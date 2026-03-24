/**
 * Spend + Approval Lifecycle Tests
 * 
 * Tests for:
 * - Small auto-approved spend
 * - Large spend → human approval → approved
 * - Large spend → human approval → denied
 * - Expired approval
 * - Idempotency
 */

const request = require('supertest');
const { 
    getApp, 
    resetDatabase, 
    createTestOrg, 
    createEscrowAccount,
    fundEscrowAccount,
    createPolicy,
    createSpendRequest,
    getApproval,
    approveApproval,
    denyApproval,
    updateApprovalDirect,
    expireStaleApprovals
} = require('./utils');

describe('Spend + Approval Lifecycle', () => {
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

    describe('Small Auto-Approved Spend', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Auto-Approve Policy',
                auto_approve_under_cents: 50000, // Auto-approve under $500
                require_human_above_cents: 50000
            });
        });

        it('should auto-approve small spend', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000, // $300 < $500 threshold
                vendor: 'Small Vendor',
                category: 'test'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
            expect(response).not.toHaveProperty('approval_id');
            expect(response).toHaveProperty('remaining_balance_cents', 970000);
        });

        it('should deduct balance on auto-approve', async () => {
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Test Vendor',
                category: 'test'
            });

            // Check escrow balance
            const res = await request(app)
                .get(`/api/v1/escrow-accounts/${escrow.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body.balance_cents).toBe(970000);
            expect(res.body.total_spent_cents).toBe(30000);
        });
    });

    describe('Large Spend → Human Approval → Approved', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Human Approval Policy',
                auto_approve_under_cents: 50000,
                require_human_above_cents: 50000,
                approval_timeout_minutes: 60
            });
        });

        it('should create pending approval for large spend', async () => {
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000, // $750, above $500 threshold
                vendor: 'Large Vendor',
                category: 'test'
            });

            expect(status).toBe(202); // Accepted but pending
            expect(response).toHaveProperty('status', 'pending');
            expect(response).toHaveProperty('approval_id');
            expect(response.approval_id).toMatch(/^apr_/);
            expect(response).toHaveProperty('approval_expires_at');
        });

        it('should NOT deduct balance for pending spend', async () => {
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000,
                vendor: 'Large Vendor',
                category: 'test'
            });

            // Balance should be unchanged
            const res = await request(app)
                .get(`/api/v1/escrow-accounts/${escrow.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body.balance_cents).toBe(1000000);
        });

        it('should approve pending spend and deduct balance', async () => {
            // Create pending spend
            const { response: spendRes } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000,
                vendor: 'Large Vendor',
                category: 'test'
            });

            const approvalId = spendRes.approval_id;

            // Approve it
            const { status, response } = await approveApproval(testOrg.token, approvalId);

            expect(status).toBe(200);
            expect(response).toHaveProperty('status', 'approved');
            expect(response).toHaveProperty('remaining_balance_cents', 925000);

            // Check escrow balance
            const escrowRes = await request(app)
                .get(`/api/v1/escrow-accounts/${escrow.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(escrowRes.body.balance_cents).toBe(925000);
        });
    });

    describe('Large Spend → Human Approval → Denied', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Human Approval Policy',
                auto_approve_under_cents: 50000,
                require_human_above_cents: 50000
            });
        });

        it('should deny pending spend without deducting balance', async () => {
            // Create pending spend
            const { response: spendRes } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000,
                vendor: 'Suspicious Vendor',
                category: 'test'
            });

            const approvalId = spendRes.approval_id;

            // Deny it
            const { status, response } = await denyApproval(
                testOrg.token, 
                approvalId, 
                'suspicious_activity',
                'This vendor looks suspicious'
            );

            expect(status).toBe(200);
            expect(response).toHaveProperty('status', 'denied');
            expect(response).toHaveProperty('denial_reason', 'suspicious_activity');

            // Balance should be unchanged
            const escrowRes = await request(app)
                .get(`/api/v1/escrow-accounts/${escrow.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(escrowRes.body.balance_cents).toBe(1000000);
        });

        it('should not allow double-deny', async () => {
            // Create and deny
            const { response: spendRes } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000,
                vendor: 'Test Vendor',
                category: 'test'
            });

            await denyApproval(testOrg.token, spendRes.approval_id, 'human_denied');

            // Try to deny again
            const { status, response } = await denyApproval(
                testOrg.token, 
                spendRes.approval_id, 
                'human_denied'
            );

            expect(status).toBe(400);
            expect(response).toHaveProperty('error');
        });
    });

    describe('Expired Approval', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Quick Expiry Policy',
                auto_approve_under_cents: 50000,
                require_human_above_cents: 50000,
                approval_timeout_minutes: 1
            });
        });

        it('should not allow approval of expired request', async () => {
            // Create pending spend
            const { response: spendRes } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000,
                vendor: 'Slow Decision',
                category: 'test'
            });

            // Manually expire the approval
            await updateApprovalDirect(spendRes.approval_id, {
                expiresAt: new Date(Date.now() - 1000) // 1 second ago
            });

            // Try to approve
            const { status, response } = await approveApproval(testOrg.token, spendRes.approval_id);

            expect(status).toBe(400);
            expect(response.error).toMatch(/expired/i);
        });

        it('should mark expired approvals via expire-stale endpoint', async () => {
            // Create pending spend
            const { response: spendRes } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 75000,
                vendor: 'Will Expire',
                category: 'test'
            });

            // Manually expire the approval
            await updateApprovalDirect(spendRes.approval_id, {
                expiresAt: new Date(Date.now() - 1000)
            });

            // Run expire-stale
            const { status, response } = await expireStaleApprovals(testOrg.token);

            expect(status).toBe(200);
            expect(response.expired_count).toBe(1);

            // Check approval status
            const approval = await getApproval(testOrg.token, spendRes.approval_id);
            expect(approval.status).toBe('expired');
        });
    });

    describe('Idempotency', () => {
        beforeEach(async () => {
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Idempotency Test Policy',
                auto_approve_under_cents: 100000,
                require_human_above_cents: 100000
            });
        });

        it('should return same result for duplicate idempotency key', async () => {
            const idempotencyKey = `test-idem-${Date.now()}`;

            // First request
            const { status: s1, response: r1 } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Idem Vendor',
                category: 'test',
                idempotency_key: idempotencyKey
            });

            expect(s1).toBe(201);
            expect(r1.status).toBe('approved');

            // Second request with same key - should return same result
            const { status: s2, response: r2 } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Idem Vendor',
                category: 'test',
                idempotency_key: idempotencyKey
            });

            // Returns 200 with the same record
            expect(s2).toBe(200);
            expect(r2.id).toBe(r1.id);
            expect(r2.status).toBe('approved'); // Same status as original
        });

        it('should only deduct balance once for idempotent requests', async () => {
            const idempotencyKey = `balance-idem-${Date.now()}`;

            // Request twice
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Idem Vendor',
                category: 'test',
                idempotency_key: idempotencyKey
            });

            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 30000,
                vendor: 'Idem Vendor',
                category: 'test',
                idempotency_key: idempotencyKey
            });

            // Balance should only be deducted once
            const res = await request(app)
                .get(`/api/v1/escrow-accounts/${escrow.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body.balance_cents).toBe(970000);
        });
    });
});
