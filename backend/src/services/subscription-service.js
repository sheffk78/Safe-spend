/**
 * Subscription Service
 * Handles Stripe subscription lifecycle for Safe-Spend plans
 */

const prisma = require('../lib/prisma');
const stripeLib = require('../lib/stripe');
const { generateId } = require('../utils/ids');
const { logger } = require('../lib/logger');

// Stripe Price IDs (from reference-stripe-products.md)
const PRICE_IDS = {
    builder: 'price_1TEVJj2lZzmsSFmdUsGS3Zff',  // $29/mo
    scale: 'price_1TEVJi2lZzmsSFmdHUD67iN2',    // $149/mo
};

// Plan entitlements
const PLAN_LIMITS = {
    sandbox: {
        maxEscrowAccounts: 1,
        monthlyVolumeCents: 0, // test only
        transactionFeePct: 0,
        isLive: false,
    },
    builder: {
        maxEscrowAccounts: 1,
        monthlyVolumeCents: 500000, // $5,000
        transactionFeePct: 0.5,
        isLive: true,
    },
    scale: {
        maxEscrowAccounts: null, // unlimited
        monthlyVolumeCents: null, // unlimited
        transactionFeePct: 0.3,
        isLive: true,
    },
};

/**
 * Get price ID for a plan
 */
function getPriceId(plan) {
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
        throw new Error(`Invalid plan: ${plan}. Valid plans are: builder, scale`);
    }
    return priceId;
}

/**
 * Create a Stripe Checkout session for subscription
 */
async function createSubscriptionCheckout({
    orgId,
    plan,
    successUrl,
    cancelUrl,
}) {
    if (plan === 'sandbox') {
        throw new Error('Sandbox plan does not require payment');
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

    if (!org) {
        throw new Error('Organization not found');
    }

    // Ensure org has a Stripe customer
    let customerId = org.stripeCustomerId;
    if (!customerId) {
        const customer = await stripeLib.createStripeCustomer({
            email: org.email,
            name: org.name,
            orgId: org.id,
        });
        customerId = customer.id;
        
        await prisma.organization.update({
            where: { id: orgId },
            data: { stripeCustomerId: customerId },
        });
    }

    const priceId = getPriceId(plan);

    // Create Checkout session for subscription
    const stripe = stripeLib.getStripeClient();
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{
            price: priceId,
            quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            org_id: orgId,
            plan: plan,
        },
        subscription_data: {
            metadata: {
                org_id: orgId,
                plan: plan,
            },
        },
    });

    // Audit event
    await prisma.auditEvent.create({
        data: {
            id: generateId('auditEvent'),
            orgId,
            eventType: 'subscription.checkout.created',
            actorType: 'human',
            details: JSON.stringify({
                stripe_session_id: session.id,
                plan,
                price_id: priceId,
            }),
        },
    });

    logger.info({ orgId, plan, sessionId: session.id }, 'Subscription checkout created');

    return {
        sessionId: session.id,
        checkoutUrl: session.url,
    };
}

/**
 * Process completed subscription checkout (called from webhook)
 */
async function processSubscriptionCheckout(session) {
    const orgId = session.metadata?.org_id;
    const plan = session.metadata?.plan;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    if (!orgId || !plan) {
        logger.error({ session_id: session.id }, 'Missing org_id or plan in subscription checkout');
        return { success: false, error: 'Missing metadata' };
    }

    // Get subscription details
    const stripe = stripeLib.getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await prisma.organization.update({
        where: { id: orgId },
        data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan: plan,
            planStatus: 'active',
            planPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
    });

    await prisma.auditEvent.create({
        data: {
            id: generateId('auditEvent'),
            orgId,
            eventType: 'subscription.activated',
            actorType: 'system',
            details: JSON.stringify({
                plan,
                stripe_subscription_id: subscriptionId,
                period_end: subscription.current_period_end,
            }),
        },
    });

    logger.info({ orgId, plan, subscriptionId }, 'Subscription activated');

    return { success: true, plan };
}

/**
 * Process subscription updated event
 */
