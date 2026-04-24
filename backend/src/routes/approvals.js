const express = require('express');
const prisma = require('../lib/prisma');
const { generateId } = require('../utils/ids');
const { requireOrgAuth, requireApprover } = require('../middleware/auth');
const { 
    queueWebhooks, 
    buildSpendEventData, 
    buildApprovalEventData 
} = require('../services/webhook-service');
const { 
    verifyActionToken, 
    sendApprovalNotification 
} = require('../services/approval-notification-service');
const { reportSpendExpired } = require('../services/arl-service');
const { emitSpendExpired } = require('../services/cross-tool-events');

const router = express.Router();

/**
 * GET /v1/approvals
 * List approvals with filtering
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
                    spendRequest: {
                        include: {
                            escrowAccount: true
                        }
                    }
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
                spendRequest: {
                    include: {
                        escrowAccount: true
                    }
                }
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
 * 
 * This executes the spend:
 * - Deducts from escrow balance
 * - Updates spend request status
 * - Creates audit events
 * - Triggers webhooks
 */
router.post('/:id/approve', requireOrgAuth, requireApprover, async (req, res) => {
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
            return res.status(400).json({ error: `Approval is already ${approval.status}` });
        }
        
        // Check if expired
        if (approval.expiresAt && new Date() > approval.expiresAt) {
            // Mark as expired
            await prisma.$transaction([
                prisma.approval.update({
                    where: { id: approval.id },
                    data: { status: 'expired' }
                }),
                prisma.spendRequest.update({
                    where: { id: approval.spendRequestId },
                    data: { 
                        status: 'expired',
                        resolvedAt: new Date()
                    }
                })
            ]);
            return res.status(400).json({ error: 'Approval has expired' });
        }
        
        // Append human approval to rules_evaluated
        const rulesEvaluated = JSON.parse(approval.spendRequest.rulesEvaluated || '[]');
        rulesEvaluated.push({
            rule: 'human_approval',
            passed: true,
            reason: 'Approved by human',
            metadata: {
                approved_by: req.org.email || req.org.id,
                approved_at: new Date().toISOString(),
                note: note || null
            }
        });
        
        // Execute the spend in a transaction with serializable isolation
        // to prevent race conditions on balance checks
        const [updatedApproval, updatedSpendRequest, updatedEscrow] = await prisma.$transaction(async (tx) => {
            // Re-read escrow inside transaction with lock
            const escrow = await tx.escrowAccount.findUnique({
                where: { id: approval.spendRequest.escrowId }
            });
            
            if (!escrow) {
                throw new Error('Escrow account not found');
            }
            
            if (escrow.status !== 'active') {
                throw new Error(`Escrow account is ${escrow.status}`);
            }
            
            if (escrow.balanceCents < approval.spendRequest.amountCents) {
                throw new Error('Insufficient funds');
            }
            
            const balanceAfter = escrow.balanceCents - approval.spendRequest.amountCents;
            
            const [updApproval, updSpend, updEscrow] = await Promise.all([
                tx.approval.update({
                    where: { id: approval.id },
                    data: {
                        status: 'approved',
                        decidedBy: `human:${req.org.email || req.org.id}`,
                        decidedAt: new Date(),
                        decisionNote: note || null
                    }
                }),
                tx.spendRequest.update({
                    where: { id: approval.spendRequestId },
                    data: {
                        status: 'approved',
                        resolvedAt: new Date(),
                        resolvedBy: `human:${req.org.email || req.org.id}`,
                        balanceBeforeCents: escrow.balanceCents,
                        balanceAfterCents: balanceAfter,
                        rulesEvaluated: JSON.stringify(rulesEvaluated)
                    }
                }),
                tx.escrowAccount.update({
                    where: { id: escrow.id },
                    data: {
                        balanceCents: balanceAfter,
                        totalSpentCents: escrow.totalSpentCents + approval.spendRequest.amountCents,
                        status: balanceAfter <= 0 ? 'depleted' : 'active'
                    }
                })
            ]);
            
            return [updApproval, updSpend, updEscrow];
        }, {
            isolationLevel: 'Serializable'
        });
            prisma.approval.update({
                where: { id: approval.id },
                data: {
                    status: 'approved',
                    decidedBy: `human:${req.org.email || req.org.id}`,
                    decidedAt: new Date(),
                    decisionNote: note || null
                }
            }),
            prisma.spendRequest.update({
                where: { id: approval.spendRequestId },
                data: {
                    status: 'approved',
                    resolvedAt: new Date(),
                    resolvedBy: `human:${req.org.email || req.org.id}`,
                    balanceBeforeCents: escrow.balanceCents,
                    balanceAfterCents: balanceAfter,
                    rulesEvaluated: JSON.stringify(rulesEvaluated)
                }
            }),
            prisma.escrowAccount.update({
                where: { id: escrow.id },
                data: {
                    balanceCents: balanceAfter,
                    totalSpentCents: escrow.totalSpentCents + approval.spendRequest.amountCents,
                    status: balanceAfter <= 0 ? 'depleted' : 'active'
                }
            })
        ]);
        
        // Update tracking tables
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(dayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        await Promise.all([
            prisma.dailySpendTracking.upsert({
                where: { escrowId_date: { escrowId: escrow.id, date: dayStart } },
                update: { 
                    totalSpentCents: { increment: approval.spendRequest.amountCents },
                    transactionCount: { increment: 1 }
                },
                create: { 
                    escrowId: escrow.id, 
                    date: dayStart, 
                    totalSpentCents: approval.spendRequest.amountCents,
                    transactionCount: 1
                }
            }),
            prisma.weeklySpendTracking.upsert({
                where: { escrowId_weekStart: { escrowId: escrow.id, weekStart } },
                update: { 
                    totalSpentCents: { increment: approval.spendRequest.amountCents },
                    transactionCount: { increment: 1 }
                },
                create: { 
                    escrowId: escrow.id, 
                    weekStart, 
                    totalSpentCents: approval.spendRequest.amountCents,
                    transactionCount: 1
                }
            }),
            prisma.monthlySpendTracking.upsert({
                where: { escrowId_monthStart: { escrowId: escrow.id, monthStart } },
                update: { 
                    totalSpentCents: { increment: approval.spendRequest.amountCents },
                    transactionCount: { increment: 1 }
                },
                create: { 
                    escrowId: escrow.id, 
                    monthStart, 
                    totalSpentCents: approval.spendRequest.amountCents,
                    transactionCount: 1
                }
            })
        ]);
        
        // Create audit events
        await Promise.all([
            prisma.auditEvent.create({
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
                        vendor: approval.spendRequest.vendor,
                        balance_before_cents: escrow.balanceCents,
                        balance_after_cents: balanceAfter,
                        note
                    }),
                    ipAddress: req.ip
                }
            }),
            prisma.auditEvent.create({
                data: {
                    id: generateId('auditEvent'),
                    orgId: req.org.id,
                    escrowId: escrow.id,
                    eventType: 'spend.approved',
                    actorType: 'human',
                    actorId: req.org.id,
                    details: JSON.stringify({
                        spend_request_id: approval.spendRequestId,
                        amount_cents: approval.spendRequest.amountCents,
                        vendor: approval.spendRequest.vendor,
                        via_approval: approval.id
                    }),
                    ipAddress: req.ip
                }
            })
        ]);
        
        // Trigger webhooks
        await Promise.all([
            queueWebhooks(req.org.id, 'approval.approved', buildApprovalEventData(
                updatedApproval,
                { ...updatedSpendRequest, status: 'approved' },
                updatedEscrow
            )),
            queueWebhooks(req.org.id, 'spend.approved', buildSpendEventData(
                { ...updatedSpendRequest, status: 'approved' },
                updatedEscrow,
                rulesEvaluated
            ))
        ]);
        
        // Return response
        res.json({
            ...formatApprovalResponse(updatedApproval, updatedSpendRequest, updatedEscrow),
            approved_by: `human:${req.org.email || req.org.id}`,
            approved_at: updatedApproval.decidedAt
        });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Failed to approve spend request' });
    }
});

