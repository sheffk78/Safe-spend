const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireOrgAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /v1/approvals
 * List pending approvals
 */
router.get('/', requireOrgAuth, async (req, res) => {
    try {
        const { status = 'pending', limit = 50, offset = 0 } = req.query;
        
        const where = { orgId: req.org.id };
        if (status) where.status = status;
        
        const [approvals, total] = await Promise.all([
            prisma.approval.findMany({
                where,
                include: {
                    spendRequest: true
                },
                orderBy: { requestedAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.approval.count({ where })
        ]);
        
        res.json({
            data: approvals.map(formatApproval),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('List approvals error:', error);
        res.status(500).json({ error: 'Failed to list approvals' });
    }
});

/**
 * GET /v1/approvals/:id
 * Get approval details
 */
router.get('/:id', requireOrgAuth, async (req, res) => {
    try {
        const approval = await prisma.approval.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            },
            include: {
                spendRequest: true
            }
        });
        
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        res.json(formatApproval(approval));
    } catch (error) {
        console.error('Get approval error:', error);
        res.status(500).json({ error: 'Failed to get approval' });
    }
});

/**
 * POST /v1/approvals/:id/approve
 * Approve a pending spend request
 */
router.post('/:id/approve', requireOrgAuth, async (req, res) => {
    try {
        const { note } = req.body;
        
        const approval = await prisma.approval.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            },
            include: {
                spendRequest: true
            }
        });
        
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        if (approval.status !== 'pending') {
            return res.status(400).json({ error: 'Approval is not pending' });
        }
        
        // Check if expired
        if (approval.expiresAt && new Date() > approval.expiresAt) {
            await prisma.approval.update({
                where: { id: approval.id },
                data: { status: 'expired' }
            });
            return res.status(400).json({ error: 'Approval has expired' });
        }
        
        // Get escrow account
        const escrow = await prisma.escrowAccount.findUnique({
            where: { id: approval.spendRequest.escrowId }
        });
        
        if (!escrow || escrow.status !== 'active') {
            return res.status(400).json({ error: 'Escrow account is not active' });
        }
        
        if (escrow.balanceCents < approval.spendRequest.amountCents) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }
        
        // Execute the spend
        const [updatedApproval, updatedSpendRequest, updatedEscrow] = await prisma.$transaction([
            prisma.approval.update({
                where: { id: approval.id },
                data: {
                    status: 'approved',
                    decidedBy: req.org.id,
                    decidedAt: new Date(),
                    decisionNote: note
                }
            }),
            prisma.spendRequest.update({
                where: { id: approval.spendRequestId },
                data: {
                    status: 'approved',
                    resolvedAt: new Date(),
                    resolvedBy: 'human:' + req.org.id,
                    balanceAfterCents: escrow.balanceCents - approval.spendRequest.amountCents
                }
            }),
            prisma.escrowAccount.update({
                where: { id: escrow.id },
                data: {
                    balanceCents: escrow.balanceCents - approval.spendRequest.amountCents,
                    totalSpentCents: escrow.totalSpentCents + approval.spendRequest.amountCents,
                    status: escrow.balanceCents - approval.spendRequest.amountCents <= 0 ? 'depleted' : 'active'
                }
            })
        ]);
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow.id,
                eventType: 'approval.approved',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({
                    approval_id: approval.id,
                    spend_request_id: approval.spendRequestId,
                    amount_cents: approval.spendRequest.amountCents,
                    note
                }),
                ipAddress: req.ip
            }
        });
        
        res.json(formatApproval({ ...updatedApproval, spendRequest: updatedSpendRequest }));
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Failed to approve' });
    }
});

/**
 * POST /v1/approvals/:id/deny
 * Deny a pending spend request
 */
router.post('/:id/deny', requireOrgAuth, async (req, res) => {
    try {
        const { reason, note } = req.body;
        
        const approval = await prisma.approval.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            },
            include: {
                spendRequest: true
            }
        });
        
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        if (approval.status !== 'pending') {
            return res.status(400).json({ error: 'Approval is not pending' });
        }
        
        // Update both approval and spend request
        const [updatedApproval, updatedSpendRequest] = await prisma.$transaction([
            prisma.approval.update({
                where: { id: approval.id },
                data: {
                    status: 'denied',
                    decidedBy: req.org.id,
                    decidedAt: new Date(),
                    decisionNote: note
                }
            }),
            prisma.spendRequest.update({
                where: { id: approval.spendRequestId },
                data: {
                    status: 'denied',
                    resolvedAt: new Date(),
                    resolvedBy: 'human:' + req.org.id,
                    denialReason: reason || 'human_denied'
                }
            })
        ]);
        
        // Update denied total
        await prisma.escrowAccount.update({
            where: { id: approval.spendRequest.escrowId },
            data: { totalDeniedCents: { increment: approval.spendRequest.amountCents } }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: approval.spendRequest.escrowId,
                eventType: 'approval.denied',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({
                    approval_id: approval.id,
                    spend_request_id: approval.spendRequestId,
                    amount_cents: approval.spendRequest.amountCents,
                    reason,
                    note
                }),
                ipAddress: req.ip
            }
        });
        
        res.json(formatApproval({ ...updatedApproval, spendRequest: updatedSpendRequest }));
    } catch (error) {
        console.error('Deny error:', error);
        res.status(500).json({ error: 'Failed to deny' });
    }
});

/**
 * Format approval for API response
 */
function formatApproval(approval) {
    return {
        id: approval.id,
        spend_request_id: approval.spendRequestId,
        status: approval.status,
        requested_at: approval.requestedAt,
        expires_at: approval.expiresAt,
        decided_by: approval.decidedBy,
        decided_at: approval.decidedAt,
        decision_note: approval.decisionNote,
        spend_request: approval.spendRequest ? {
            id: approval.spendRequest.id,
            escrow_id: approval.spendRequest.escrowId,
            amount_cents: approval.spendRequest.amountCents,
            vendor: approval.spendRequest.vendor,
            category: approval.spendRequest.category,
            description: approval.spendRequest.description,
            status: approval.spendRequest.status
        } : null
    };
}

module.exports = router;
