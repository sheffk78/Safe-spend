/**
 * Admin API v1 Routes
 * INTERNAL USE ONLY - Not for public documentation
 * 
 * Provides programmatic org management for Kit and internal automation:
 * - Create organizations
 * - Bootstrap Safe-Spend resources (escrows, policies, keys, webhooks)
 * - Get org readiness checklist
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin, requireAdminRole } = require('../middleware/admin-auth');
const { logger } = require('../lib/logger');
const { generateId } = require('../utils/ids');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require admin auth
router.use(requireAdmin);

// ============================================
// GOVERNANCE PATTERN DEFINITIONS
// These match the Trust Law Explainer (Prompt 12)
// ============================================

const GOVERNANCE_PATTERNS = {
    marketing_agent_budget: {
        escrow: {
            name: 'Marketing Agent Budget',
            initialBalanceCents: 500000 // $5,000
        },
        policy: {
            name: 'Marketing: Ads & Compute',
            per_transaction_limit_cents: 10000,    // $100
            daily_limit_cents: 50000,              // $500
            monthly_limit_cents: 500000,           // $5,000
            allowed_vendors: ['Google Ads', 'Meta Ads', 'Anthropic', 'OpenAI'],
            allowed_categories: ['advertising', 'ai_compute'],
            blocked_categories: ['transfers', 'wire'],
            auto_approve_under_cents: 5000,        // $50
            require_human_above_cents: 5000,
            approval_timeout_minutes: 240,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start: 6,
            active_hours_end: 22,
            active_timezone: 'America/New_York'
        },
        apiKeyLabel: 'Marketing Agent'
    },
    procurement_agent: {
        escrow: {
            name: 'Procurement Experiments',
            initialBalanceCents: 300000 // $3,000
        },
        policy: {
            name: 'Procurement: SaaS Trials',
            per_transaction_limit_cents: 30000,    // $300
            daily_limit_cents: 100000,             // $1,000
            monthly_limit_cents: 300000,           // $3,000
            allowed_vendors: ['AWS', 'Google Cloud', 'Vercel', 'Supabase', 'OpenAI', 'Anthropic', 'GitHub', 'Notion'],
            allowed_categories: ['saas_subscription', 'developer_tools', 'ai_compute', 'cloud_compute'],
            auto_approve_under_cents: 15000,       // $150
            require_human_above_cents: 15000,
            approval_timeout_minutes: 480,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start: 9,
            active_hours_end: 18,
            active_timezone: 'UTC'
        },
        apiKeyLabel: 'Procurement Agent'
    },
    sandbox_experiments: {
        escrow: {
            name: 'R&D Sandbox',
            initialBalanceCents: 50000 // $500
        },
        policy: {
            name: 'R&D: Exploration Budget',
            per_transaction_limit_cents: 2000,     // $20
            daily_limit_cents: 10000,              // $100
            monthly_limit_cents: 50000,            // $500
            allowed_categories: ['ai_compute', 'api_credits', 'saas_subscription', 'developer_tools', 'research', 'testing'],
            blocked_categories: ['transfers'],
            auto_approve_under_cents: 1000,        // $10
            require_human_above_cents: 1000,
            approval_timeout_minutes: 60,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        },
        apiKeyLabel: 'Sandbox Agent'
    }
};

// Validation schemas
const createOrgSchema = z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    plan: z.enum(['sandbox', 'builder', 'scale']).optional().default('sandbox'),
    auto_bootstrap: z.boolean().optional().default(false),
    password: z.string().min(8).optional() // Optional initial password
});

const bootstrapSchema = z.object({
    presets: z.object({
        marketing_agent_budget: z.boolean().optional().default(false),
        procurement_agent: z.boolean().optional().default(false),
        sandbox_experiments: z.boolean().optional().default(false)
    }).optional().default({}),
    webhook_url: z.string().url().optional()
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a random API key
 */
function generateApiKey(type = 'test') {
    const prefix = type === 'test' ? 'sk_test_' : 'sk_agent_';
    const randomPart = crypto.randomBytes(24).toString('hex');
    return prefix + randomPart;
}

/**
 * Hash an API key for storage
 */
async function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Bootstrap resources for an organization
 */
