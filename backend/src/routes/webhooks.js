const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId, generateWebhookSecret } = require('../utils/ids');
const { requireOrgAuth } = require('../middleware/auth');
const { 
    SUPPORTED_EVENTS, 
    validateEventTypes, 
    processPendingDeliveries 
} = require('../services/webhook-service');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/webhooks
 * Create a new webhook
 */
router.post('/', requireOrgAuth, async (req, res) => {
    try {
        const { url, events = [] } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'url is required' });
        }
        
        // Validate URL format
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        // Validate events
        if (!events || events.length === 0) {
            return res.status(400).json({ 
                error: 'events is required and must be a non-empty array',
                supported_events: SUPPORTED_EVENTS
            });
        }
        
        const eventValidation = validateEventTypes(events);
        if (!eventValidation.valid) {
            return res.status(400).json({ 
                error: eventValidation.error,
                supported_events: SUPPORTED_EVENTS
            });
        }
        
        const webhookId = generateId('webhook');
        const secret = generateWebhookSecret();
        
        const webhook = await prisma.webhook.create({
            data: {
                id: webhookId,
                orgId: req.org.id,
                url,
                events: JSON.stringify(events),
                secret
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'webhook.created',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ webhook_id: webhook.id, url, events }),
                ipAddress: req.ip
            }
        });
        
        // Return secret only on creation
        res.status(201).json({
            ...formatWebhook(webhook),
            secret // Only shown once!
        });
    } catch (error) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});

/**
 * GET /v1/webhooks
 * List webhooks
 */
router.get('/', requireOrgAuth, async (req, res) => {
    try {
        const webhooks = await prisma.webhook.findMany({
            where: { orgId: req.org.id },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({
            data: webhooks.map(formatWebhook),
            total: webhooks.length,
            supported_events: SUPPORTED_EVENTS
        });
    } catch (error) {
        console.error('List webhooks error:', error);
        res.status(500).json({ error: 'Failed to list webhooks' });
    }
});

/**
 * GET /v1/webhooks/:id
 * Get webhook details
 */
router.get('/:id', requireOrgAuth, async (req, res) => {
    try {
        const webhook = await prisma.webhook.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        res.json(formatWebhook(webhook));
    } catch (error) {
        console.error('Get webhook error:', error);
        res.status(500).json({ error: 'Failed to get webhook' });
    }
});

/**
 * GET /v1/webhooks/:id/deliveries
 * List recent deliveries for a webhook
 */
router.get('/:id/deliveries', requireOrgAuth, async (req, res) => {
    try {
        const { limit = 50, status } = req.query;
        
        const webhook = await prisma.webhook.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        const where = { webhookId: webhook.id };
        if (status) where.status = status;
        
        const deliveries = await prisma.webhookDelivery.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });
        
        res.json({
            data: deliveries.map(formatDelivery),
            total: deliveries.length
        });
    } catch (error) {
        console.error('List deliveries error:', error);
        res.status(500).json({ error: 'Failed to list deliveries' });
    }
});

/**
 * PATCH /v1/webhooks/:id
 * Update a webhook
 */
router.patch('/:id', requireOrgAuth, async (req, res) => {
    try {
        const webhook = await prisma.webhook.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        const updateData = {};
        
        if (req.body.url !== undefined) {
            try {
                new URL(req.body.url);
                updateData.url = req.body.url;
            } catch {
                return res.status(400).json({ error: 'Invalid URL format' });
            }
        }
        
        if (req.body.events !== undefined) {
            const eventValidation = validateEventTypes(req.body.events);
            if (!eventValidation.valid) {
                return res.status(400).json({ 
                    error: eventValidation.error,
                    supported_events: SUPPORTED_EVENTS
                });
            }
            updateData.events = JSON.stringify(req.body.events);
        }
        
        if (req.body.is_active !== undefined) {
            updateData.isActive = req.body.is_active;
        }
        
        const updated = await prisma.webhook.update({
            where: { id: webhook.id },
            data: updateData
        });
        
        res.json(formatWebhook(updated));
    } catch (error) {
        console.error('Update webhook error:', error);
        res.status(500).json({ error: 'Failed to update webhook' });
    }
});

