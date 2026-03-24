/**
 * Global Error Handler
 * Safe-Spend Production Hardening
 * 
 * Catches all unhandled errors and returns consistent error responses.
 * Hides stack traces in production.
 */

const { getConfig } = require('../config/environment');
const { logger, events } = require('../lib/logger');

const config = getConfig();

/**
 * Custom error classes
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'internal_error') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'not_found');
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = []) {
        super(message, 400, 'validation_error');
        this.details = details;
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'unauthorized');
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'forbidden');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409, 'conflict');
    }
}

class RateLimitError extends AppError {
    constructor(retryAfter = 60) {
        super('Too many requests', 429, 'rate_limit_exceeded');
        this.retryAfter = retryAfter;
    }
}

/**
 * Error response formatter
 */
function formatErrorResponse(err, req) {
    const response = {
        error: err.code || 'internal_server_error',
        message: err.isOperational ? err.message : 'An unexpected error occurred.',
        request_id: req.requestId,
    };

    // Add validation details if present
    if (err.details) {
        response.details = err.details;
    }

    // Add retry_after for rate limit errors
    if (err.retryAfter) {
        response.retry_after = err.retryAfter;
    }

    // Include stack trace in development
    if (config.isDev && err.stack) {
        response.stack = err.stack;
    }

    return response;
}

/**
 * Global error handler middleware
 * Must be registered LAST in the middleware chain
 */
function errorHandler(err, req, res, next) {
    // Determine status code
    const statusCode = err.statusCode || 500;
    
    // Log the error
    const logContext = {
        request_id: req.requestId,
        status_code: statusCode,
        error_code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
        org_id: req.org?.id,
    };

    if (statusCode >= 500) {
        // Log full stack for server errors
        logContext.stack = err.stack;
        events.unhandledException(logContext);
    } else if (statusCode >= 400) {
        // Log at warn level for client errors
        logger.warn(logContext, err.message);
    }

    // Send response
    res.status(statusCode).json(formatErrorResponse(err, req));
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res, next) {
    const err = new NotFoundError(`Route ${req.method} ${req.path} not found`);
    next(err);
}

/**
 * Async handler wrapper to catch promise rejections
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    // Error classes
    AppError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    RateLimitError,
    
    // Middleware
    errorHandler,
    notFoundHandler,
    asyncHandler,
};