async function bootstrapOrg(orgId, presets, webhookUrl, adminId) {
    const results = {
        escrows: [],
        policies: [],
        api_keys: [],
        webhooks: []
    };

    const enabledPatterns = Object.entries(presets)
        .filter(([key, enabled]) => enabled && GOVERNANCE_PATTERNS[key])
        .map(([key]) => key);

    // Create escrows, policies, and keys for each enabled pattern
    for (const patternKey of enabledPatterns) {
        const pattern = GOVERNANCE_PATTERNS[patternKey];

        // Create escrow account
        const escrow = await prisma.escrowAccount.create({
            data: {
                id: generateId('escrowAccount'),
                orgId,
                name: pattern.escrow.name,
                balanceCents: pattern.escrow.initialBalanceCents,
                totalFundedCents: pattern.escrow.initialBalanceCents,
                currency: 'usd',
                status: 'active'
            }
        });
        results.escrows.push({ id: escrow.id, name: escrow.name });

        // Create policy linked to escrow
        const policy = await prisma.spendingPolicy.create({
            data: {
                id: generateId('spendingPolicy'),
                orgId,
                escrowId: escrow.id,
                name: pattern.policy.name,
                isActive: true,
                perTransactionLimitCents: pattern.policy.per_transaction_limit_cents,
                dailyLimitCents: pattern.policy.daily_limit_cents,
                monthlyLimitCents: pattern.policy.monthly_limit_cents,
                allowedVendors: JSON.stringify(pattern.policy.allowed_vendors || []),
                allowedCategories: JSON.stringify(pattern.policy.allowed_categories || []),
                blockedCategories: JSON.stringify(pattern.policy.blocked_categories || []),
                autoApproveUnderCents: pattern.policy.auto_approve_under_cents,
                requireHumanAboveCents: pattern.policy.require_human_above_cents,
                approvalTimeoutMinutes: pattern.policy.approval_timeout_minutes,
                activeDays: JSON.stringify(pattern.policy.active_days || []),
                activeHoursStart: pattern.policy.active_hours_start?.toString().padStart(2, '0') || null,
                activeHoursEnd: pattern.policy.active_hours_end?.toString().padStart(2, '0') || null,
                activeTimezone: pattern.policy.active_timezone || 'UTC'
            }
        });
        results.policies.push({ id: policy.id, name: policy.name });

        // Create agent API key for this pattern
        const agentKeyValue = generateApiKey('agent');
        const agentKeyHash = await hashApiKey(agentKeyValue);
        const agentKey = await prisma.apiKey.create({
            data: {
                id: generateId('apiKey'),
                orgId,
                keyHash: agentKeyHash,
                keyPrefix: agentKeyValue.substring(0, 12),
                keyType: 'agent',
                label: pattern.apiKeyLabel,
                isActive: true
            }
        });
        results.api_keys.push({
            id: agentKey.id,
            type: 'agent',
            label: agentKey.label,
            key_preview: agentKey.keyPrefix + '...'
        });

        // Log escrow and policy creation
        await prisma.auditEvent.create({
            data: {
                orgId,
                eventType: 'admin.bootstrap.escrow_created',
                actorType: 'admin_automation',
                actorId: adminId,
                details: JSON.stringify({
                    pattern: patternKey,
                    admin_id: adminId,
                    escrow_id: escrow.id,
                    policy_id: policy.id
                })
            }
        });
    }

    // Create a default test API key
    const testKeyValue = generateApiKey('test');
    const testKeyHash = await hashApiKey(testKeyValue);
    const testKey = await prisma.apiKey.create({
        data: {
            id: generateId('apiKey'),
            orgId,
            keyHash: testKeyHash,
            keyPrefix: testKeyValue.substring(0, 12),
            keyType: 'test',
            label: 'Default Test Key',
            isActive: true
        }
    });
    results.api_keys.unshift({
        id: testKey.id,
        type: 'test',
        label: testKey.label,
        key_preview: testKey.keyPrefix + '...'
    });

    // Create webhook if URL provided
    if (webhookUrl) {
        const webhookSecret = crypto.randomBytes(32).toString('hex');
        const webhook = await prisma.webhook.create({
            data: {
                id: generateId('webhook'),
                orgId,
                url: webhookUrl,
                secret: webhookSecret,
                events: JSON.stringify([
                    'spend.approved',
                    'spend.denied',
                    'approval.requested',
                    'approval.approved',
                    'approval.denied'
                ]),
                isActive: true
            }
        });
        results.webhooks.push({
            id: webhook.id,
            url: webhook.url,
            events: ['spend.approved', 'spend.denied', 'approval.requested', 'approval.approved', 'approval.denied']
        });
    }

    // Log bootstrap completion
    await prisma.auditEvent.create({
        data: {
            orgId,
            eventType: 'admin.org.bootstrapped',
            actorType: 'admin_automation',
            actorId: adminId,
            details: JSON.stringify({
                patterns_enabled: enabledPatterns,
                escrows_created: results.escrows.length,
                policies_created: results.policies.length,
                api_keys_created: results.api_keys.length,
                webhooks_created: results.webhooks.length
            })
        }
    });

    return results;
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /admin/v1/orgs
 * Create a new client organization
 * INTERNAL USE ONLY
 */
router.post('/orgs', async (req, res) => {
    try {
        const validation = createOrgSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'Invalid request body',
                details: validation.error.issues,
                request_id: req.requestId
            });
        }

        const { name, email, plan, auto_bootstrap, password } = validation.data;

        // Check for existing org with same email
        const existingOrg = await prisma.organization.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingOrg) {
            return res.status(409).json({
                error: 'conflict',
                message: 'An organization with this email already exists',
                request_id: req.requestId
            });
        }

        // Generate password hash if provided, otherwise generate random
        const actualPassword = password || crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(actualPassword, 12);

        // Create organization
        const org = await prisma.organization.create({
            data: {
                id: generateId('organization'),
                name,
                email: email.toLowerCase(),
                passwordHash,
                plan
            }
        });

        // Log org creation
        await prisma.auditEvent.create({
            data: {
                orgId: org.id,
                eventType: 'admin.org.created',
                actorType: 'admin',
                actorId: req.admin.id,
                details: JSON.stringify({
                    admin_email: req.admin.email,
                    plan,
                    auto_bootstrap
                })
            }
        });

        logger.info({
            admin_id: req.admin.id,
            org_id: org.id,
            org_email: org.email,
            plan,
            auto_bootstrap,
            request_id: req.requestId
        }, 'Admin created organization via API');

        // Bootstrap if requested
        let bootstrapResults = null;
        if (auto_bootstrap) {
            bootstrapResults = await bootstrapOrg(
                org.id,
                {
                    marketing_agent_budget: true,
                    procurement_agent: true,
                    sandbox_experiments: true
                },
                null, // No webhook URL for auto-bootstrap
                req.admin.id
            );
        }

        // Generate initial org JWT (1 hour expiry for first-time setup)
        const initialOrgToken = jwt.sign(
            {
                org_id: org.id,
                email: org.email,
                purpose: 'initial_setup',
                created_by_admin: req.admin.id
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            org: {
                id: org.id,
                name: org.name,
                email: org.email,
                plan: org.plan
            },
            bootstrap: auto_bootstrap ? {
                status: 'completed',
                details: {
                    escrows_created: bootstrapResults.escrows.length,
                    policies_created: bootstrapResults.policies.length,
                    api_keys_created: bootstrapResults.api_keys.length,
                    webhooks_created: bootstrapResults.webhooks.length
                },
                resources: bootstrapResults
            } : null,
            initial_org_token: initialOrgToken,
            initial_password: password ? undefined : actualPassword // Only return if auto-generated
        });
    } catch (error) {
        logger.error({ error: error.message, request_id: req.requestId }, 'Failed to create organization via Admin API');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to create organization',
            request_id: req.requestId
        });
    }
});

