/**
 * Structured Logging with Pino
 * Safe-Spend Production Hardening
 * 
 * Provides JSON logging in production and pretty-print in development.
 * All logs include request_id and org_id when available.
 */

const pino = require('pino');
const { getConfig } = require('../config/environment');

const config = getConfig();

// Create base logger
const logger = pino({
    level: config.logLevel,
    
    // Use pretty print in development
    transport: config.isDev ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        }
    } : undefined,
    
    // Base context for all logs
    base: {
        env: config.env,
        service: 'safe-spend-api',
    },
    
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
    
    // Redact sensitive fields
    redact: {
        paths: ['req.headers.authorization', 'password', 'api_key', 'token', 'keyHash'],
        censor: '[REDACTED]',
    },
});

/**
 * Create a child logger with request context
 */
function createRequestLogger(req) {
    return logger.child({
        request_id: req.requestId,
        org_id: req.org?.id,
        method: req.method,
        path: req.path,
    });
}

/**
 * Log event with standard format
 */
function logEvent(level, event, context = {}) {
    logger[level]({
        event,
        ...context,
    }, event);
}

/**
 * Specific event loggers
 */
const events = {
    // Spend events
    spendRequested: (ctx) => logEvent('info', 'spend.requested', ctx),
    spendApproved: (ctx) => logEvent('info', 'spend.approved', ctx),
    spendDenied: (ctx) => logEvent('info', 'spend.denied', ctx),
    spendPendingApproval: (ctx) => logEvent('info', 'spend.pending_approval', ctx),
    
    // Escrow events
    escrowFunded: (ctx) => logEvent('info', 'escrow.funded', ctx),
    escrowClosed: (ctx) => logEvent('info', 'escrow.closed', ctx),
    
    // Approval events
    approvalRequested: (ctx) => logEvent('info', 'approval.requested', ctx),
    approvalApproved: (ctx) => logEvent('info', 'approval.approved', ctx),
    approvalDenied: (ctx) => logEvent('info', 'approval.denied', ctx),
    approvalExpired: (ctx) => logEvent('info', 'approval.expired', ctx),
    
    // Webhook events
    webhookDeliverySuccess: (ctx) => logEvent('info', 'webhook.delivery.success', ctx),
    webhookDeliveryFailed: (ctx) => logEvent('warn', 'webhook.delivery.failed', ctx),
    webhookDeliveryExhausted: (ctx) => logEvent('error', 'webhook.delivery.exhausted', ctx),
    
    // Security events
    rateLimitNearThreshold: (ctx) => logEvent('warn', 'security.rate_limit.near_threshold', ctx),
    rateLimitExceeded: (ctx) => logEvent('warn', 'security.rate_limit.exceeded', ctx),
    authFailed: (ctx) => logEvent('warn', 'security.auth.failed', ctx),
    stripeWebhookInvalid: (ctx) => logEvent('warn', 'stripe.webhook.invalid_signature', ctx),
    
    // Error events
    unhandledException: (ctx) => logEvent('error', 'error.unhandled', ctx),
    databaseError: (ctx) => logEvent('error', 'error.database', ctx),
    stripeError: (ctx) => logEvent('error', 'error.stripe', ctx),
};

module.exports = {
    logger,
    createRequestLogger,
    logEvent,
    events,
};
