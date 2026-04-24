const express = require('express');
const prisma = require('../lib/prisma');
const { generateId, generateApiKey } = require('../utils/ids');
const { requireOrgAuth } = require('../middleware/auth');
const { trackKeyRevocation } = require('../services/security-alerts');

const router = express.Router();

/**
 * POST /v1/api-keys
 * Create a new API key
 */
router.post('/', requireOrgAuth, async (req, res) => {
    try {
        const { key_type = 'live', label, permissions = [] } = req.body;
        
        // Validate key type
        const validTypes = ['live', 'test', 'agent'];
        if (!validTypes.includes(key_type)) {
            return res.status(400).json({ error: 'Invalid key_type. Must be live, test, or agent' });
        }
        
        // Generate the key
        const { fullKey, keyHash, keyPrefix } = generateApiKey(key_type);
        
        const apiKey = await prisma.apiKey.create({
            data: {
                id: generateId('apiKey'),
                orgId: req.org.id,
                keyHash,
                keyPrefix,
                keyType: key_type,
                label,
                permissions: JSON.stringify(permissions)
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'api_key.created',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({
                    api_key_id: apiKey.id,
                    key_type,
                    label,
                    key_prefix: keyPrefix
                }),
                ipAddress: req.ip
            }
        });
        
        // Return full key only on creation
        res.status(201).json({
            id: apiKey.id,
            key: fullKey, // Only shown once!
            key_prefix: keyPrefix,
            key_type: apiKey.keyType,
            label: apiKey.label,
            permissions: apiKey.permissions,
            is_active: apiKey.isActive,
            created_at: apiKey.createdAt,
            warning: 'Save this key securely. It will not be shown again.'
        });
    } catch (error) {
        console.error('Create API key error:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

/**
 * GET /v1/api-keys
 * List API keys
 */
router.get('/', requireOrgAuth, async (req, res) => {
    try {
        const apiKeys = await prisma.apiKey.findMany({
            where: { orgId: req.org.id },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({
            data: apiKeys.map(formatApiKey),
            total: apiKeys.length
        });
    } catch (error) {
        console.error('List API keys error:', error);
        res.status(500).json({ error: 'Failed to list API keys' });
    }
});

/**
 * GET /v1/api-keys/:id
 * Get API key details
 */
router.get('/:id', requireOrgAuth, async (req, res) => {
    try {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        
        res.json(formatApiKey(apiKey));
    } catch (error) {
        console.error('Get API key error:', error);
        res.status(500).json({ error: 'Failed to get API key' });
    }
});

/**
 * PATCH /v1/api-keys/:id
 * Update an API key
 */
router.patch('/:id', requireOrgAuth, async (req, res) => {
    try {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        
        const updateData = {};
        
        if (req.body.label !== undefined) {
            updateData.label = req.body.label;
        }
        
        if (req.body.permissions !== undefined) {
            updateData.permissions = JSON.stringify(req.body.permissions);
        }
        
        if (req.body.is_active !== undefined) {
            updateData.isActive = req.body.is_active;
        }
        
        const updated = await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: updateData
        });
        
        res.json(formatApiKey(updated));
    } catch (error) {
        console.error('Update API key error:', error);
        res.status(500).json({ error: 'Failed to update API key' });
    }
});

/**
 * DELETE /v1/api-keys/:id
 * Delete (revoke) an API key
 */
router.delete('/:id', requireOrgAuth, async (req, res) => {
    try {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        
        await prisma.apiKey.delete({
            where: { id: apiKey.id }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'api_key.revoked',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({
                    api_key_id: apiKey.id,
                    key_prefix: apiKey.keyPrefix
                }),
                ipAddress: req.ip
            }
        });
        
        // Track key revocation for security alerts
        trackKeyRevocation(
            req.org.id,
            req.org.name,
            apiKey.id,
            apiKey.label,
            req.org.id
        ).catch(() => {}); // Fire and forget
        
        res.json({ message: 'API key revoked' });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});

/**
 * POST /v1/api-keys/:id/deactivate
 * Temporarily deactivate an API key
 */
router.post('/:id/deactivate', requireOrgAuth, async (req, res) => {
    try {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        
        const updated = await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { isActive: false }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'api_key.deactivated',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ api_key_id: apiKey.id }),
                ipAddress: req.ip
            }
        });
        
        res.json(formatApiKey(updated));
    } catch (error) {
        console.error('Deactivate API key error:', error);
        res.status(500).json({ error: 'Failed to deactivate API key' });
    }
});

/**
 * POST /v1/api-keys/:id/reactivate
 * Reactivate a deactivated API key
 */
router.post('/:id/reactivate', requireOrgAuth, async (req, res) => {
    try {
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        
        const updated = await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { isActive: true }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'api_key.reactivated',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ api_key_id: apiKey.id }),
                ipAddress: req.ip
            }
        });
        
        res.json(formatApiKey(updated));
    } catch (error) {
        console.error('Reactivate API key error:', error);
        res.status(500).json({ error: 'Failed to reactivate API key' });
    }
});

/**
 * Format API key for API response
 */
function formatApiKey(key) {
    return {
        id: key.id,
        key_prefix: key.keyPrefix,
        key_type: key.keyType,
        label: key.label,
        permissions: JSON.parse(key.permissions || '[]'),
        is_active: key.isActive,
        last_used_at: key.lastUsedAt,
        created_at: key.createdAt,
        updated_at: key.updatedAt
    };
}

module.exports = router;
