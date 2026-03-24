/**
 * Webhook Delivery Tests
 * 
 * Tests for:
 * - Register webhook endpoint
 * - Receive events after spend
 * - Signature verification
 */

const request = require('supertest');
const crypto = require('crypto');
const { 
    getApp, 
    resetDatabase, 
    createTestOrg, 
    createEscrowAccount,
    fundEscrowAccount,
    createPolicy,
    createSpendRequest,
    createWebhook,
    prisma
} = require('./utils');

describe('Webhook Delivery', () => {
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
        await fundEscrowAccount(testOrg.token, escrow.id, 500000);
        await createPolicy(testOrg.token, escrow.id, {
            auto_approve_under_cents: 100000,
            require_human_above_cents: 100000
        });
    });

    describe('Register Webhook Endpoint', () => {
        it('should create a webhook with event subscriptions', async () => {
            const res = await request(app)
                .post('/api/v1/webhooks')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({
                    url: 'https://example.com/webhook',
                    events: ['spend.approved', 'spend.denied', 'approval.requested']
                })
                .expect(201);

            expect(res.body).toHaveProperty('id');
            expect(res.body.id).toMatch(/^whk_/);
            expect(res.body).toHaveProperty('url', 'https://example.com/webhook');
            expect(res.body).toHaveProperty('events');
            expect(res.body.events).toContain('spend.approved');
            expect(res.body).toHaveProperty('secret');
            expect(res.body.secret).toMatch(/^whsec_/);
            expect(res.body).toHaveProperty('is_active', true);
        });

        it('should list webhooks', async () => {
            await createWebhook(testOrg.token, 'https://example1.com/hook', ['spend.approved']);
            await createWebhook(testOrg.token, 'https://example2.com/hook', ['approval.requested']);

            const res = await request(app)
                .get('/api/v1/webhooks')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveLength(2);
        });

        it('should require valid event types', async () => {
            const res = await request(app)
                .post('/api/v1/webhooks')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({
                    url: 'https://example.com/webhook',
                    events: ['invalid.event', 'spend.approved']
                })
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('invalid.event');
        });

        it('should delete a webhook', async () => {
            const webhook = await createWebhook(testOrg.token, 'https://example.com/hook', ['spend.approved']);

            await request(app)
                .delete(`/api/v1/webhooks/${webhook.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            // Verify deleted
            const res = await request(app)
                .get('/api/v1/webhooks')
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body.data).toHaveLength(0);
        });
    });

    describe('Receive Events After Spend', () => {
        let webhook;

        beforeEach(async () => {
            webhook = await createWebhook(
                testOrg.token, 
                'https://httpbin.org/post', 
                ['spend.approved', 'spend.denied', 'approval.requested']
            );
        });

        it('should queue webhook delivery on spend.approved', async () => {
            // Create an auto-approved spend
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 20000, // Auto-approved
                vendor: 'Webhook Test',
                category: 'test'
            });

            // Check webhook deliveries
            const deliveries = await prisma.webhookDelivery.findMany({
                where: { webhookId: webhook.id }
            });

            expect(deliveries.length).toBeGreaterThanOrEqual(1);
            
            const spendDelivery = deliveries.find(d => d.eventType === 'spend.approved');
            expect(spendDelivery).toBeDefined();
            expect(spendDelivery.status).toBe('pending');
            expect(spendDelivery.payload).toContain('spend_request_id');
        });

        it('should queue webhook delivery on approval.requested', async () => {
            // Update policy to require human approval for larger amounts
            await createPolicy(testOrg.token, escrow.id, {
                name: 'Human Approval Policy',
                auto_approve_under_cents: 10000,
                require_human_above_cents: 10000
            });

            // Create a spend requiring approval
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 50000, // Requires approval
                vendor: 'Webhook Test Large',
                category: 'test'
            });

            // Check webhook deliveries
            const deliveries = await prisma.webhookDelivery.findMany({
                where: { webhookId: webhook.id, eventType: 'approval.requested' }
            });

            expect(deliveries.length).toBeGreaterThanOrEqual(1);
            expect(deliveries[0].payload).toContain('approval_id');
        });

        it('should list webhook deliveries via API', async () => {
            // Create a spend
            await createSpendRequest(testOrg.token, {
                escrow_id: escrow.id,
                amount_cents: 20000,
                vendor: 'Delivery List Test',
                category: 'test'
            });

            // Get deliveries via API
            const res = await request(app)
                .get(`/api/v1/webhooks/${webhook.id}/deliveries`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('data');
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data[0]).toHaveProperty('event_type');
            expect(res.body.data[0]).toHaveProperty('status');
        });
    });

    describe('Signature Verification', () => {
        it('should create valid HMAC-SHA256 signature', async () => {
            const webhook = await createWebhook(
                testOrg.token, 
                'https://httpbin.org/post', 
                ['spend.approved']
            );

            // Import signature helper
            const { createSignature, verifySignature } = require('../src/services/webhook-service');

            // Test payload
            const payload = JSON.stringify({
                id: 'evt_test123',
                type: 'spend.approved',
                data: { amount: 100 }
            });
            const timestamp = Math.floor(Date.now() / 1000).toString();

            // Create signature
            const signature = createSignature(payload, webhook.secret, timestamp);
            expect(signature).toBeTruthy();
            expect(signature).toHaveLength(64); // SHA256 hex

            // Verify signature
            const isValid = verifySignature(payload, signature, webhook.secret, timestamp);
            expect(isValid).toBe(true);
        });

        it('should reject tampered payload', () => {
            const { createSignature, verifySignature } = require('../src/services/webhook-service');

            const secret = 'whsec_testsecret';
            const payload = JSON.stringify({ test: 'data' });
            const timestamp = Math.floor(Date.now() / 1000).toString();

            // Create signature
            const signature = createSignature(payload, secret, timestamp);

            // Tamper with payload
            const tamperedPayload = JSON.stringify({ test: 'tampered' });
            const isValid = verifySignature(tamperedPayload, signature, secret, timestamp);
            expect(isValid).toBe(false);
        });

        it('should reject old timestamps', () => {
            const { createSignature, verifySignature } = require('../src/services/webhook-service');

            const secret = 'whsec_testsecret';
            const payload = JSON.stringify({ test: 'data' });
            const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 minutes ago

            // Create signature with old timestamp
            const signature = createSignature(payload, secret, oldTimestamp);

            // Should reject (default tolerance is 5 minutes)
            const isValid = verifySignature(payload, signature, secret, oldTimestamp);
            expect(isValid).toBe(false);
        });
    });

    describe('Webhook Management', () => {
        let webhook;

        beforeEach(async () => {
            webhook = await createWebhook(
                testOrg.token, 
                'https://example.com/hook', 
                ['spend.approved']
            );
        });

        it('should toggle webhook active status', async () => {
            // Deactivate
            const deactivateRes = await request(app)
                .patch(`/api/v1/webhooks/${webhook.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({ is_active: false })
                .expect(200);

            expect(deactivateRes.body).toHaveProperty('is_active', false);

            // Reactivate
            const activateRes = await request(app)
                .patch(`/api/v1/webhooks/${webhook.id}`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .send({ is_active: true })
                .expect(200);

            expect(activateRes.body).toHaveProperty('is_active', true);
        });

        it('should rotate webhook secret', async () => {
            const oldSecret = webhook.secret;

            const res = await request(app)
                .post(`/api/v1/webhooks/${webhook.id}/rotate-secret`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('secret');
            expect(res.body.secret).not.toBe(oldSecret);
            expect(res.body.secret).toMatch(/^whsec_/);
        });

        it('should test webhook endpoint', async () => {
            const res = await request(app)
                .post(`/api/v1/webhooks/${webhook.id}/test`)
                .set('Authorization', `Bearer ${testOrg.token}`)
                .expect(200);

            expect(res.body).toHaveProperty('success');
            expect(res.body).toHaveProperty('payload_sent');
            expect(res.body.payload_sent).toHaveProperty('type', 'webhook.test');
        });
    });
});
