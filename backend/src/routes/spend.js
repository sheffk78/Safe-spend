const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/spend
 * Create a spend request
 * NOTE: This is a PLACEHOLDER implementation. The full 13-step rules engine
 * will be implemented in Prompt 03.
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const {
            escrow_id,
            amount_cents,
            currency = 'usd',
            vendor,
            category,
            description,
            idempotency_key,
            metadata = {}
        } = req.body;
        
        // Validate required fields
        if (!escrow_id || !amount_cents || !vendor) {
            return res.status(400).json({ 
                error: 'escrow_id, amount_cents, and vendor are required' 
            });
        }
        
        if (amount_cents <= 0) {
            return res.status(400).json({ error: 'amount_cents must be positive' });
        }
        
        // Check idempotency
        if (idempotency_key) {
            const existing = await prisma.spendRequest.findUnique({
                where: { idempotencyKey: idempotency_key }
            });
            
            if (existing) {
                return res.json(formatSpendRequest(existing));
            }
        }
        
        // Verify escrow account exists and belongs to org
        const escrow = await prisma.escrowAccount.findFirst({
            where: { id: escrow_id, orgId: req.org.id }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        // Check account status
        if (escrow.status !== 'active') {
            const spendRequest = await prisma.spendRequest.create({
                data: {
                    id: generateId('spendRequest'),
                    escrowId: escrow_id,
                    orgId: req.org.id,
                    apiKeyId: req.apiKey?.id,
                    amountCents: amount_cents,
                    currency,
                    vendor,
                    category,
                    description,
                    idempotencyKey: idempotency_key,
                    status: 'denied',
                    resolvedAt: new Date(),
                    resolvedBy: 'system',
                    denialReason: `Account is ${escrow.status}`,
                    rulesEvaluated: JSON.stringify([{ rule: 'account_status', passed: false, reason: `Account is ${escrow.status}` }]),
                    balanceBeforeCents: escrow.balanceCents,
                    metadata: JSON.stringify(metadata)
                }
            });
            
            return res.status(400).json({
                ...formatSpendRequest(spendRequest),
                error: `Account is ${escrow.status}`
            });
        }
        
        // PLACEHOLDER: Basic balance check (full rules engine in Prompt 03)
        const balanceBefore = escrow.balanceCents;
        
        if (balanceBefore < amount_cents) {
            // Insufficient funds
            const spendRequest = await prisma.spendRequest.create({
                data: {
                    id: generateId('spendRequest'),
                    escrowId: escrow_id,
                    orgId: req.org.id,
                    apiKeyId: req.apiKey?.id,
                    amountCents: amount_cents,
                    currency,
                    vendor,
                    category,
                    description,
                    idempotencyKey: idempotency_key,
                    status: 'denied',
                    resolvedAt: new Date(),
                    resolvedBy: 'system',
                    denialReason: 'insufficient_funds',
                    rulesEvaluated: JSON.stringify([{ rule: 'balance_check', passed: false, reason: 'Insufficient funds' }]),
                    balanceBeforeCents: balanceBefore,
                    metadata: JSON.stringify(metadata)
                }
            });
            
            // Update denied total
            await prisma.escrowAccount.update({
                where: { id: escrow_id },
                data: { totalDeniedCents: escrow.totalDeniedCents + amount_cents }
            });
            
            // Audit event
            await prisma.auditEvent.create({
                data: {
                    id: generateId('auditEvent'),
                    orgId: req.org.id,
                    escrowId: escrow_id,
                    eventType: 'spend.denied',
                    actorType: req.authType === 'api_key' ? 'agent' : 'human',
                    actorId: req.apiKey?.id || req.org.id,
                    details: JSON.stringify({
                        spend_request_id: spendRequest.id,
                        amount_cents,
                        vendor,
                        denial_reason: 'insufficient_funds'
                    }),
                    ipAddress: req.ip
                }
            });
            
            return res.status(400).json({
                ...formatSpendRequest(spendRequest),
                error: 'Insufficient funds'
            });
        }
        
        // PLACEHOLDER: Approve the spend (full rules engine in Prompt 03)
        // TODO: Implement 13-step validation cascade in Prompt 03
        const rulesEvaluated = JSON.stringify([
            { rule: 'placeholder', passed: true, reason: 'Rules engine to be implemented in Prompt 03' }
        ]);
        
        // Deduct from balance
        const updatedEscrow = await prisma.escrowAccount.update({
            where: { id: escrow_id },
            data: {
                balanceCents: balanceBefore - amount_cents,
                totalSpentCents: escrow.totalSpentCents + amount_cents,
                status: balanceBefore - amount_cents <= 0 ? 'depleted' : 'active'
            }
        });
        
        // Create spend request
        const spendRequest = await prisma.spendRequest.create({
            data: {
                id: generateId('spendRequest'),
                escrowId: escrow_id,
                orgId: req.org.id,
                apiKeyId: req.apiKey?.id,
                amountCents: amount_cents,
                currency,
                vendor,
                category,
                description,
                idempotencyKey: idempotency_key,
                status: 'approved',
                resolvedAt: new Date(),
                resolvedBy: 'system',
                rulesEvaluated,
                balanceBeforeCents: balanceBefore,
                balanceAfterCents: updatedEscrow.balanceCents,
                metadata: JSON.stringify(metadata)
            }
        });
        
        // Update spend tracking (basic implementation)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        await prisma.dailySpendTracking.upsert({
            where: {
                escrowId_date: {
                    escrowId: escrow_id,
                    date: today
                }
            },
            update: {
                totalSpentCents: { increment: amount_cents },
                transactionCount: { increment: 1 }
            },
            create: {
                escrowId: escrow_id,
                date: today,
                totalSpentCents: amount_cents,
                transactionCount: 1
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow_id,
                eventType: 'spend.approved',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
                details: JSON.stringify({
                    spend_request_id: spendRequest.id,
                    amount_cents,
                    vendor,
                    category,
                    balance_before: balanceBefore,
                    balance_after: updatedEscrow.balanceCents
                }),
                ipAddress: req.ip
            }
        });
        
        res.status(201).json({
            ...formatSpendRequest(spendRequest),
            remaining_balance_cents: updatedEscrow.balanceCents
        });
    } catch (error) {
        console.error('Spend request error:', error);
        res.status(500).json({ error: 'Failed to process spend request' });
    }
});

