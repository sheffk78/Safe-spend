/**
 * Admin Authentication Routes
 * Separate auth system for Agentic Trust internal operators
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { logger } = require('../lib/logger');
const { generateId } = require('../utils/ids');

const router = express.Router();

// Use separate secret for admin JWT (falls back to main secret)
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const ADMIN_JWT_EXPIRY = '8h'; // Shorter expiry for admin sessions

// Validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

/**
 * POST /admin/auth/login
 * Admin login - issues admin JWT
 */
router.post('/login', async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'Invalid email or password format',
                request_id: req.requestId
            });
        }

        const { email, password } = validation.data;

        // Find admin user
        const admin = await prisma.adminUser.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!admin || !admin.isActive) {
            // Generic error to prevent enumeration
            logger.warn({ email, request_id: req.requestId }, 'Admin login failed: user not found or inactive');
            return res.status(401).json({
                error: 'invalid_credentials',
                message: 'Invalid email or password',
                request_id: req.requestId
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.passwordHash);
        if (!validPassword) {
            logger.warn({ email, request_id: req.requestId }, 'Admin login failed: invalid password');
            return res.status(401).json({
                error: 'invalid_credentials',
                message: 'Invalid email or password',
                request_id: req.requestId
            });
        }

        // Update last login
        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() }
        });

        // Generate admin JWT
        const token = jwt.sign(
            {
                admin_id: admin.id,
                email: admin.email,
                role: admin.role,
                type: 'admin'
            },
            ADMIN_JWT_SECRET,
            { expiresIn: ADMIN_JWT_EXPIRY }
        );

        logger.info({ admin_id: admin.id, email: admin.email, request_id: req.requestId }, 'Admin login successful');

        res.json({
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        logger.error({ error: error.message, request_id: req.requestId }, 'Admin login error');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Login failed',
            request_id: req.requestId
        });
    }
});

/**
 * GET /admin/auth/me
 * Get current admin user info
 */
router.get('/me', async (req, res) => {
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

        // Verify admin JWT
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

        if (decoded.type !== 'admin') {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Invalid token type',
                request_id: req.requestId
            });
        }

        // Get admin user
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

        res.json({
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                lastLoginAt: admin.lastLoginAt,
                createdAt: admin.createdAt
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'unauthorized',
                message: 'Invalid or expired token',
                request_id: req.requestId
            });
        }
        logger.error({ error: error.message, request_id: req.requestId }, 'Admin /me error');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to get admin info',
            request_id: req.requestId
        });
    }
});

module.exports = router;
