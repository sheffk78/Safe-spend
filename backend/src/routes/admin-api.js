/**
 * Admin API Routes
 * Internal endpoints for platform operations, monitoring, and content management
 * 
 * Scopes:
 * - health: System health and status
 * - blog: Blog CRUD
 * - metrics: Platform metrics
 * - audit: Cross-org audit access
 * - keys: Admin key management
 * - *: All scopes (superadmin)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const adminKeyService = require('../services/admin-key-service');
const errorLogService = require('../services/error-log-service');
const blogService = require('../services/blog-service');

// Track server start time for uptime
const SERVER_START_TIME = Date.now();

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
        const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
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
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Admin authentication middleware with scope checking
 */
const requireAdminScope = (requiredScope) => {
    return async (req, res, next) => {
        try {
            // Check X-Admin-Key header first, then Authorization: Bearer
            const adminKeyHeader = req.headers['x-admin-key'];
            const authHeader = req.headers.authorization;
            
            let token;
            if (adminKeyHeader && adminKeyHeader.startsWith('ss_admin_')) {
                token = adminKeyHeader;
            } else if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
            
            if (!token) {
                return res.status(401).json({
                    error: {
                        code: 'MISSING_AUTH',
                        message: 'Admin API key required. Use X-Admin-Key header or Authorization: Bearer'
                    }
                });
            }
            
            // Validate admin key and check scope
            const result = await adminKeyService.validateAdminKey(token, requiredScope);
            
            if (!result) {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_KEY',
                        message: 'Invalid or inactive admin key'
                    }
                });
            }
            
            if (result.error === 'INSUFFICIENT_SCOPE') {
                return res.status(403).json({
                    error: {
                        code: 'INSUFFICIENT_SCOPE',
                        message: `This admin key does not have the '${requiredScope}' scope.`,
                        required_scope: requiredScope
                    }
                });
            }
            
            req.adminKey = result;
            next();
        } catch (error) {
            console.error('Admin auth error:', error);
            return res.status(500).json({
                error: {
                    code: 'AUTH_ERROR',
                    message: 'Authentication error'
                }
            });
        }
    };
};

// =====================================================
// HEALTH ENDPOINTS (scope: health)
// =====================================================

/**
 * GET /admin/health
 * Public health check (no auth)
 */
router.get('/health', async (req, res) => {
    try {
        // Basic database check
        await prisma.$queryRaw`SELECT 1`;
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime_seconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000)
        });
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            errors: [error.message]
        });
    }
});

/**
 * GET /admin/status
 * Detailed system status (auth required)
 */
router.get('/status', requireAdminScope('health'), async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Database check with latency
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;
        
        // Get counts
        const [orgCount, escrowCount, pendingApprovals, spendToday, errorCount24h] = await Promise.all([
            prisma.organization.count(),
            prisma.escrowAccount.count(),
            prisma.spendRequest.count({ where: { status: 'pending_approval' } }),
            prisma.spendRequest.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            }),
            errorLogService.getErrorCount(24)
        ]);
        
        // Memory usage
        const memUsage = process.memoryUsage();
        
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime_seconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
            services: {
                database: {
                    status: 'connected',
                    latency_ms: dbLatency
                },
                stripe: {
                    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
                }
            },
            counts: {
                organizations: orgCount,
                active_escrows: escrowCount,
                pending_approvals: pendingApprovals,
                spend_requests_today: spendToday,
                errors_24h: errorCount24h
            },
            memory: {
                heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss_mb: Math.round(memUsage.rss / 1024 / 1024)
            },
            response_time_ms: Date.now() - startTime
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /admin/errors
 * Recent application errors
 */
router.get('/errors', requireAdminScope('health'), async (req, res) => {
    try {
        const { limit = 50, since } = req.query;
        
        const errors = await errorLogService.getRecentErrors({
            limit: Math.min(parseInt(limit), 500),
            since
        });
        
        res.json({
            errors,
            total: errors.length,
            period: since ? `since ${since}` : 'last 24h'
        });
    } catch (error) {
        console.error('Error fetching errors:', error);
        res.status(500).json({
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch error logs'
            }
        });
    }
});

