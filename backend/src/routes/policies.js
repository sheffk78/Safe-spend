const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireAuth, restrictAgentKeys } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Agent keys should not be able to manage policies
// Only allow agent keys to access balance and spend endpoints
router.use(restrictAgentKeys(['/v1/spend', '/v1/escrow-accounts/*/balance']));

/**
 * POST /v1/policies
 * Create a new spending policy
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const {
            escrow_id,
            name,
            per_transaction_limit_cents,
            daily_limit_cents,
            weekly_limit_cents,
            monthly_limit_cents,
            allowed_vendors = [],
            blocked_vendors = [],
            vendor_match_mode = 'exact',
            allowed_categories = [],
            blocked_categories = [],
            active_days = ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start,
            active_hours_end,
            active_timezone = 'America/Denver',
            auto_approve_under_cents,
            require_human_above_cents,
            approval_timeout_minutes = 60,
            metadata = {}
        } = req.body;
        
        if (!escrow_id || !name) {
            return res.status(400).json({ error: 'escrow_id and name are required' });
        }
        
        // Verify escrow account exists and belongs to org
        const escrow = await prisma.escrowAccount.findFirst({
            where: { id: escrow_id, orgId: req.org.id }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        const policyId = generateId('spendingPolicy');
        const policy = await prisma.spendingPolicy.create({
            data: {
                id: policyId,
                escrowId: escrow_id,
                orgId: req.org.id,
                name,
                perTransactionLimitCents: per_transaction_limit_cents,
                dailyLimitCents: daily_limit_cents,
                weeklyLimitCents: weekly_limit_cents,
                monthlyLimitCents: monthly_limit_cents,
                allowedVendors: JSON.stringify(allowed_vendors),
                blockedVendors: JSON.stringify(blocked_vendors),
                vendorMatchMode: vendor_match_mode,
                allowedCategories: JSON.stringify(allowed_categories),
                blockedCategories: JSON.stringify(blocked_categories),
                activeDays: JSON.stringify(active_days),
                activeHoursStart: active_hours_start,
                activeHoursEnd: active_hours_end,
                activeTimezone: active_timezone,
                autoApproveUnderCents: auto_approve_under_cents,
                requireHumanAboveCents: require_human_above_cents,
                approvalTimeoutMinutes: approval_timeout_minutes,
                metadata: JSON.stringify(metadata)
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow_id,
                eventType: 'policy.created',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ policy_name: name }),
                ipAddress: req.ip
            }
        });
        
        res.status(201).json(formatPolicy(policy));
    } catch (error) {
        console.error('Create policy error:', error);
        res.status(500).json({ error: 'Failed to create policy' });
    }
});

/**
 * GET /v1/policies
 * List spending policies
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const { escrow_id } = req.query;
        
        const where = { orgId: req.org.id };
        if (escrow_id) where.escrowId = escrow_id;
        
        const policies = await prisma.spendingPolicy.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        
        res.json({
            data: policies.map(formatPolicy),
            total: policies.length
        });
    } catch (error) {
        console.error('List policies error:', error);
        res.status(500).json({ error: 'Failed to list policies' });
    }
});

/**
 * GET /v1/policies/:id
 * Get policy details
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const policy = await prisma.spendingPolicy.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        res.json(formatPolicy(policy));
    } catch (error) {
        console.error('Get policy error:', error);
        res.status(500).json({ error: 'Failed to get policy' });
    }
});

/**
 * PATCH /v1/policies/:id
 * Update a policy
 */
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const policy = await prisma.spendingPolicy.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        const updateData = {};
        const allowedFields = [
            'name', 'is_active',
            'per_transaction_limit_cents', 'daily_limit_cents', 'weekly_limit_cents', 'monthly_limit_cents',
            'allowed_vendors', 'blocked_vendors', 'vendor_match_mode',
            'allowed_categories', 'blocked_categories',
            'active_days', 'active_hours_start', 'active_hours_end', 'active_timezone',
            'auto_approve_under_cents', 'require_human_above_cents', 'approval_timeout_minutes',
            'metadata'
        ];
        
        // Map snake_case to camelCase
        const fieldMap = {
            'is_active': 'isActive',
            'per_transaction_limit_cents': 'perTransactionLimitCents',
            'daily_limit_cents': 'dailyLimitCents',
            'weekly_limit_cents': 'weeklyLimitCents',
            'monthly_limit_cents': 'monthlyLimitCents',
            'allowed_vendors': 'allowedVendors',
            'blocked_vendors': 'blockedVendors',
            'vendor_match_mode': 'vendorMatchMode',
            'allowed_categories': 'allowedCategories',
            'blocked_categories': 'blockedCategories',
            'active_days': 'activeDays',
            'active_hours_start': 'activeHoursStart',
            'active_hours_end': 'activeHoursEnd',
            'active_timezone': 'activeTimezone',
            'auto_approve_under_cents': 'autoApproveUnderCents',
            'require_human_above_cents': 'requireHumanAboveCents',
            'approval_timeout_minutes': 'approvalTimeoutMinutes'
        };
        
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                const dbField = fieldMap[field] || field;
                updateData[dbField] = req.body[field];
            }
        }
        
        const updated = await prisma.spendingPolicy.update({
            where: { id: policy.id },
            data: updateData
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: policy.escrowId,
                eventType: 'policy.updated',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ updated_fields: Object.keys(updateData) }),
                ipAddress: req.ip
            }
        });
        
        res.json(formatPolicy(updated));
    } catch (error) {
        console.error('Update policy error:', error);
        res.status(500).json({ error: 'Failed to update policy' });
    }
});

/**
 * DELETE /v1/policies/:id
 * Delete a policy
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const policy = await prisma.spendingPolicy.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        await prisma.spendingPolicy.delete({
            where: { id: policy.id }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: policy.escrowId,
                eventType: 'policy.deleted',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ policy_name: policy.name }),
                ipAddress: req.ip
            }
        });
        
        res.json({ message: 'Policy deleted' });
    } catch (error) {
        console.error('Delete policy error:', error);
        res.status(500).json({ error: 'Failed to delete policy' });
    }
});

/**
 * Format policy for API response
 */
function formatPolicy(policy) {
    return {
        id: policy.id,
        escrow_id: policy.escrowId,
        name: policy.name,
        is_active: policy.isActive,
        per_transaction_limit_cents: policy.perTransactionLimitCents,
        daily_limit_cents: policy.dailyLimitCents,
        weekly_limit_cents: policy.weeklyLimitCents,
        monthly_limit_cents: policy.monthlyLimitCents,
        allowed_vendors: JSON.parse(policy.allowedVendors || '[]'),
        blocked_vendors: JSON.parse(policy.blockedVendors || '[]'),
        vendor_match_mode: policy.vendorMatchMode,
        allowed_categories: JSON.parse(policy.allowedCategories || '[]'),
        blocked_categories: JSON.parse(policy.blockedCategories || '[]'),
        active_days: JSON.parse(policy.activeDays || '[]'),
        active_hours_start: policy.activeHoursStart,
        active_hours_end: policy.activeHoursEnd,
        active_timezone: policy.activeTimezone,
        auto_approve_under_cents: policy.autoApproveUnderCents,
        require_human_above_cents: policy.requireHumanAboveCents,
        approval_timeout_minutes: policy.approvalTimeoutMinutes,
        metadata: JSON.parse(policy.metadata || '{}'),
        created_at: policy.createdAt,
        updated_at: policy.updatedAt
    };
}

module.exports = router;
