const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { hashApiKey } = require('../utils/ids');
const { logger, events } = require('../lib/logger');
const { trackFailedAuth } = require('../services/security-alerts');

const prisma = new PrismaClient();

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    // Ensure equal length for timing-safe comparison
    if (bufA.length !== bufB.length) {
        // Compare against itself to maintain constant time
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generic unauthorized response (prevents enumeration)
 */
function unauthorizedResponse(req, res, reason = 'Invalid or missing credentials') {
    events.authFailed({
        request_id: req.requestId,
        ip: req.ip,
        path: req.path,
    });
    
    // Track failed auth for security alerts (fire and forget)
    trackFailedAuth(req.ip, req.path, reason).catch(() => {});
    
    return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Invalid or missing credentials',
        request_id: req.requestId,
    });
}

/**
 * Middleware to authenticate with JWT (org session from dashboard)
 */
async function requireOrgAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorizedResponse(req, res);
        }
        
        const token = authHeader.substring(7);
        
        // Check if it's an API key (starts with sk_)
        if (token.startsWith('sk_')) {
            return res.status(401).json({ 
                error: 'unauthorized',
                message: 'API key not allowed for this endpoint. Use JWT token.',
                request_id: req.requestId,
            });
        }
        
        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Load organization
        const org = await prisma.organization.findUnique({
            where: { id: decoded.org_id }
        });
        
        if (!org) {
            return unauthorizedResponse(req, res);
        }
        
        req.org = org;
        req.authType = 'jwt';
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return unauthorizedResponse(req, res);
        }
        logger.error({ 
            error: error.message, 
            request_id: req.requestId 
        }, 'Auth error');
        return res.status(500).json({ 
            error: 'internal_server_error',
            message: 'Authentication failed',
            request_id: req.requestId,
        });
    }
}

/**
 * Middleware to authenticate with API key
 * Supports both "Authorization: Bearer sk_xxx" and "X-API-Key: sk_xxx" headers
 * Uses timing-safe comparison to prevent timing attacks
 */
async function requireApiKeyAuth(req, res, next) {
    try {
        let token = null;
        
        // Check X-API-Key header first (preferred for API keys)
        if (req.headers['x-api-key']) {
            token = req.headers['x-api-key'];
        } else {
            // Fall back to Authorization: Bearer header
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        
        if (!token) {
            return unauthorizedResponse(req, res);
        }
        
        // Must be an API key
        if (!token.startsWith('sk_')) {
            return unauthorizedResponse(req, res);
        }
        
        // Hash the key and look it up
        const keyHash = hashApiKey(token);
        
        // Find all potential matching keys (we'll do timing-safe comparison)
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                isActive: true,
            },
            include: {
                organization: true
            }
        });
        
        // Re-query with hash to find the actual key
        // This is a two-step process: first find active keys, then timing-safe compare
        const matchedKey = await prisma.apiKey.findFirst({
            where: {
                keyHash: keyHash,
                isActive: true
            },
            include: {
                organization: true
            }
        });
        
        if (!matchedKey) {
            // Generic error - don't reveal if key exists but is inactive
            return unauthorizedResponse(req, res);
        }
        
        // Update last used (async, don't wait)
        prisma.apiKey.update({
            where: { id: matchedKey.id },
            data: { lastUsedAt: new Date() }
        }).catch(err => {
            logger.warn({ error: err.message }, 'Failed to update API key lastUsedAt');
        });
        
        req.org = matchedKey.organization;
        req.apiKey = matchedKey;
        req.authType = 'api_key';
        next();
    } catch (error) {
        logger.error({ 
            error: error.message, 
            request_id: req.requestId 
        }, 'API Key auth error');
        return res.status(500).json({ 
            error: 'internal_server_error',
            message: 'Authentication failed',
            request_id: req.requestId,
        });
    }
}

/**
 * Middleware that accepts either JWT or API key
 * Supports X-API-Key header, Authorization: Bearer sk_xxx, or Authorization: Bearer <JWT>
 */
async function requireAuth(req, res, next) {
    try {
        // Check X-API-Key header first (prioritize API key auth)
        if (req.headers['x-api-key']) {
            return requireApiKeyAuth(req, res, next);
        }
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorizedResponse(req, res);
        }
        
        const token = authHeader.substring(7);
        
        // Check if it's an API key
        if (token.startsWith('sk_')) {
            return requireApiKeyAuth(req, res, next);
        } else {
            return requireOrgAuth(req, res, next);
        }
    } catch (error) {
        logger.error({ 
            error: error.message, 
            request_id: req.requestId 
        }, 'Auth error');
        return res.status(500).json({ 
            error: 'internal_server_error',
            message: 'Authentication failed',
            request_id: req.requestId,
        });
    }
}

/**
 * Middleware to restrict agent keys to specific endpoints
 * Use after requireAuth
 */
function restrictAgentKeys(allowedEndpoints = []) {
    return (req, res, next) => {
        if (req.authType === 'api_key' && req.apiKey.keyType === 'agent') {
            const path = req.path;
            const isAllowed = allowedEndpoints.some(endpoint => {
                if (endpoint.endsWith('*')) {
                    return path.startsWith(endpoint.slice(0, -1));
                }
                return path === endpoint || path.startsWith(endpoint + '/');
            });
            
            if (!isAllowed) {
                return res.status(403).json({ 
                    error: 'forbidden',
                    message: 'Agent keys can only access spend and balance endpoints',
                    request_id: req.requestId,
                });
            }
        }
        next();
    };
}