// =====================================================
// METRICS ENDPOINTS (scope: metrics)
// =====================================================

/**
 * GET /admin/metrics/overview
 * High-level platform dashboard data
 */
router.get('/metrics/overview', requireAdminScope('metrics'), async (req, res) => {
    try {
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
        
        // Organizations
        const [orgTotal, orgWeek, orgMonth] = await Promise.all([
            prisma.organization.count(),
            prisma.organization.count({ where: { createdAt: { gte: weekAgo } } }),
            prisma.organization.count({ where: { createdAt: { gte: monthAgo } } })
        ]);
        
        // Escrow accounts
        const [escrowTotal, escrowActive, escrowPaused] = await Promise.all([
            prisma.escrowAccount.count(),
            prisma.escrowAccount.count({ where: { status: 'active' } }),
            prisma.escrowAccount.count({ where: { status: 'paused' } })
        ]);
        
        // Get total balance
        const balanceAgg = await prisma.escrowAccount.aggregate({
            _sum: { balanceCents: true }
        });
        
        // Spend requests
        const [spendToday, spendWeek, spendMonth, approvedCount, deniedCount, pendingCount] = await Promise.all([
            prisma.spendRequest.count({ where: { createdAt: { gte: dayAgo } } }),
            prisma.spendRequest.count({ where: { createdAt: { gte: weekAgo } } }),
            prisma.spendRequest.count({ where: { createdAt: { gte: monthAgo } } }),
            prisma.spendRequest.count({ where: { status: 'approved', createdAt: { gte: monthAgo } } }),
            prisma.spendRequest.count({ where: { status: 'denied', createdAt: { gte: monthAgo } } }),
            prisma.spendRequest.count({ where: { status: 'pending_approval' } })
        ]);
        
        const totalProcessed = approvedCount + deniedCount + pendingCount;
        
        // API keys
        const [liveKeys, testKeys, agentKeys] = await Promise.all([
            prisma.apiKey.count({ where: { keyType: 'live', isActive: true } }),
            prisma.apiKey.count({ where: { keyType: 'test', isActive: true } }),
            prisma.apiKey.count({ where: { keyType: 'agent', isActive: true } })
        ]);
        
        res.json({
            timestamp: now.toISOString(),
            organizations: {
                total: orgTotal,
                created_this_week: orgWeek,
                created_this_month: orgMonth
            },
            escrow_accounts: {
                total: escrowTotal,
                active: escrowActive,
                paused: escrowPaused,
                total_balance_cents: balanceAgg._sum.balanceCents || 0
            },
            spend_requests: {
                today: spendToday,
                this_week: spendWeek,
                this_month: spendMonth,
                approved_rate: totalProcessed > 0 ? (approvedCount / totalProcessed).toFixed(2) : 0,
                denied_rate: totalProcessed > 0 ? (deniedCount / totalProcessed).toFixed(2) : 0,
                pending_rate: totalProcessed > 0 ? (pendingCount / totalProcessed).toFixed(2) : 0
            },
            approvals: {
                pending: pendingCount
            },
            api_keys: {
                total_active: liveKeys + testKeys + agentKeys,
                by_type: {
                    live: liveKeys,
                    test: testKeys,
                    agent: agentKeys
                }
            }
        });
    } catch (error) {
        console.error('Metrics overview error:', error);
        res.status(500).json({
            error: {
                code: 'METRICS_ERROR',
                message: 'Failed to fetch metrics'
            }
        });
    }
});

/**
 * GET /admin/metrics/activity
 * Recent platform activity feed
 */