/**
 * GET /v1/spend
 * List spend requests
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const { escrow_id, status, limit = 50, offset = 0 } = req.query;
        
        const where = { orgId: req.org.id };
        if (escrow_id) where.escrowId = escrow_id;
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
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('List spend requests error:', error);
        res.status(500).json({ error: 'Failed to list spend requests' });
    }
});

/**
 * GET /v1/spend/:id
 * Get spend request details
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const spendRequest = await prisma.spendRequest.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!spendRequest) {
            return res.status(404).json({ error: 'Spend request not found' });
        }
        
        res.json(formatSpendRequest(spendRequest));
    } catch (error) {
        console.error('Get spend request error:', error);
        res.status(500).json({ error: 'Failed to get spend request' });
    }
});

/**
 * POST /v1/spend/:id/cancel
 * Cancel a pending spend request
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
    try {
        const spendRequest = await prisma.spendRequest.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!spendRequest) {
            return res.status(404).json({ error: 'Spend request not found' });
        }
        
        if (spendRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Can only cancel pending requests' });
        }
        
        const updated = await prisma.spendRequest.update({
            where: { id: spendRequest.id },
            data: {
                status: 'cancelled',
                resolvedAt: new Date(),
                resolvedBy: 'human:' + req.org.id
            }
        });
        
        res.json(formatSpendRequest(updated));
    } catch (error) {
        console.error('Cancel spend request error:', error);
        res.status(500).json({ error: 'Failed to cancel spend request' });
    }
});

/**
 * Format spend request for API response
 */
function formatSpendRequest(sr) {
    return {
        id: sr.id,
        escrow_id: sr.escrowId,
        amount_cents: sr.amountCents,
        currency: sr.currency,
        vendor: sr.vendor,
        category: sr.category,
        description: sr.description,
        idempotency_key: sr.idempotencyKey,
        status: sr.status,
        resolved_at: sr.resolvedAt,
        resolved_by: sr.resolvedBy,
        denial_reason: sr.denialReason,
        rules_evaluated: JSON.parse(sr.rulesEvaluated || '[]'),
        balance_before_cents: sr.balanceBeforeCents,
        balance_after_cents: sr.balanceAfterCents,
        metadata: JSON.parse(sr.metadata || '{}'),
        created_at: sr.createdAt
    };
}

module.exports = router;