/**
 * Middleware to block agent keys from write operations on governance endpoints
 * Agent keys can read policies and escrows but cannot create/update/delete them
 */
function requireOwnerKey(req, res, next) {
    // If authenticated with API key and it's an agent key, block write operations
    if (req.authType === 'api_key' && req.apiKey.keyType === 'agent') {
        return res.status(403).json({ 
            error: 'forbidden',
            message: 'Agent keys cannot modify governance settings. Use an owner key instead.',
            request_id: req.requestId,
        });
    }
    next();
}

/**
 * Middleware to check if the user can modify a locked policy
 * Requires policy ID in params
 */
async function canModifyPolicy(req, res, next) {
    try {
        const policyId = req.params.id;
        if (!policyId) {
            return next();
        }

        const policy = await prisma.spendingPolicy.findUnique({
            where: { id: policyId }
        });

        if (!policy) {
            return res.status(404).json({ 
                error: 'not_found',
                message: 'Policy not found',
                request_id: req.requestId,
            });
        }

        // Check ownership
        if (policy.orgId !== req.org.id) {
            return res.status(404).json({ 
                error: 'not_found',
                message: 'Policy not found',
                request_id: req.requestId,
            });
        }

        // Agent keys can never modify policies (even unlocked ones)
        if (req.authType === 'api_key' && req.apiKey.keyType === 'agent') {
            return res.status(403).json({ 
                error: 'forbidden',
                message: 'Agent keys cannot modify governance settings. Use an owner key instead.',
                request_id: req.requestId,
            });
        }

        req.policy = policy;
        next();
    } catch (error) {
        logger.error({ error: error.message }, 'Error in canModifyPolicy middleware');
        return res.status(500).json({ 
            error: 'internal_server_error',
            request_id: req.requestId,
        });
    }
}

/**
 * RBAC Middleware - Check if user has required permission for the action
 * Must be used after requireOrgAuth
 */
const rbacService = require('../services/rbac-service');

function requirePermission(permission) {
    return async (req, res, next) => {
        try {
            // API key auth bypasses RBAC (handled by requireOwnerKey and restrictAgentKeys)
            if (req.authType === 'api_key') {
                return next();
            }
            
            // JWT auth - check user's role
            if (!req.org || !req.userEmail) {
                return res.status(401).json({
                    error: 'unauthorized',
                    message: 'Authentication required',
                    request_id: req.requestId,
                });
            }
            
            const role = await rbacService.getUserRole(req.org.id, req.userEmail);
            
            if (!role) {
                return res.status(403).json({
                    error: 'forbidden',
                    message: 'You are not a member of this organization',
                    request_id: req.requestId,
                });
            }
            
            req.userRole = role;
            
            if (!rbacService.hasPermission(role, permission)) {
                return res.status(403).json({
                    error: 'forbidden',
                    message: `Your role (${role}) does not have permission to perform this action`,
                    required_permission: permission,
                    request_id: req.requestId,
                });
            }
            
            next();
        } catch (error) {
            logger.error({ error: error.message }, 'Error in requirePermission middleware');
            return res.status(500).json({
                error: 'internal_server_error',
                request_id: req.requestId,
            });
        }
    };
}

/**
 * Middleware to check if user is org owner
 */
async function requireOrgOwner(req, res, next) {
    try {
        if (req.authType === 'api_key') {
            return res.status(403).json({
                error: 'forbidden',
                message: 'This action requires org owner authentication, not API key',
                request_id: req.requestId,
            });
        }
        
        const role = await rbacService.getUserRole(req.org.id, req.userEmail);
        
        if (role !== 'owner') {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Only the organization owner can perform this action',
                request_id: req.requestId,
            });
        }
        
        req.userRole = role;
        next();
    } catch (error) {
        logger.error({ error: error.message }, 'Error in requireOrgOwner middleware');
        return res.status(500).json({
            error: 'internal_server_error',
            request_id: req.requestId,
        });
    }
}

/**
 * Middleware to check if user can approve (finance_admin or owner)
 */
async function requireApprover(req, res, next) {
    try {
        if (req.authType === 'api_key') {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Approvals require human authentication, not API key',
                request_id: req.requestId,
            });
        }
        
        const role = await rbacService.getUserRole(req.org.id, req.userEmail);
        
        if (!['owner', 'finance_admin'].includes(role)) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Only owners and finance admins can approve or deny spends',
                your_role: role,
                request_id: req.requestId,
            });
        }
        
        req.userRole = role;
        next();
    } catch (error) {
        logger.error({ error: error.message }, 'Error in requireApprover middleware');
        return res.status(500).json({
            error: 'internal_server_error',
            request_id: req.requestId,
        });
    }
}

module.exports = {
    requireAuth,
    requireOrgAuth,
    requireApiKeyAuth,
    restrictAgentKeys,
    requireOwnerKey,
    canModifyPolicy,
    requirePermission,
    requireOrgOwner,
    requireApprover,
    timingSafeEqual,
    prisma
};
