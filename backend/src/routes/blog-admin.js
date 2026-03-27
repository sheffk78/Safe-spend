/**
 * Blog Admin API Routes
 * Admin endpoints for managing blog posts (requires admin auth)
 */

const express = require('express');
const router = express.Router();
const blogService = require('../services/blog-service');
const adminKeyService = require('../services/admin-key-service');
const { requireAdmin } = require('../middleware/admin-auth');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

/**
 * Admin authentication middleware
 * Accepts either admin API key OR admin JWT session
 */
const requireAdminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        
        const token = authHeader.substring(7);
        
        // Check if it's an admin API key (starts with ss_admin_)
        if (token.startsWith(adminKeyService.KEY_PREFIX)) {
            const adminKey = await adminKeyService.validateAdminKey(token);
            if (adminKey) {
                req.adminAuth = { type: 'api_key', keyId: adminKey.id, keyName: adminKey.name };
                return next();
            }
            return res.status(401).json({ error: 'Invalid admin API key' });
        }
        
        // Otherwise, try to verify as admin JWT
        try {
            const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
            
            // Check if it's an admin token
            if (decoded.type === 'admin' && decoded.admin_id) {
                const admin = await prisma.adminUser.findUnique({
                    where: { id: decoded.admin_id }
                });
                
                if (admin && admin.isActive) {
                    req.adminAuth = { type: 'jwt', adminId: admin.id, adminEmail: admin.email };
                    req.admin = admin;
                    return next();
                }
            }
            
            return res.status(403).json({ error: 'This endpoint requires admin authentication' });
        } catch (jwtError) {
            return res.status(401).json({ error: 'Invalid or expired admin token' });
        }
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
};

/**
 * POST /api/admin/blog/posts
 * Create a new blog post
 */
router.post('/posts', requireAdminAuth, async (req, res) => {
    try {
        const post = await blogService.createPost(req.body);
        
        // Log to audit (if audit service exists)
        console.log(`[BLOG AUDIT] Post created: ${post.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({ error: 'Failed to create post', details: error.message });
    }
});

/**
 * GET /api/admin/blog/posts
 * List all posts (drafts, published, archived)
 */
router.get('/posts', requireAdminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        
        const result = await blogService.listAllPosts({
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
            status
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error listing blog posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

/**
 * GET /api/admin/blog/posts/:id
 * Get any post by ID
 */
router.get('/posts/:id', requireAdminAuth, async (req, res) => {
    try {
        const post = await blogService.getPostById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json(post);
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

/**
 * PUT /api/admin/blog/posts/:id
 * Update a post (partial updates supported)
 */
router.put('/posts/:id', requireAdminAuth, async (req, res) => {
    try {
        const post = await blogService.updatePost(req.params.id, req.body);
        
        console.log(`[BLOG AUDIT] Post updated: ${post.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json(post);
    } catch (error) {
        console.error('Error updating blog post:', error);
        
        if (error.message === 'Post not found') {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.status(500).json({ error: 'Failed to update post', details: error.message });
    }
});

/**
 * DELETE /api/admin/blog/posts/:id
 * Soft delete (archive) or hard delete with ?hard=true
 */
router.delete('/posts/:id', requireAdminAuth, async (req, res) => {
    try {
        const hard = req.query.hard === 'true';
        const result = await blogService.deletePost(req.params.id, hard);
        
        console.log(`[BLOG AUDIT] Post ${hard ? 'hard' : 'soft'} deleted: ${req.params.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json(result);
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

/**
 * POST /api/admin/blog/posts/:id/publish
 * Publish a draft post
 */
router.post('/posts/:id/publish', requireAdminAuth, async (req, res) => {
    try {
        const post = await blogService.publishPost(req.params.id);
        
        console.log(`[BLOG AUDIT] Post published: ${post.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json(post);
    } catch (error) {
        console.error('Error publishing blog post:', error);
        
        if (error.message === 'Post not found') {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.status(500).json({ error: 'Failed to publish post' });
    }
});

/**
 * POST /api/admin/blog/posts/:id/unpublish
 * Revert to draft
 */
router.post('/posts/:id/unpublish', requireAdminAuth, async (req, res) => {
    try {
        const post = await blogService.unpublishPost(req.params.id);
        
        console.log(`[BLOG AUDIT] Post unpublished: ${post.id} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json(post);
    } catch (error) {
        console.error('Error unpublishing blog post:', error);
        res.status(500).json({ error: 'Failed to unpublish post' });
    }
});

/**
 * POST /api/admin/blog/posts/:id/export
 * Export post with Dev.to frontmatter (nice-to-have)
 */
router.post('/posts/:id/export', requireAdminAuth, async (req, res) => {
    try {
        const format = req.query.format || 'markdown';
        const post = await blogService.getPostById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        if (format === 'devto') {
            const devtoContent = `---
title: ${post.title}
published: false
description: ${post.excerpt}
tags: ${post.tags.join(', ')}
canonical_url: ${post.seo.canonical_url}
cover_image: ${post.cover_image?.url || ''}
---

${post.content}`;
            
            res.set('Content-Type', 'text/markdown');
            res.send(devtoContent);
        } else {
            res.set('Content-Type', 'text/markdown');
            res.send(post.content);
        }
    } catch (error) {
        console.error('Error exporting blog post:', error);
        res.status(500).json({ error: 'Failed to export post' });
    }
});

module.exports = { router, requireAdminAuth };
