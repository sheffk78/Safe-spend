/**
 * Request ID Middleware
 * Safe-Spend Production Hardening
 * 
 * Generates unique request IDs for tracing and debugging.
 */

const crypto = require('crypto');

/**
 * Generate a unique request ID
 */
function generateRequestId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'req_';
    const randomBytes = crypto.randomBytes(12);
    for (let i = 0; i < 12; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    return result;
}

/**
 * Request ID middleware
 * Attaches unique ID to each request and adds it to response headers
 */
function requestIdMiddleware(req, res, next) {
    // Check for existing request ID (from proxy/load balancer)
    const existingId = req.headers['x-request-id'];
    req.requestId = existingId || generateRequestId();
    
    // Add to response headers
    res.setHeader('X-Request-ID', req.requestId);
    
    next();
}

module.exports = {
    requestIdMiddleware,
    generateRequestId,
};
