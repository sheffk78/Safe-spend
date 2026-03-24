/**
 * Spending Policy Rule Tests
 * 
 * Tests for:
 * - Per-Transaction Limit
 * - Daily Cap
 * - Vendor Allowlist
 * - Category Blocklist
 */

const request = require('supertest');
const { 
    getApp, 
    resetDatabase, 
    createTestOrg, 
    createEscrowAccount,
    fundEscrowAccount,
    createPolicy,
    createSpendRequest
} = require('./utils');

describe('Spending Policy Rules', () => {
    let app;
    let testOrg;
    let escrow;

    beforeAll(async () => {
        app = getApp();
    });

    beforeEach(async () => {
        await resetDatabase();
        testOrg = await createTestOrg();
        escrow = await createEscrowAccount(testOrg.token);
        await fundEscrowAccount(testOrg.token, escrow.id, 1000000); // $10,000
    });

    describe('Per-Transaction Limit', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Per-Tx Limit Policy',
                per_transaction_limit_cents: 50000, // $500 per tx
                auto_approve_under_cents: 100000,
                require_human_above_cents: 100000
            });
        });

        it('should approve spend under per-transaction limit', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000, // $300
                vendor: 'Test Vendor',
                category: 'test'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
        });

        it('should deny spend over per-transaction limit', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 60000, // $600, over $500 limit
                vendor: 'Test Vendor',
                category: 'test'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('status', 'denied');
            expect(response.rules_evaluated).toBeDefined();
            
            // Find the per_transaction_limit rule
            const limitRule = response.rules_evaluated.find(r => r.rule === 'per_transaction_limit');
            expect(limitRule).toBeDefined();
            expect(limitRule.passed).toBe(false);
        });
    });

    describe('Daily Cap', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Daily Cap Policy',
                per_transaction_limit_cents: 500000,
                daily_limit_cents: 100000, // $1,000 daily cap
                auto_approve_under_cents: 200000,
                require_human_above_cents: 200000
            });
        });

        it('should approve multiple spends under daily cap', async () => {
            // First spend $400
            const { status: s1, response: r1 } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 40000,
                vendor: 'Vendor 1',
                category: 'test'
            });
            expect(s1).toBe(201);
            expect(r1.status).toBe('approved');

            // Second spend $500 (total $900, under $1000)
            const { status: s2, response: r2 } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 50000,
                vendor: 'Vendor 2',
                category: 'test'
            });
            expect(s2).toBe(201);
            expect(r2.status).toBe('approved');
        });

        it('should deny spend that exceeds daily cap', async () => {
            // First spend $600
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 60000,
                vendor: 'Vendor 1',
                category: 'test'
            });

            // Second spend $500 would exceed $1000 daily cap
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 50000,
                vendor: 'Vendor 2',
                category: 'test'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('status', 'denied');
            
            const dailyRule = response.rules_evaluated.find(r => r.rule === 'daily_cap_check');
            expect(dailyRule).toBeDefined();
            expect(dailyRule.passed).toBe(false);
        });
    });

    describe('Vendor Allowlist', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Vendor Allowlist Policy',
                allowed_vendors: ['Google Ads', 'Meta Ads', 'Anthropic'],
                vendor_match_mode: 'contains',
                auto_approve_under_cents: 100000,
                require_human_above_cents: 100000
            });
        });

        it('should approve spend to allowed vendor', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Google Ads Campaign',
                category: 'advertising'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
        });

        it('should deny spend to non-allowed vendor', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Unknown Vendor',
                category: 'advertising'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('status', 'denied');
            
            const vendorRule = response.rules_evaluated.find(r => r.rule === 'vendor_check');
            expect(vendorRule).toBeDefined();
            expect(vendorRule.passed).toBe(false);
        });

        it('should use contains match for vendor names', async () => {
            // "Anthropic API" contains "Anthropic"
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Anthropic API',
                category: 'ai_compute'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
        });
    });

    describe('Category Blocklist', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Category Blocklist Policy',
                blocked_categories: ['gambling', 'alcohol', 'weapons'],
                auto_approve_under_cents: 100000,
                require_human_above_cents: 100000
            });
        });

        it('should approve spend in allowed category', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Office Supplies',
                category: 'office_expenses'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
        });

        it('should deny spend in blocked category', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Casino Games',
                category: 'gambling'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('status', 'denied');
            
            const categoryRule = response.rules_evaluated.find(r => r.rule === 'category_check');
            expect(categoryRule).toBeDefined();
            expect(categoryRule.passed).toBe(false);
        });
    });

    describe('Combined Rules', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Combined Rules Policy',
                per_transaction_limit_cents: 50000,
                daily_limit_cents: 100000,
                allowed_vendors: ['Approved Vendor'],
                blocked_categories: ['blocked_category'],
                vendor_match_mode: 'contains',
                auto_approve_under_cents: 100000,
                require_human_above_cents: 100000
            });
        });

        it('should approve spend passing all rules', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Approved Vendor',
                category: 'allowed_category'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
            
            // All rules should pass
            const failedRules = response.rules_evaluated.filter(r => !r.passed);
            expect(failedRules).toHaveLength(0);
        });

        it('should deny on first failing rule', async () => {
            // Over per-transaction limit
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 60000,
                vendor: 'Approved Vendor',
                category: 'allowed_category'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('status', 'denied');
        });
    });
});
