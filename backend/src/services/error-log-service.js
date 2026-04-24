/**
 * Error Logging Service
 * Captures application errors for admin monitoring
 */

const prisma = require('../lib/prisma');

// In-memory ring buffer as backup (last 500 errors)
const ERROR_BUFFER_SIZE = 500;
let errorBuffer = [];

/**
 * Log an error to the database and memory buffer
 */
async function logError({ level = 'error', message, endpoint, stack, requestId, metadata }) {
    const errorEntry = {
        level,
        message: message?.substring(0, 2000) || 'Unknown error', // Limit message length
        endpoint,
        stack: stack?.substring(0, 10000), // Limit stack length
        requestId,
        metadata: metadata ? JSON.stringify(metadata).substring(0, 5000) : null
    };
    
    // Add to memory buffer
    errorBuffer.push({
        ...errorEntry,
        timestamp: new Date().toISOString()
    });
    
    // Trim buffer if too large
    if (errorBuffer.length > ERROR_BUFFER_SIZE) {
        errorBuffer = errorBuffer.slice(-ERROR_BUFFER_SIZE);
    }
    
    // Try to persist to database
    try {
        await prisma.errorLog.create({
            data: errorEntry
        });
    } catch (dbError) {
        console.error('Failed to persist error log:', dbError.message);
    }
}

/**
 * Get recent errors
 */
async function getRecentErrors({ limit = 50, since } = {}) {
    try {
        const where = {};
        if (since) {
            where.timestamp = { gte: new Date(since) };
        }
        
        const errors = await prisma.errorLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: Math.min(limit, 500)
        });
        
        return errors.map(e => ({
            timestamp: e.timestamp.toISOString(),
            level: e.level,
            message: e.message,
            endpoint: e.endpoint,
            stack: e.stack,
            request_id: e.requestId,
            metadata: e.metadata ? JSON.parse(e.metadata) : null
        }));
    } catch (error) {
        // Fallback to memory buffer
        console.error('Failed to fetch errors from DB, using buffer:', error.message);
        return errorBuffer.slice(-limit);
    }
}

/**
 * Get error count for a period
 */
async function getErrorCount(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    try {
        return await prisma.errorLog.count({
            where: {
                timestamp: { gte: since }
            }
        });
    } catch (error) {
        return errorBuffer.filter(e => new Date(e.timestamp) >= since).length;
    }
}

/**
 * Cleanup old errors (run periodically)
 */
async function cleanupOldErrors(daysToKeep = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    try {
        const result = await prisma.errorLog.deleteMany({
            where: {
                timestamp: { lt: cutoff }
            }
        });
        return result.count;
    } catch (error) {
        console.error('Failed to cleanup old errors:', error.message);
        return 0;
    }
}

/**
 * Express error middleware to capture errors
 */
function createErrorMiddleware() {
    return async (err, req, res, next) => {
        // Log the error
        await logError({
            level: 'error',
            message: err.message || 'Unknown error',
            endpoint: `${req.method} ${req.originalUrl}`,
            stack: err.stack,
            requestId: req.requestId || req.headers['x-request-id'],
            metadata: {
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
                user_agent: req.headers['user-agent']
            }
        });
        
        next(err);
    };
}

module.exports = {
    logError,
    getRecentErrors,
    getErrorCount,
    cleanupOldErrors,
    createErrorMiddleware
};