/**
 * POST /admin/v1/orgs/:orgId/bootstrap
 * Bootstrap Safe-Spend resources for an organization
 * INTERNAL USE ONLY
 */
router.post('/orgs/:orgId/bootstrap', async (req, res) => {
    try {
        const { orgId } = req.params;

        const validation = bootstrapSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'Invalid request body',
                details: validation.error.issues,
                request_id: req.requestId
            });
        }

        const { presets, webhook_url } = validation.data;

        // Verify org exists
        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Organization not found',
                request_id: req.requestId
            });
        }

        // Check if any presets are enabled
        const anyEnabled = Object.values(presets).some(v => v);
        if (!anyEnabled && !webhook_url) {
            return res.status(400).json({
                error: 'validation_error',
                message: 'At least one preset must be enabled or a webhook_url must be provided',
                request_id: req.requestId
            });
        }

        // Bootstrap the org
        const results = await bootstrapOrg(orgId, presets, webhook_url, req.admin.id);

        logger.info({
            admin_id: req.admin.id,
            org_id: orgId,
            presets,
            webhook_url,
            request_id: req.requestId
        }, 'Admin bootstrapped organization via API');

        res.json({
            org_id: orgId,
            escrows: results.escrows,
            policies: results.policies,
            api_keys: results.api_keys,
            webhooks: results.webhooks
        });
    } catch (error) {
        logger.error({ error: error.message, org_id: req.params.orgId, request_id: req.requestId }, 'Failed to bootstrap organization');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to bootstrap organization',
            request_id: req.requestId
        });
    }
});