/**
 * POST /v1/approvals/:id/deny
 * Deny a pending spend request
 * 
 * Does NOT deduct from escrow balance
 */
router.post('/:id/deny', requireOrgAuth, requireApprover, async (req, res) => {
    try {
        const { reason = 'human_denied', note } = req.body;
        
        const approval = await prisma.approval.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            },
            include: {
                spendRequest: {
                    include: {
                        escrowAccount: true
                    }
                }
            }
        });
        
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        if (approval.status !== 'pending') {
            return res.status(400).json({ error: `Approval is already ${approval.status}` });
        }
        
        // Append human denial to rules_evaluated
        const rulesEvaluated = JSON.parse(approval.spendRequest.rulesEvaluated || '[]');
        rulesEvaluated.push({
            rule: 'human_denial',
            passed: false,
            reason: reason,
            metadata: {
                denied_by: req.org.email || req.org.id,
                denied_at: new Date().toISOString(),
                note: note || null
            }
        });
        
        // Update approval and spend request
        const [updatedApproval, updatedSpendRequest] = await prisma.$transaction([
            prisma.approval.update({
                where: { id: approval.id },
                data: {
                    status: 'denied',
                    decidedBy: `human:${req.org.email || req.org.id}`,
                    decidedAt: new Date(),
                    decisionNote: note || null
                }
            }),
            prisma.spendRequest.update({
                where: { id: approval.spendRequestId },
                data: {
                    status: 'denied',
                    resolvedAt: new Date(),
                    resolvedBy: `human:${req.org.email || req.org.id}`,
                    denialReason: reason,
                    rulesEvaluated: JSON.stringify(rulesEvaluated)
                }
            })
        ]);
        
        // Update denied total on escrow
        await prisma.escrowAccount.update({
            where: { id: approval.spendRequest.escrowId },
            data: { totalDeniedCents: { increment: approval.spendRequest.amountCents } }
        });
        
        // Create audit events
        await Promise.all([
            prisma.auditEvent.create({
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
                        vendor: approval.spendRequest.vendor,
                        reason,
                        note
                    }),
                    ipAddress: req.ip
                }
            }),
            prisma.auditEvent.create({
                data: {
                    id: generateId('auditEvent'),
                    orgId: req.org.id,
                    escrowId: approval.spendRequest.escrowId,
                    eventType: 'spend.denied',
                    actorType: 'human',
                    actorId: req.org.id,
                    details: JSON.stringify({
                        spend_request_id: approval.spendRequestId,
                        amount_cents: approval.spendRequest.amountCents,
                        vendor: approval.spendRequest.vendor,
                        via_approval: approval.id,
                        reason
                    }),
                    ipAddress: req.ip
                }
            })
        ]);
        
        // Trigger webhooks
        await Promise.all([
            queueWebhooks(req.org.id, 'approval.denied', buildApprovalEventData(
                updatedApproval,
                { ...updatedSpendRequest, status: 'denied' },
                approval.spendRequest.escrowAccount
            )),
            queueWebhooks(req.org.id, 'spend.denied', buildSpendEventData(
                { ...updatedSpendRequest, status: 'denied' },
                approval.spendRequest.escrowAccount,
                rulesEvaluated
            ))
        ]);
        
        res.json({
            ...formatApprovalResponse(updatedApproval, updatedSpendRequest, approval.spendRequest.escrowAccount),
            denied_by: `human:${req.org.email || req.org.id}`,
            denied_at: updatedApproval.decidedAt,
            denial_reason: reason
        });
    } catch (error) {
        console.error('Deny error:', error);
        res.status(500).json({ error: 'Failed to deny spend request' });
    }
});

