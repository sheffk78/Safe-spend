/**
 * Multi-Tenant Isolation Tests
 * Safe-Spend Production Hardening
 * 
 * Verifies that organizations cannot access each other's resources.
 */

const request = require('supertest');
const app = require('../src/server');
const { PrismaClient } = require('@prisma/client');
const { createTestOrg, createEscrowAccount, createPolicy, createSpendRequest, createApproval } = require('./utils');

const prisma = new PrismaClient();

describe('Multi-Tenant Isolation', () => {
    let orgA, orgB;
    let escrowA, escrowB;
    let approvalA;

    beforeAll(async () => {
        await prisma.$connect();
        
        // Create two separate organizations
        orgA = await createTestOrg({ 
            email: 'org-a@test.com', 
            name: 'Organization A' 
        });
        
        orgB = await createTestOrg({ 
            email: 'org-b@test.com', 
            name: 'Organization B' 
        });

        // Create escrow accounts for each org
        escrowA = await createEscrowAccount(orgA.token, {
            name: 'Org A Escrow',
            description: 'Escrow for Organization A'
        });

        escrowB = await createEscrowAccount(orgB.token, {
            name: 'Org B Escrow',
            description: 'Escrow for Organization B'
        });

        // Fund Org A's escrow
        await request(app)
            .post(`/api/v1/escrow-accounts/${escrowA.id}/fund`)
            .set('Authorization', `Bearer ${orgA.token}`)
            .send({ amount_cents: 100000 });

        // Create a policy for Org A with approval required
        await request(app)
            .post('/api/v1/policies')
            .set('Authorization', `Bearer ${orgA.token}`)
            .send({
                escrow_id: escrowA.id,
                name: 'Test Policy with Approval',
                per_transaction_limit_cents: 100000,
                require_human_above_cents: 1000, // Require approval above $10
            })
            .expect(201);

        // Create a spend request that requires approval for Org A
        const spendResult = await request(app)
            .post('/api/v1/spend')
            .set('Authorization', `Bearer ${orgA.token}`)
            .send({
                escrow_id: escrowA.id,
                amount_cents: 5000, // $50 - requires approval
                vendor: 'Test Vendor',
                category: 'test'
            });

        // Get the approval ID from Org A
        const approvals = await request(app)
            .get('/api/v1/approvals')
            .set('Authorization', `Bearer ${orgA.token}`);
        
        if (approvals.body.data && approvals.body.data.length > 0) {
            approvalA = approvals.body.data[0];
        }
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('Escrow Account Isolation', () => {
        it('Org A cannot read Org B escrow accounts', async () => {
            // Try to get Org B's escrow with Org A's token
            const res = await request(app)
                .get(`/api/v1/escrow-accounts/${escrowB.id}`)
                .set('Authorization', `Bearer ${orgA.token}`)
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org B cannot read Org A escrow accounts', async () => {
            // Try to get Org A's escrow with Org B's token
            const res = await request(app)
                .get(`/api/v1/escrow-accounts/${escrowA.id}`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org A cannot fund Org B escrow accounts', async () => {
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrowB.id}/fund`)
                .set('Authorization', `Bearer ${orgA.token}`)
                .send({ amount_cents: 10000 })
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org B cannot pause Org A escrow accounts', async () => {
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrowA.id}/pause`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org list only returns own escrow accounts', async () => {
            // Org A should only see their escrows
            const resA = await request(app)
                .get('/api/v1/escrow-accounts')
                .set('Authorization', `Bearer ${orgA.token}`)
                .expect(200);

            const escrowIdsA = resA.body.data.map(e => e.id);
            expect(escrowIdsA).toContain(escrowA.id);
            expect(escrowIdsA).not.toContain(escrowB.id);

            // Org B should only see their escrows
            const resB = await request(app)
                .get('/api/v1/escrow-accounts')
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(200);

            const escrowIdsB = resB.body.data.map(e => e.id);
            expect(escrowIdsB).toContain(escrowB.id);
            expect(escrowIdsB).not.toContain(escrowA.id);
        });
    });

    describe('Approval Isolation', () => {
        it('Org B cannot approve Org A pending approvals', async () => {
            if (!approvalA) {
                console.log('Skipping: No pending approval found for Org A');
                return;
            }

            // Try to approve Org A's approval with Org B's token
            const res = await request(app)
                .post(`/api/v1/approvals/${approvalA.id}/approve`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .send({ note: 'Trying to approve from wrong org' })
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org B cannot deny Org A pending approvals', async () => {
            if (!approvalA) {
                console.log('Skipping: No pending approval found for Org A');
                return;
            }

            // Try to deny Org A's approval with Org B's token
            const res = await request(app)
                .post(`/api/v1/approvals/${approvalA.id}/deny`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .send({ reason: 'Trying to deny from wrong org' })
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org B cannot view Org A approval details', async () => {
            if (!approvalA) {
                console.log('Skipping: No pending approval found for Org A');
                return;
            }

            // Try to view Org A's approval with Org B's token
            const res = await request(app)
                .get(`/api/v1/approvals/${approvalA.id}`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Approval list only returns own approvals', async () => {
            // Org B should not see Org A's approvals
            const res = await request(app)
                .get('/api/v1/approvals')
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(200);

            // If there are approvals, none should belong to Org A
            if (res.body.data && res.body.data.length > 0) {
                const approvalIds = res.body.data.map(a => a.id);
                if (approvalA) {
                    expect(approvalIds).not.toContain(approvalA.id);
                }
            }
        });
    });

    describe('API Key Isolation', () => {
        it('API keys cannot be used across organizations', async () => {
            // Create an API key for Org A
            const keyRes = await request(app)
                .post('/api/v1/api-keys')
                .set('Authorization', `Bearer ${orgA.token}`)
                .send({ key_type: 'test', name: 'Cross-org test key' })
                .expect(201);

            const orgAKey = keyRes.body.key;

            // Try to access Org B's escrow with Org A's API key
            const res = await request(app)
                .get(`/api/v1/escrow-accounts/${escrowB.id}`)
                .set('X-API-Key', orgAKey)
                .expect(404);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('Policy Isolation', () => {
        it('Org B cannot view Org A policies', async () => {
            // Create a policy for Org A
            const policyRes = await request(app)
                .post('/api/v1/policies')
                .set('Authorization', `Bearer ${orgA.token}`)
                .send({
                    escrow_id: escrowA.id,
                    name: 'Isolated Policy',
                    per_transaction_limit_cents: 50000,
                })
                .expect(201);

            const policyA = policyRes.body;

            // Try to view with Org B's token
            const res = await request(app)
                .get(`/api/v1/policies/${policyA.id}`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(404);

            expect(res.body.error).toBeDefined();
        });

        it('Org B cannot modify Org A policies', async () => {
            // Get Org A's policies
            const policiesRes = await request(app)
                .get('/api/v1/policies')
                .set('Authorization', `Bearer ${orgA.token}`)
                .expect(200);

            if (policiesRes.body.data.length === 0) {
                console.log('Skipping: No policies found for Org A');
                return;
            }

            const policyA = policiesRes.body.data[0];

            // Try to update with Org B's token
            const res = await request(app)
                .patch(`/api/v1/policies/${policyA.id}`)
                .set('Authorization', `Bearer ${orgB.token}`)
                .send({ name: 'Hacked Policy' })
                .expect(404);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('Spend Request Isolation', () => {
        it('Org B cannot spend from Org A escrow', async () => {
            const res = await request(app)
                .post('/api/v1/spend')
                .set('Authorization', `Bearer ${orgB.token}`)
                .send({
                    escrow_id: escrowA.id, // Trying to spend from Org A's escrow
                    amount_cents: 1000,
                    vendor: 'Malicious Vendor',
                })
                .expect(404);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('Audit Log Isolation', () => {
        it('Org list only returns own audit events', async () => {
            // Get audit events for Org A
            const resA = await request(app)
                .get('/api/v1/audit')
                .set('Authorization', `Bearer ${orgA.token}`)
                .expect(200);

            // Get audit events for Org B
            const resB = await request(app)
                .get('/api/v1/audit')
                .set('Authorization', `Bearer ${orgB.token}`)
                .expect(200);

            // Verify events are org-scoped (no overlap in escrow IDs)
            const escrowIdsA = new Set(resA.body.data.filter(e => e.escrow_id).map(e => e.escrow_id));
            const escrowIdsB = new Set(resB.body.data.filter(e => e.escrow_id).map(e => e.escrow_id));

            // Check that Org A events don't reference Org B's escrow and vice versa
            expect(escrowIdsA.has(escrowB.id)).toBe(false);
            expect(escrowIdsB.has(escrowA.id)).toBe(false);
        });
    });
});
