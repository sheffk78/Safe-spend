require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');

// Config & Logging
const { validateEnvironment, getConfig } = require('./config/environment');
const { logger, events } = require('./lib/logger');

// Middleware
const { requestIdMiddleware } = require('./middleware/request-id');
const { 
    globalRateLimiter, 
    authRateLimiter, 
    spendRateLimiter, 
    keyCreationRateLimiter, 
    exportRateLimiter,
    standardApiRateLimiter,
    writeRateLimiter,
    publicApiRateLimiter,
    adminApiRateLimiter
} = require('./middleware/rate-limit');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// Routes
const authRoutes = require('./routes/auth');
const escrowAccountsRoutes = require('./routes/escrow-accounts');
const policiesRoutes = require('./routes/policies');
const spendRoutes = require('./routes/spend');
const approvalsRoutes = require('./routes/approvals');
const auditRoutes = require('./routes/audit');
const webhooksRoutes = require('./routes/webhooks');
const apiKeysRoutes = require('./routes/api-keys');
const stripeWebhookRoutes = require('./routes/stripe-webhook');
const subscriptionRoutes = require('./routes/subscription');
const teamRoutes = require('./routes/team');
const exportsRoutes = require('./routes/exports');
const aavSettingsRoutes = require('./routes/aav-settings');

// Admin Routes
const adminAuthRoutes = require('./routes/admin-auth');
const adminOrgsRoutes = require('./routes/admin-orgs');
const adminApiV1Routes = require('./routes/admin-api-v1');
const adminAnalyticsRoutes = require('./routes/admin-analytics');

// Blog Routes
const blogPublicRoutes = require('./routes/blog-public');
const blogPagesRoutes = require('./routes/blog-pages');

// New Admin API (unified with scopes)
const adminApiRoutes = require('./routes/admin-api');
const errorLogService = require('./services/error-log-service');

// Validate environment at startup
validateEnvironment();
const config = getConfig();
const prisma = new PrismaClient();

const app = express();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Trust proxy for proper IP detection behind Kubernetes/load balancers
app.set('trust proxy', true);

// IMPORTANT: Stripe webhook route must be registered BEFORE body parsing middleware
// because it needs the raw body for signature verification
app.use('/api/stripe', stripeWebhookRoutes);

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API
    crossOriginEmbedderPolicy: false,
}));

// Request ID for tracing
app.use(requestIdMiddleware);

// CORS configuration
app.use(cors({
    origin: config.corsOrigins === '*' ? '*' : config.corsOrigins,
    credentials: true
}));

// Body parsing with error handling
app.use(express.json({ 
    limit: '1mb',
    verify: (req, res, buf, encoding) => {
        // Store raw body for signature verification if needed
        req.rawBody = buf;
    }
}));

// JSON parsing error handler
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'invalid_json',
            message: 'Request body contains invalid JSON'
        });
    }
    next(err);
});

// Global rate limiter (applied to all routes except health)
app.use(globalRateLimiter);

// ============================================
// Health Check (Enhanced)
// ============================================
app.get('/api/health', async (req, res) => {
    const checks = {
        database: 'unknown',
        stripe: 'unknown',
    };

    let overallStatus = 'ok';

    // Database check
    try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'ok';
    } catch (error) {
        checks.database = 'error';
        overallStatus = 'degraded';
        logger.error({ error: error.message }, 'Health check: Database connection failed');
    }

    // Stripe check (just verify key is configured)
    if (config.stripeSecretKey) {
        checks.stripe = 'ok';
    } else {
        checks.stripe = 'not_configured';
        // Don't mark as degraded - Stripe is optional in dev
        if (config.isProd) {
            overallStatus = 'degraded';
        }
    }

    const statusCode = overallStatus === 'ok' ? 200 : 503;

    res.status(statusCode).json({
        status: overallStatus,
        version: '1.0.0',
        environment: config.env,
        checks,
        uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// API Routes (with specific rate limiters)
// ============================================

// Auth routes - strict rate limiting (prevent brute force)
app.use('/api/v1/auth', authRateLimiter, authRoutes);

// Escrow accounts - standard API rate limit for reads, write limit for creates
app.use('/api/v1/escrow-accounts', standardApiRateLimiter, escrowAccountsRoutes);

// Policies - standard API rate limit
app.use('/api/v1/policies', standardApiRateLimiter, policiesRoutes);

// Spend requests - special rate limit (more restrictive)
app.use('/api/v1/spend', spendRateLimiter, spendRoutes);

// Approvals - standard API rate limit
app.use('/api/v1/approvals', standardApiRateLimiter, approvalsRoutes);

// Audit - standard API rate limit
app.use('/api/v1/audit', standardApiRateLimiter, auditRoutes);

// Webhooks - write rate limit (creating webhooks)
app.use('/api/v1/webhooks', writeRateLimiter, webhooksRoutes);

// API Keys - key creation rate limit
app.use('/api/v1/api-keys', keyCreationRateLimiter, apiKeysRoutes);

// Subscription - standard rate limit
app.use('/api/v1/subscription', standardApiRateLimiter, subscriptionRoutes);

// Team - write rate limit (invites, removals)
app.use('/api/v1/team', writeRateLimiter, teamRoutes);

// Exports - export rate limit (resource intensive)
app.use('/api/v1/exports', exportRateLimiter, exportsRoutes);

// AAV Settings - write rate limit
app.use('/api/v1/settings/aav', writeRateLimiter, aavSettingsRoutes);

// ============================================
// Static File Serving (Uploaded Images)
// ============================================
const path = require('path');
app.use('/api/uploads/blog-images', express.static(path.join(__dirname, '../uploads/blog-images')));

// ============================================
// Admin Routes (Separate auth system)
// ============================================
app.use('/api/admin/auth', authRateLimiter, adminAuthRoutes);
app.use('/api/admin/orgs', adminApiRateLimiter, adminOrgsRoutes);

// Admin API v1 (Internal automation - NOT for public documentation)
app.use('/api/admin/v1', adminApiRateLimiter, adminApiV1Routes);

// Admin Analytics (Charts and metrics)
app.use('/api/admin/analytics', adminApiRateLimiter, adminAnalyticsRoutes);

// ============================================
// Blog Routes
// ============================================

// Public blog API endpoints - public rate limit
app.use('/api/blog', publicApiRateLimiter, blogPublicRoutes);

// Server-rendered blog pages (SEO-friendly HTML) - public rate limit
// Must be before the 404 handler
app.use('/blog', publicApiRateLimiter, blogPagesRoutes);

// ============================================
// New Unified Admin API (with scopes)
// ============================================
app.use('/api/admin', adminApiRateLimiter, adminApiRoutes);

// ============================================
// Error Handling
// ============================================

// Error logging middleware (captures errors before handler)
app.use(errorLogService.createErrorMiddleware());

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============================================
// Server Startup & Shutdown
// ============================================

const PORT = config.port;
let server;

// Graceful shutdown handling
async function gracefulShutdown(signal) {
    logger.info({ signal }, 'Received shutdown signal. Closing server...');
    
    if (server) {
        server.close(async () => {
            logger.info('HTTP server closed');
            
            // Disconnect database
            await prisma.$disconnect();
            logger.info('Database disconnected');
            
            process.exit(0);
        });

        // Force exit after 10 seconds if graceful shutdown fails
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled rejection');
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    server = app.listen(PORT, '0.0.0.0', () => {
        logger.info({
            port: PORT,
            environment: config.env,
            log_level: config.logLevel,
        }, `Safe-Spend API server started`);
    });
}

module.exports = app;
