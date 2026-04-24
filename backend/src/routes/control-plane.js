/**
 * Control Plane Routes
 * 
 * Read-only API endpoints consumed by agentictrust.app control plane.
 * These provide aggregated data for Agent Cards and org dashboards.
 * 
 * Auth: Service key (admin JWT for now)
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { validateAgentId } = require('../utils/ids');

const router = express.Router();

/**
 * GET /v1/org/:org_id/summary
 * Aggregated org statistics for control plane
 */
router.get('/org/:org_id/summary', requireAuth, async (req, res) => {
    try {
        const { org_id } = req.params;

        // Verify the requesting org owns this data (or is admin)
        if (req.org.id !== org_id && !req.isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const [escrows, spendRequests] = await Promise.all([
            prisma.escrowAccount.findMany({
                where: { orgId: org_id }
            }),
            prisma.spendRequest.findMany({
                where: {
                    orgId: org_id,
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            })
        ]);

        const activeEscrows = escrows.filter(e => e.status === 'active');
        const totalBalance = escrows.reduce((sum, e) => sum + e.balanceCents, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const spendsToday = spendRequests.filter(s => new Date(s.createdAt) >= today);
        const denials7d = spendRequests.filter(s => s.status === 'denied');
        const denialRate = spendRequests.length > 0 
            ? Math.round((denials7d.length / spendRequests.length) * 100) / 100 
            : 0;

        res.json({
            tool: 'safe_spend',
            org_id,
            total_balance_cents: totalBalance,
            active_escrows: activeEscrows.length,
            spends_today: spendsToday.length,
            spends_this_week: spendRequests.length,
            denial_rate_7d: denialRate
        });
    } catch (error) {
        console.error('Control plane org summary error:', error);
        res.status(500).json({ error: 'Failed to get org summary' });
    }
});

/**
 * GET /v1/agents/:agent_id/card-data
 * Agent Card data for control plane
 */
router.get('/agents/:agent_id/card-data', requireAuth, async (req, res) => {
    try {
        const { agent_id } = req.params;

        if (!validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format'
            });
        }

        // Find escrows for this agent
        const allEscrows = await prisma.escrowAccount.findMany({
            where: { orgId: req.org.id }
        });

        const agentEscrows = allEscrows.filter(escrow => {
            if (escrow.agentId === agent_id) return true;
            const authorizedAgents = JSON.parse(escrow.authorizedAgentIds || '[]');
            return authorizedAgents.includes(agent_id);
        });

        const hasFundedEscrow = agentEscrows.some(e => e.totalFundedCents > 0);
        const activeEscrows = agentEscrows.filter(e => e.status === 'active');
        const hasBalance = agentEscrows.some(e => e.balanceCents > 0);

        res.json({
            tool: 'safe_spend',
            agent_id,
            financial: {
                has_funded_escrow: hasFundedEscrow,
                escrow_status: activeEscrows.length > 0 ? 'active' : (agentEscrows.length > 0 ? 'inactive' : 'none'),
                escrow_count: agentEscrows.length,
                remaining_balance_available: hasBalance
            }
        });
    } catch (error) {
        console.error('Control plane agent card-data error:', error);
        res.status(500).json({ error: 'Failed to get agent card data' });
    }
});

module.exports = router;
