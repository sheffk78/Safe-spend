/**
 * Admin Authentication Middleware
 * Separate from org auth - for Agentic Trust internal operators only
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../lib/logger');

const prisma = new PrismaClient();

// Use separate secret for admin JWT (falls back to main secret)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

/**
 * Middleware to require admin authentication
 * Supports both admin JWT tokens and ss_admin_ API keys
 */
async function requireAdmin(req, res, next) {
    try {
        // First check for X-Admin-Key header (API key auth)
        const adminKeyHeader = req.headers['x-admin-key'];
        if (adminKeyHeader && adminKeyHeader.startsWith('ss_admin_')) {
            const { validateAdminKey } = require('../services/admin-key-service');
            const keyResult = await validateAdminKey(adminKeyHeader);
            
            if (keyResult.error) {
                return res.status(403).json({
                    error: 'forbidden',
                    message: keyResult.error === 'INVALID_KEY' ? 'Invalid admin API key' : keyResult.error,
                    request_id: req.requestId
                });
            }
            
            // API key auth successful — create a synthetic admin object
            req.admin = {
                id: keyResult.id,
                email: 'api-key-auth',
                name: keyResult.label || 'API Key',
                role: 'superadmin',
                isActive: true
            };
            req.adminKey = keyResult;
            req.authType = 'admin_key';
            return next();
        }

        // Fall back to JWT Bearer token auth
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Missing or invalid authorization header. Use X-Admin-Key or Authorization: Bearer <token>',
                request_id: req.requestId
            });
        }

        const token = authHeader.substring(7);

        // Also allow ss_admin_ keys via Bearer header
        if (token.startsWith('ss_admin_')) {
            const { validateAdminKey } = require('../services/admin-key-service');
            const keyResult = await validateAdminKey(token);
            
            if (keyResult.error) {
                return res.status(403).json({
                    error: 'forbidden',
                    message: keyResult.error === 'INVALID_KEY' ? 'Invalid admin API key' : keyResult.error,
                    request_id: req.requestId
                });
            }
            
            req.admin = {
                id: keyResult.id,
                email: 'api-key-auth',
                name: keyResult.label || 'API Key',
                role: 'superadmin',
                isActive: true
            };
            req.adminKey = keyResult;
            req.authType = 'admin_key';
            return next();
        }

        // Reject org API keys
        if (token.startsWith('sk_')) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'API keys cannot access admin endpoints',
                request_id: req.requestId
            });
        }

        // Verify admin JWT
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

        // Must be an admin token
        if (decoded.type !== 'admin' || !decoded.admin_id) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'This endpoint requires admin authentication',
                request_id: req.requestId
            });
        }

        // Load admin user
        const admin = await prisma.adminUser.findUnique({
            where: { id: decoded.admin_id }
        });

        if (!admin || !admin.isActive) {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Admin user not found or inactive',
                request_id: req.requestId
            });
        }

        // Attach admin to request
        req.admin = admin;
        req.authType = 'admin';

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Invalid or expired admin token',
                request_id: req.requestId
            });
        }
        logger.error({ error: error.message, request_id: req.requestId }, 'Admin auth middleware error');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Authentication failed',
            request_id: req.requestId
        });
    }
}

/**
 * Middleware to require specific admin roles
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['superadmin', 'support'])
 */
function requireAdminRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Admin authentication required',
                request_id: req.requestId
            });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            logger.warn({
                admin_id: req.admin.id,
                role: req.admin.role,
                required_roles: allowedRoles,
                request_id: req.requestId
            }, 'Admin role check failed');

            return res.status(403).json({
                error: 'forbidden',
                message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
                request_id: req.requestId
            });
        }

        next();
    };
}

module.exports = {
    requireAdmin,
    requireAdminRole,
    ADMIN_JWT_SECRET
};