/**
 * DELETE /v1/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', requireOrgAuth, async (req, res) => {
    try {
        const webhook = await prisma.webhook.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        await prisma.webhook.delete({
            where: { id: webhook.id }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'webhook.deleted',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ webhook_id: webhook.id }),
                ipAddress: req.ip
            }
        });
        
        res.json({ message: 'Webhook deleted' });
    } catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});

/**
 * POST /v1/webhooks/:id/rotate-secret
 * Rotate webhook secret
 */
router.post('/:id/rotate-secret', requireOrgAuth, async (req, res) => {
    try {
        const webhook = await prisma.webhook.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        const newSecret = generateWebhookSecret();
        
        const updated = await prisma.webhook.update({
            where: { id: webhook.id },
            data: { secret: newSecret }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'webhook.secret_rotated',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ webhook_id: webhook.id }),
                ipAddress: req.ip
            }
        });
        
        res.json({
            ...formatWebhook(updated),
            secret: newSecret // Only shown on rotation!
        });
    } catch (error) {
        console.error('Rotate webhook secret error:', error);
        res.status(500).json({ error: 'Failed to rotate secret' });
    }
});

/**
 * POST /v1/webhooks/deliver-pending
 * Maintenance endpoint to trigger webhook delivery processing
 * 
 * In production, this should be called periodically (e.g., every minute via cron)
 */
router.post('/deliver-pending', requireOrgAuth, async (req, res) => {
    try {
        const { limit = 50 } = req.body;
        const results = await processPendingDeliveries(parseInt(limit));
        
        res.json({
            message: 'Webhook delivery processing complete',
            ...results
        });
    } catch (error) {
        console.error('Deliver pending webhooks error:', error);
        res.status(500).json({ error: 'Failed to process pending deliveries' });
    }
});

/**
 * POST /v1/webhooks/:id/test
 * Send a test webhook to verify endpoint
 */
router.post('/:id/test', requireOrgAuth, async (req, res) => {
    try {
        const webhook = await prisma.webhook.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found' });
        }
        
        const { createSignature, buildPayload } = require('../services/webhook-service');
        
        // Build test payload
        const payload = buildPayload('webhook.test', {
            message: 'This is a test webhook from Safe-Spend',
            webhook_id: webhook.id,
            timestamp: new Date().toISOString()
        });
        const payloadJson = JSON.stringify(payload);
        
        // Send test webhook
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = createSignature(payloadJson, webhook.secret, timestamp);
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-SafeSpend-Signature': signature,
                    'X-SafeSpend-Timestamp': timestamp,
                    'X-SafeSpend-Event': 'webhook.test',
                    'User-Agent': 'SafeSpend-Webhook/1.0'
                },
                body: payloadJson,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            res.json({
                success: response.ok,
                status_code: response.status,
                payload_sent: payload
            });
        } catch (fetchError) {
            res.json({
                success: false,
                error: fetchError.message,
                payload_sent: payload
            });
        }
    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ error: 'Failed to test webhook' });
    }
});

/**
 * Format webhook for API response
 */
function formatWebhook(webhook) {
    return {
        id: webhook.id,
        url: webhook.url,
        events: JSON.parse(webhook.events || '[]'),
        is_active: webhook.isActive,
        last_triggered_at: webhook.lastTriggeredAt,
        created_at: webhook.createdAt
    };
}

/**
 * Format delivery for API response
 */
function formatDelivery(delivery) {
    return {
        id: delivery.id,
        event_id: delivery.eventId,
        event_type: delivery.eventType,
        status: delivery.status,
        attempt_count: delivery.attemptCount,
        last_attempt_at: delivery.lastAttemptAt,
        next_attempt_at: delivery.nextAttemptAt,
        error_message: delivery.errorMessage,
        created_at: delivery.createdAt
    };
}

module.exports = router;
