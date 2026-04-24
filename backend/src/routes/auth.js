const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { generateId } = require('../utils/ids');
const { requireOrgAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /v1/auth/signup
 * Create a new organization account
 */
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        // Check if email already exists
        const existing = await prisma.organization.findUnique({
            where: { email: email.toLowerCase() }
        });
        
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create organization with prefixed ID
        const orgId = generateId('organization');
        const org = await prisma.organization.create({
            data: {
                id: orgId,
                name,
                email: email.toLowerCase(),
                passwordHash
            }
        });
        
        // Generate JWT
        const token = jwt.sign(
            { org_id: org.id, email: org.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Create audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: org.id,
                eventType: 'org.created',
                actorType: 'human',
                actorId: org.id,
                details: JSON.stringify({ email: org.email }),
                ipAddress: req.ip
            }
        });
        
        res.status(201).json({
            token,
            organization: {
                id: org.id,
                name: org.name,
                email: org.email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * POST /v1/auth/login
 * Authenticate and get JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find organization
        const org = await prisma.organization.findUnique({
            where: { email: email.toLowerCase() }
        });
        
        if (!org) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Verify password
        const validPassword = await bcrypt.compare(password, org.passwordHash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { org_id: org.id, email: org.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Create audit event
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: org.id,
                eventType: 'org.login',
                actorType: 'human',
                actorId: org.id,
                details: JSON.stringify({}),
                ipAddress: req.ip
            }
        });
        
        res.json({
            token,
            organization: {
                id: org.id,
                name: org.name,
                email: org.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /v1/auth/me
 * Get current organization profile
 */
router.get('/me', requireOrgAuth, async (req, res) => {
    res.json({
        id: req.org.id,
        name: req.org.name,
        email: req.org.email,
        createdAt: req.org.createdAt
    });
});

module.exports = router;
