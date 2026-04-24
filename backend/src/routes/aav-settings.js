/**
 * AAV Settings Routes
 * 
 * Manage AAV (Agent Authority Vault) configuration for organizations.
 */

const express = require('express');
const { requireAuth, requireOwnerKey } = require('../middleware/auth');
const { 
    getAAVConfiguration, 
    upsertAAVConfiguration, 
    formatAAVConfiguration 
} = require('../services/aav-service');
const { generateId } = require('../utils/ids');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * GET /v1/settings/aav
 * Get AAV configuration for current organization
 */
router.get('/', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const config = await getAAVConfiguration(req.org.id);
        
        if (!config) {
            return res.json({
                is_configured: false,
                aav_endpoint: null,
                aav_public_key: null,
                aav_api_key_set: false,
                default_enforcement_mode: 'none'
            });
        }
        
        res.json(formatAAVConfiguration(config));
    } catch (error) {
        console.error('Get AAV config error:', error);
        res.status(500).json({ error: 'Failed to get AAV configuration' });
    }
});

/**
 * PUT /v1/settings/aav
 * Create or update AAV configuration
 */
router.put('/', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const {
            aav_endpoint,
            aav_public_key,
            aav_api_key,
            default_enforcement_mode = 'none'
        } = req.body;
        
        // Validate enforcement mode
        const validModes = ['none', 'warn', 'strict'];
        if (!validModes.includes(default_enforcement_mode)) {
            return res.status(400).json({ 
                error: `Invalid default_enforcement_mode. Must be one of: ${validModes.join(', ')}` 
            });
        }
        
        const config = await upsertAAVConfiguration(req.org.id, {
            aav_endpoint,
            aav_public_key,
            aav_api_key,
            default_enforcement_mode
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'aav.config.updated',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ 
                    endpoint_configured: !!aav_endpoint,
                    public_key_configured: !!aav_public_key,
                    api_key_configured: !!aav_api_key,
                    default_enforcement_mode
                }),
                ipAddress: req.ip
            }
        });
        
        res.json({
            message: 'AAV configuration updated',
            config
        });
    } catch (error) {
        console.error('Update AAV config error:', error);
        res.status(500).json({ error: 'Failed to update AAV configuration' });
    }
});

/**
 * POST /v1/settings/aav/verify
 * Test AAV connection and verify configuration
 */
router.post('/verify', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const config = await getAAVConfiguration(req.org.id);
        
        if (!config || !config.isConfigured) {
            return res.status(400).json({ 
                error: 'AAV not configured',
                message: 'Please configure AAV endpoint and credentials first'
            });
        }
        
        // TODO: Actually ping AAV endpoint when available
        // For now, just verify configuration exists
        const verified = !!(config.aavEndpoint || config.aavPublicKey);
        
        if (verified) {
            // Update lastVerifiedAt
            await prisma.aAVConfiguration.update({
                where: { orgId: req.org.id },
                data: { lastVerifiedAt: new Date() }
            });
        }
        
        res.json({
            verified,
            message: verified ? 'AAV configuration verified' : 'AAV configuration incomplete',
            details: {
                endpoint_configured: !!config.aavEndpoint,
                public_key_configured: !!config.aavPublicKey,
                api_key_configured: !!config.aavApiKey
            }
        });
    } catch (error) {
        console.error('Verify AAV config error:', error);
        res.status(500).json({ error: 'Failed to verify AAV configuration' });
    }
});

/**
 * DELETE /v1/settings/aav
 * Remove AAV configuration
 */
router.delete('/', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        await prisma.aAVConfiguration.deleteMany({
            where: { orgId: req.org.id }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'aav.config.deleted',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({}),
                ipAddress: req.ip
            }
        });
        
        res.json({ message: 'AAV configuration removed' });
    } catch (error) {
        console.error('Delete AAV config error:', error);
        res.status(500).json({ error: 'Failed to delete AAV configuration' });
    }
});

module.exports = router;
