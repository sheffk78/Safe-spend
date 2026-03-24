/**
 * Safe-Spend Test Utilities
 * 
 * Provides helpers for creating test data and managing test state.
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get the Express app for testing
let app;
const getApp = () => {
    if (!app) {
        app = require('../src/server');
    }
    return app;
};

/**
 * Reset database - truncate all tables
 * Call this between test suites to ensure clean state
 */
const resetDatabase = async () => {
    // Delete in order to respect foreign keys
    await prisma.webhookDelivery.deleteMany({});
    await prisma.webhook.deleteMany({});
    await prisma.auditEvent.deleteMany({});
    await prisma.approval.deleteMany({});
    await prisma.spendRequest.deleteMany({});
    await prisma.dailySpendTracking.deleteMany({});
    await prisma.weeklySpendTracking.deleteMany({});
    await prisma.monthlySpendTracking.deleteMany({});
    await prisma.spendingPolicy.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.escrowAccount.deleteMany({});
    await prisma.organization.deleteMany({});
};

/**
 * Create a test organization via signup endpoint
 * 
 * @param {Object} overrides - Override default values
 * @returns {Object} { token, org, email, password }
 */
const createTestOrg = async (overrides = {}) => {
    const timestamp = Date.now();
    const defaultData = {
        email: `test-${timestamp}@example.com`,
        password: 'TestPassword123!',
        name: `Test Org ${timestamp}`
    };
    
    const data = { ...defaultData, ...overrides };
    
    const res = await request(getApp())
        .post('/api/v1/auth/signup')
        .send(data)
        .expect(201);
    
    return {
        token: res.body.token,
        org: res.body.organization,
        email: data.email,
        password: data.password
    };
};

/**
 * Login with existing credentials
 * 
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} { token, org }
 */
const loginTestOrg = async (email, password) => {
    const res = await request(getApp())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
    
    return {
        token: res.body.token,
        org: res.body.organization
    };
};

/**
 * Create an API key for the organization
 * 
 * @param {string} token - JWT token
 * @param {string} keyType - 'live', 'test', or 'agent'
 * @param {Object} options - Additional options like label, permissions
 * @returns {Object} API key data with full key visible
 */
const createApiKey = async (token, keyType = 'agent', options = {}) => {
    const res = await request(getApp())
        .post('/api/v1/api-keys')
        .set('Authorization', `Bearer ${token}`)
        .send({
            key_type: keyType,
            label: options.label || `Test ${keyType} key`,
            permissions: options.permissions || ['create_spend', 'view_transactions']
        })
        .expect(201);
    
    return res.body;
};

/**
 * Create an escrow account
 * 
 * @param {string} token - JWT token
 * @param {Object} options - name, description
 * @returns {Object} Escrow account data
 */
const createEscrowAccount = async (token, options = {}) => {
    const timestamp = Date.now();
    const res = await request(getApp())
        .post('/api/v1/escrow-accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: options.name || `Test Escrow ${timestamp}`,
            description: options.description || 'Test escrow account'
        })
        .expect(201);
    
    return res.body;
};

/**
 * Fund an escrow account
 * 
 * @param {string} token - JWT token
 * @param {string} escrowId - Escrow account ID
 * @param {number} amountCents - Amount in cents to add
 * @returns {Object} Updated escrow data
 */
const fundEscrowAccount = async (token, escrowId, amountCents) => {
    const res = await request(getApp())
        .post(`/api/v1/escrow-accounts/${escrowId}/fund`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount_cents: amountCents })
        .expect(200);
    
    return res.body;
};

/**
 * Create a spending policy
 * 
 * @param {string} token - JWT token
 * @param {string} escrowId - Escrow account ID
 * @param {Object} overrides - Policy field overrides
 * @returns {Object} Policy data
 */
