const express = require('express');
const prisma = require('../lib/prisma');
const { generateId } = require('../utils/ids');
const { requireAuth, requireOwnerKey } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /v1/policies
 * Create a new spending policy (draft by default)
 */
router.post('/', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const {
            escrow_id,
            name,
            purpose, // Free-form text for trust mandate purpose
            draft = true, // Default to draft for agent-led setup
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
            metadata = {},
            // AAV fields - full spec
            aav_enabled = false,
            authorized_agent_ids = [],
            aav_grant_ids = [],
            aav_enforcement_mode = null,  // null = inherit from escrow
            aav_required_autonomy_level,  // 1-4
            aav_required_actions = [],
            aav_map_vendors = false,
            aav_map_limits = false,
            // ARL Reputation fields
            min_reputation_score,
            reputation_spending_boost = false
        } = req.body;
        
        if (!escrow_id || !name) {
            return res.status(400).json({ error: 'escrow_id and name are required' });
        }
        
        // Validate AAV enforcement mode if provided
        if (aav_enforcement_mode !== null) {
            const validModes = ['none', 'warn', 'strict', 'verify', 'log_only'];
            if (!validModes.includes(aav_enforcement_mode)) {
                return res.status(400).json({ 
                    error: `Invalid aav_enforcement_mode. Must be one of: ${validModes.join(', ')}` 
                });
            }
        }
        
        // Validate autonomy level
        if (aav_required_autonomy_level !== undefined && 
            (aav_required_autonomy_level < 1 || aav_required_autonomy_level > 4)) {
            return res.status(400).json({
                error: 'aav_required_autonomy_level must be between 1 and 4'
            });
        }
        
        // Verify escrow account exists and belongs to org
        const escrow = await prisma.escrowAccount.findFirst({
            where: { id: escrow_id, orgId: req.org.id }
        });
        
        if (!escrow) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        const policyId = generateId('spendingPolicy');
        const status = draft ? 'draft' : 'active';
        
        const policy = await prisma.spendingPolicy.create({
            data: {
                id: policyId,
                escrowId: escrow_id,
                orgId: req.org.id,
                name,
                purpose: purpose || null,
                status,
                isActive: !draft, // isActive = false for drafts
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
                metadata: JSON.stringify(metadata),
                // AAV fields - full spec
                aavEnabled: aav_enabled,
                authorizedAgentIds: JSON.stringify(authorized_agent_ids),
                aavGrantIds: JSON.stringify(aav_grant_ids),
                aavEnforcementMode: aav_enforcement_mode,
                aavRequiredAutonomyLevel: aav_required_autonomy_level || null,
                aavRequiredActions: JSON.stringify(aav_required_actions),
                aavMapVendors: aav_map_vendors,
                aavMapLimits: aav_map_limits,
                // ARL Reputation
                minReputationScore: min_reputation_score != null ? parseInt(min_reputation_score) : null,
                reputationSpendingBoost: reputation_spending_boost
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: escrow_id,
                eventType: 'policy.created',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
                details: JSON.stringify({ 
                    policy_name: name, 
                    status,
                    created_as_draft: draft
                }),
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
        const { escrow_id, status } = req.query;
        
        const where = { orgId: req.org.id };
        if (escrow_id) where.escrowId = escrow_id;
        if (status) where.status = status;
        
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
 * POST /v1/policies/:id/lock
 * Lock (activate) a draft policy - makes it enforceable and prevents agent modification
 */
router.post('/:id/lock', requireAuth, requireOwnerKey, async (req, res) => {
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
        
        if (policy.status === 'active' && policy.lockedAt) {
            return res.status(400).json({ 
                error: 'Policy is already locked',
                locked_at: policy.lockedAt,
                locked_by: policy.lockedBy
            });
        }
        
        const updated = await prisma.spendingPolicy.update({
            where: { id: policy.id },
            data: {
                status: 'active',
                isActive: true,
                lockedAt: new Date(),
                lockedBy: req.org.id
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: policy.escrowId,
                eventType: 'policy.locked',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ 
                    policy_name: policy.name,
                    previous_status: policy.status
                }),
                ipAddress: req.ip
            }
        });
        
        res.json({
            message: 'Policy locked and activated',
            policy: formatPolicy(updated)
        });
    } catch (error) {
        console.error('Lock policy error:', error);
        res.status(500).json({ error: 'Failed to lock policy' });
    }
});

/**
 * POST /v1/policies/:id/unlock
 * Unlock a policy for editing (requires confirmation)
 */
router.post('/:id/unlock', requireAuth, requireOwnerKey, async (req, res) => {
    try {
        const { confirm } = req.body;
        
        if (!confirm) {
            return res.status(400).json({ 
                error: 'Confirmation required',
                message: 'Include { "confirm": true } to unlock this policy. This will allow modifications.',
            });
        }
        
        const policy = await prisma.spendingPolicy.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        if (!policy.lockedAt) {
            return res.status(400).json({ error: 'Policy is not locked' });
        }
        
        const updated = await prisma.spendingPolicy.update({
            where: { id: policy.id },
            data: {
                lockedAt: null,
                lockedBy: null
                // Keep status as 'active' - policy is still enforced, just editable
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: policy.escrowId,
                eventType: 'policy.unlocked',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ 
                    policy_name: policy.name,
                    was_locked_at: policy.lockedAt,
                    was_locked_by: policy.lockedBy
                }),
                ipAddress: req.ip
            }
        });
        
        res.json({
            message: 'Policy unlocked for editing',
            policy: formatPolicy(updated)
        });
    } catch (error) {
        console.error('Unlock policy error:', error);
        res.status(500).json({ error: 'Failed to unlock policy' });
    }
});

