/**
 * Team Management Routes
 * Handles organization member management (RBAC)
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireOrgAuth, requireOrgOwner, requirePermission } = require('../middleware/auth');
const rbacService = require('../services/rbac-service');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /v1/team
 * List organization members
 */
router.get('/', requireOrgAuth, async (req, res) => {
    try {
        const members = await rbacService.listMembers(req.org.id);
        
        // Get current user's role
        const currentUserRole = await rbacService.getUserRole(req.org.id, req.userEmail);
        
        res.json({
            data: members,
            total: members.length,
            current_user: {
                email: req.userEmail,
                role: currentUserRole
            }
        });
    } catch (error) {
        console.error('List team error:', error);
        res.status(500).json({ error: 'Failed to list team members' });
    }
});

/**
 * GET /v1/team/roles
 * Get available roles and their permissions
 */
router.get('/roles', requireOrgAuth, async (req, res) => {
    const roles = Object.entries(rbacService.ROLES).map(([name, config]) => ({
        name,
        level: config.level,
        permissions: config.permissions,
        description: getRoleDescription(name)
    }));
    
    res.json({ roles });
});

/**
 * POST /v1/team/invite
 * Invite a new member to the organization
 */
router.post('/invite', requireOrgAuth, requireOrgOwner, async (req, res) => {
    try {
        const { email, role } = req.body;
        
        if (!email || !role) {
            return res.status(400).json({ error: 'email and role are required' });
        }
        
        if (!rbacService.ROLES[role]) {
            return res.status(400).json({ 
                error: 'Invalid role',
                valid_roles: Object.keys(rbacService.ROLES)
            });
        }
        
        if (role === 'owner') {
            return res.status(400).json({ 
                error: 'Cannot invite someone as owner. There can only be one owner per organization.' 
            });
        }
        
        const normalizedEmail = email.toLowerCase();
        
        // Check if already a member
        const existing = await prisma.orgMember.findFirst({
            where: {
                orgId: req.org.id,
                email: normalizedEmail,
                status: { in: ['active', 'pending'] }
            }
        });
        
        if (existing) {
            return res.status(400).json({ 
                error: 'User is already a member or has a pending invite',
                status: existing.status
            });
        }
        
        // Check if this is the org owner email
        if (normalizedEmail === req.org.email.toLowerCase()) {
            return res.status(400).json({ 
                error: 'Cannot invite the organization owner as a member' 
            });
        }
        
        const { member, inviteToken } = await rbacService.createMember({
            orgId: req.org.id,
            email: normalizedEmail,
            role,
            invitedBy: req.userEmail
        });
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'member.invited',
                actorType: 'human',
                actorId: req.userEmail,
                details: JSON.stringify({
                    invited_email: normalizedEmail,
                    role,
                    member_id: member.id
                }),
                ipAddress: req.ip
            }
        });
        
        // TODO: Send invite email via Postmark
        // For now, return the invite token (in production, this would be sent via email)
        const inviteUrl = `${process.env.FRONTEND_URL || 'https://safespend.app'}/invite/${inviteToken}`;
        
        res.status(201).json({
            message: 'Invitation sent',
            member: {
                id: member.id,
                email: member.email,
                role: member.role,
                status: member.status
            },
            invite_url: inviteUrl // Only for development/testing
        });
    } catch (error) {
        console.error('Invite member error:', error);
        res.status(500).json({ error: 'Failed to invite member' });
    }
});

/**
 * POST /v1/team/accept-invite
 * Accept an invitation to join an organization
 */
router.post('/accept-invite', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Invite token is required' });
        }
        
        const member = await rbacService.acceptInvite(token);
        
        // Get org info
        const org = await prisma.organization.findUnique({
            where: { id: member.orgId },
            select: { id: true, name: true }
        });
        
        res.json({
            message: 'Invitation accepted',
            organization: {
                id: org.id,
                name: org.name
            },
            role: member.role
        });
    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /v1/team/invite/:token
 * Get invite details (for invite acceptance page)
 */
