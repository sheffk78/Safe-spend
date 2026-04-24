/**
 * Environment Configuration & Validation
 * Safe-Spend Production Hardening
 * 
 * Validates all required environment variables at startup
 * and provides typed configuration object.
 */

const ENVIRONMENTS = ['development', 'staging', 'production'];

/**
 * Required environment variables by environment
 */
const REQUIRED_VARS = {
    all: ['JWT_SECRET'],
    production: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    staging: ['STRIPE_SECRET_KEY'],
};

/**
 * Validate required environment variables
 * Throws an error if any required variable is missing
 */
function validateEnvironment() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const missing = [];

    // Check universal requirements
    REQUIRED_VARS.all.forEach(key => {
        if (!process.env[key]) {
            missing.push(key);
        }
    });

    // Check environment-specific requirements
    if (REQUIRED_VARS[nodeEnv]) {
        REQUIRED_VARS[nodeEnv].forEach(key => {
            if (!process.env[key]) {
                missing.push(key);
            }
        });
    }

    if (missing.length > 0) {
        const message = `Missing required environment variables: ${missing.join(', ')}`;
        console.error(`[CONFIG ERROR] ${message}`);
        
        // In production, throw immediately
        if (nodeEnv === 'production') {
            throw new Error(message);
        } else {
            console.warn('[CONFIG WARNING] Continuing in development mode with missing variables');
        }
    }

    return true;
}

/**
 * Get typed configuration object
 */
function getConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    return {
        // Environment
        env: nodeEnv,
        isDev: nodeEnv === 'development',
        isStaging: nodeEnv === 'staging',
        isProd: nodeEnv === 'production',

        // Server
        port: parseInt(process.env.PORT || '8001', 10),
        appUrl: process.env.APP_URL || 'http://localhost:8001',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

        // Database
        databaseUrl: process.env.DATABASE_URL,

        // Auth
        jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

        // Stripe
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

        // Logging
        logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),

        // Rate Limiting
        rateLimits: {
            auth: {
                max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
                windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10), // 15 min
            },
            spend: {
                max: parseInt(process.env.RATE_LIMIT_SPEND_MAX || '60', 10),
                windowMs: 60000, // 1 minute
            },
            keys: {
                max: parseInt(process.env.RATE_LIMIT_KEYS_MAX || '20', 10),
                windowMs: 3600000, // 1 hour
            },
            global: {
                max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '200', 10),
                windowMs: 60000, // 1 minute
            },
        },

        // CORS
        corsOrigins: process.env.CORS_ORIGINS === '*' ? '*' : (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
    };
}

module.exports = {
    validateEnvironment,
    getConfig,
    ENVIRONMENTS,
};