/**
 * POST /v1/approvals/expire-stale
 * Maintenance endpoint to expire stale pending approvals
 * 
 * In production, this should be called periodically (e.g., every minute via cron)
 */
router.post('/expire-stale', requireOrgAuth, async (req, res) => {
    try {
        const now = new Date();
        
        // Find all expired pending approvals
        const expiredApprovals = await prisma.approval.findMany({
            where: {
                status: 'pending',
                expiresAt: { lte: now }
            },
            include: {
                spendRequest: true
            }
        });
        
        if (expiredApprovals.length === 0) {
            return res.json({ message: 'No stale approvals found', expired_count: 0 });
        }
        
        const results = [];
        
        for (const approval of expiredApprovals) {
            try {
                // Update approval and spend request
                const [updatedApproval, updatedSpendRequest] = await prisma.$transaction([
                    prisma.approval.update({
                        where: { id: approval.id },
                        data: { status: 'expired' }
                    }),
                    prisma.spendRequest.update({
                        where: { id: approval.spendRequestId },
                        data: {
                            status: 'expired',
                            resolvedAt: now,
                            resolvedBy: 'system:auto_expire'
                        }
                    })
                ]);
                
                // Create audit event
                await prisma.auditEvent.create({
                    data: {
                        id: generateId('auditEvent'),
                        orgId: approval.orgId,
                        escrowId: approval.spendRequest.escrowId,
                        eventType: 'approval.expired',
                        actorType: 'system',
                        actorId: 'auto_expire',
                        details: JSON.stringify({
                            approval_id: approval.id,
                            spend_request_id: approval.spendRequestId,
                            amount_cents: approval.spendRequest.amountCents,
                            vendor: approval.spendRequest.vendor,
                            expires_at: approval.expiresAt
                        })
                    }
                });
                
                // Queue webhook
                const escrow = await prisma.escrowAccount.findUnique({
                    where: { id: approval.spendRequest.escrowId }
                });
                
                await queueWebhooks(approval.orgId, 'approval.expired', buildApprovalEventData(
                    updatedApproval,
                    updatedSpendRequest,
                    escrow
                ));
                
                // ARL outcome reporting (async, fire-and-forget)
                const agentId = approval.spendRequest.agentId || approval.spendRequest.aavAgentId;
                if (agentId) {
                    reportSpendExpired(agentId);
                }
                
                // Cross-tool event emission
                emitSpendExpired(approval.orgId, agentId, {
                    spend_request_id: approval.spendRequestId,
                    escrow_id: approval.spendRequest.escrowId,
                    amount_cents: approval.spendRequest.amountCents,
                    vendor: approval.spendRequest.vendor
                }).catch(() => {});
                
                results.push({ approval_id: approval.id, status: 'expired' });
            } catch (err) {
                console.error(`Failed to expire approval ${approval.id}:`, err);
                results.push({ approval_id: approval.id, status: 'error', error: err.message });
            }
        }
        
        res.json({
            message: 'Stale approvals processed',
            expired_count: results.filter(r => r.status === 'expired').length,
            results
        });
    } catch (error) {
        console.error('Expire stale approvals error:', error);
        res.status(500).json({ error: 'Failed to expire stale approvals' });
    }
});

