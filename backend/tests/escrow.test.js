/**
 * Escrow Account Lifecycle Tests
 * 
 * Tests for:
 * - Create + Fund
 * - Pause / Resume
 * - Close (no more spends)
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

describe('Escrow Account Lifecycle', () => {
    let app;
    let testOrg;

    beforeAll(async () => {
        app = getApp();
    });

    beforeEach(async () => {
        await resetDatabase();
        testOrg = await createTestOrg();
    });

    describe('Create + Fund', () => {
        it('should create an escrow account with zero balance', async () => {
            const res = await request(app)
                .post('/api/v1/escrow-accounts')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({
                    name: 'Marketing Budget',
                    description: 'Monthly marketing allocation'
                })
                .expect(201);

            expect(res.body).toHaveProperty('id');
            expect(res.body.id).toMatch(/^esc_/);
            expect(res.body).toHaveProperty('name', 'Marketing Budget');
            expect(res.body).toHaveProperty('balance_cents', 0);
            expect(res.body).toHaveProperty('status', 'active');
        });

        it('should fund an escrow account', async () => {
            // Create account
            const escrow = await createEscrowAccount(testOrg.token, { name: 'Fund Test' });
            
            // Fund it
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/fund`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({ amount_cents: 100000 })
                .expect(200);

            expect(res.body).toHaveProperty('message', 'Account funded successfully');
            expect(res.body.escrow).toHaveProperty('balance_cents', 100000);
            expect(res.body.escrow).toHaveProperty('total_funded_cents', 100000);
        });

        it('should accumulate multiple fundings', async () => {
            const escrow = await createEscrowAccount(testOrg.token);
            
            // First funding
            await fundEscrowAccount(testOrg.token, escrow.id, 50000);
            
            // Second funding
            const res = await fundEscrowAccount(testOrg.token, escrow.id, 30000);

            expect(res.escrow.balance_cents).toBe(80000);
            expect(res.escrow.total_funded_cents).toBe(80000);
        });

        it('should list all escrow accounts', async () => {
            // Create multiple accounts
            await createEscrowAccount(testOrg.token, { name: 'Account 1' });
            await createEscrowAccount(testOrg.token, { name: 'Account 2' });

            const res = await request(app)
                .get('/api/v1/escrow-accounts')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveLength(2);
            expect(res.body).toHaveProperty('total', 2);
        });
    });

    describe('Pause / Resume', () => {
        let escrow;

        beforeEach(async () => {
            escrow = await createEscrowAccount(testOrg.token);
            await fundEscrowAccount(testOrg.token, escrow.id, 100000);
            await createPolicy(testOrg.token, escrow.id);
        });

        it('should pause an active escrow account', async () => {
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/pause`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('status', 'paused');
        });

        it('should reject spends when escrow is paused', async () => {
            // Pause the account
            await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/pause`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Try to spend
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 10000,
                vendor: 'Test Vendor',
                category: 'test'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('error');
            expect(response.error.toLowerCase()).toContain('paused');
        });

        it('should resume a paused escrow account', async () => {
            // Pause
            await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/pause`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Resume
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/resume`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('status', 'active');
        });

        it('should allow spends after resume', async () => {
            // Pause then resume
            await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/pause`)
                .set('Authorization', `Bearer ${testOrg.token}`);
            
            await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/resume`)
                .set('Authorization', `Bearer ${testOrg.token}`);

            // Spend should work now
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 10000,
                vendor: 'Test Vendor',
                category: 'test'
            });

            expect(status).toBe(201);
            expect(response).toHaveProperty('status', 'approved');
        });
    });

    describe('Close (no more spends)', () => {
        let escrow;

        beforeEach(async () => {
            escrow = await createEscrowAccount(testOrg.token);
            await fundEscrowAccount(testOrg.token, escrow.id, 100000);
            await createPolicy(testOrg.token, escrow.id);
        });

        it('should close an escrow account', async () => {
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/close`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('status', 'closed');
        });

        it('should reject spends on closed account', async () => {
            // Close the account
            await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/close`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Try to spend
            const { status, response } = await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 10000,
                vendor: 'Test Vendor',
                category: 'test'
            });

            expect(status).toBe(400);
            expect(response).toHaveProperty('error');
            expect(response.error.toLowerCase()).toContain('closed');
        });

        it('should not allow resume on closed account', async () => {
            // Close
            await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/close`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Try to resume
            const res = await request(app)
                .post(`/api/v1/escrow-accounts/${escrow.id}/resume`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(400);

            expect(res.body).toHaveProperty('error');
        });
    });
});
