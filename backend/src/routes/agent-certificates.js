/**
 * Agent Certificate Mapping Routes
 * 
 * Maps agent_id → certificate_id for AAV authority verification.
 * Routes: POST /v1/agent-certificates
 *         GET /v1/agent-certificates/:agent_id
 *         DELETE /v1/agent-certificates/:agent_id
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { validateAgentId } = require('../utils/ids');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/agent-certificates
 * Create or update a certificate mapping for an agent
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { agent_id, certificate_id } = req.body;

        if (!agent_id || !certificate_id) {
            return res.status(400).json({
                error: 'agent_id and certificate_id are required'
            });
        }

        if (!validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format'
            });
        }

        if (!certificate_id.startsWith('cert_')) {
            return res.status(400).json({
                error: 'invalid_certificate_id',
                message: 'certificate_id must start with cert_'
            });
        }

        const mapping = await prisma.agentCertificate.upsert({
            where: {
                orgId_agentId: {
                    orgId: req.org.id,
                    agentId: agent_id
                }
            },
            update: {
                certificateId: certificate_id,
                mappedAt: new Date()
            },
            create: {
                orgId: req.org.id,
                agentId: agent_id,
                certificateId: certificate_id,
                mappedAt: new Date()
            }
        });

        res.status(201).json({
            agent_id: mapping.agentId,
            certificate_id: mapping.certificateId,
            mapped_at: mapping.mappedAt,
            created_at: mapping.createdAt
        });
    } catch (error) {
        console.error('Create agent certificate error:', error);
        res.status(500).json({ error: 'Failed to create agent certificate mapping' });
    }
});

/**
 * GET /v1/agent-certificates/:agent_id
 * Get certificate mapping for an agent
 */
router.get('/:agent_id', requireAuth, async (req, res) => {
    try {
        const { agent_id } = req.params;

        if (!validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format'
            });
        }

        const mapping = await prisma.agentCertificate.findUnique({
            where: {
                orgId_agentId: {
                    orgId: req.org.id,
                    agentId: agent_id
                }
            }
        });

        if (!mapping) {
            return res.status(404).json({
                error: 'not_found',
                message: `No certificate mapping found for agent ${agent_id}`
            });
        }

        res.json({
            agent_id: mapping.agentId,
            certificate_id: mapping.certificateId,
            mapped_at: mapping.mappedAt,
            created_at: mapping.createdAt
        });
    } catch (error) {
        console.error('Get agent certificate error:', error);
        res.status(500).json({ error: 'Failed to get agent certificate mapping' });
    }
});

/**
 * DELETE /v1/agent-certificates/:agent_id
 * Remove certificate mapping for an agent
 */
router.delete('/:agent_id', requireAuth, async (req, res) => {
    try {
        const { agent_id } = req.params;

        if (!validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format'
            });
        }

        const mapping = await prisma.agentCertificate.findUnique({
            where: {
                orgId_agentId: {
                    orgId: req.org.id,
                    agentId: agent_id
                }
            }
        });

        if (!mapping) {
            return res.status(404).json({
                error: 'not_found',
                message: `No certificate mapping found for agent ${agent_id}`
            });
        }

        await prisma.agentCertificate.delete({
            where: { id: mapping.id }
        });

        res.json({ deleted: true, agent_id });
    } catch (error) {
        console.error('Delete agent certificate error:', error);
        res.status(500).json({ error: 'Failed to delete agent certificate mapping' });
    }
});

module.exports = router;
