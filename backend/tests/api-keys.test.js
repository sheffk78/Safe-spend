/**
 * API Key Scope Tests
 * 
 * Tests for:
 * - Create / List / Revoke
 * - Agent key for agent-scoped endpoints
 * - Revoked key cannot access
 */

const request = require('supertest');
const { 
    getApp, 
    resetDatabase, 
    createTestOrg, 
    createApiKey,
    createEscrowAccount,
    fundEscrowAccount,
    createPolicy,
    createSpendRequest
} = require('./utils');

describe('API Key Scope', () => {
    let app;
    let testOrg;

    beforeAll(async () => {
        app = getApp();
    });

    beforeEach(async () => {
        await resetDatabase();
        testOrg = await createTestOrg();
    });

    describe('Create / List / Revoke', () => {
        it('should create an API key', async () => {
            const res = await request(app)
                .post('/api/v1/api-keys')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({
                    key_type: 'agent',
                    label: 'My Agent Key',
                    permissions: ['create_spend', 'view_transactions']
                })
                .expect(201);

            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('key');
            expect(res.body.key).toMatch(/^sk_agent_/);
            expect(res.body).toHaveProperty('key_prefix');
            expect(res.body).toHaveProperty('key_type', 'agent');
            expect(res.body).toHaveProperty('label', 'My Agent Key');
            expect(res.body).toHaveProperty('is_active', true);
        });

        it('should list API keys', async () => {
            // Create multiple keys
            await createApiKey(testOrg.token, 'agent', { label: 'Agent 1' });
            await createApiKey(testOrg.token, 'test', { label: 'Test Key' });
            await createApiKey(testOrg.token, 'live', { label: 'Live Key' });

            const res = await request(app)
                .get('/api/v1/api-keys')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveLength(3);
            expect(res.body.data.map(k => k.key_type).sort()).toEqual(['agent', 'live', 'test']);
        });

        it('should revoke an API key', async () => {
            const key = await createApiKey(testOrg.token, 'agent');

            const res = await request(app)
                .delete(`/api/v1/api-keys/${key.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('message');

            // Verify key is gone from list
            const listRes = await request(app)
                .get('/api/v1/api-keys')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(listRes.body.data).toHaveLength(0);
        });

        it('should deactivate and reactivate an API key', async () => {
            const key = await createApiKey(testOrg.token, 'agent');

            // Deactivate
            const deactivateRes = await request(app)
                .post(`/api/v1/api-keys/${key.id}/deactivate`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(deactivateRes.body).toHaveProperty('is_active', false);

            // Reactivate
            const reactivateRes = await request(app)
                .post(`/api/v1/api-keys/${key.id}/reactivate`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(reactivateRes.body).toHaveProperty('is_active', true);
        });
    });

    describe('Agent Key for Agent-Scoped Endpoints', () => {
        let escrow;
        let agentKey;

        beforeEach(async () => {
            escrow = await createEscrowAccount(testOrg.token);
            await fundEscrowAccount(testOrg.token, escrow.id, 500000);
            await createPolicy(testOrg.token, escrow.id, {
                auto_approve_under_cents: 100000,
                require_human_above_cents: 100000
            });
            
            const keyData = await createApiKey(testOrg.token, 'agent', {
                permissions: ['create_spend', 'view_transactions']
            });
            agentKey = keyData.key;
        });

        it('should allow agent key to create spend request', async () => {
            const res = await request(app)
                .post('/api/v1/spend')
                .set('X-API-Key', agentKey)
                .send({
                    escrow_id: escrow.id,
                    amount_cents: 20000,
                    vendor: 'Agent Vendor',
                    category: 'agent_expense'
                })
                .expect(201);

            expect(res.body).toHaveProperty('status', 'approved');
        });

        it('should allow agent key to list spend requests', async () => {
            // Create a spend first
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 20000,
                vendor: 'Test',
                category: 'test'
            });

            // List with agent key
            const res = await request(app)
                .get('/api/v1/spend')
                .set('X-API-Key', agentKey)
                .expect(200);

            expect(res.body).toHaveProperty('data');
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });

        it('should track last_used_at for API key', async () => {
            // Use the key
            await request(app)
                .post('/api/v1/spend')
                .set('X-API-Key', agentKey)
                .send({
                    escrow_id: escrow.id,
                    amount_cents: 20000,
                    vendor: 'Track Usage',
                    category: 'test'
                });

            // List keys to check last_used_at
            const res = await request(app)
                .get('/api/v1/api-keys')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Key prefix format is "sk_agent_xxx..." (first 12 chars + "...")
            const expectedPrefix = agentKey.substring(0, 12) + '...';
            const usedKey = res.body.data.find(k => k.key_prefix === expectedPrefix);
            expect(usedKey).toBeDefined();
            expect(usedKey.last_used_at).not.toBeNull();
        });
    });

    describe('Revoked Key Cannot Access', () => {
        let escrow;
        let agentKey;
        let keyId;

        beforeEach(async () => {
            escrow = await createEscrowAccount(testOrg.token);
            await fundEscrowAccount(testOrg.token, escrow.id, 500000);
            await createPolicy(testOrg.token, escrow.id);
            
            const keyData = await createApiKey(testOrg.token, 'agent');
            agentKey = keyData.key;
            keyId = keyData.id;
        });

        it('should reject revoked API key', async () => {
            // Revoke the key
            await request(app)
                .delete(`/api/v1/api-keys/${keyId}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Try to use the revoked key
            const res = await request(app)
                .post('/api/v1/spend')
                .set('X-API-Key', agentKey)
                .send({
                    escrow_id: escrow.id,
                    amount_cents: 20000,
                    vendor: 'Should Fail',
                    category: 'test'
                })
                .expect(401);

            expect(res.body).toHaveProperty('error');
        });

        it('should reject deactivated API key', async () => {
            // Deactivate the key
            await request(app)
                .post(`/api/v1/api-keys/${keyId}/deactivate`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Try to use the deactivated key
            const res = await request(app)
                .post('/api/v1/spend')
                .set('X-API-Key', agentKey)
                .send({
                    escrow_id: escrow.id,
                    amount_cents: 20000,
                    vendor: 'Should Fail',
                    category: 'test'
                })
                .expect(401);

            expect(res.body).toHaveProperty('error');
        });
    });
});
