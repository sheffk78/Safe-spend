/**
 * Blog Admin API Routes
 * Admin endpoints for managing blog posts (requires admin auth)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const blogService = require('../services/blog-service');
const adminKeyService = require('../services/admin-key-service');
const { requireAdmin } = require('../middleware/admin-auth');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

// Configure multer for image uploads
const UPLOAD_DIR = path.join(__dirname, '../../uploads/blog-images');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp_randomhex.ext
        const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

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
 * POST /api/admin/blog/images
 * Upload an image for blog posts
 * Returns the URL to the uploaded image
 */
router.post('/images', requireAdminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: { 
                    code: 'NO_FILE', 
                    message: 'No image file provided' 
                } 
            });
        }

        // Build the public URL for the uploaded image
        const baseUrl = process.env.REACT_APP_BACKEND_URL || process.env.BASE_URL || '';
        const imageUrl = `${baseUrl}/api/uploads/blog-images/${req.file.filename}`;
        
        console.log(`[BLOG AUDIT] Image uploaded: ${req.file.filename} by ${JSON.stringify(req.adminAuth)}`);

        res.status(201).json({
            success: true,
            image: {
                url: imageUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ 
            error: { 
                code: 'UPLOAD_FAILED', 
                message: error.message || 'Failed to upload image' 
            } 
        });
    }
});

/**
 * GET /api/admin/blog/images
 * List all uploaded blog images
 */
router.get('/images', requireAdminAuth, async (req, res) => {
    try {
        const files = fs.readdirSync(UPLOAD_DIR);
        const baseUrl = process.env.REACT_APP_BACKEND_URL || process.env.BASE_URL || '';
        
        const images = files
            .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
            .map(filename => {
                const filePath = path.join(UPLOAD_DIR, filename);
                const stats = fs.statSync(filePath);
                return {
                    filename,
                    url: `${baseUrl}/api/uploads/blog-images/${filename}`,
                    size: stats.size,
                    uploadedAt: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        res.json({ images, total: images.length });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({ error: 'Failed to list images' });
    }
});

/**
 * DELETE /api/admin/blog/images/:filename
 * Delete an uploaded image
 */
router.delete('/images/:filename', requireAdminAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(UPLOAD_DIR, filename);
        
        // Security check: prevent path traversal
        if (!filePath.startsWith(UPLOAD_DIR)) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        fs.unlinkSync(filePath);
        
        console.log(`[BLOG AUDIT] Image deleted: ${filename} by ${JSON.stringify(req.adminAuth)}`);
        
        res.json({ success: true, message: 'Image deleted' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
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
