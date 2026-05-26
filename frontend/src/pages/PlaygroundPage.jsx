/**
 * Public API Playground
 * Interactive API testing environment for Safe-Spend
 * Works in Demo Mode (no auth) or Live Mode (with API key)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
    Play,
    Code,
    Eye,
    FileText,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Key,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Keyboard,
    X,
    Send
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// ============================================================================
// DEMO DATA
// ============================================================================

const DEMO_DATA = {
    organization: {
        id: 'org_demo_acme',
        name: 'Acme AI Corp',
        email: 'demo@acme-ai.example.com'
    },
    escrowAccounts: [
        {
            id: 'esc_demo_mktg01',
            name: 'Marketing Budget',
            description: 'Q1 2026 marketing and AI tool spend',
            balance_cents: 450001,
            currency: 'usd',
            status: 'active',
            total_funded_cents: 1000000,
            total_spent_cents: 549999
        },
        {
            id: 'esc_demo_infra01',
            name: 'Infrastructure Budget',
            description: 'Cloud hosting and DevOps tooling',
            balance_cents: 250000,
            currency: 'usd',
            status: 'active',
            total_funded_cents: 500000,
            total_spent_cents: 250000
        },
        {
            id: 'esc_demo_paused',
            name: 'Paused Research Fund',
            description: 'Temporarily paused — pending budget review',
            balance_cents: 75000,
            currency: 'usd',
            status: 'paused',
            total_funded_cents: 200000,
            total_spent_cents: 125000
        }
    ],
    policies: [
        {
            id: 'pol_demo_ai_tools',
            escrow_id: 'esc_demo_mktg01',
            name: 'Marketing AI Tools',
            per_transaction_limit_cents: 50000,
            daily_limit_cents: 100000,
            monthly_limit_cents: 500000,
            allowed_vendors: ['Anthropic', 'OpenAI', 'Google Cloud'],
            allowed_categories: ['ai_compute', 'cloud_hosting'],
            auto_approve_under_cents: 5000,
            require_human_above_cents: 25000,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start: '06:00',
            active_hours_end: '22:00',
            active_timezone: 'America/Denver',
            is_active: true
        }
    ],
    spendRequests: [
        {
            id: 'spr_demo_001',
            escrow_id: 'esc_demo_mktg01',
            amount_cents: 2500,
            vendor: 'OpenAI',
            category: 'ai_compute',
            status: 'approved',
            description: 'GPT-4 API batch — weekly content generation',
            created_at: '2026-03-26T14:30:00Z'
        },
        {
            id: 'spr_demo_002',
            escrow_id: 'esc_demo_mktg01',
            amount_cents: 85000,
            vendor: 'Unauthorized SaaS',
            category: 'unknown',
            status: 'denied',
            denial_reason: 'Vendor not in allowed list; amount exceeds daily cap',
            created_at: '2026-03-26T14:28:00Z'
        },
        {
            id: 'spr_demo_003',
            escrow_id: 'esc_demo_mktg01',
            amount_cents: 30000,
            vendor: 'Anthropic',
            category: 'ai_compute',
            status: 'pending_approval',
            description: 'Enterprise tier upgrade — annual',
            created_at: '2026-03-26T14:35:00Z'
        }
    ],
    auditEvents: [
        {
            id: 'evt_demo_001',
            event_type: 'spend.approved',
            actor_type: 'agent',
            details: { amount_cents: 2500, vendor: 'OpenAI' },
            created_at: '2026-03-26T14:30:00Z'
        },
        {
            id: 'evt_demo_002',
            event_type: 'spend.denied',
            actor_type: 'agent',
            details: { amount_cents: 85000, vendor: 'Unauthorized SaaS', reasons: ['vendor_not_allowed', 'daily_cap_exceeded'] },
            created_at: '2026-03-26T14:28:00Z'
        },
        {
            id: 'evt_demo_003',
            event_type: 'escrow.funded',
            actor_type: 'human',
            details: { amount_cents: 500000, escrow_name: 'Marketing Budget' },
            created_at: '2026-03-26T10:00:00Z'
        },
        {
            id: 'evt_demo_004',
            event_type: 'policy.created',
            actor_type: 'human',
            details: { policy_name: 'Marketing AI Tools', escrow_id: 'esc_demo_mktg01' },
            created_at: '2026-03-26T09:45:00Z'
        }
    ]
};

// ============================================================================
// QUICK SCENARIOS
// ============================================================================

const QUICK_SCENARIOS = [
    {
        id: 'submit-spend',
        name: 'Submit a Spend Request',
        description: 'Agent requests $49.99 from Marketing Budget',
        endpoint: { method: 'POST', path: '/v1/spend' },
        prefill: {
            escrow_id: 'esc_demo_mktg01',
            amount_cents: 4999,
            vendor: 'Anthropic',
            category: 'ai_compute',
            description: 'Claude API usage — March batch processing',
            idempotency_key: 'demo_spend_001'
        },
        plainEnglish: 'An AI agent requests $49.99 from the Marketing Budget to pay Anthropic for API usage. The rules engine will evaluate spending limits, vendor allowlists, and daily caps before approving or denying.'
    },
    {
        id: 'check-balance',
        name: 'Check Account Balance',
        description: 'View remaining balance in a protected account',
        endpoint: { method: 'GET', path: '/v1/escrow-accounts/:id/balance' },
        prefill: { id: 'esc_demo_mktg01' },
        plainEnglish: 'Check how much money is left in the Marketing Budget protected account. Agents call this before spending to make sure they have enough funds.'
    },
    {
        id: 'create-escrow',
        name: 'Create a Protected Account',
        description: 'Open a new dedicated wallet',
        endpoint: { method: 'POST', path: '/v1/escrow-accounts' },
        prefill: {
            name: 'Q2 Advertising Budget',
            description: 'Dedicated budget for ad spend across Google and Meta',
            currency: 'usd',
            metadata: { department: 'marketing', quarter: 'Q2-2026' }
        },
        plainEnglish: "Create a new protected account to hold funds. Think of this as opening a dedicated wallet with a specific purpose. You'll fund it and attach spending policies next."
    },
    {
        id: 'set-policy',
        name: 'Set a Spending Policy',
        description: 'Attach governance rules to an account',
        endpoint: { method: 'POST', path: '/v1/policies' },
        prefill: {
            escrow_id: 'esc_demo_mktg01',
            name: 'Marketing AI Tools',
            per_transaction_limit_cents: 50000,
            daily_limit_cents: 100000,
            monthly_limit_cents: 500000,
            allowed_vendors: ['Anthropic', 'OpenAI', 'Google Cloud'],
            allowed_categories: ['ai_compute', 'cloud_hosting'],
            auto_approve_under_cents: 5000,
            require_human_above_cents: 25000
        },
        plainEnglish: 'Attach a spending policy to a protected account. This one allows up to $500 per transaction, $1,000/day, and $5,000/month — only for Anthropic, OpenAI, and Google Cloud. Transactions under $50 auto-approve. Over $250 requires human sign-off.'
    },
    {
        id: 'trigger-denial',
        name: 'Trigger a Denial',
        description: 'Spend request that will be denied',
        endpoint: { method: 'POST', path: '/v1/spend' },
        prefill: {
            escrow_id: 'esc_demo_mktg01',
            amount_cents: 75000,
            vendor: 'Meta Ads',
            category: 'advertising',
            description: 'Facebook ad campaign boost',
            idempotency_key: 'demo_spend_denied_001'
        },
        plainEnglish: "This spend request will be DENIED. The amount ($750) exceeds the daily limit ($500), and 'Meta Ads' isn't on the allowed vendor list. The response will show exactly which rules failed and why."
    },
    {
        id: 'trigger-approval',
        name: 'Trigger Human Approval',
        description: 'Request that needs manual review',
        endpoint: { method: 'POST', path: '/v1/spend' },
        prefill: {
            escrow_id: 'esc_demo_mktg01',
            amount_cents: 30000,
            vendor: 'Anthropic',
            category: 'ai_compute',
            description: 'Enterprise API tier upgrade — annual prepayment',
            idempotency_key: 'demo_spend_approval_001'
        },
        plainEnglish: "This $300 spend request passes all rules, but exceeds the auto-approve threshold ($50) and the human-approval threshold ($250). It will be placed in 'pending_approval' status until a human owner approves or denies it."
    },
    {
        id: 'view-audit',
        name: 'View Audit Trail',
        description: 'Pull recent denied spend requests',
        endpoint: { method: 'GET', path: '/v1/audit' },
        prefill: { event_type: 'spend.denied', limit: 10 },
        plainEnglish: 'Pull the last 10 denied spend requests from the audit log. Every action in Safe-Spend is recorded — who did what, when, and why. This is the immutable receipt trail.'
    },
    {
        id: 'list-approvals',
        name: 'List Pending Approvals',
        description: 'Check for requests awaiting review',
        endpoint: { method: 'GET', path: '/v1/approvals' },
        prefill: { status: 'pending' },
        plainEnglish: 'Check if any spend requests are waiting for human approval. These are transactions that passed all automated rules but exceeded the approval threshold.'
    }
];

// ============================================================================
// ALL ENDPOINTS
// ============================================================================

const ALL_ENDPOINTS = [
    {
        category: 'Protected Accounts',
        endpoints: [
            { method: 'POST', path: '/v1/escrow-accounts', description: 'Create account' },
            { method: 'GET', path: '/v1/escrow-accounts', description: 'List accounts' },
            { method: 'GET', path: '/v1/escrow-accounts/:id', description: 'Get account' },
            { method: 'POST', path: '/v1/escrow-accounts/:id/fund', description: 'Fund account' },
            { method: 'POST', path: '/v1/escrow-accounts/:id/pause', description: 'Pause account' },
            { method: 'POST', path: '/v1/escrow-accounts/:id/resume', description: 'Resume account' },
            { method: 'POST', path: '/v1/escrow-accounts/:id/close', description: 'Close account' },
            { method: 'GET', path: '/v1/escrow-accounts/:id/balance', description: 'Check balance' }
        ]
    },
    {
        category: 'Spending Policies',
        endpoints: [
            { method: 'POST', path: '/v1/policies', description: 'Create policy' },
            { method: 'GET', path: '/v1/policies', description: 'List policies' },
            { method: 'GET', path: '/v1/policies/:id', description: 'Get policy' },
            { method: 'PATCH', path: '/v1/policies/:id', description: 'Update policy' },
            { method: 'DELETE', path: '/v1/policies/:id', description: 'Delete policy' }
        ]
    },
    {
        category: 'Spend Requests',
        endpoints: [
            { method: 'POST', path: '/v1/spend', description: 'Request a spend' },
            { method: 'GET', path: '/v1/spend/:id', description: 'Check status' },
            { method: 'GET', path: '/v1/spend', description: 'List requests' },
            { method: 'POST', path: '/v1/spend/:id/cancel', description: 'Cancel request' }
        ]
    },
    {
        category: 'Approvals',
        endpoints: [
            { method: 'GET', path: '/v1/approvals', description: 'List approvals' },
            { method: 'POST', path: '/v1/approvals/:id/approve', description: 'Approve' },
            { method: 'POST', path: '/v1/approvals/:id/deny', description: 'Deny' }
        ]
    },
    {
        category: 'Audit',
        endpoints: [
            { method: 'GET', path: '/v1/audit', description: 'Query events' }
        ]
    },
    {
        category: 'Webhooks',
        endpoints: [
            { method: 'POST', path: '/v1/webhooks', description: 'Register webhook' },
            { method: 'GET', path: '/v1/webhooks', description: 'List webhooks' },
            { method: 'DELETE', path: '/v1/webhooks/:id', description: 'Delete webhook' }
        ]
    }
];

// ============================================================================
// DEMO MODE SIMULATOR
// ============================================================================

let demoState = JSON.parse(JSON.stringify(DEMO_DATA));

const resetDemoState = () => {
    demoState = JSON.parse(JSON.stringify(DEMO_DATA));
};

const formatCents = (cents) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(cents / 100);
};

const simulateDemoRequest = (method, path, body, queryParams) => {
    const startTime = Date.now();
    
    // Simulate network delay
    return new Promise((resolve) => {
        setTimeout(() => {
            const result = processRequest(method, path, body, queryParams);
            result.responseTime = Date.now() - startTime;
            resolve(result);
        }, 150 + Math.random() * 200);
    });
};

const processRequest = (method, path, body, queryParams) => {
    // GET /v1/escrow-accounts
    if (method === 'GET' && path === '/v1/escrow-accounts') {
        return {
            status: 200,
            data: { data: demoState.escrowAccounts, total: demoState.escrowAccounts.length },
            plainEnglish: `Found ${demoState.escrowAccounts.length} protected accounts. Total balance held: ${formatCents(demoState.escrowAccounts.reduce((sum, a) => sum + a.balance_cents, 0))}.`
        };
    }
    
    // GET /v1/escrow-accounts/:id/balance
    if (method === 'GET' && path.match(/\/v1\/escrow-accounts\/[^/]+\/balance/)) {
        const id = path.split('/')[3];
        const account = demoState.escrowAccounts.find(a => a.id === id);
        if (!account) {
            return { status: 404, data: { error: { code: 'NOT_FOUND', message: 'Escrow account not found' } }, plainEnglish: `No protected account found with ID "${id}".` };
        }
        return {
            status: 200,
            data: { balance_cents: account.balance_cents, currency: account.currency, account_name: account.name },
            plainEnglish: `The "${account.name}" account has ${formatCents(account.balance_cents)} available.`
        };
    }
    
    // GET /v1/escrow-accounts/:id
    if (method === 'GET' && path.match(/\/v1\/escrow-accounts\/[^/]+$/)) {
        const id = path.split('/')[3];
        const account = demoState.escrowAccounts.find(a => a.id === id);
        if (!account) {
            return { status: 404, data: { error: { code: 'NOT_FOUND', message: 'Escrow account not found' } }, plainEnglish: `No protected account found with ID "${id}".` };
        }
        return { status: 200, data: account, plainEnglish: `Retrieved details for "${account.name}" — ${formatCents(account.balance_cents)} balance, status: ${account.status}.` };
    }
    
    // POST /v1/escrow-accounts
    if (method === 'POST' && path === '/v1/escrow-accounts') {
        const newAccount = {
            id: `esc_demo_${Date.now().toString(36)}`,
            name: body.name || 'New Account',
            description: body.description || '',
            balance_cents: 0,
            currency: body.currency || 'usd',
            status: 'active',
            total_funded_cents: 0,
            total_spent_cents: 0,
            metadata: body.metadata || {},
            created_at: new Date().toISOString()
        };
        demoState.escrowAccounts.push(newAccount);
        return { status: 201, data: newAccount, plainEnglish: `Created new protected account "${newAccount.name}" with ID ${newAccount.id}. Fund it with POST /v1/escrow-accounts/${newAccount.id}/fund.` };
    }
    
    // GET /v1/policies
    if (method === 'GET' && path === '/v1/policies') {
        return { status: 200, data: { data: demoState.policies, total: demoState.policies.length }, plainEnglish: `Found ${demoState.policies.length} spending policies.` };
    }
    
    // POST /v1/policies
    if (method === 'POST' && path === '/v1/policies') {
        const newPolicy = {
            id: `pol_demo_${Date.now().toString(36)}`,
            ...body,
            is_active: true,
            created_at: new Date().toISOString()
        };
        demoState.policies.push(newPolicy);
        return { status: 201, data: newPolicy, plainEnglish: `Created policy "${newPolicy.name}" for protected account ${newPolicy.escrow_id}. It's now active and will govern all spend requests.` };
    }
    
    // POST /v1/spend
    if (method === 'POST' && path === '/v1/spend') {
        return simulateSpendRequest(body);
    }
    
    // GET /v1/spend
    if (method === 'GET' && path === '/v1/spend') {
        return { status: 200, data: { data: demoState.spendRequests, total: demoState.spendRequests.length }, plainEnglish: `Found ${demoState.spendRequests.length} spend requests.` };
    }
    
    // GET /v1/audit
    if (method === 'GET' && path === '/v1/audit') {
        let events = [...demoState.auditEvents];
        if (queryParams?.event_type) {
            events = events.filter(e => e.event_type === queryParams.event_type);
        }
        const limit = parseInt(queryParams?.limit) || 10;
        events = events.slice(0, limit);
        return { status: 200, data: { data: events, total: events.length }, plainEnglish: `Retrieved ${events.length} audit events${queryParams?.event_type ? ` of type "${queryParams.event_type}"` : ''}.` };
    }
    
    // GET /v1/approvals
    if (method === 'GET' && path === '/v1/approvals') {
        const pending = demoState.spendRequests.filter(s => s.status === 'pending_approval');
        return { status: 200, data: { data: pending.map(s => ({ id: `apr_${s.id.replace('spr_', '')}`, spend_request_id: s.id, ...s })), total: pending.length }, plainEnglish: `Found ${pending.length} spend request(s) awaiting human approval.` };
    }
    
    // Default: endpoint not found in demo
    return { status: 501, data: { error: { code: 'NOT_IMPLEMENTED', message: 'This endpoint is not available in demo mode' } }, plainEnglish: 'This endpoint is not simulated in demo mode. Connect with a real API key to test it.' };
};

const simulateSpendRequest = (body) => {
    const { escrow_id, amount_cents, vendor, category, description, idempotency_key } = body;
    
    const account = demoState.escrowAccounts.find(a => a.id === escrow_id);
    if (!account) {
        return { status: 404, data: { error: { code: 'ESCROW_NOT_FOUND', message: 'Escrow account not found' } }, plainEnglish: `No protected account found with ID "${escrow_id}".` };
    }
    
    const policy = demoState.policies.find(p => p.escrow_id === escrow_id && p.is_active);
    
    const rulesEvaluated = [];
    let failed = false;
    let failedRules = [];
    
    // Rule: Account exists and active
    rulesEvaluated.push({ rule: 'escrow_exists', passed: true });
    if (account.status !== 'active') {
        rulesEvaluated.push({ rule: 'escrow_active', passed: false, reason: `Account is ${account.status}` });
        failed = true;
        failedRules.push('Account not active');
    } else {
        rulesEvaluated.push({ rule: 'escrow_active', passed: true });
    }
    
    // Rule: Sufficient balance
    if (amount_cents > account.balance_cents) {
        rulesEvaluated.push({ rule: 'sufficient_balance', passed: false, reason: `Requested ${formatCents(amount_cents)}, only ${formatCents(account.balance_cents)} available` });
        failed = true;
        failedRules.push('Insufficient balance');
    } else {
        rulesEvaluated.push({ rule: 'sufficient_balance', passed: true });
    }
    
    if (policy) {
        // Rule: Per-transaction limit
        if (amount_cents > policy.per_transaction_limit_cents) {
            rulesEvaluated.push({ rule: 'per_transaction_limit', passed: false, reason: `${formatCents(amount_cents)} exceeds limit of ${formatCents(policy.per_transaction_limit_cents)}` });
            failed = true;
            failedRules.push('Exceeds per-transaction limit');
        } else {
            rulesEvaluated.push({ rule: 'per_transaction_limit', passed: true });
        }
        
        // Rule: Daily limit
        if (amount_cents > policy.daily_limit_cents) {
            rulesEvaluated.push({ rule: 'daily_limit', passed: false, reason: `${formatCents(amount_cents)} exceeds daily limit of ${formatCents(policy.daily_limit_cents)}` });
            failed = true;
            failedRules.push('Exceeds daily limit');
        } else {
            rulesEvaluated.push({ rule: 'daily_limit', passed: true });
        }
        
        // Rule: Vendor allowlist
        if (policy.allowed_vendors && policy.allowed_vendors.length > 0) {
            if (!policy.allowed_vendors.includes(vendor)) {
                rulesEvaluated.push({ rule: 'allowed_vendors', passed: false, reason: `"${vendor}" not in allowed list: ${policy.allowed_vendors.join(', ')}` });
                failed = true;
                failedRules.push('Vendor not allowed');
            } else {
                rulesEvaluated.push({ rule: 'allowed_vendors', passed: true });
            }
        }
        
        // Rule: Category allowlist
        if (policy.allowed_categories && policy.allowed_categories.length > 0) {
            if (!policy.allowed_categories.includes(category)) {
                rulesEvaluated.push({ rule: 'allowed_categories', passed: false, reason: `"${category}" not in allowed list: ${policy.allowed_categories.join(', ')}` });
                failed = true;
                failedRules.push('Category not allowed');
            } else {
                rulesEvaluated.push({ rule: 'allowed_categories', passed: true });
            }
        }
    }
    
    if (failed) {
        const spendRequest = {
            id: `spr_demo_${Date.now().toString(36)}`,
            escrow_id,
            amount_cents,
            vendor,
            category,
            description,
            status: 'denied',
            rules_evaluated: rulesEvaluated,
            created_at: new Date().toISOString()
        };
        demoState.spendRequests.push(spendRequest);
        
        const passedCount = rulesEvaluated.filter(r => r.passed).length;
        const failedCount = rulesEvaluated.filter(r => !r.passed).length;
        
        return {
            status: 200,
            data: spendRequest,
            plainEnglish: `❌ Spend Denied\n\nYour agent's request to spend ${formatCents(amount_cents)} at ${vendor} was denied.\n\n• Protected Account: ${account.name} (${escrow_id})\n• Amount Requested: ${formatCents(amount_cents)}\n• Vendor: ${vendor}\n• Category: ${category}\n\nRules Failed (${failedCount}):\n${failedRules.map(r => `✗ ${r}`).join('\n')}\n\nRules Passed (${passedCount}):\n${rulesEvaluated.filter(r => r.passed).map(r => `✓ ${r.rule.replace(/_/g, ' ')}`).join(', ')}`
        };
    }
    
    // Check for human approval threshold
    if (policy && amount_cents >= policy.require_human_above_cents) {
        const spendRequest = {
            id: `spr_demo_${Date.now().toString(36)}`,
            escrow_id,
            amount_cents,
            vendor,
            category,
            description,
            status: 'pending_approval',
            approval_id: `apr_demo_${Date.now().toString(36)}`,
            rules_evaluated: rulesEvaluated,
            created_at: new Date().toISOString()
        };
        demoState.spendRequests.push(spendRequest);
        
        return {
            status: 200,
            data: spendRequest,
            plainEnglish: `⏳ Pending Human Approval\n\nYour agent's request to spend ${formatCents(amount_cents)} at ${vendor} has been placed on hold for human review.\n\n• Protected Account: ${account.name} (${escrow_id})\n• Amount: ${formatCents(amount_cents)}\n• Reason: Exceeds auto-approve threshold (${formatCents(policy.auto_approve_under_cents)})\n• Approval ID: ${spendRequest.approval_id}\n\nThe account owner will be notified. They can approve or deny from the dashboard.`
        };
    }
    
    // Approved - deduct balance
    account.balance_cents -= amount_cents;
    account.total_spent_cents += amount_cents;
    
    const spendRequest = {
        id: `spr_demo_${Date.now().toString(36)}`,
        escrow_id,
        amount_cents,
        vendor,
        category,
        description,
        status: 'approved',
        rules_evaluated: rulesEvaluated,
        remaining_balance_cents: account.balance_cents,
        created_at: new Date().toISOString()
    };
    demoState.spendRequests.push(spendRequest);
    
    return {
        status: 200,
        data: spendRequest,
        plainEnglish: `✅ Spend Approved\n\nYour agent's request to spend ${formatCents(amount_cents)} at ${vendor} was approved.\n\n• Protected Account: ${account.name} (${escrow_id})\n• Amount: ${formatCents(amount_cents)}\n• Vendor: ${vendor}\n• Category: ${category}\n• Remaining Balance: ${formatCents(account.balance_cents)}\n\nAll ${rulesEvaluated.length} policy rules passed. The spend was auto-approved because it was under the ${formatCents(policy?.auto_approve_under_cents || 0)} threshold.`
    };
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const MethodBadge = ({ method }) => {
    const colors = {
        GET: 'bg-ss-accent/20 text-ss-accent border-ss-accent/20',
        POST: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        PATCH: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        DELETE: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
        <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${colors[method] || 'bg-ss-text-tertiary/20 text-ss-text-tertiary'}`}>
            {method}
        </span>
    );
};

const StatusBadge = ({ status }) => {
    if (status >= 200 && status < 300) {
        return <span className="px-2 py-1 bg-teal-500/20 text-teal-400 rounded text-sm font-mono">{status} OK</span>;
    }
    if (status >= 400 && status < 500) {
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-mono">{status} Error</span>;
    }
    if (status >= 500) {
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm font-mono">{status} Server Error</span>;
    }
    return <span className="px-2 py-1 bg-ss-text-tertiary/20 text-ss-text-tertiary rounded text-sm font-mono">{status}</span>;
};

const CodeBlock = ({ code, language, onCopy }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopy?.();
    };
    
    return (
        <div className="relative">
            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 bg-ss-elevated hover:bg-gray-100 rounded-lg text-ss-text-tertiary hover:text-ss-text transition-all z-10"
            >
                {copied ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
            </button>
            <pre className="bg-ss-bg rounded-lg p-4 overflow-x-auto text-sm border border-gray-200">
                <code className="text-ss-text-tertiary font-mono whitespace-pre">{code}</code>
            </pre>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PublicPlaygroundPage = () => {
    const location = useLocation();
    const [mode, setMode] = useState('demo'); // 'demo' | 'live'
    const [apiKey, setApiKey] = useState('');
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [connectedOrg, setConnectedOrg] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
    
    const [selectedEndpoint, setSelectedEndpoint] = useState(QUICK_SCENARIOS[0].endpoint);
    const [selectedScenario, setSelectedScenario] = useState(QUICK_SCENARIOS[0]);
    const [formData, setFormData] = useState(QUICK_SCENARIOS[0].prefill);
    const [queryParams, setQueryParams] = useState({});
    
    const [activeTab, setActiveTab] = useState('form'); // 'form' | 'code'
    const [codeLanguage, setCodeLanguage] = useState('curl');
    const [responseTab, setResponseTab] = useState('pretty'); // 'pretty' | 'plain'
    
    const [response, setResponse] = useState(null);
    const [sending, setSending] = useState(false);
    
    const [expandedCategories, setExpandedCategories] = useState(['Protected Accounts', 'Spend Requests']);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    
    // Check for first visit
    useEffect(() => {
        const hasVisited = localStorage.getItem('playground_visited');
        if (!hasVisited) {
            setShowOnboarding(true);
        }
    }, []);
    
    const dismissOnboarding = (dontShowAgain) => {
        setShowOnboarding(false);
        if (dontShowAgain) {
            localStorage.setItem('playground_visited', 'true');
        }
    };
    
    // Handle deep linking
    useEffect(() => {
        const hash = location.hash.replace('#', '');
        if (hash.startsWith('scenario/')) {
            const scenarioId = hash.replace('scenario/', '');
            const scenario = QUICK_SCENARIOS.find(s => s.id === scenarioId);
            if (scenario) {
                selectScenario(scenario);
            }
        }
    }, [location.hash]);
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSendRequest();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('endpoint-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [formData, selectedEndpoint]);
    
    const selectScenario = (scenario) => {
        setSelectedScenario(scenario);
        setSelectedEndpoint(scenario.endpoint);
        setFormData(scenario.prefill);
        setQueryParams({});
        setResponse(null);
        window.history.replaceState(null, '', `#scenario/${scenario.id}`);
    };
    
    const selectEndpoint = (endpoint) => {
        setSelectedEndpoint(endpoint);
        setSelectedScenario(null);
        setFormData({});
        setQueryParams({});
        setResponse(null);
        window.history.replaceState(null, '', `#${endpoint.method}${endpoint.path}`);
    };
    
    const handleConnect = async () => {
        if (!apiKeyInput.startsWith('sk_')) {
            setConnectionError('Invalid API key format. Keys start with sk_live_, sk_test_, or sk_agent_');
            return;
        }
        
        setConnecting(true);
        setConnectionError(null);
        
        try {
            const res = await fetch(`${API_URL}/api/v1/escrow-accounts`, {
                headers: { 'Authorization': `Bearer ${apiKeyInput}` }
            });
            
            if (res.ok) {
                setApiKey(apiKeyInput);
                setMode('live');
                setConnectedOrg({ name: 'Your Organization' }); // Would normally parse from response
            } else {
                setConnectionError('Invalid API key. Check that it starts with sk_live_ or sk_test_.');
            }
        } catch (err) {
            setConnectionError('Could not connect to API. Please try again.');
        } finally {
            setConnecting(false);
        }
    };
    
    const handleDisconnect = () => {
        setApiKey('');
        setApiKeyInput('');
        setMode('demo');
        setConnectedOrg(null);
    };
    
    const handleSendRequest = async () => {
        setSending(true);
        setResponse(null);
        
        try {
            let result;
            
            if (mode === 'demo') {
                // Build path with ID substitution
                let path = selectedEndpoint.path;
                if (formData.id) {
                    path = path.replace(':id', formData.id);
                }
                
                result = await simulateDemoRequest(
                    selectedEndpoint.method,
                    path,
                    selectedEndpoint.method !== 'GET' ? formData : null,
                    selectedEndpoint.method === 'GET' ? { ...formData, ...queryParams } : queryParams
                );
            } else {
                // Live mode - make real API call
                let path = selectedEndpoint.path;
                if (formData.id) {
                    path = path.replace(':id', formData.id);
                }
                
                const url = new URL(`${API_URL}/api${path}`);
                if (selectedEndpoint.method === 'GET') {
                    Object.entries({ ...formData, ...queryParams }).forEach(([k, v]) => {
                        if (v !== undefined && v !== '' && k !== 'id') url.searchParams.set(k, v);
                    });
                }
                
                const startTime = Date.now();
                const res = await fetch(url.toString(), {
                    method: selectedEndpoint.method,
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: selectedEndpoint.method !== 'GET' ? JSON.stringify(formData) : undefined
                });
                
                const data = await res.json();
                result = {
                    status: res.status,
                    data,
                    responseTime: Date.now() - startTime,
                    plainEnglish: 'Live API response. See Pretty tab for full details.'
                };
            }
            
            setResponse(result);
        } catch (err) {
            setResponse({
                status: 0,
                data: { error: { message: err.message } },
                plainEnglish: `Request failed: ${err.message}`
            });
        } finally {
            setSending(false);
        }
    };
    
    // Generate code snippets
    const generateCodeSnippets = useMemo(() => {
        let path = selectedEndpoint.path;
        if (formData.id) {
            path = path.replace(':id', formData.id);
        }
        
        const keyDisplay = mode === 'demo' ? 'sk_test_demo_key...' : (apiKey ? `${apiKey.substring(0, 12)}...****` : 'sk_live_...');
        const baseUrl = 'https://safe-spend.dev';
        
        const curl = selectedEndpoint.method === 'GET'
            ? `curl "${baseUrl}${path}${Object.keys(formData).length ? '?' + new URLSearchParams(formData).toString() : ''}" \\
  -H "Authorization: Bearer ${keyDisplay}"`
            : `curl -X ${selectedEndpoint.method} "${baseUrl}${path}" \\
  -H "Authorization: Bearer ${keyDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(formData, null, 2)}'`;
        
        const python = `from safespend import SafeSpend

client = SafeSpend(api_key="${keyDisplay}")

response = client.${path.split('/')[2]?.replace(/-/g, '_') || 'api'}.${selectedEndpoint.method.toLowerCase()}(
${Object.entries(formData).map(([k, v]) => `    ${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`).join(',\n')}
)`;
        
        const nodejs = `const SafeSpend = require('safespend');

const client = new SafeSpend({ apiKey: '${keyDisplay}' });

const response = await client.${path.split('/')[2]?.replace(/-/g, '_') || 'api'}.${selectedEndpoint.method.toLowerCase()}({
${Object.entries(formData).map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : JSON.stringify(v)}`).join(',\n')}
});`;

        return { curl, python, nodejs };
    }, [selectedEndpoint, formData, mode, apiKey]);
    
    const toggleCategory = (category) => {
        setExpandedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };
    
    // Get current escrow balance for status bar
    const currentEscrow = demoState.escrowAccounts.find(a => a.id === 'esc_demo_mktg01');
    
    return (
        <div className="min-h-screen bg-ss-bg">
            <Navbar />
            
            <main className="pt-20 pb-12">
                <div className="max-w-[1400px] mx-auto px-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="font-heading text-3xl md:text-4xl font-bold text-ss-text">
                                    API Playground
                                </h1>
                                <p className="text-ss-text-tertiary mt-2">
                                    Test every endpoint. No setup required.
                                </p>
                            </div>
                            
                            {/* Mode Toggle */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setMode('demo'); handleDisconnect(); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        mode === 'demo'
                                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                            : 'bg-white text-ss-text-tertiary border border-gray-200 hover:text-ss-text'
                                    }`}
                                >
                                    Demo Mode
                                </button>
                                <button
                                    onClick={() => setMode('live')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        mode === 'live'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'bg-white text-ss-text-tertiary border border-gray-200 hover:text-ss-text'
                                    }`}
                                >
                                    Live Mode
                                </button>
                            </div>
                        </div>
                        
                        {/* API Key Bar */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            {mode === 'live' && !apiKey ? (
                                <div className="flex items-center gap-4">
                                    <Key size={20} className="text-ss-text-tertiary flex-shrink-0" />
                                    <input
                                        type="password"
                                        value={apiKeyInput}
                                        onChange={(e) => setApiKeyInput(e.target.value)}
                                        placeholder="sk_live_... or sk_test_..."
                                        className="flex-1 px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text font-mono text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="api-key-input"
                                    />
                                    <button
                                        onClick={handleConnect}
                                        disabled={connecting || !apiKeyInput}
                                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-lg text-ss-text font-medium text-sm transition-all"
                                        data-testid="connect-btn"
                                    >
                                        {connecting ? 'Connecting...' : 'Connect'}
                                    </button>
                                    <button
                                        onClick={() => setMode('demo')}
                                        className="text-sm text-ss-text-tertiary hover:text-ss-text transition-colors"
                                    >
                                        Use Demo Mode
                                    </button>
                                </div>
                            ) : mode === 'live' && apiKey ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-teal-400" />
                                        <span className="text-teal-400 font-medium">Connected</span>
                                        {connectedOrg && (
                                            <span className="text-ss-text-tertiary">— {connectedOrg.name}</span>
                                        )}
                                        <span className="text-ss-text-tertiary font-mono text-sm">
                                            {apiKey.substring(0, 12)}...
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleDisconnect}
                                        className="text-sm text-ss-text-tertiary hover:text-red-400 transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                                        <span className="text-teal-400 font-medium">Demo Mode</span>
                                        <span className="text-ss-text-tertiary">— Using simulated data</span>
                                    </div>
                                    <button
                                        onClick={() => resetDemoState()}
                                        className="flex items-center gap-2 text-sm text-ss-text-tertiary hover:text-ss-text transition-colors"
                                    >
                                        <RefreshCw size={14} />
                                        Reset Demo Data
                                    </button>
                                </div>
                            )}
                            {connectionError && (
                                <p className="mt-2 text-sm text-red-400">{connectionError}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Main Layout */}
                    <div className="flex gap-6">
                        {/* Left Panel - Endpoint Selector */}
                        <div className="w-[320px] flex-shrink-0 space-y-6">
                            {/* Quick Scenarios */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <Play size={16} className="text-teal-400" />
                                        <h2 className="font-semibold text-ss-text">Quick Scenarios</h2>
                                    </div>
                                </div>
                                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                                    {QUICK_SCENARIOS.map((scenario) => (
                                        <button
                                            key={scenario.id}
                                            onClick={() => selectScenario(scenario)}
                                            className={`w-full px-4 py-3 text-left transition-all ${
                                                selectedScenario?.id === scenario.id
                                                    ? 'bg-teal-500/5 border-l-2 border-teal-500'
                                                    : 'hover:bg-[rgba(255,255,255,0.02)] border-l-2 border-transparent'
                                            }`}
                                            data-testid={`scenario-${scenario.id}`}
                                        >
                                            <p className={`font-medium text-sm ${
                                                selectedScenario?.id === scenario.id ? 'text-teal-400' : 'text-ss-text'
                                            }`}>
                                                {scenario.name}
                                            </p>
                                            <p className="text-xs text-ss-text-tertiary mt-0.5">{scenario.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* All Endpoints */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <h2 className="font-semibold text-ss-text">All Endpoints</h2>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {ALL_ENDPOINTS.map((category) => (
                                        <div key={category.category}>
                                            <button
                                                onClick={() => toggleCategory(category.category)}
                                                className="w-full px-4 py-2 flex items-center justify-between text-sm text-ss-text-tertiary hover:text-ss-text hover:bg-[rgba(255,255,255,0.02)] transition-all"
                                            >
                                                <span>{category.category}</span>
                                                {expandedCategories.includes(category.category) ? (
                                                    <ChevronDown size={14} />
                                                ) : (
                                                    <ChevronRight size={14} />
                                                )}
                                            </button>
                                            {expandedCategories.includes(category.category) && (
                                                <div className="pb-2">
                                                    {category.endpoints.map((endpoint) => {
                                                        const isSelected = selectedEndpoint.method === endpoint.method && selectedEndpoint.path === endpoint.path;
                                                        return (
                                                            <button
                                                                key={`${endpoint.method}-${endpoint.path}`}
                                                                onClick={() => selectEndpoint(endpoint)}
                                                                className={`w-full px-4 py-2 flex items-center gap-2 text-left transition-all ${
                                                                    isSelected
                                                                        ? 'bg-teal-500/5 border-l-2 border-teal-500'
                                                                        : 'hover:bg-[rgba(255,255,255,0.02)] border-l-2 border-transparent'
                                                                }`}
                                                            >
                                                                <MethodBadge method={endpoint.method} />
                                                                <span className="text-xs font-mono text-ss-text-tertiary truncate flex-1">
                                                                    {endpoint.path}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Right Panel - Request/Response */}
                        <div className="flex-1 space-y-6">
                            {/* Scenario Description */}
                            {selectedScenario && (
                                <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
                                    <p className="text-ss-text-tertiary text-sm leading-relaxed">
                                        {selectedScenario.plainEnglish}
                                    </p>
                                </div>
                            )}
                            
                            {/* Request Builder */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* Tabs */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <MethodBadge method={selectedEndpoint.method} />
                                            <span className="font-mono text-sm text-ss-text">{selectedEndpoint.path}</span>
                                        </div>
                                        <div className="flex bg-ss-elevated rounded-lg p-0.5">
                                            <button
                                                onClick={() => setActiveTab('form')}
                                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                                                    activeTab === 'form'
                                                        ? 'bg-gray-100 text-ss-text'
                                                        : 'text-ss-text-tertiary hover:text-ss-text-tertiary'
                                                }`}
                                            >
                                                Form
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('code')}
                                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                                                    activeTab === 'code'
                                                        ? 'bg-gray-100 text-ss-text'
                                                        : 'text-ss-text-tertiary hover:text-ss-text-tertiary'
                                                }`}
                                            >
                                                Code
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSendRequest}
                                        disabled={sending}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-lg text-ss-text font-medium text-sm transition-all"
                                        data-testid="send-request-btn"
                                    >
                                        {sending ? (
                                            <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                Send Request
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                {/* Form Tab */}
                                {activeTab === 'form' && (
                                    <div className="p-4 space-y-4">
                                        {Object.entries(formData).map(([key, value]) => (
                                            <div key={key}>
                                                <label className="block text-sm text-ss-text-tertiary mb-1">
                                                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                    {['escrow_id', 'amount_cents', 'vendor'].includes(key) && (
                                                        <span className="text-teal-400 ml-1">*</span>
                                                    )}
                                                </label>
                                                {typeof value === 'object' ? (
                                                    <textarea
                                                        value={JSON.stringify(value, null, 2)}
                                                        onChange={(e) => {
                                                            try {
                                                                setFormData({ ...formData, [key]: JSON.parse(e.target.value) });
                                                            } catch {}
                                                        }}
                                                        rows={3}
                                                        className="w-full px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text font-mono text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent resize-none"
                                                    />
                                                ) : (
                                                    <input
                                                        type={key.includes('cents') ? 'number' : 'text'}
                                                        value={value}
                                                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                        className="w-full px-4 py-2 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text font-mono text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                                    />
                                                )}
                                                {key === 'amount_cents' && value && (
                                                    <p className="text-xs text-ss-text-tertiary mt-1">
                                                        {value} cents = {formatCents(parseInt(value) || 0)}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                        {Object.keys(formData).length === 0 && (
                                            <p className="text-ss-text-tertiary text-sm text-center py-8">
                                                No parameters required for this endpoint.
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                {/* Code Tab */}
                                {activeTab === 'code' && (
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            {['curl', 'python', 'nodejs'].map((lang) => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setCodeLanguage(lang)}
                                                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                                                        codeLanguage === lang
                                                            ? 'bg-teal-500/20 text-teal-400'
                                                            : 'bg-ss-elevated text-ss-text-tertiary hover:text-ss-text-tertiary'
                                                    }`}
                                                >
                                                    {lang === 'nodejs' ? 'Node.js' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                        <CodeBlock 
                                            code={generateCodeSnippets[codeLanguage]} 
                                            language={codeLanguage} 
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Response Viewer */}
                            {response && (
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                    {/* Response Header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                                        <div className="flex items-center gap-4">
                                            <StatusBadge status={response.status} />
                                            <span className="text-ss-text-tertiary font-mono text-sm">
                                                {response.responseTime}ms
                                            </span>
                                        </div>
                                        <div className="flex bg-ss-elevated rounded-lg p-0.5">
                                            <button
                                                onClick={() => setResponseTab('pretty')}
                                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                                                    responseTab === 'pretty'
                                                        ? 'bg-gray-100 text-ss-text'
                                                        : 'text-ss-text-tertiary hover:text-ss-text-tertiary'
                                                }`}
                                            >
                                                Pretty
                                            </button>
                                            <button
                                                onClick={() => setResponseTab('plain')}
                                                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                                                    responseTab === 'plain'
                                                        ? 'bg-gray-100 text-ss-text'
                                                        : 'text-ss-text-tertiary hover:text-ss-text-tertiary'
                                                }`}
                                            >
                                                Plain English
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Demo Mode Badge */}
                                    {mode === 'demo' && (
                                        <div className="px-4 py-2 bg-teal-500/5 border-b border-teal-500/20">
                                            <p className="text-xs text-teal-400">
                                                🎯 Demo Response — switch to Live Mode to use real data
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Response Body */}
                                    <div className="p-4">
                                        {responseTab === 'pretty' ? (
                                            <pre className="bg-ss-bg rounded-lg p-4 overflow-x-auto text-sm border border-gray-200">
                                                <code className="text-ss-text-tertiary font-mono whitespace-pre">
                                                    {JSON.stringify(response.data, null, 2)}
                                                </code>
                                            </pre>
                                        ) : (
                                            <div className="bg-ss-bg rounded-lg p-4 border border-gray-200">
                                                <pre className="text-ss-text whitespace-pre-wrap text-sm leading-relaxed">
                                                    {response.plainEnglish}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Status Bar */}
                    <div className="mt-6 px-4 py-2 bg-white rounded-lg border border-gray-200 flex items-center justify-between text-xs text-ss-text-tertiary">
                        <div className="flex items-center gap-4">
                            {mode === 'demo' ? (
                                <>
                                    <span>Demo Mode</span>
                                    <span>·</span>
                                    <span>Marketing Budget: {formatCents(currentEscrow?.balance_cents || 0)}</span>
                                    <span>·</span>
                                    <span>{demoState.escrowAccounts.length} protected accounts</span>
                                </>
                            ) : (
                                <>
                                    <span>Live Mode</span>
                                    <span>·</span>
                                    <span>Connected as {connectedOrg?.name || 'Your Organization'}</span>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setShowShortcuts(true)}
                            className="flex items-center gap-1 hover:text-ss-text-tertiary transition-colors"
                        >
                            <Keyboard size={12} />
                            Shortcuts
                        </button>
                    </div>
                </div>
            </main>
            
            {/* Onboarding Overlay */}
            {showOnboarding && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-gray-200 max-w-lg w-full p-6">
                        <h2 className="font-heading text-xl font-bold text-ss-text mb-4">
                            Welcome to the Safe-Spend Playground
                        </h2>
                        <ol className="space-y-3 text-sm text-ss-text-tertiary mb-6">
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                <span>Start with a <strong className="text-ss-text">Quick Scenario</strong> on the left — click one and we'll pre-fill everything.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                <span>Hit <strong className="text-ss-text">"Send Request"</strong> to see how the API responds.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                <span>Switch between <strong className="text-ss-text">"Pretty"</strong> and <strong className="text-ss-text">"Plain English"</strong> tabs to understand the response.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                                <span>When you're ready, connect your own API key to test with real data.</span>
                            </li>
                        </ol>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => dismissOnboarding(true)}
                                className="text-sm text-ss-text-tertiary hover:text-ss-text-tertiary"
                            >
                                Don't show again
                            </button>
                            <button
                                onClick={() => dismissOnboarding(false)}
                                className="px-6 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg text-ss-text font-medium text-sm transition-all"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Shortcuts Modal */}
            {showShortcuts && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
                    <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-ss-text">Keyboard Shortcuts</h3>
                            <button onClick={() => setShowShortcuts(false)} className="text-ss-text-tertiary hover:text-ss-text">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-ss-text-tertiary">Send request</span>
                                <kbd className="px-2 py-1 bg-ss-elevated rounded text-ss-text-tertiary font-mono text-xs">⌘ Enter</kbd>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-ss-text-tertiary">Search endpoints</span>
                                <kbd className="px-2 py-1 bg-ss-elevated rounded text-ss-text-tertiary font-mono text-xs">⌘ K</kbd>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <Footer />
        </div>
    );
};

export default PublicPlaygroundPage;