router.get('/metrics/activity', requireAdminScope('metrics'), async (req, res) => {
    try {
        const { limit = 50, since } = req.query;
        const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const auditEvents = await prisma.auditEvent.findMany({
            where: {
                createdAt: { gte: sinceDate }
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(parseInt(limit), 200)
        });
        
        const events = auditEvents.map(e => ({
            timestamp: e.createdAt.toISOString(),
            type: e.eventType,
            org_id: e.orgId,
            details: e.details ? JSON.parse(e.details) : {}
        }));
        
        res.json({ events });
    } catch (error) {
        console.error('Activity feed error:', error);
        res.status(500).json({
            error: {
                code: 'ACTIVITY_ERROR',
                message: 'Failed to fetch activity'
            }
        });
    }
});

/**
 * GET /admin/metrics/stripe
 * Stripe-specific health and revenue data
 */
router.get('/metrics/stripe', requireAdminScope('metrics'), async (req, res) => {
    try {
        // This would integrate with Stripe API in production
        // For now, return basic data from our records
        const stripeFundings = await prisma.fundingEvent.findMany({
            where: {
                status: 'succeeded',
                type: 'funding',
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
        });
        
        const totalFunded = stripeFundings.reduce((sum, f) => sum + f.amountCents, 0);
        
        res.json({
            status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
            fundings_this_month: {
                count: stripeFundings.length,
                total_cents: totalFunded
            },
            webhooks: {
                status: 'ok'
            }
        });
    } catch (error) {
        console.error('Stripe metrics error:', error);
        res.status(500).json({
            error: {
                code: 'STRIPE_ERROR',
                message: 'Failed to fetch Stripe metrics'
            }
        });
    }
});

// =====================================================
// AUDIT ENDPOINTS (scope: audit)
// =====================================================

/**
 * GET /admin/audit
 * Cross-org audit log query
 */
router.get('/audit', requireAdminScope('audit'), async (req, res) => {
    try {
        const { org_id, event_type, actor_type, since, until, limit = 50, offset = 0 } = req.query;
        
        const where = {};
        
        if (org_id) where.orgId = org_id;
        if (event_type) where.eventType = event_type;
        if (actor_type) where.actorType = actor_type;
        if (since || until) {
            where.createdAt = {};
            if (since) where.createdAt.gte = new Date(since);
            if (until) where.createdAt.lte = new Date(until);
        }
        
        const [events, total] = await Promise.all([
            prisma.auditEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: parseInt(offset),
                take: Math.min(parseInt(limit), 500)
            }),
            prisma.auditEvent.count({ where })
        ]);
        
        res.json({
            events: events.map(e => ({
                id: e.id,
                timestamp: e.createdAt.toISOString(),
                event_type: e.eventType,
                organization_id: e.orgId,
                actor_type: e.actorType,
                actor_id: e.actorId,
                escrow_id: e.escrowId,
                details: e.details ? JSON.parse(e.details) : {},
                ip_address: e.ipAddress
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Audit query error:', error);
        res.status(500).json({
            error: {
                code: 'AUDIT_ERROR',
                message: 'Failed to fetch audit logs'
            }
        });
    }
});

// =====================================================
// ADMIN KEY MANAGEMENT (scope: keys)
// =====================================================

/**
 * POST /admin/keys
 * Create a new admin key
 */
router.post('/keys', requireAdminScope('keys'), async (req, res) => {
    try {
        const { label, description, scopes = ['*'] } = req.body;
        
        if (!label) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_LABEL',
                    message: 'Label is required'
                }
            });
        }
        
        const key = await adminKeyService.generateAdminKey({ label, description, scopes });
        
        // Log to audit
        console.log(`[ADMIN AUDIT] Key created: ${key.id} with scopes ${scopes.join(', ')} by ${req.adminKey.id}`);
        
        res.status(201).json(key);
    } catch (error) {
        console.error('Create key error:', error);
        res.status(500).json({
            error: {
                code: 'CREATE_ERROR',
                message: error.message || 'Failed to create key'
            }
        });
    }
});

/**
 * GET /admin/keys
 * List all admin keys
 */
router.get('/keys', requireAdminScope('keys'), async (req, res) => {
    try {
        const keys = await adminKeyService.listAdminKeys();
        res.json({ keys });
    } catch (error) {
        console.error('List keys error:', error);
        res.status(500).json({
            error: {
                code: 'LIST_ERROR',
                message: 'Failed to list keys'
            }
        });
    }
});

/**
 * DELETE /admin/keys/:id
 * Revoke an admin key
 */
router.delete('/keys/:id', requireAdminScope('keys'), async (req, res) => {
    try {
        const result = await adminKeyService.revokeAdminKey(req.params.id);
        
        console.log(`[ADMIN AUDIT] Key revoked: ${req.params.id} by ${req.adminKey.id}`);
        
        res.json(result);
    } catch (error) {
        console.error('Revoke key error:', error);
        res.status(500).json({
            error: {
                code: 'REVOKE_ERROR',
                message: 'Failed to revoke key'
            }
        });
    }
});

// =====================================================
// BLOG ENDPOINTS (scope: blog)
// =====================================================

/**
 * POST /admin/blog/posts
 * Create a new blog post
 */
router.post('/blog/posts', requireAdminScope('blog'), async (req, res) => {
    try {
        const post = await blogService.createPost(req.body);
        
        console.log(`[ADMIN AUDIT] Blog post created: ${post.id} by ${req.adminKey.id}`);
        
        res.status(201).json({
            id: post.id,
            slug: post.slug,
            status: post.status,
            published_at: post.published_at,
            url: `https://safe-spend.dev/blog/${post.slug}`
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            error: {
                code: 'CREATE_ERROR',
                message: error.message || 'Failed to create post'
            }
        });
    }
});

/**
 * GET /admin/blog/posts
 * List all posts
 */
router.get('/blog/posts', requireAdminScope('blog'), async (req, res) => {
    try {
        const { status, limit = 20, offset = 0, tag } = req.query;
        
        const result = await blogService.listAllPosts({
            status,
            page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            limit: parseInt(limit)
        });
        
        res.json(result);
    } catch (error) {
        console.error('List posts error:', error);
        res.status(500).json({
            error: {
                code: 'LIST_ERROR',
                message: 'Failed to list posts'
            }
        });
    }
});

/**
 * GET /admin/blog/posts/:id_or_slug
 * Get a single post
 */
router.get('/blog/posts/:id_or_slug', requireAdminScope('blog'), async (req, res) => {
    try {
        const idOrSlug = req.params.id_or_slug;
        
        // Try by ID first, then by slug (admin can see any status)
        let post = await blogService.getPostById(idOrSlug);
        if (!post) {
            post = await blogService.getPostBySlug(idOrSlug);
        }
        
        if (!post) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Post not found'
                }
            });
        }
        
        res.json(post);
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            error: {
                code: 'FETCH_ERROR',
                message: 'Failed to fetch post'
            }
        });
    }
});

