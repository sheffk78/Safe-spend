/**
 * Agent-scoped Routes
 * 
 * Provides agent-centric views of escrow accounts and spend history.
 * Routes: GET /v1/agents/:agent_id/escrow-accounts
 *         GET /v1/agents/:agent_id/spend-history
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { validateAgentId } = require('../utils/ids');

const router = express.Router();

/**
 * GET /v1/agents/:agent_id/escrow-accounts
 * List escrow accounts linked to this agent_id
 */
router.get('/:agent_id/escrow-accounts', requireAuth, async (req, res) => {
    try {
        const { agent_id } = req.params;

        if (!validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format'
            });
        }

        // Find escrows where agent_id matches directly or is in authorized list
        const allEscrows = await prisma.escrowAccount.findMany({
            where: { orgId: req.org.id }
        });

        const matchingEscrows = allEscrows.filter(escrow => {
            // Direct agent_id match
            if (escrow.agentId === agent_id) return true;
            // In authorized agents list
            const authorizedAgents = JSON.parse(escrow.authorizedAgentIds || '[]');
            return authorizedAgents.includes(agent_id);
        });

        res.json({
            data: matchingEscrows.map(formatEscrowAccount),
            total: matchingEscrows.length,
            agent_id
        });
    } catch (error) {
        console.error('Agent escrow accounts error:', error);
        res.status(500).json({ error: 'Failed to list agent escrow accounts' });
    }
});

/**
 * GET /v1/agents/:agent_id/spend-history
 * Paginated spend request history for this agent
 */
router.get('/:agent_id/spend-history', requireAuth, async (req, res) => {
    try {
        const { agent_id } = req.params;
        const { limit = 50, offset = 0, status } = req.query;

        if (!validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format'
            });
        }

        const where = {
            orgId: req.org.id,
            agentId: agent_id
        };
        if (status) where.status = status;

        const [spendRequests, total] = await Promise.all([
            prisma.spendRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.spendRequest.count({ where })
        ]);

        res.json({
            data: spendRequests.map(formatSpendRequest),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            agent_id
        });
    } catch (error) {
        console.error('Agent spend history error:', error);
        res.status(500).json({ error: 'Failed to list agent spend history' });
    }
});

function formatEscrowAccount(escrow) {
    return {
        id: escrow.id,
        agent_id: escrow.agentId,
        name: escrow.name,
        description: escrow.description,
        balance_cents: escrow.balanceCents,
        currency: escrow.currency,
        status: escrow.status,
        total_funded_cents: escrow.totalFundedCents,
        total_spent_cents: escrow.totalSpentCents,
        aav_enabled: escrow.aavEnabled,
        aav_enforcement_mode: escrow.aavEnforcementMode,
        created_at: escrow.createdAt,
        updated_at: escrow.updatedAt
    };
}

function formatSpendRequest(sr) {
    let rulesEvaluated = [];
    try { rulesEvaluated = JSON.parse(sr.rulesEvaluated || '[]'); } catch {}
    let metadata = {};
    try { metadata = JSON.parse(sr.metadata || '{}'); } catch {}

    return {
        id: sr.id,
        escrow_id: sr.escrowId,
        agent_id: sr.agentId,
        amount_cents: sr.amountCents,
        currency: sr.currency,
        vendor: sr.vendor,
        category: sr.category,
        description: sr.description,
        status: sr.status,
        denial_reason: sr.denialReason,
        denial_source: sr.denialSource,
        rules_evaluated: rulesEvaluated,
        balance_before_cents: sr.balanceBeforeCents,
        balance_after_cents: sr.balanceAfterCents,
        aav_agent_id: sr.aavAgentId,
        aav_verification_status: sr.aavVerificationStatus,
        metadata,
        created_at: sr.createdAt
    };
}

module.exports = router;
