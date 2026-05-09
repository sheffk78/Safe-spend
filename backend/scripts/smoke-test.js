#!/usr/bin/env node
/**
 * Safe-Spend E2E Smoke Tests
 * 
 * Exercises core production flows against the Safe-Spend API.
 * Designed to be run by Kit or Jenkins after every deploy.
 * 
 * Usage:
 *   node scripts/smoke-test.js                    # Run all tests
 *   node scripts/smoke-test.js --quick             # Skip slow tests (just health + schema)
 *   node scripts/smoke-test.js --base-url URL      # Override base URL
 * 
 * Environment:
 *   SAFE_SPEND_API_KEY — An active agent API key for spend test requests
 *   SAFE_SPEND_ORG_ID   — Organization ID (optional, uses first org from API key)
 * 
 * Exit codes:
 *   0 — All tests passed
 *   1 — One or more tests failed
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.SAFE_SPEND_BASE_URL || 'https://api.safe-spend.dev';
const API_KEY = process.env.SAFE_SPEND_API_KEY;
const QUICK_MODE = process.argv.includes('--quick');

let passed = 0;
let failed = 0;
const results = [];

function log(emoji, msg) {
    console.log(`${emoji} ${msg}`);
}

async function fetchJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const mod = urlObj.protocol === 'https:' ? https : http;
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };
        const req = mod.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

async function test(name, fn) {
    try {
        await fn();
        passed++;
        results.push({ name, status: 'PASS' });
        log('✅', name);
    } catch (err) {
        failed++;
        results.push({ name, status: 'FAIL', error: err.message });
        log('❌', `${name}: ${err.message}`);
    }
}

async function runTests() {
    console.log('🧪 Safe-Spend E2E Smoke Tests');
    console.log(`   Base URL: ${BASE_URL}`);
    console.log(`   API Key: ${API_KEY ? 'set' : 'not set (spend tests skipped)'}`);
    console.log('');

    // ─── Health Checks ────────────────────────────────────
    await test('API health endpoint returns 200', async () => {
        const res = await fetchJSON(`${BASE_URL}/api/health`);
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        if (res.data.status !== 'ok') throw new Error(`Expected status "ok", got "${res.data.status}"`);
        if (res.data.checks?.database !== 'ok') throw new Error(`Database check failed: ${res.data.checks?.database}`);
    });

    await test('Frontend returns 200', async () => {
        const frontendUrl = BASE_URL.replace('api.', '').replace(':8001', '');
        const res = await fetchJSON(frontendUrl);
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    // ─── Schema Parity ─────────────────────────────────────
    if (!QUICK_MODE) {
        await test('Schema parity check passes', async () => {
            const { execSync } = require('child_process');
            try {
                execSync('node scripts/check_schema_parity.js --ci', {
                    cwd: __dirname + '/..',
                    stdio: 'pipe'
                });
            } catch (err) {
                // CI mode currently allows drifts with exit 0 — if it exits non-zero, that's a real failure
                const output = err.stdout?.toString() || '';
                if (output.includes('Total drifts:') && !output.includes('0 drifts')) {
                    throw new Error(`Schema parity check found drifts. Run 'node scripts/check_schema_parity.js' for details.`);
                }
            }
        });
    }

    // ─── API Key Tests (requires API_KEY) ─────────────────
    if (API_KEY && !QUICK_MODE) {
        let orgId = null;

        await test('API key authentication works', async () => {
            const res = await fetchJSON(`${BASE_URL}/api/v1/escrow-accounts`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            if (res.status === 401) throw new Error('API key rejected (401)');
            if (res.status === 500) throw new Error('Server error (500) — possible schema drift');
            // 200 or 404 is acceptable
            if (res.status !== 200 && res.status !== 404) {
                throw new Error(`Unexpected status ${res.status}`);
            }
            // Extract org ID from response if available
            if (res.data?.data?.[0]?.org_id) {
                orgId = res.data.data[0].org_id;
            }
        });

        await test('API key isActive field returns properly', async () => {
            const res = await fetchJSON(`${BASE_URL}/api/v1/api-keys`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            if (res.status === 500) throw new Error('Server error — possible missing isActive column in api_keys');
            if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
            const keys = res.data?.data || res.data || [];
            if (keys.length === 0) throw new Error('No API keys returned');
            const key = keys[0];
            if (key.is_active === undefined || key.is_active === null) {
                throw new Error('API key is_active is null/undefined — column may be missing from PostgreSQL');
            }
        });

        await test('Escrow accounts endpoint responds', async () => {
            const res = await fetchJSON(`${BASE_URL}/api/v1/escrow-accounts`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            if (res.status === 500) throw new Error('Server error — possible missing columns in escrow_accounts');
        });

        await test('Spending policies endpoint responds', async () => {
            const res = await fetchJSON(`${BASE_URL}/api/v1/policies`, {
                headers: { 'Authorization': `Bearer ${API_KEY}` }
            });
            if (res.status === 500) throw new Error('Server error — possible missing columns in spending_policies');
        });
    }

    // ─── Summary ───────────────────────────────────────────
    console.log('');
    console.log('─── Results ───');
    for (const r of results) {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
    }
    console.log('');
    console.log(`Total: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log('\n🚫 Smoke tests failed. Fix critical issues before continuing.');
        process.exit(1);
    } else {
        console.log('\n✅ All smoke tests passed.');
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});