/**
 * PATCH /v1/policies/:id
 * Update a policy
 */
router.patch('/:id', requireAuth, requireOwnerKey, async (req, res) => {
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
        
        // Check if policy is locked
        if (policy.lockedAt) {
            return res.status(403).json({ 
                error: 'Policy is locked',
                message: 'This policy is locked and cannot be modified. Unlock it first using POST /v1/policies/:id/unlock',
                locked_at: policy.lockedAt,
                locked_by: policy.lockedBy
            });
        }
        
        const updateData = {};
        const allowedFields = [
            'name', 'purpose', 'is_active', 'status', 'draft',
            'per_transaction_limit_cents', 'daily_limit_cents', 'weekly_limit_cents', 'monthly_limit_cents',
            'allowed_vendors', 'blocked_vendors', 'vendor_match_mode',
            'allowed_categories', 'blocked_categories',
            'active_days', 'active_hours_start', 'active_hours_end', 'active_timezone',
            'auto_approve_under_cents', 'require_human_above_cents', 'approval_timeout_minutes',
            'metadata',
            // AAV fields
            'aav_enabled', 'authorized_agent_ids', 'aav_grant_ids', 'aav_enforcement_mode'
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
            'approval_timeout_minutes': 'approvalTimeoutMinutes',
            // AAV field mappings
            'aav_enabled': 'aavEnabled',
            'authorized_agent_ids': 'authorizedAgentIds',
            'aav_grant_ids': 'aavGrantIds',
            'aav_enforcement_mode': 'aavEnforcementMode'
        };
        
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                const dbField = fieldMap[field] || field;
                let value = req.body[field];
                
                // Handle JSON fields
                if (['allowedVendors', 'blockedVendors', 'allowedCategories', 'blockedCategories', 'activeDays', 'authorizedAgentIds', 'aavGrantIds'].includes(dbField)) {
                    value = JSON.stringify(value);
                }
                if (dbField === 'metadata') {
                    value = JSON.stringify(value);
                }
                
                // Handle draft -> status conversion
                if (field === 'draft') {
                    updateData['status'] = value ? 'draft' : 'active';
                    updateData['isActive'] = !value;
                } else {
                    updateData[dbField] = value;
                }
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
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
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
 * PUT /v1/policies/:id
 * Full update of a policy (same logic as PATCH)
 */
router.put('/:id', requireAuth, requireOwnerKey, async (req, res) => {
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
        
        // Check if policy is locked
        if (policy.lockedAt) {
            return res.status(403).json({ 
                error: 'Policy is locked',
                message: 'This policy is locked and cannot be modified. Unlock it first using POST /v1/policies/:id/unlock',
                locked_at: policy.lockedAt,
                locked_by: policy.lockedBy
            });
        }
        
        const updateData = {};
        const allowedFields = [
            'name', 'purpose', 'is_active', 'status', 'draft',
            'per_transaction_limit_cents', 'daily_limit_cents', 'weekly_limit_cents', 'monthly_limit_cents',
            'allowed_vendors', 'blocked_vendors', 'vendor_match_mode',
            'allowed_categories', 'blocked_categories',
            'active_days', 'active_hours_start', 'active_hours_end', 'active_timezone',
            'auto_approve_under_cents', 'require_human_above_cents', 'approval_timeout_minutes',
            'metadata', 'aav_enabled', 'authorized_agent_ids', 'aav_grant_ids', 'aav_enforcement_mode'
        ];
        
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
            'approval_timeout_minutes': 'approvalTimeoutMinutes',
            'aav_enabled': 'aavEnabled',
            'authorized_agent_ids': 'authorizedAgentIds',
            'aav_grant_ids': 'aavGrantIds',
            'aav_enforcement_mode': 'aavEnforcementMode'
        };
        
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                const dbField = fieldMap[field] || field;
                let value = req.body[field];
                
                if (['allowedVendors', 'blockedVendors', 'allowedCategories', 'blockedCategories', 'activeDays', 'authorizedAgentIds', 'aavGrantIds'].includes(dbField)) {
                    value = JSON.stringify(value);
                }
                if (dbField === 'metadata') {
                    value = JSON.stringify(value);
                }
                
                if (field === 'draft') {
                    updateData['status'] = value ? 'draft' : 'active';
                    updateData['isActive'] = !value;
                } else {
                    updateData[dbField] = value;
                }
            }
        }
        
        const updated = await prisma.spendingPolicy.update({
            where: { id: policy.id },
            data: updateData
        });
        
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: policy.escrowId,
                eventType: 'policy.updated',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
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
router.delete('/:id', requireAuth, requireOwnerKey, async (req, res) => {
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
        
        // Check if policy is locked
        if (policy.lockedAt) {
            return res.status(403).json({ 
                error: 'Policy is locked',
                message: 'This policy is locked and cannot be deleted. Unlock it first.',
                locked_at: policy.lockedAt
            });
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
 * POST /v1/policies/:id/archive
 * Archive a policy (soft delete - keeps for audit trail)
 */
router.post('/:id/archive', requireAuth, requireOwnerKey, async (req, res) => {
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
        
        const updated = await prisma.spendingPolicy.update({
            where: { id: policy.id },
            data: {
                status: 'archived',
                isActive: false
            }
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                escrowId: policy.escrowId,
                eventType: 'policy.archived',
                actorType: 'human',
                actorId: req.org.id,
                details: JSON.stringify({ policy_name: policy.name }),
                ipAddress: req.ip
            }
        });
        
        res.json({
            message: 'Policy archived',
            policy: formatPolicy(updated)
        });
    } catch (error) {
        console.error('Archive policy error:', error);
        res.status(500).json({ error: 'Failed to archive policy' });
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
        purpose: policy.purpose,
        status: policy.status,
        is_active: policy.isActive,
        is_locked: !!policy.lockedAt,
        locked_at: policy.lockedAt,
        locked_by: policy.lockedBy,
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
        // AAV fields - full spec
        aav_enabled: policy.aavEnabled,
        authorized_agent_ids: JSON.parse(policy.authorizedAgentIds || '[]'),
        aav_grant_ids: JSON.parse(policy.aavGrantIds || '[]'),
        aav_enforcement_mode: policy.aavEnforcementMode,
        aav_required_autonomy_level: policy.aavRequiredAutonomyLevel,
        aav_required_actions: JSON.parse(policy.aavRequiredActions || '[]'),
        aav_map_vendors: policy.aavMapVendors || false,
        aav_map_limits: policy.aavMapLimits || false,
        // ARL Reputation fields
        min_reputation_score: policy.minReputationScore,
        reputation_spending_boost: policy.reputationSpendingBoost || false,
        metadata: JSON.parse(policy.metadata || '{}'),
        created_at: policy.createdAt,
        updated_at: policy.updatedAt
    };
}

module.exports = router;
