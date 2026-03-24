const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { queueWebhooks } = require('../services/webhook-service');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/escrow-accounts
 * Create a new escrow account
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, currency = 'usd', metadata = {} } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const escrowId = generateId('escrowAccount');
        const escrow = await prisma.escrowAccount.create({
            data: {
                id: escrowId,
                orgId: req.org.id,
                name,
                description,
                currency,
                metadata: JSON.stringify(metadata)
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow.id,
                eventType: 'escrow.created',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.authType === 'api_key' ? req.apiKey.id : req.org.id,
                details: JSON.stringify({ name, currency }),
                ipAddress: req.ip
            }
        });
        
        res.status(201).json(formatEscrowAccount(escrow));
    } catch (error) {
        console.error('Create escrow error:', error);
        res.status(500).json({ error: 'Failed to create escrow account' });
    }
});

/**
 * GET /v1/escrow-accounts
 * List escrow accounts for current organization
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const escrows = await prisma.escrowAccount.findMany({
            where: { orgId: req.org.id },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({
            data: escrows.map(formatEscrowAccount),
            total: escrows.length
        });
    } catch (error) {
        console.error('List escrow error:', error);
        res.status(500).json({ error: 'Failed to list escrow accounts' });
    }
});

/**
 * GET /v1/escrow-accounts/:id
 * Get escrow account details
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        res.json(formatEscrowAccount(escrow));
    } catch (error) {
        console.error('Get escrow error:', error);
        res.status(500).json({ error: 'Failed to get escrow account' });
    }
});

/**
 * GET /v1/escrow-accounts/:id/balance
 * Get escrow account balance (agent keys can access this)
 */
router.get('/:id/balance', requireAuth, async (req, res) => {
    try {
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            },
            select: {
                id: true,
                balanceCents: true,
                currency: true,
                status: true
            }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        res.json({
            escrow_id: escrow.id,
            balance_cents: escrow.balanceCents,
            currency: escrow.currency,
            status: escrow.status
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

/**
 * POST /v1/escrow-accounts/:id/fund
 * Fund an escrow account (placeholder - no Stripe integration yet)
 */
router.post('/:id/fund', requireAuth, async (req, res) => {
    try {
        const { amount_cents } = req.body;
        
        if (!amount_cents || amount_cents <= 0) {
            return res.status(400).json({ error: 'Valid amount_cents is required' });
        }
        
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        if (escrow.status === 'closed') {
            return res.status(400).json({ error: 'Cannot fund a closed account' });
        }
        
        // Update balance (placeholder - no real Stripe call)
        const updated = await prisma.escrowAccount.update({
            where: { id: escrow.id },
            data: {
                balanceCents: escrow.balanceCents + amount_cents,
                totalFundedCents: escrow.totalFundedCents + amount_cents,
                status: 'active' // Reactivate if depleted
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow.id,
                eventType: 'escrow.funded',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({
                    amount_cents,
                    balance_before_cents: escrow.balanceCents,
                    balance_after_cents: updated.balanceCents
                }),
                ipAddress: req.ip
            }
        });
        
        // Trigger webhook
        await queueWebhooks(req.org.id, 'escrow.funded', {
            escrow_id: escrow.id,
            org_id: req.org.id,
            amount_cents,
            balance_before_cents: escrow.balanceCents,
            balance_after_cents: updated.balanceCents
        });
        
        res.json({
            message: 'Account funded successfully',
            escrow: formatEscrowAccount(updated)
        });
    } catch (error) {
        console.error('Fund escrow error:', error);
        res.status(500).json({ error: 'Failed to fund escrow account' });
    }
});

/**
 * POST /v1/escrow-accounts/:id/pause
 * Pause spending on an escrow account
 */
router.post('/:id/pause', requireAuth, async (req, res) => {
    try {
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        const updated = await prisma.escrowAccount.update({
            where: { id: escrow.id },
            data: { status: 'paused' }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow.id,
                eventType: 'escrow.paused',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({}),
                ipAddress: req.ip
            }
        });
        
        // Trigger webhook
        await queueWebhooks(req.org.id, 'escrow.paused', {
            escrow_id: escrow.id,
            org_id: req.org.id,
            balance_cents: updated.balanceCents
        });
        
        res.json(formatEscrowAccount(updated));
    } catch (error) {
        console.error('Pause escrow error:', error);
        res.status(500).json({ error: 'Failed to pause escrow account' });
    }
});

/**
 * POST /v1/escrow-accounts/:id/resume
 * Resume spending on an escrow account
 */
router.post('/:id/resume', requireAuth, async (req, res) => {
    try {
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        // Cannot resume a closed account
        if (escrow.status === 'closed') {
            return res.status(400).json({ error: 'Cannot resume a closed account' });
        }
        
        const newStatus = escrow.balanceCents > 0 ? 'active' : 'depleted';
        
        const updated = await prisma.escrowAccount.update({
            where: { id: escrow.id },
            data: { status: newStatus }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow.id,
                eventType: 'escrow.resumed',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ new_status: newStatus }),
                ipAddress: req.ip
            }
        });
        
        // Trigger webhook
        await queueWebhooks(req.org.id, 'escrow.resumed', {
            escrow_id: escrow.id,
            org_id: req.org.id,
            balance_cents: updated.balanceCents,
            new_status: newStatus
        });
        
        res.json(formatEscrowAccount(updated));
    } catch (error) {
        console.error('Resume escrow error:', error);
        res.status(500).json({ error: 'Failed to resume escrow account' });
    }
});

/**
 * POST /v1/escrow-accounts/:id/close
 * Close an escrow account
 */
router.post('/:id/close', requireAuth, async (req, res) => {
    try {
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        const updated = await prisma.escrowAccount.update({
            where: { id: escrow.id },
            data: { status: 'closed' }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow.id,
                eventType: 'escrow.closed',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ remaining_balance_cents: escrow.balanceCents }),
                ipAddress: req.ip
            }
        });
        
        // Trigger webhook
        await queueWebhooks(req.org.id, 'escrow.closed', {
            escrow_id: escrow.id,
            org_id: req.org.id,
            remaining_balance_cents: escrow.balanceCents
        });
        
        res.json(formatEscrowAccount(updated));
    } catch (error) {
        console.error('Close escrow error:', error);
        res.status(500).json({ error: 'Failed to close escrow account' });
    }
});

/**
 * Format escrow account for API response
 */
function formatEscrowAccount(escrow) {
    return {
        id: escrow.id,
        name: escrow.name,
        description: escrow.description,
        balance_cents: escrow.balanceCents,
        currency: escrow.currency,
        status: escrow.status,
        total_funded_cents: escrow.totalFundedCents,
        total_spent_cents: escrow.totalSpentCents,
        total_denied_cents: escrow.totalDeniedCents,
        metadata: JSON.parse(escrow.metadata || '{}'),
        created_at: escrow.createdAt,
        updated_at: escrow.updatedAt
    };
}

module.exports = router;
