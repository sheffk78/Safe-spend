/**
 * RBAC (Role-Based Access Control) Service
 * Manages organization members, roles, and permissions
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { generateId } = require('../utils/ids');

const prisma = new PrismaClient();

// Role definitions and permissions
const ROLES = {
    owner: {
        level: 100,
        permissions: [
            'fund_escrow',
            'create_policy',
            'modify_policy',
            'lock_policy',
            'approve_spend',
            'create_api_key',
            'view_data',
            'manage_org',
            'invite_members'
        ]
    },
    finance_admin: {
        level: 80,
        permissions: [
            'fund_escrow',
            'create_policy',
            'modify_policy',
            'lock_policy',
            'approve_spend',
            'create_api_key',
            'view_data'
        ]
    },
    developer: {
        level: 50,
        permissions: [
            'create_api_key',
            'view_data'
        ]
    },
    read_only: {
        level: 10,
        permissions: [
            'view_data'
        ]
    }
};

// Permission to action mapping
const PERMISSION_ACTIONS = {
    // Escrow operations
    'POST /v1/escrow-accounts': 'fund_escrow',
    'POST /v1/escrow-accounts/:id/fund': 'fund_escrow',
    'POST /v1/escrow-accounts/:id/pause': 'fund_escrow',
    'POST /v1/escrow-accounts/:id/resume': 'fund_escrow',
    'POST /v1/escrow-accounts/:id/close': 'fund_escrow',
    
    // Policy operations
    'POST /v1/policies': 'create_policy',
    'PATCH /v1/policies/:id': 'modify_policy',
    'PUT /v1/policies/:id': 'modify_policy',
    'DELETE /v1/policies/:id': 'modify_policy',
    'POST /v1/policies/:id/lock': 'lock_policy',
    'POST /v1/policies/:id/unlock': 'lock_policy',
    'POST /v1/policies/:id/archive': 'modify_policy',
    
    // Approval operations
    'POST /v1/approvals/:id/approve': 'approve_spend',
    'POST /v1/approvals/:id/deny': 'approve_spend',
    
    // API key operations
    'POST /v1/api-keys': 'create_api_key',
    'DELETE /v1/api-keys/:id': 'create_api_key',
    
    // Org management
    'POST /v1/team/invite': 'invite_members',
    'DELETE /v1/team/:id': 'invite_members',
    'PATCH /v1/team/:id': 'invite_members',
    'PATCH /v1/org/settings': 'manage_org',
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
    const roleConfig = ROLES[role];
    if (!roleConfig) return false;
    return roleConfig.permissions.includes(permission);
}

/**
 * Get required permission for an action
 */
function getRequiredPermission(method, path) {
    // Normalize path by replacing IDs with :id
    const normalizedPath = path.replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:id');
    const key = `${method} ${normalizedPath}`;
    return PERMISSION_ACTIONS[key] || null;
}

/**
 * Get user's role in an organization
 */
async function getUserRole(orgId, userEmail) {
    // Check if user is the org owner (original creator)
    const org = await prisma.organization.findUnique({
        where: { id: orgId }
    });
    
    if (org && org.email === userEmail) {
        return 'owner';
    }
    
    // Check OrgMember table
    const member = await prisma.orgMember.findFirst({
        where: {
            orgId,
            email: userEmail,
            status: 'active'
        }
    });
    
    return member?.role || null;
}

/**
 * Create an organization member
 */
async function createMember({ orgId, email, role, invitedBy }) {
    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const member = await prisma.orgMember.create({
        data: {
            id: generateId('orgMember'),
            orgId,
            email: email.toLowerCase(),
            role,
            status: 'pending',
            invitedBy,
            inviteToken,
            inviteExpiresAt
        }
    });
    
    return { member, inviteToken };
}

/**
 * Accept an invitation
 */
async function acceptInvite(inviteToken) {
    const member = await prisma.orgMember.findUnique({
        where: { inviteToken }
    });
    
    if (!member) {
        throw new Error('Invalid invite token');
    }
    
    if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
        throw new Error('Invite has expired');
    }
    
    if (member.status !== 'pending') {
        throw new Error('Invite already used');
    }
    
    const updated = await prisma.orgMember.update({
        where: { id: member.id },
        data: {
            status: 'active',
            inviteToken: null,
            inviteExpiresAt: null,
            joinedAt: new Date()
        }
    });
    
    return updated;
}

/**
 * Update member role
 */
async function updateMemberRole(memberId, newRole, updatedBy) {
    if (!ROLES[newRole]) {
        throw new Error('Invalid role');
    }
    
    const member = await prisma.orgMember.update({
        where: { id: memberId },
        data: { role: newRole }
    });
    
    return member;
}

/**
 * Remove member from organization
 */
async function removeMember(memberId) {
    const member = await prisma.orgMember.update({
        where: { id: memberId },
        data: { status: 'removed' }
    });
    
    return member;
}

/**
 * List organization members
 */
async function listMembers(orgId) {
    // Get org owner
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { email: true, name: true, createdAt: true }
    });
    
    // Get other members
    const members = await prisma.orgMember.findMany({
        where: {
            orgId,
            status: { in: ['active', 'pending'] }
        },
        orderBy: { createdAt: 'asc' }
    });
    
    // Combine owner with members
    const allMembers = [
        {
            id: 'owner',
            email: org.email,
            role: 'owner',
            status: 'active',
            joinedAt: org.createdAt,
            isOrgOwner: true
        },
        ...members.map(m => ({
            id: m.id,
            email: m.email,
            role: m.role,
            status: m.status,
            joinedAt: m.joinedAt,
            invitedBy: m.invitedBy,
            isOrgOwner: false
        }))
    ];
    
    return allMembers;
}

/**
 * Get members who can approve spends (finance_admin and owner)
 */
async function getApproverEmails(orgId) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { email: true }
    });
    
    const financeMembers = await prisma.orgMember.findMany({
        where: {
            orgId,
            status: 'active',
            role: { in: ['owner', 'finance_admin'] }
        },
        select: { email: true }
    });
    
    const emails = new Set([org.email]); // Owner always included
    financeMembers.forEach(m => emails.add(m.email));
    
    return Array.from(emails);
}

module.exports = {
    ROLES,
    PERMISSION_ACTIONS,
    hasPermission,
    getRequiredPermission,
    getUserRole,
    createMember,
    acceptInvite,
    updateMemberRole,
    removeMember,
    listMembers,
    getApproverEmails
};
