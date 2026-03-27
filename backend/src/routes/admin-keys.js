/**
 * Admin API Keys Routes
 * Endpoints for managing admin API keys
 */

const express = require('express');
const router = express.Router();
const adminKeyService = require('../services/admin-key-service');
const { requireAdminAuth } = require('./blog-admin');

/**
 * POST /api/admin/keys
 * Generate a new admin API key
 */
router.post('/', requireAdminAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const createdBy = req.adminAuth.adminId || req.adminAuth.userId || req.adminAuth.keyName;
        
        const key = await adminKeyService.generateAdminKey({
            name,
            description,
            createdBy
        });
        
        console.log(`[ADMIN AUDIT] API key created: ${key.key_id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.status(201).json(key);
    } catch (error) {
        console.error('Error creating admin key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

/**
 * GET /api/admin/keys
 * List all admin API keys
 */
router.get('/', requireAdminAuth, async (req, res) => {
    try {
        const keys = await adminKeyService.listAdminKeys();
        res.json({ keys });
    } catch (error) {
        console.error('Error listing admin keys:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

/**
 * POST /api/admin/keys/:id/revoke
 * Revoke an admin API key
 */
router.post('/:id/revoke', requireAdminAuth, async (req, res) => {
    try {
        const result = await adminKeyService.revokeAdminKey(req.params.id);
        
        console.log(`[ADMIN AUDIT] API key revoked: ${req.params.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json(result);
    } catch (error) {
        console.error('Error revoking admin key:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
});

/**
 * DELETE /api/admin/keys/:id
 * Permanently delete an admin API key
 */
router.delete('/:id', requireAdminAuth, async (req, res) => {
    try {
        const result = await adminKeyService.deleteAdminKey(req.params.id);
        
        console.log(`[ADMIN AUDIT] API key deleted: ${req.params.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json(result);
    } catch (error) {
        console.error('Error deleting admin key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

module.exports = router;
