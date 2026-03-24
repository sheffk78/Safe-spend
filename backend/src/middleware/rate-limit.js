/**
 * Rate Limiting Middleware
 * Safe-Spend Production Hardening
 * 
 * Implements rate limiting for auth, spend, key creation, and global endpoints.
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
    // Use default IP-based key generator (handles IPv6)
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
    validate: { xForwardedForHeader: false },
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
    keyGenerator: apiKeyKeyGenerator,
    handler: rateLimitHandler,
    skip: () => process.env.NODE_ENV === 'test', // Only skip in automated tests
    validate: { xForwardedForHeader: false },
});

/**
 * Key creation rate limiter - 20 requests per hour per org
 */
const keyCreationRateLimiter = rateLimit({
    windowMs: config.rateLimits.keys.windowMs,
    max: config.rateLimits.keys.max,
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IP key generator to avoid IPv6 issues
    handler: rateLimitHandler,
    skip: () => config.isDev || process.env.NODE_ENV === 'test',
    validate: { xForwardedForHeader: false },
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
    validate: { xForwardedForHeader: false },
});

/**
 * Global rate limiter - 200 requests per minute per IP
 */
const globalRateLimiter = rateLimit({
    windowMs: config.rateLimits.global.windowMs,
    max: config.rateLimits.global.max,
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IP-based key generator (handles IPv6)
    handler: rateLimitHandler,
    skip: (req) => {
        // Skip rate limiting for health checks, in dev, and in tests
        if (config.isDev || process.env.NODE_ENV === 'test') return true;
        if (req.path === '/api/health') return true;
        return false;
    },
    validate: { xForwardedForHeader: false },
});

module.exports = {
    authRateLimiter,
    spendRateLimiter,
    keyCreationRateLimiter,
    exportRateLimiter,
    globalRateLimiter,
};