/**
 * Format approval for list response
 */
function formatApproval(approval) {
    const result = {
        id: approval.id,
        spend_request_id: approval.spendRequestId,
        status: approval.status,
        requested_at: approval.requestedAt,
        expires_at: approval.expiresAt,
        decided_by: approval.decidedBy,
        decided_at: approval.decidedAt,
        decision_note: approval.decisionNote,
        notification_sent: approval.notificationSent
    };
    
    if (approval.spendRequest) {
        result.spend_request = {
            id: approval.spendRequest.id,
            escrow_id: approval.spendRequest.escrowId,
            amount_cents: approval.spendRequest.amountCents,
            currency: approval.spendRequest.currency,
            vendor: approval.spendRequest.vendor,
            category: approval.spendRequest.category,
            description: approval.spendRequest.description,
            status: approval.spendRequest.status,
            rules_evaluated: JSON.parse(approval.spendRequest.rulesEvaluated || '[]')
        };
        
        if (approval.spendRequest.escrowAccount) {
            result.escrow_account = {
                id: approval.spendRequest.escrowAccount.id,
                name: approval.spendRequest.escrowAccount.name,
                balance_cents: approval.spendRequest.escrowAccount.balanceCents
            };
        }
    }
    
    return result;
}

/**
 * Format approval response after approve/deny action
 */
function formatApprovalResponse(approval, spendRequest, escrow) {
    return {
        id: spendRequest.id,
        approval_id: approval.id,
        status: spendRequest.status,
        escrow_id: spendRequest.escrowId,
        amount_cents: spendRequest.amountCents,
        currency: spendRequest.currency || 'usd',
        vendor: spendRequest.vendor,
        category: spendRequest.category,
        description: spendRequest.description,
        remaining_balance_cents: escrow?.balanceCents,
        balance_before_cents: spendRequest.balanceBeforeCents,
        balance_after_cents: spendRequest.balanceAfterCents,
        rules_evaluated: JSON.parse(spendRequest.rulesEvaluated || '[]'),
        resolved_at: spendRequest.resolvedAt,
        resolved_by: spendRequest.resolvedBy
    };
}

/**
 * GET /v1/approvals/action
 * One-click approve/deny from email link
 * 
 * This endpoint verifies the signed token and shows a confirmation page,
 * then processes the action on POST (to prevent link scanner issues)
 */