/**
 * PATCH /admin/blog/posts/:id
 * Update a post
 */
router.patch('/blog/posts/:id', requireAdminScope('blog'), async (req, res) => {
    try {
        const post = await blogService.updatePost(req.params.id, req.body);
        
        console.log(`[ADMIN AUDIT] Blog post updated: ${req.params.id} by ${req.adminKey.id}`);
        
        res.json(post);
    } catch (error) {
        console.error('Update post error:', error);
        
        if (error.message === 'Post not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Post not found'
                }
            });
        }
        
        res.status(500).json({
            error: {
                code: 'UPDATE_ERROR',
                message: error.message || 'Failed to update post'
            }
        });
    }
});

/**
 * DELETE /admin/blog/posts/:id
 * Delete a post
 */
router.delete('/blog/posts/:id', requireAdminScope('blog'), async (req, res) => {
    try {
        const hard = req.query.hard === 'true';
        const result = await blogService.deletePost(req.params.id, hard);
        
        console.log(`[ADMIN AUDIT] Blog post ${hard ? 'hard' : 'soft'} deleted: ${req.params.id} by ${req.adminKey.id}`);
        
        res.json(result);
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            error: {
                code: 'DELETE_ERROR',
                message: 'Failed to delete post'
            }
        });
    }
});

/**
 * POST /admin/blog/posts/:id/publish
 * Publish a post
 */
router.post('/blog/posts/:id/publish', requireAdminScope('blog'), async (req, res) => {
    try {
        const post = await blogService.publishPost(req.params.id);
        
        console.log(`[ADMIN AUDIT] Blog post published: ${req.params.id} by ${req.adminKey.id}`);
        
        res.json(post);
    } catch (error) {
        console.error('Publish post error:', error);
        res.status(500).json({
            error: {
                code: 'PUBLISH_ERROR',
                message: 'Failed to publish post'
            }
        });
    }
});

/**
 * POST /admin/blog/posts/:id/unpublish
 * Unpublish a post
 */
