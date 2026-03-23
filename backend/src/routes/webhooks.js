const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId, generateWebhookSecret } = require('../utils/ids');
const { requireOrgAuth } = require('../middleware/auth');

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
                details: JSON.stringify({ webhook_id: webhook.id, url }),
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
            total: webhooks.length
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

module.exports = router;