async function processSubscriptionUpdated(subscription) {
    const orgId = subscription.metadata?.org_id;
    const plan = subscription.metadata?.plan;

    if (!orgId) {
        // Try to find org by subscription ID
        const org = await prisma.organization.findFirst({
            where: { stripeSubscriptionId: subscription.id },
        });
        if (!org) {
            logger.warn({ subscription_id: subscription.id }, 'Could not find org for subscription update');
            return { success: false, error: 'Organization not found' };
        }
    }

    const org = await prisma.organization.findFirst({
        where: {
            OR: [
                { id: orgId },
                { stripeSubscriptionId: subscription.id },
            ],
        },
    });

    if (!org) {
        return { success: false, error: 'Organization not found' };
    }

    // Map Stripe status to our status
    let planStatus = 'active';
    if (subscription.status === 'past_due') planStatus = 'past_due';
    if (subscription.status === 'canceled') planStatus = 'canceled';
    if (subscription.status === 'trialing') planStatus = 'trialing';
    if (subscription.status === 'unpaid') planStatus = 'past_due';

    await prisma.organization.update({
        where: { id: org.id },
        data: {
            plan: plan || org.plan,
            planStatus,
            planPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
    });

    await prisma.auditEvent.create({
        data: {
            id: generateId('auditEvent'),
            orgId: org.id,
            eventType: 'subscription.updated',
            actorType: 'system',
            details: JSON.stringify({
                stripe_status: subscription.status,
                plan_status: planStatus,
                period_end: subscription.current_period_end,
            }),
        },
    });

    logger.info({ orgId: org.id, planStatus }, 'Subscription updated');

    return { success: true };
}

/**
 * Process subscription deleted/canceled event
 */
async function processSubscriptionDeleted(subscription) {
    const org = await prisma.organization.findFirst({
        where: { stripeSubscriptionId: subscription.id },
    });

    if (!org) {
        logger.warn({ subscription_id: subscription.id }, 'Could not find org for subscription deletion');
        return { success: false, error: 'Organization not found' };
    }

    // Revert to sandbox
    await prisma.organization.update({
        where: { id: org.id },
        data: {
            plan: 'sandbox',
            planStatus: 'canceled',
            stripeSubscriptionId: null,
        },
    });

    await prisma.auditEvent.create({
        data: {
            id: generateId('auditEvent'),
            orgId: org.id,
            eventType: 'subscription.canceled',
            actorType: 'system',
            details: JSON.stringify({
                previous_plan: org.plan,
                stripe_subscription_id: subscription.id,
            }),
        },
    });

    logger.info({ orgId: org.id }, 'Subscription canceled, reverted to sandbox');

    return { success: true };
}

/**
 * Process invoice payment failed event
 */
async function processInvoicePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;
    
    const org = await prisma.organization.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
    });

    if (!org) {
        return { success: false, error: 'Organization not found' };
    }

    await prisma.organization.update({
        where: { id: org.id },
        data: {
            planStatus: 'past_due',
        },
    });

    await prisma.auditEvent.create({
        data: {
            id: generateId('auditEvent'),
            orgId: org.id,
            eventType: 'subscription.payment_failed',
            actorType: 'system',
            details: JSON.stringify({
                invoice_id: invoice.id,
                amount_due: invoice.amount_due,
            }),
        },
    });

    logger.warn({ orgId: org.id, invoiceId: invoice.id }, 'Invoice payment failed');

    return { success: true };
}

/**
 * Get subscription status for an organization
 */
async function getSubscriptionStatus(orgId) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            plan: true,
            planStatus: true,
            planPeriodEnd: true,
            stripeSubscriptionId: true,
            monthlyEscrowVolumeCents: true,
        },
    });

    if (!org) {
        throw new Error('Organization not found');
    }

    const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.sandbox;

    return {
        plan: org.plan,
        status: org.planStatus,
        period_end: org.planPeriodEnd,
        subscription_id: org.stripeSubscriptionId,
        limits: {
            max_escrow_accounts: limits.maxEscrowAccounts,
            monthly_volume_cents: limits.monthlyVolumeCents,
            transaction_fee_pct: limits.transactionFeePct,
            is_live: limits.isLive,
        },
        usage: {
            monthly_escrow_volume_cents: org.monthlyEscrowVolumeCents,
        },
    };
}

/**
 * Create a billing portal session for managing subscription
 */
async function createBillingPortalSession(orgId, returnUrl) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

    if (!org || !org.stripeCustomerId) {
        throw new Error('No Stripe customer found for organization');
    }

    const stripe = stripeLib.getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: returnUrl,
    });

    return {
        url: session.url,
    };
}

/**
 * Check if org can create more escrow accounts
 */
async function canCreateEscrow(orgId) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            escrowAccounts: {
                where: { status: { not: 'closed' } },
            },
        },
    });

    if (!org) {
        throw new Error('Organization not found');
    }

    const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.sandbox;
    
    if (limits.maxEscrowAccounts === null) {
        return { allowed: true };
    }

    const currentCount = org.escrowAccounts.length;
    
    return {
        allowed: currentCount < limits.maxEscrowAccounts,
        current: currentCount,
        limit: limits.maxEscrowAccounts,
        upgrade_required: currentCount >= limits.maxEscrowAccounts,
    };
}

/**
 * Check if org can process more escrow volume this month
 */
async function canProcessVolume(orgId, amountCents) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

    if (!org) {
        throw new Error('Organization not found');
    }

    const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.sandbox;
    
    if (limits.monthlyVolumeCents === null) {
        return { allowed: true };
    }

    const newTotal = org.monthlyEscrowVolumeCents + amountCents;
    
    return {
        allowed: newTotal <= limits.monthlyVolumeCents,
        current: org.monthlyEscrowVolumeCents,
        requested: amountCents,
        limit: limits.monthlyVolumeCents,
        would_exceed_by: Math.max(0, newTotal - limits.monthlyVolumeCents),
        upgrade_required: newTotal > limits.monthlyVolumeCents,
    };
}

/**
 * Record escrow volume usage
 */
async function recordVolumeUsage(orgId, amountCents) {
    await prisma.organization.update({
        where: { id: orgId },
        data: {
            monthlyEscrowVolumeCents: { increment: amountCents },
        },
    });
}

module.exports = {
    PRICE_IDS,
    PLAN_LIMITS,
    getPriceId,
    createSubscriptionCheckout,
    processSubscriptionCheckout,
    processSubscriptionUpdated,
    processSubscriptionDeleted,
    processInvoicePaymentFailed,
    getSubscriptionStatus,
    createBillingPortalSession,
    canCreateEscrow,
    canProcessVolume,
    recordVolumeUsage,
};