router.get('/invite/:token', async (req, res) => {
    try {
        const member = await prisma.orgMember.findUnique({
            where: { inviteToken: req.params.token },
            include: {
                organization: {
                    select: { id: true, name: true }
                }
            }
        });
        
        if (!member) {
            return res.status(404).json({ error: 'Invalid invite token' });
        }
        
        if (member.status !== 'pending') {
            return res.status(400).json({ error: 'Invite has already been used' });
        }
        
        if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
            return res.status(400).json({ error: 'Invite has expired' });
        }
        
        res.json({
            organization: {
                id: member.organization.id,
                name: member.organization.name
            },
            email: member.email,
            role: member.role,
            expires_at: member.inviteExpiresAt
        });
    } catch (error) {
        console.error('Get invite error:', error);
        res.status(500).json({ error: 'Failed to get invite details' });
    }
});

/**
 * PATCH /v1/team/:id
 * Update member role
 */
router.patch('/:id', requireOrgAuth, requireOrgOwner, async (req, res) => {
    try {
        const { role } = req.body;
        
        if (!role) {
            return res.status(400).json({ error: 'role is required' });
        }
        
        if (!rbacService.ROLES[role]) {
            return res.status(400).json({ 
                error: 'Invalid role',
                valid_roles: Object.keys(rbacService.ROLES).filter(r => r !== 'owner')
            });
        }
        
        if (role === 'owner') {
            return res.status(400).json({ 
                error: 'Cannot change role to owner. Use ownership transfer instead.' 
            });
        }
        
        // Find member
        const member = await prisma.orgMember.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id,
                status: 'active'
            }
        });
        
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        const updated = await rbacService.updateMemberRole(member.id, role, req.userEmail);
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'member.role_changed',
                actorType: 'human',
                actorId: req.userEmail,
                details: JSON.stringify({
                    member_id: member.id,
                    member_email: member.email,
                    old_role: member.role,
                    new_role: role
                }),
                ipAddress: req.ip
            }
        });
        
        res.json({
            message: 'Member role updated',
            member: {
                id: updated.id,
                email: updated.email,
                role: updated.role
            }
        });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: error.message || 'Failed to update member' });
    }
});

/**
 * DELETE /v1/team/:id
 * Remove member from organization
 */
router.delete('/:id', requireOrgAuth, requireOrgOwner, async (req, res) => {
    try {
        const member = await prisma.orgMember.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id,
                status: { in: ['active', 'pending'] }
            }
        });
        
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        await rbacService.removeMember(member.id);
        
        // Audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'member.removed',
                actorType: 'human',
                actorId: req.userEmail,
                details: JSON.stringify({
                    member_id: member.id,
                    member_email: member.email,
                    member_role: member.role
                }),
                ipAddress: req.ip
            }
        });
        
        res.json({ message: 'Member removed' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

/**
 * GET /v1/team/my-role
 * Get current user's role in the organization
 */
router.get('/my-role', requireOrgAuth, async (req, res) => {
    try {
        const role = await rbacService.getUserRole(req.org.id, req.userEmail);
        const roleConfig = rbacService.ROLES[role];
        
        res.json({
            email: req.userEmail,
            role,
            permissions: roleConfig?.permissions || [],
            organization: {
                id: req.org.id,
                name: req.org.name
            }
        });
    } catch (error) {
        console.error('Get my role error:', error);
        res.status(500).json({ error: 'Failed to get role' });
    }
});

/**
 * Helper function to get role descriptions
 */
function getRoleDescription(role) {
    const descriptions = {
        owner: 'Full access to all organization settings, billing, and team management',
        finance_admin: 'Can fund escrows, create policies, and approve/deny spend requests',
        developer: 'Can create API keys and view data, but cannot modify policies or approve spends',
        read_only: 'Can only view data, no write access'
    };
    return descriptions[role] || '';
}

module.exports = router;
