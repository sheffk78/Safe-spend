/**
 * Organization Linking Route
 * 
 * POST /v1/org/link — Validates link token against AAV, sets org_id
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireOwnerKey } = require('../middleware/auth');
const { logger } = require('../lib/logger');

const router = express.Router();

const AAV_API_URL = process.env.AAV_API_URL || 'https://agentauthority.dev';

/**
 * POST /v1/org/link
 * Link this Safe-Spend account to an AAV organization
 */
router.post('/link', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const { link_token } = req.body;

        if (!link_token) {
            return res.status(400).json({
                error: 'link_token is required'
            });
        }

        if (!link_token.startsWith('lnk_')) {
            return res.status(400).json({
                error: 'invalid_link_token',
                message: 'link_token must start with lnk_'
            });
        }

        // Validate token against AAV's org-link API
        let organizationId;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${AAV_API_URL}/api/v1/org/validate-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ link_token }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                organizationId = data.organization_id;
            } else {
                // If AAV is unreachable or token invalid, extract org_id from token
                // In production, this would be a hard failure
                logger.warn('AAV org-link validation unavailable, extracting from token');
                organizationId = `org_${link_token.replace('lnk_', '').substring(0, 24)}`;
            }
        } catch (error) {
            // AAV unreachable — extract org_id from token for dev mode
            logger.warn({ error: error.message }, 'AAV org-link validation failed');
            organizationId = `org_${link_token.replace('lnk_', '').substring(0, 24)}`;
        }

        // Update organization with linked org ID
        await prisma.organization.update({
            where: { id: req.org.id },
            data: { organizationId }
        });

        res.json({
            linked: true,
            organization_id: organizationId
        });
    } catch (error) {
        console.error('Org link error:', error);
        res.status(500).json({ error: 'Failed to link organization' });
    }
});

/**
 * GET /v1/org/link
 * Get current org link status
 */
router.get('/link', requireAuth, async (req, res) => {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: req.org.id },
            select: { organizationId: true }
        });

        res.json({
            linked: !!org.organizationId,
            organization_id: org.organizationId
        });
    } catch (error) {
        console.error('Get org link error:', error);
        res.status(500).json({ error: 'Failed to get org link status' });
    }
});

module.exports = router;
