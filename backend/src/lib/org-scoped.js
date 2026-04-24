/**
 * Org-Scoped Database Helpers
 * Safe-Spend Production Hardening
 * 
 * Provides helper functions that ensure all database access is scoped to the requesting organization.
 * Prevents cross-org data access.
 */

const { PrismaClient } = require('@prisma/client');
const { NotFoundError, ForbiddenError } = require('../middleware/error-handler');

const prisma = new PrismaClient();

/**
 * Get escrow account for an organization
 * @throws NotFoundError if escrow doesn't exist or doesn't belong to org
 */
async function getEscrowForOrg(escrowId, orgId) {
    const escrow = await prisma.escrowAccount.findFirst({
        where: {
            id: escrowId,
            orgId: orgId,
        },
    });

    if (!escrow) {
        throw new NotFoundError('Escrow account not found');
    }

    return escrow;
}

/**
 * Get policy for an organization
 * @throws NotFoundError if policy doesn't exist or doesn't belong to org
 */
async function getPolicyForOrg(policyId, orgId) {
    const policy = await prisma.spendingPolicy.findFirst({
        where: {
            id: policyId,
            orgId: orgId,
        },
    });

    if (!policy) {
        throw new NotFoundError('Policy not found');
    }

    return policy;
}

/**
 * Get spend request for an organization
 * @throws NotFoundError if spend doesn't exist or doesn't belong to org
 */
async function getSpendForOrg(spendId, orgId) {
    const spend = await prisma.spendRequest.findFirst({
        where: {
            id: spendId,
            orgId: orgId,
        },
    });

    if (!spend) {
        throw new NotFoundError('Spend request not found');
    }

    return spend;
}

/**
 * Get approval for an organization
 * @throws NotFoundError if approval doesn't exist or doesn't belong to org
 */
async function getApprovalForOrg(approvalId, orgId) {
    const approval = await prisma.approval.findFirst({
        where: {
            id: approvalId,
            orgId: orgId,
        },
    });

    if (!approval) {
        throw new NotFoundError('Approval not found');
    }

    return approval;
}

/**
 * Get webhook for an organization
 * @throws NotFoundError if webhook doesn't exist or doesn't belong to org
 */
async function getWebhookForOrg(webhookId, orgId) {
    const webhook = await prisma.webhook.findFirst({
        where: {
            id: webhookId,
            orgId: orgId,
        },
    });

    if (!webhook) {
        throw new NotFoundError('Webhook not found');
    }

    return webhook;
}

/**
 * Get API key for an organization
 * @throws NotFoundError if key doesn't exist or doesn't belong to org
 */
async function getApiKeyForOrg(keyId, orgId) {
    const apiKey = await prisma.apiKey.findFirst({
        where: {
            id: keyId,
            orgId: orgId,
        },
    });

    if (!apiKey) {
        throw new NotFoundError('API key not found');
    }

    return apiKey;
}

/**
 * List escrow accounts for an organization
 */
async function listEscrowsForOrg(orgId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (status) {
        where.status = status;
    }

    return prisma.escrowAccount.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List policies for an organization
 */
async function listPoliciesForOrg(orgId, options = {}) {
    const { escrowId, isActive, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (escrowId) {
        where.escrowId = escrowId;
    }
    if (typeof isActive === 'boolean') {
        where.isActive = isActive;
    }

    return prisma.spendingPolicy.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List spend requests for an organization
 */
async function listSpendsForOrg(orgId, options = {}) {
    const { escrowId, status, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (escrowId) {
        where.escrowId = escrowId;
    }
    if (status) {
        where.status = status;
    }

    return prisma.spendRequest.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List approvals for an organization
 */
async function listApprovalsForOrg(orgId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (status) {
        where.status = status;
    }

    return prisma.approval.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List audit events for an organization
 */
async function listAuditEventsForOrg(orgId, options = {}) {
    const { eventType, escrowId, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (eventType) {
        where.eventType = eventType;
    }
    if (escrowId) {
        where.escrowId = escrowId;
    }

    return prisma.auditEvent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List webhooks for an organization
 */
async function listWebhooksForOrg(orgId, options = {}) {
    const { isActive, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (typeof isActive === 'boolean') {
        where.isActive = isActive;
    }

    return prisma.webhook.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * List API keys for an organization
 */
async function listApiKeysForOrg(orgId, options = {}) {
    const { isActive, keyType, limit = 50, offset = 0 } = options;
    
    const where = { orgId };
    if (typeof isActive === 'boolean') {
        where.isActive = isActive;
    }
    if (keyType) {
        where.keyType = keyType;
    }

    return prisma.apiKey.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Verify org ownership middleware factory
 * Creates middleware that loads a resource and verifies org ownership
 */
function verifyOrgOwnership(resourceType, paramName = 'id') {
    const getters = {
        escrow: getEscrowForOrg,
        policy: getPolicyForOrg,
        spend: getSpendForOrg,
        approval: getApprovalForOrg,
        webhook: getWebhookForOrg,
        apiKey: getApiKeyForOrg,
    };

    const getter = getters[resourceType];
    if (!getter) {
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            const orgId = req.org.id;
            
            req[resourceType] = await getter(resourceId, orgId);
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    // Single resource getters
    getEscrowForOrg,
    getPolicyForOrg,
    getSpendForOrg,
    getApprovalForOrg,
    getWebhookForOrg,
    getApiKeyForOrg,
    
    // List functions
    listEscrowsForOrg,
    listPoliciesForOrg,
    listSpendsForOrg,
    listApprovalsForOrg,
    listAuditEventsForOrg,
    listWebhooksForOrg,
    listApiKeysForOrg,
    
    // Middleware
    verifyOrgOwnership,
    
    // Prisma client for direct queries when needed
    prisma,
};
