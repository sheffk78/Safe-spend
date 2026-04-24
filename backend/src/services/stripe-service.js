const prisma = require('../lib/prisma.js');
/**
 * Stripe Service
 * Handles Stripe-related business logic for Safe-Spend
 * 
 * This service manages:
 * - Organization to Stripe Customer mapping
 * - Escrow funding via Checkout Sessions
 * - Refunds on escrow close
 * - Webhook event processing
 */

const stripeLib = require('../lib/stripe');
const { generateId } = require('../utils/ids');

/**
 * Helper function to generate event IDs
 */
function generateEventId() {
    return generateId('auditEvent');
}

/**
 * Ensure an organization has a Stripe Customer
 * Creates one if it doesn't exist
 */
async function ensureStripeCustomer(orgId) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

    if (!org) {
        throw new Error('Organization not found');
    }

    // If already has a Stripe customer, return it
    if (org.stripeCustomerId) {
        return org.stripeCustomerId;
    }

    // Create a new Stripe customer
    const customer = await stripeLib.createStripeCustomer({
        email: org.email,
        name: org.name,
        orgId: org.id,
    });

    // Update org with Stripe customer ID
    await prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customer.id },
    });

    // Create audit event
    await prisma.auditEvent.create({
        data: {
            id: generateEventId(),
            orgId,
            eventType: 'stripe.customer.created',
            actorType: 'system',
            details: JSON.stringify({
                stripe_customer_id: customer.id,
                email: org.email,
            }),
        },
    });

    return customer.id;
}

/**
 * Create a funding session for an escrow account
 */
async function createFundingSession({
    orgId,
    escrowId,
    amountCents,
    currency = 'usd',
    successUrl,
    cancelUrl,
}) {
    // Validate escrow belongs to org and is active
    const escrow = await prisma.escrowAccount.findFirst({
        where: {
            id: escrowId,
            orgId,
        },
    });

    if (!escrow) {
        throw new Error('Escrow account not found');
    }

    if (escrow.status !== 'active') {
        throw new Error(`Cannot fund escrow in ${escrow.status} status`);
    }

    // Ensure org has a Stripe customer
    const customerId = await ensureStripeCustomer(orgId);

    // Create Stripe Checkout session
    const session = await stripeLib.createCheckoutSession({
        customerId,
        amountCents,
        currency,
        escrowId,
        orgId,
        escrowName: escrow.name,
        successUrl,
        cancelUrl,
    });

    // Create a pending funding event
    await prisma.fundingEvent.create({
        data: {
            orgId,
            escrowId,
            stripeSessionId: session.id,
            amountCents,
            currency,
            status: 'pending',
            type: 'funding',
        },
    });

    // Create audit event for session creation
    await prisma.auditEvent.create({
        data: {
            id: generateEventId(),
            orgId,
            escrowId,
            eventType: 'funding.session.created',
            actorType: 'human',
            details: JSON.stringify({
                stripe_session_id: session.id,
                amount_cents: amountCents,
                currency,
            }),
        },
    });

    return {
        sessionId: session.id,
        checkoutUrl: session.url,
    };
}

/**
 * Process a completed Checkout Session (called from webhook)
 */
async function processCompletedCheckout(session) {
    const escrowId = session.metadata?.escrow_id;
    const orgId = session.metadata?.org_id;

    if (!escrowId || !orgId) {
        console.error('Missing escrow_id or org_id in session metadata');
        return { success: false, error: 'Missing metadata' };
    }

    const amountCents = session.amount_total;
    const paymentIntentId = session.payment_intent;

    // Use transaction to update everything atomically
    const result = await prisma.$transaction(async (tx) => {
        // Update escrow account balance
        const escrow = await tx.escrowAccount.update({
            where: { id: escrowId },
            data: {
                balanceCents: { increment: amountCents },
                totalFundedCents: { increment: amountCents },
                stripePaymentIntentId: paymentIntentId,
            },
        });

        // Update funding event
        await tx.fundingEvent.updateMany({
            where: {
                stripeSessionId: session.id,
            },
            data: {
                status: 'succeeded',
                stripePaymentIntentId: paymentIntentId,
            },
        });

        // Create audit event
        await tx.auditEvent.create({
            data: {
                id: generateEventId(),
                orgId,
                escrowId,
                eventType: 'escrow.funded',
                actorType: 'system',
                details: JSON.stringify({
                    stripe_session_id: session.id,
                    stripe_payment_intent_id: paymentIntentId,
                    amount_cents: amountCents,
                    currency: session.currency,
                    new_balance_cents: escrow.balanceCents,
                    source: 'stripe_checkout',
                }),
            },
        });

        return escrow;
    });

    return { success: true, escrow: result };
}

