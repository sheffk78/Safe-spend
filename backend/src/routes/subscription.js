/**
 * Subscription Routes
 * Handles plan upgrades, billing portal, and subscription status
 */

const express = require('express');
const { requireOrgAuth } = require('../middleware/auth');
const subscriptionService = require('../services/subscription-service');

const router = express.Router();

/**
 * GET /v1/subscription
 * Get current subscription status and limits
 */
router.get('/', requireOrgAuth, async (req, res) => {
    try {
        const status = await subscriptionService.getSubscriptionStatus(req.org.id);
        res.json(status);
    } catch (error) {
        console.error('Error getting subscription status:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

/**
 * POST /v1/subscription/checkout
 * Create a checkout session for a plan upgrade
 */
router.post('/checkout', requireOrgAuth, async (req, res) => {
    try {
        const { plan, success_url, cancel_url } = req.body;

        if (!plan || !['builder', 'scale'].includes(plan)) {
            return res.status(400).json({ 
                error: 'Invalid plan. Choose "builder" or "scale"' 
            });
        }

        if (!success_url || !cancel_url) {
            return res.status(400).json({ 
                error: 'success_url and cancel_url are required' 
            });
        }

        const result = await subscriptionService.createSubscriptionCheckout({
            orgId: req.org.id,
            plan,
            successUrl: success_url,
            cancelUrl: cancel_url,
        });

        res.json({
            session_id: result.sessionId,
            checkout_url: result.checkoutUrl,
        });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
});

/**
 * POST /v1/subscription/portal
 * Create a billing portal session for managing subscription
 */
router.post('/portal', requireOrgAuth, async (req, res) => {
    try {
        const { return_url } = req.body;

        if (!return_url) {
            return res.status(400).json({ error: 'return_url is required' });
        }

        const result = await subscriptionService.createBillingPortalSession(
            req.org.id,
            return_url
        );

        res.json({
            portal_url: result.url,
        });
    } catch (error) {
        console.error('Error creating billing portal session:', error);
        res.status(500).json({ error: error.message || 'Failed to create billing portal session' });
    }
});

/**
 * GET /v1/subscription/limits
 * Check if org can perform certain actions based on plan limits
 */
router.get('/limits', requireOrgAuth, async (req, res) => {
    try {
        const canEscrow = await subscriptionService.canCreateEscrow(req.org.id);
        const status = await subscriptionService.getSubscriptionStatus(req.org.id);

        res.json({
            plan: status.plan,
            status: status.status,
            escrow_accounts: canEscrow,
            monthly_volume: {
                current_cents: status.usage.monthly_escrow_volume_cents,
                limit_cents: status.limits.monthly_volume_cents,
                is_unlimited: status.limits.monthly_volume_cents === null,
            },
            transaction_fee_pct: status.limits.transaction_fee_pct,
            is_live: status.limits.is_live,
        });
    } catch (error) {
        console.error('Error getting subscription limits:', error);
        res.status(500).json({ error: 'Failed to get subscription limits' });
    }
});

/**
 * GET /v1/subscription/plans
 * Get available plans and their features (public info)
 */
router.get('/plans', async (req, res) => {
    res.json({
        plans: [
            {
                id: 'sandbox',
                name: 'Sandbox',
                price_cents: 0,
                price_display: 'Free',
                billing_period: null,
                features: {
                    escrow_accounts: 1,
                    monthly_volume: 'Test only (fake money)',
                    transaction_fee: 'None',
                    webhooks: true,
                    audit_trail: true,
                    framework_sdks: true,
                    custom_approval_workflows: false,
                    multi_tenant: false,
                    support: 'Community',
                },
                is_live: false,
            },
            {
                id: 'builder',
                name: 'Builder',
                price_cents: 2900,
                price_display: '$29/month',
                billing_period: 'monthly',
                stripe_price_id: subscriptionService.PRICE_IDS.builder,
                features: {
                    escrow_accounts: 1,
                    monthly_volume: '$5,000',
                    transaction_fee: '0.5%',
                    webhooks: true,
                    audit_trail: true,
                    framework_sdks: true,
                    custom_approval_workflows: false,
                    multi_tenant: false,
                    support: 'Email',
                },
                is_live: true,
            },
            {
                id: 'scale',
                name: 'Scale',
                price_cents: 14900,
                price_display: '$149/month',
                billing_period: 'monthly',
                stripe_price_id: subscriptionService.PRICE_IDS.scale,
                features: {
                    escrow_accounts: 'Unlimited',
                    monthly_volume: 'Unlimited',
                    transaction_fee: '0.3%',
                    webhooks: true,
                    audit_trail: true,
                    framework_sdks: true,
                    custom_approval_workflows: true,
                    multi_tenant: true,
                    support: 'Priority + SLA',
                },
                is_live: true,
            },
        ],
    });
});

module.exports = router;
