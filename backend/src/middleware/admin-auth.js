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
 * Rejects org JWTs and API keys - only admin JWTs are allowed
 */
async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Missing or invalid authorization header',
                request_id: req.requestId
            });
        }

        const token = authHeader.substring(7);

        // Reject API keys immediately
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
