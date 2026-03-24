/**
 * Input Validation Schemas (Zod)
 * Safe-Spend Production Hardening
 * 
 * Defines validation schemas for all API request bodies.
 */

const { z } = require('zod');

// ============================================
// Auth Schemas
// ============================================

const signupSchema = z.object({
    name: z.string()
        .min(2, 'Organization name must be at least 2 characters')
        .max(100, 'Organization name must be at most 100 characters'),
    email: z.string()
        .email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100, 'Password must be at most 100 characters'),
});

const loginSchema = z.object({
    email: z.string()
        .email('Invalid email format'),
    password: z.string()
        .min(1, 'Password is required'),
});

// ============================================
// Escrow Account Schemas
// ============================================

const createEscrowSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name must be at most 100 characters'),
    description: z.string()
        .max(500, 'Description must be at most 500 characters')
        .optional(),
});

const fundEscrowSchema = z.object({
    amount_cents: z.number()
        .int('Amount must be an integer')
        .positive('Amount must be positive')
        .max(100000000, 'Amount exceeds maximum limit'), // $1M max
});

const fundSessionSchema = z.object({
    amount_cents: z.number()
        .int('Amount must be an integer')
        .positive('Amount must be positive')
        .max(100000000, 'Amount exceeds maximum limit'),
    currency: z.string()
        .length(3, 'Currency must be a 3-letter ISO code')
        .optional()
        .default('usd'),
    success_url: z.string()
        .url('Invalid success URL'),
    cancel_url: z.string()
        .url('Invalid cancel URL'),
});

// ============================================
// Policy Schemas
// ============================================

const createPolicySchema = z.object({
    escrow_id: z.string()
        .min(1, 'Escrow ID is required'),
    name: z.string()
        .min(1, 'Policy name is required')
        .max(100, 'Name must be at most 100 characters'),
    is_active: z.boolean()
        .optional()
        .default(true),
    per_transaction_limit_cents: z.number()
        .int()
        .positive()
        .optional()
        .nullable(),
    daily_limit_cents: z.number()
        .int()
        .positive()
        .optional()
        .nullable(),
    weekly_limit_cents: z.number()
        .int()
        .positive()
        .optional()
        .nullable(),
    monthly_limit_cents: z.number()
        .int()
        .positive()
        .optional()
        .nullable(),
    allowed_vendors: z.array(z.string())
        .optional()
        .nullable(),
    blocked_vendors: z.array(z.string())
        .optional()
        .nullable(),
    allowed_categories: z.array(z.string())
        .optional()
        .nullable(),
    blocked_categories: z.array(z.string())
        .optional()
        .nullable(),
    auto_approve_under_cents: z.number()
        .int()
        .nonnegative()
        .optional()
        .nullable(),
    require_human_above_cents: z.number()
        .int()
        .nonnegative()
        .optional()
        .nullable(),
    approval_timeout_minutes: z.number()
        .int()
        .positive()
        .max(10080, 'Approval timeout cannot exceed 7 days')
        .optional()
        .default(60),
});

const updatePolicySchema = createPolicySchema.partial().omit({ escrow_id: true });

// ============================================
// Spend Schemas
// ============================================

const spendSchema = z.object({
    escrow_id: z.string()
        .min(1, 'Escrow ID is required'),
    amount_cents: z.number()
        .int('Amount must be an integer')
        .positive('Amount must be positive')
        .max(100000000, 'Amount exceeds maximum limit'),
    currency: z.string()
        .length(3, 'Currency must be a 3-letter ISO code')
        .optional()
        .default('usd'),
    vendor: z.string()
        .min(1, 'Vendor is required')
        .max(200, 'Vendor name must be at most 200 characters'),
    category: z.string()
        .max(100, 'Category must be at most 100 characters')
        .optional(),
    description: z.string()
        .max(1000, 'Description must be at most 1000 characters')
        .optional(),
    idempotency_key: z.string()
        .min(1, 'Idempotency key cannot be empty')
        .max(100, 'Idempotency key must be at most 100 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Idempotency key must be alphanumeric with dashes/underscores')
        .optional(),
    metadata: z.record(z.unknown())
        .optional(),
});

// ============================================
// API Key Schemas
// ============================================

const createApiKeySchema = z.object({
    key_type: z.enum(['live', 'test', 'agent'])
        .optional()
        .default('live'),
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name must be at most 100 characters')
        .optional(),
});

// ============================================
// Webhook Schemas
// ============================================

const webhookEventsEnum = z.enum([
    'spend.approved',
    'spend.denied',
    'spend.pending_approval',
    'spend.expired',
    'approval.requested',
    'approval.approved',
    'approval.denied',
    'approval.expired',
    'escrow.funded',
    'escrow.paused',
    'escrow.resumed',
    'escrow.closed',
]);

const createWebhookSchema = z.object({
    url: z.string()
        .url('Invalid webhook URL')
        .refine(url => url.startsWith('https://'), {
            message: 'Webhook URL must use HTTPS',
        }),
    events: z.array(webhookEventsEnum)
        .min(1, 'At least one event type is required'),
});

// ============================================
// Approval Schemas
// ============================================

const approveSchema = z.object({
    note: z.string()
        .max(500, 'Note must be at most 500 characters')
        .optional(),
});

const denySchema = z.object({
    reason: z.string()
        .max(200, 'Reason must be at most 200 characters')
        .optional(),
    note: z.string()
        .max(500, 'Note must be at most 500 characters')
        .optional(),
});

// ============================================
// Validation Middleware Factory
// ============================================

/**
 * Create validation middleware for a Zod schema
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            
            if (!result.success) {
                const errors = result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                
                return res.status(400).json({
                    error: 'validation_error',
                    message: 'Invalid request body.',
                    details: errors,
                    request_id: req.requestId,
                });
            }
            
            // Replace body with validated/transformed data
            req.body = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'Failed to validate request body.',
                request_id: req.requestId,
            });
        }
    };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.query);
            
            if (!result.success) {
                const errors = result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                
                return res.status(400).json({
                    error: 'validation_error',
                    message: 'Invalid query parameters.',
                    details: errors,
                    request_id: req.requestId,
                });
            }
            
            req.query = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'Failed to validate query parameters.',
                request_id: req.requestId,
            });
        }
    };
}

module.exports = {
    // Schemas
    signupSchema,
    loginSchema,
    createEscrowSchema,
    fundEscrowSchema,
    fundSessionSchema,
    createPolicySchema,
    updatePolicySchema,
    spendSchema,
    createApiKeySchema,
    createWebhookSchema,
    approveSchema,
    denySchema,
    
    // Middleware
    validate,
    validateQuery,
};