const createPolicy = async (token, escrowId, overrides = {}) => {
    const defaultPolicy = {
        escrow_id: escrowId,
        name: `Test Policy ${Date.now()}`,
        is_active: true,
        per_transaction_limit_cents: 100000,
        daily_limit_cents: 500000,
        weekly_limit_cents: 2000000,
        monthly_limit_cents: 5000000,
        allowed_vendors: [],
        blocked_vendors: [],
        vendor_match_mode: 'contains',
        allowed_categories: [],
        blocked_categories: [],
        active_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        active_hours_start: null,
        active_hours_end: null,
        active_timezone: 'UTC',
        auto_approve_under_cents: 50000,
        require_human_above_cents: 50000,
        approval_timeout_minutes: 60
    };
    
    const policyData = { ...defaultPolicy, ...overrides };
    
    const res = await request(getApp())
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${token}`)
        .send(policyData)
        .expect(201);
    
    return res.body;
};

/**
 * Create a spend request
 * 
 * @param {string} authToken - JWT or API key
 * @param {Object} spendData - Spend request data
 * @param {boolean} isApiKey - Whether authToken is an API key
 * @returns {Object} { response, status }
 */
const createSpendRequest = async (authToken, spendData, isApiKey = false) => {
    const req = request(getApp())
        .post('/api/v1/spend');
    
    if (isApiKey) {
        req.set('X-API-Key', authToken);
    } else {
        req.set('Authorization', `Bearer ${authToken}`);
    }
    
    const res = await req.send(spendData);
    
    return {
        response: res.body,
        status: res.status
    };
};

/**
 * Create a webhook
 * 
 * @param {string} token - JWT token
 * @param {string} url - Webhook URL
 * @param {Array} events - Event types to subscribe to
 * @returns {Object} Webhook data with secret
 */
const createWebhook = async (token, url, events) => {
    const res = await request(getApp())
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${token}`)
        .send({ url, events })
        .expect(201);
    
    return res.body;
};

/**
 * Get approval by ID
 * 
 * @param {string} token - JWT token
 * @param {string} approvalId - Approval ID
 * @returns {Object} Approval data
 */
const getApproval = async (token, approvalId) => {
    const res = await request(getApp())
        .get(`/api/v1/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    
    return res.body;
};

/**
 * Approve an approval
 * 
 * @param {string} token - JWT token
 * @param {string} approvalId - Approval ID
 * @param {string} note - Optional note
 * @returns {Object} Result
 */
const approveApproval = async (token, approvalId, note = null) => {
    const res = await request(getApp())
        .post(`/api/v1/approvals/${approvalId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ note });
    
    return { response: res.body, status: res.status };
};

/**
 * Deny an approval
 * 
 * @param {string} token - JWT token
 * @param {string} approvalId - Approval ID
 * @param {string} reason - Denial reason
 * @param {string} note - Optional note
 * @returns {Object} Result
 */
const denyApproval = async (token, approvalId, reason = 'human_denied', note = null) => {
    const res = await request(getApp())
        .post(`/api/v1/approvals/${approvalId}/deny`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason, note });
    
    return { response: res.body, status: res.status };
};

/**
 * Update approval directly in database (for testing expiration)
 * 
 * @param {string} approvalId - Approval ID
 * @param {Object} updates - Fields to update
 */
const updateApprovalDirect = async (approvalId, updates) => {
    await prisma.approval.update({
        where: { id: approvalId },
        data: updates
    });
};

/**
 * Trigger stale approval expiration
 * 
 * @param {string} token - JWT token
 * @returns {Object} Result
 */
const expireStaleApprovals = async (token) => {
    const res = await request(getApp())
        .post('/api/v1/approvals/expire-stale')
        .set('Authorization', `Bearer ${token}`);
    
    return { response: res.body, status: res.status };
};

module.exports = {
    getApp,
    prisma,
    resetDatabase,
    createTestOrg,
    loginTestOrg,
    createApiKey,
    createEscrowAccount,
    fundEscrowAccount,
    createPolicy,
    createSpendRequest,
    createWebhook,
    getApproval,
    approveApproval,
    denyApproval,
    updateApprovalDirect,
    expireStaleApprovals
};
