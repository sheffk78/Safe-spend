/**
 * Rate Limiting Middleware
 * Safe-Spend Production Hardening
 * 
 * Implements rate limiting for various endpoint categories:
 * 
 * | Endpoint Category       | Rate Limit               | Scope                    |
 * |------------------------|--------------------------|--------------------------|
 * | Auth (login/signup)    | 5 req/15min per IP       | IP address               |
 * | Spend Requests         | 60 req/min per key       | API key (always active)  |
 * | API Key Creation       | 10 req/hour per org      | Organization             |
 * | Exports                | 10 req/5min per org      | Organization             |
 * | Standard API (reads)   | 100 req/min per key      | API key                  |
 * | Write Operations       | 30 req/min per key       | API key                  |
 * | Public API (blog)      | 30 req/min per IP        | IP address               |
 * | Admin API              | 120 req/min per key      | Admin key                |
 * | Global (fallback)      | 1000 req/min per IP      | IP address               |
 * 
 * Note: All rate limiters except spendRateLimiter are skipped in development mode.
 */

const rateLimit = require('express-rate-limit');
const { getConfig } = require('../config/environment');
const { logger, events } = require('../lib/logger');

const config = getConfig();

/**
 * Standard rate limit response
 */
const rateLimitHandler = (req, res) => {
    events.rateLimitExceeded({
        request_id: req.requestId,
        ip: req.ip,
        path: req.path,
        org_id: req.org?.id,
    });
    
    res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
        retry_after: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
        request_id: req.requestId,
    });
};

/**
 * Key generator for API key-based rate limiting
 * Uses the key prefix to identify the API key without exposing it
 */
const apiKeyKeyGenerator = (req) => {
    // If using API key auth, use key prefix
    if (req.apiKey?.keyPrefix) {
        return `apikey:${req.apiKey.keyPrefix}`;
    }
    // Fall back to org ID or IP
    if (req.org?.id) {
        return `org:${req.org.id}`;
    }
    return req.ip;
};

/**
 * Org-based key generator
 */
const orgKeyGenerator = (req) => {
    if (req.org?.id) {
        return `org:${req.org.id}`;
    }
    return req.ip;
};

/**
 * Auth rate limiter - 10 requests per 15 minutes per IP
 * Prevents brute-force login/signup
 */
const authRateLimiter = rateLimit({
    windowMs: config.rateLimits.auth.windowMs,
    max: config.rateLimits.auth.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Spend rate limiter - 60 requests per minute per API key
 * Prevents agents from hammering the rules engine
 * NOTE: Always enabled (including dev/test) for chaos testing
 */
const spendRateLimiter = rateLimit({
    windowMs: config.rateLimits.spend.windowMs,
    max: config.rateLimits.spend.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => process.env.NODE_ENV === 'test', // Only skip in automated tests
});

/**
 * Key creation rate limiter - 20 requests per hour per org
 */
const keyCreationRateLimiter = rateLimit({
    windowMs: config.rateLimits.keys.windowMs,
    max: config.rateLimits.keys.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Export rate limiter - 10 requests per 5 minutes per org
 * Prevents abuse of CSV generation which can be resource-intensive
 */
const exportRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 exports per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: orgKeyGenerator,
    handler: (req, res) => {
        events.rateLimitExceeded({
            request_id: req.requestId,
            ip: req.ip,
            path: req.path,
            org_id: req.org?.id,
            limiter: 'export',
        });
        
        res.status(429).json({
            error: 'rate_limit_exceeded',
            message: 'Too many export requests. Please wait a few minutes before generating another export.',
            retry_after: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
            request_id: req.requestId,
        });
    },
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Standard API rate limiter - 100 requests per minute per API key
 * For standard read endpoints (escrow accounts, policies, audit, etc.)
 */
const standardApiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: apiKeyKeyGenerator,
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Write operations rate limiter - 30 requests per minute per API key
 * For create/update/delete operations (more restrictive than reads)
 */
const writeRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 writes per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: apiKeyKeyGenerator,
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Public API rate limiter - 30 requests per minute per IP
 * For public endpoints like blog
 */
const publicApiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Admin API rate limiter - 120 requests per minute per admin key
 * For admin console operations
 */
const adminApiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use admin key ID if available
        if (req.adminKey?.id) {
            return `admin:${req.adminKey.id}`;
        }
        return req.ip;
    },
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
});

/**
 * Global rate limiter - 200 requests per minute per IP
 */
const globalRateLimiter = rateLimit({
    windowMs: config.rateLimits.global.windowMs,
    max: config.rateLimits.global.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    skip: (req) => {
        // Skip rate limiting for health checks, in dev, and in tests
        if (config.isDev || process.env.NODE_ENV === 'test') return true;
        if (req.path === '/api/health') return true;
        return false;
    },
});

module.exports = {
    authRateLimiter,
    spendRateLimiter,
    keyCreationRateLimiter,
    exportRateLimiter,
    globalRateLimiter,
    standardApiRateLimiter,
    writeRateLimiter,
    publicApiRateLimiter,
    adminApiRateLimiter,
};