router.get('/action', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        const result = verifyActionToken(token);
        
        if (!result.valid) {
            return res.status(400).json({ 
                error: result.error,
                message: 'The link has expired or is invalid. Please use the dashboard to manage this approval.'
            });
        }
        
        // Get approval details
        const approval = await prisma.approval.findUnique({
            where: { id: result.approvalId },
            include: {
                spendRequest: {
                    include: {
                        escrowAccount: true
                    }
                },
                organization: {
                    select: { name: true }
                }
            }
        });
        
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        if (approval.status !== 'pending') {
            return res.status(400).json({ 
                error: 'Approval has already been resolved',
                status: approval.status,
                resolved_at: approval.resolvedAt
            });
        }
        
        // Return confirmation page data
        res.json({
            action: result.action,
            approval_id: approval.id,
            organization: approval.organization.name,
            amount_cents: approval.spendRequest.amountCents,
            currency: approval.spendRequest.currency,
            vendor: approval.spendRequest.vendor,
            escrow_name: approval.spendRequest.escrowAccount?.name,
            expires_at: approval.expiresAt,
            confirm_url: `/api/v1/approvals/action?token=${token}`,
            dashboard_url: `/dashboard/approvals/${approval.id}`
        });
    } catch (error) {
        console.error('Action verification error:', error);
        res.status(500).json({ error: 'Failed to verify action' });
    }
});

/**
 * POST /v1/approvals/action
 * Confirm one-click approve/deny from email link
 */
router.post('/action', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        const result = verifyActionToken(token);
        
        if (!result.valid) {
            return res.status(400).json({ 
                error: result.error,
                message: 'The link has expired or is invalid.'
            });
        }
        
        // Get approval
        const approval = await prisma.approval.findUnique({
            where: { id: result.approvalId },
            include: {
                spendRequest: {
                    include: {
                        escrowAccount: true
                    }
                }
            }
        });
        
        if (!approval) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        if (approval.status !== 'pending') {
            return res.status(400).json({ 
                error: 'Approval has already been resolved',
                status: approval.status
            });
        }
        
        // Check expiry
        if (approval.expiresAt && approval.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Approval has expired' });
        }
        
        // Process action
        if (result.action === 'approve') {
            // Perform the balance deduction and approval
            const spendRequest = approval.spendRequest;
            const escrow = spendRequest.escrowAccount;
            
            // Verify escrow has sufficient balance
            if (escrow.balanceCents < spendRequest.amountCents) {
                return res.status(400).json({ 
                    error: 'Insufficient escrow balance',
                    available: escrow.balanceCents,
                    required: spendRequest.amountCents
                });
            }
            
            // Update escrow balance
            const newBalance = escrow.balanceCents - spendRequest.amountCents;
            await prisma.escrowAccount.update({
                where: { id: escrow.id },
                data: {
                    balanceCents: newBalance,
                    totalSpentCents: escrow.totalSpentCents + spendRequest.amountCents
                }
            });
            
            // Update spend request
            await prisma.spendRequest.update({
                where: { id: spendRequest.id },
                data: {
                    status: 'approved',
                    balanceAfterCents: newBalance,
                    resolvedAt: new Date(),
                    resolvedBy: 'email_action'
                }
            });
            
            // Update approval
            await prisma.approval.update({
                where: { id: approval.id },
                data: {
                    status: 'approved',
                    resolvedAt: new Date(),
                    resolvedBy: 'email_action',
                    resolution_note: 'Approved via email one-click action'
                }
            });
            
            res.json({
                message: 'Spend approved successfully',
                status: 'approved',
                amount_cents: spendRequest.amountCents,
                new_balance_cents: newBalance
            });
        } else if (result.action === 'deny') {
            // Update spend request
            await prisma.spendRequest.update({
                where: { id: approval.spendRequest.id },
                data: {
                    status: 'denied',
                    denialReason: 'human_denied',
                    resolvedAt: new Date(),
                    resolvedBy: 'email_action'
                }
            });
            
            // Update approval
            await prisma.approval.update({
                where: { id: approval.id },
                data: {
                    status: 'denied',
                    resolvedAt: new Date(),
                    resolvedBy: 'email_action',
                    resolution_note: 'Denied via email one-click action'
                }
            });
            
            res.json({
                message: 'Spend denied',
                status: 'denied'
            });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Action execution error:', error);
        res.status(500).json({ error: 'Failed to execute action' });
    }
});

module.exports = router;
