const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireAuth, requireOwnerKey } = require('../middleware/auth');
const { queueWebhooks } = require('../services/webhook-service');
const stripeService = require('../services/stripe-service');
const { isStripeConfigured } = require('../lib/stripe');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/escrow-accounts
 * Create a new escrow account
 * Note: Owner keys can create escrows; agent keys cannot
 */
router.post('/', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            currency = 'usd', 
            metadata = {},
            // AAV fields (legacy + new spec)
            aav_enabled = false,
            authorized_agent_ids = [],
            aav_grant_ids = [],
            aav_enforcement_mode = 'none',
            aav_api_key,
            aav_require_certificate = false
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        // Validate AAV enforcement mode (support both old and new modes)
        const validModes = ['none', 'warn', 'strict', 'verify', 'log_only'];
        if (!validModes.includes(aav_enforcement_mode)) {
            return res.status(400).json({ 
                error: `Invalid aav_enforcement_mode. Must be one of: ${validModes.join(', ')}` 
            });
        }
        
        const escrowId = generateId('escrowAccount');
        const escrow = await prisma.escrowAccount.create({
            data: {
                id: escrowId,
                orgId: req.org.id,
                name,
                description,
                currency,
                metadata: JSON.stringify(metadata),
                // AAV fields - full spec
                aavEnabled: aav_enabled,
                authorizedAgentIds: JSON.stringify(authorized_agent_ids),
                aavGrantIds: JSON.stringify(aav_grant_ids),
                aavEnforcementMode: aav_enforcement_mode,
                aavApiKey: aav_api_key || null,
                aavRequireCertificate: aav_require_certificate
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
                details: JSON.stringify({ name, currency, aav_enabled }),
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
 * Fund an escrow account (LEGACY - simulated funding without Stripe)
 * Keep for backwards compatibility with tests
 * Note: Requires owner key - agent keys cannot fund escrows
 */
router.post('/:id/fund', requireAuth, requireOwnerKey, async (req, res) => {
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
        
        // Update balance (simulated - no real Stripe call)
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
                    balance_after_cents: updated.balanceCents,
                    source: 'simulated'
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
 * POST /v1/escrow-accounts/:id/fund-session
 * Create a Stripe Checkout Session for funding
 */
router.post('/:id/fund-session', requireAuth, async (req, res) => {
    try {
        // Check if Stripe is configured
        if (!isStripeConfigured()) {
            return res.status(503).json({ 
                error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment.' 
            });
        }

        const { amount_cents, currency = 'usd', success_url, cancel_url } = req.body;
        
        if (!amount_cents || amount_cents <= 0) {
            return res.status(400).json({ error: 'Valid amount_cents is required' });
        }

        if (!success_url || !cancel_url) {
            return res.status(400).json({ error: 'success_url and cancel_url are required' });
        }
        
        const result = await stripeService.createFundingSession({
            orgId: req.org.id,
            escrowId: req.params.id,
            amountCents: amount_cents,
            currency,
            successUrl: success_url,
            cancelUrl: cancel_url,
        });
        
        res.json({
            session_id: result.sessionId,
            checkout_url: result.checkoutUrl,
        });
    } catch (error) {
        console.error('Fund session error:', error);
        res.status(500).json({ error: error.message || 'Failed to create funding session' });
    }
});

/**
 * POST /v1/escrow-accounts/:id/confirm-funding
 * Manually confirm funding (for development without webhooks)
 */
router.post('/:id/confirm-funding', requireAuth, async (req, res) => {
    try {
        const { session_id } = req.body;
        
        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }
        
        const result = await stripeService.simulateFundingComplete(session_id);
        
        if (result.success) {
            res.json({
                message: 'Funding confirmed',
                escrow: formatEscrowAccount(result.escrow),
            });
        } else {
            res.status(400).json({ error: result.message || 'Failed to confirm funding' });
        }
    } catch (error) {
        console.error('Confirm funding error:', error);
        res.status(500).json({ error: error.message || 'Failed to confirm funding' });
    }
});

/**
 * GET /v1/escrow-accounts/:id/funding-history
 * Get funding history for an escrow account
 */
router.get('/:id/funding-history', requireAuth, async (req, res) => {
    try {
        const escrow = await prisma.escrowAccount.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id,
            },
        });

        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }

        const history = await stripeService.getFundingHistory(req.params.id, req.org.id);
        
        res.json({
            data: history,
            total: history.length,
        });
    } catch (error) {
        console.error('Funding history error:', error);
        res.status(500).json({ error: 'Failed to get funding history' });
    }
});

/**
 * POST /v1/escrow-accounts/:id/pause
 * Pause spending on an escrow account
 */
router.post('/:id/pause', requireAuth, requireOwnerKey, async (req, res) => {
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
router.post('/:id/resume', requireAuth, requireOwnerKey, async (req, res) => {
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
 * Close an escrow account with optional Stripe refund
 */
router.post('/:id/close', requireAuth, requireOwnerKey, async (req, res) => {
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

        if (escrow.status === 'closed') {
            return res.status(400).json({ error: 'Account is already closed' });
        }
        
        let refundInfo = { refundId: null, refundedAmount: 0 };
        
        // If there's a remaining balance and Stripe is configured, process refund
        if (escrow.balanceCents > 0 && isStripeConfigured()) {
            try {
                refundInfo = await stripeService.processEscrowRefund(escrow.id, req.org.id);
            } catch (refundError) {
                console.error('Stripe refund failed:', refundError);
                // Continue with close even if refund fails
                // The remaining balance will be noted in audit
            }
        }
        
        // Update escrow to closed status
        const updated = await prisma.escrowAccount.update({
            where: { id: escrow.id },
            data: { 
                status: 'closed',
                balanceCents: 0  // Zero out balance on close
            }
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
                details: JSON.stringify({ 
                    remaining_balance_cents: escrow.balanceCents,
                    stripe_refund_id: refundInfo.refundId,
                    refunded_amount_cents: refundInfo.refundedAmount,
                }),
                ipAddress: req.ip
            }
        });
        
        // Trigger webhook
        await queueWebhooks(req.org.id, 'escrow.closed', {
            escrow_id: escrow.id,
            org_id: req.org.id,
            remaining_balance_cents: escrow.balanceCents,
            stripe_refund_id: refundInfo.refundId,
            refunded_amount_cents: refundInfo.refundedAmount,
        });
        
        res.json({
            ...formatEscrowAccount(updated),
            refund: refundInfo.refundId ? {
                stripe_refund_id: refundInfo.refundId,
                refunded_amount_cents: refundInfo.refundedAmount,
            } : null,
        });
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
        // AAV fields - full spec
        aav_enabled: escrow.aavEnabled,
        authorized_agent_ids: JSON.parse(escrow.authorizedAgentIds || '[]'),
        aav_grant_ids: JSON.parse(escrow.aavGrantIds || '[]'),
        aav_enforcement_mode: escrow.aavEnforcementMode,
        aav_api_key_configured: !!escrow.aavApiKey, // Don't expose actual key
        aav_require_certificate: escrow.aavRequireCertificate || false,
        aav_last_verified_at: escrow.aavLastVerifiedAt,
        metadata: JSON.parse(escrow.metadata || '{}'),
        created_at: escrow.createdAt,
        updated_at: escrow.updatedAt
    };
}

module.exports = router;