/**
 * GET /admin/v1/orgs/:orgId/checklist
 * Get readiness checklist for an organization
 * INTERNAL USE ONLY
 */
router.get('/orgs/:orgId/checklist', async (req, res) => {
    try {
        const { orgId } = req.params;

        // Verify org exists
        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Organization not found',
                request_id: req.requestId
            });
        }

        // Gather metrics
        const [
            escrowCount,
            activePolicyCount,
            agentKeyCount,
            webhookCount,
            lastSpend
        ] = await Promise.all([
            prisma.escrowAccount.count({ where: { orgId, status: 'active' } }),
            prisma.spendingPolicy.count({ where: { orgId, isActive: true } }),
            prisma.apiKey.count({ where: { orgId, isActive: true, keyType: 'agent' } }),
            prisma.webhook.count({ where: { orgId, isActive: true } }),
            prisma.spendRequest.findFirst({
                where: { orgId, status: 'approved' },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })
        ]);

        // Check for recent spend (within last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const hasRecentSpend = lastSpend && new Date(lastSpend.createdAt) >= sevenDaysAgo;

        // Get balance info
        const totalBalance = await prisma.escrowAccount.aggregate({
            where: { orgId, status: 'active' },
            _sum: { balanceCents: true }
        });

        // Log checklist view (optional but helpful for analytics)
        await prisma.auditEvent.create({
            data: {
                orgId,
                eventType: 'admin.org.checklist.viewed',
                actorType: 'admin',
                actorId: req.admin.id,
                details: JSON.stringify({ admin_email: req.admin.email })
            }
        });

        res.json({
            org_id: orgId,
            org_name: org.name,
            org_email: org.email,
            checks: {
                has_escrow_accounts: {
                    ok: escrowCount > 0,
                    count: escrowCount,
                    total_balance_cents: totalBalance._sum.balanceCents || 0
                },
                has_policies: {
                    ok: activePolicyCount > 0,
                    count: activePolicyCount
                },
                has_agent_keys: {
                    ok: agentKeyCount > 0,
                    count: agentKeyCount
                },
                has_webhooks: {
                    ok: webhookCount > 0,
                    count: webhookCount
                },
                has_recent_spend: {
                    ok: hasRecentSpend,
                    last_spend_at: lastSpend?.createdAt || null
                }
            },
            ready_for_production: escrowCount > 0 && activePolicyCount > 0 && agentKeyCount > 0,
            recommendations: [
                ...(escrowCount === 0 ? ['Create at least one escrow account'] : []),
                ...(activePolicyCount === 0 ? ['Configure at least one spending policy'] : []),
                ...(agentKeyCount === 0 ? ['Generate an agent API key'] : []),
                ...(webhookCount === 0 ? ['Set up a webhook for real-time notifications'] : []),
                ...(!hasRecentSpend ? ['Test with a spend request to verify integration'] : [])
            ]
        });
    } catch (error) {
        logger.error({ error: error.message, org_id: req.params.orgId, request_id: req.requestId }, 'Failed to get org checklist');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to get organization checklist',
            request_id: req.requestId
        });
    }
});

/**
 * GET /admin/v1/patterns
 * List available governance patterns
 * INTERNAL USE ONLY
 */
router.get('/patterns', async (req, res) => {
    const patterns = Object.entries(GOVERNANCE_PATTERNS).map(([key, pattern]) => ({
        id: key,
        escrow_name: pattern.escrow.name,
        policy_name: pattern.policy.name,
        initial_balance_cents: pattern.escrow.initialBalanceCents,
        per_tx_limit_cents: pattern.policy.per_transaction_limit_cents,
        daily_limit_cents: pattern.policy.daily_limit_cents,
        monthly_limit_cents: pattern.policy.monthly_limit_cents,
        auto_approve_under_cents: pattern.policy.auto_approve_under_cents
    }));

    res.json({
        patterns,
        description: 'Available governance patterns for org bootstrapping'
    });
});

module.exports = router;