/**
 * Process refund for an escrow account being closed
 */
async function processEscrowRefund(escrowId, orgId) {
    const escrow = await prisma.escrowAccount.findFirst({
        where: { id: escrowId, orgId },
        include: {
            fundingEvents: {
                where: { status: 'succeeded', type: 'funding' },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!escrow) {
        throw new Error('Escrow account not found');
    }

    if (escrow.balanceCents === 0) {
        return { refundId: null, refundedAmount: 0 };
    }

    // Find a payment intent to refund
    const fundingEvent = escrow.fundingEvents.find(e => e.stripePaymentIntentId);
    
    if (!fundingEvent?.stripePaymentIntentId) {
        // No Stripe payment to refund - just zero the balance
        console.warn(`No Stripe payment intent found for escrow ${escrowId}. Zeroing balance without Stripe refund.`);
        return { refundId: null, refundedAmount: escrow.balanceCents };
    }

    // Create Stripe refund
    const refund = await stripeLib.createRefund({
        paymentIntentId: fundingEvent.stripePaymentIntentId,
        amountCents: escrow.balanceCents,
        reason: 'requested_by_customer',
    });

    // Record refund funding event
    await prisma.fundingEvent.create({
        data: {
            orgId,
            escrowId,
            stripePaymentIntentId: fundingEvent.stripePaymentIntentId,
            stripeRefundId: refund.id,
            amountCents: escrow.balanceCents,
            currency: escrow.currency,
            status: 'refunded',
            type: 'refund',
        },
    });

    return {
        refundId: refund.id,
        refundedAmount: escrow.balanceCents,
    };
}

/**
 * Get funding history for an escrow account
 */
async function getFundingHistory(escrowId, orgId) {
    const events = await prisma.fundingEvent.findMany({
        where: {
            escrowId,
            orgId,
        },
        orderBy: { createdAt: 'desc' },
    });

    return events.map(event => ({
        id: event.id,
        type: event.type,
        amount_cents: event.amountCents,
        currency: event.currency,
        status: event.status,
        stripe_payment_intent_id: event.stripePaymentIntentId,
        stripe_session_id: event.stripeSessionId,
        stripe_refund_id: event.stripeRefundId,
        created_at: event.createdAt,
    }));
}

/**
 * Simulate funding (for development without Stripe webhook)
 * This is called manually when testing without webhooks
 */
async function simulateFundingComplete(sessionId) {
    const fundingEvent = await prisma.fundingEvent.findFirst({
        where: { stripeSessionId: sessionId },
    });

    if (!fundingEvent) {
        throw new Error('Funding event not found');
    }

    if (fundingEvent.status !== 'pending') {
        return { success: false, message: 'Funding already processed' };
    }

    // Simulate the session completion
    const simulatedSession = {
        id: sessionId,
        amount_total: fundingEvent.amountCents,
        currency: fundingEvent.currency,
        payment_intent: `pi_simulated_${Date.now()}`,
        metadata: {
            escrow_id: fundingEvent.escrowId,
            org_id: fundingEvent.orgId,
        },
    };

    return processCompletedCheckout(simulatedSession);
}

module.exports = {
    ensureStripeCustomer,
    createFundingSession,
    processCompletedCheckout,
    processEscrowRefund,
    getFundingHistory,
    simulateFundingComplete,
};