router.post('/blog/posts/:id/unpublish', requireAdminScope('blog'), async (req, res) => {
    try {
        const post = await blogService.unpublishPost(req.params.id);
        
        console.log(`[ADMIN AUDIT] Blog post unpublished: ${req.params.id} by ${req.adminKey.id}`);
        
        res.json(post);
    } catch (error) {
        console.error('Unpublish post error:', error);
        res.status(500).json({
            error: {
                code: 'UNPUBLISH_ERROR',
                message: 'Failed to unpublish post'
            }
        });
    }
});

// =====================================================
// BLOG IMAGE ENDPOINTS (scope: blog)
// =====================================================

/**
 * POST /admin/blog/images
 * Upload an image for blog posts
 */
router.post('/blog/images', requireAdminScope('blog'), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: { 
                    code: 'NO_FILE', 
                    message: 'No image file provided. Use form field name "image".' 
                } 
            });
        }

        // Build URL from request or env
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || '';
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
        const imageUrl = `${baseUrl}/api/uploads/blog-images/${req.file.filename}`;
        
        console.log(`[ADMIN AUDIT] Blog image uploaded: ${req.file.filename} by ${req.adminKey.id}`);

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
        console.error('Image upload error:', error);
        res.status(500).json({ 
            error: { 
                code: 'UPLOAD_FAILED', 
                message: error.message || 'Failed to upload image' 
            } 
        });
    }
});

/**
 * GET /admin/blog/images
 * List all uploaded blog images
 */
router.get('/blog/images', requireAdminScope('blog'), async (req, res) => {
    try {
        const files = fs.readdirSync(UPLOAD_DIR);
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || '';
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
        
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
        console.error('List images error:', error);
        res.status(500).json({ error: { code: 'LIST_ERROR', message: 'Failed to list images' } });
    }
});

/**
 * DELETE /admin/blog/images/:filename
 * Delete an uploaded image
 */
router.delete('/blog/images/:filename', requireAdminScope('blog'), async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(UPLOAD_DIR, filename);
        
        // Security: prevent path traversal
        const realPath = path.resolve(filePath);
        if (!realPath.startsWith(path.resolve(UPLOAD_DIR))) {
            return res.status(400).json({ error: { code: 'INVALID_PATH', message: 'Invalid filename' } });
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Image not found' } });
        }
        
        fs.unlinkSync(filePath);
        
        console.log(`[ADMIN AUDIT] Blog image deleted: ${filename} by ${req.adminKey.id}`);
        
        res.json({ success: true, message: 'Image deleted' });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete image' } });
    }
});

// =====================================================
// SETUP ENDPOINT (bootstrap first key)
// =====================================================

/**
 * POST /admin/setup
 * Create initial superadmin key (only works when no keys exist)
 */
router.post('/setup', async (req, res) => {
    try {
        // Check setup token
        const setupToken = process.env.ADMIN_SETUP_TOKEN;
        const providedToken = req.headers.authorization?.replace('Bearer ', '');
        
        if (!setupToken) {
            return res.status(400).json({
                error: {
                    code: 'SETUP_DISABLED',
                    message: 'ADMIN_SETUP_TOKEN not configured in environment'
                }
            });
        }
        
        if (providedToken !== setupToken) {
            return res.status(401).json({
                error: {
                    code: 'INVALID_SETUP_TOKEN',
                    message: 'Invalid setup token'
                }
            });
        }
        
        // Check if any admin keys exist
        const hasKeys = await adminKeyService.hasAdminKeys();
        if (hasKeys) {
            return res.status(400).json({
                error: {
                    code: 'SETUP_COMPLETE',
                    message: 'Admin keys already exist. Use an existing key to create new ones.'
                }
            });
        }
        
        // Create superadmin key
        const { label = 'Superadmin', scopes = ['*'] } = req.body;
        const key = await adminKeyService.generateAdminKey({ label, scopes });
        
        console.log(`[ADMIN SETUP] Initial superadmin key created: ${key.id}`);
        
        res.status(201).json(key);
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({
            error: {
                code: 'SETUP_ERROR',
                message: error.message || 'Failed to create initial key'
            }
        });
    }
});

module.exports = router;
