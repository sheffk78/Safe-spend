/**
 * Stripe Client Configuration
 * Safe-Spend uses Stripe for payment processing in test mode
 * 
 * Note: This is configured for TEST MODE only.
 * Production Treasury/Issuing integration is a future step.
 */

const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    console.warn('WARNING: STRIPE_SECRET_KEY not set. Stripe integration will not work.');
}

// Initialize Stripe client with explicit API version
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
}) : null;

/**
 * Check if Stripe is properly configured
 */
function isStripeConfigured() {
    return !!stripe;
}

/**
 * Create a Stripe Customer for an organization
 */
async function createStripeCustomer({ email, name, orgId }) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
            safe_spend_org_id: orgId,
        },
    });

    return customer;
}

/**
 * Create a Checkout Session for funding an escrow account
 */
async function createCheckoutSession({
    customerId,
    amountCents,
    currency = 'usd',
    escrowId,
    orgId,
    escrowName,
    successUrl,
    cancelUrl,
}) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: `Fund Escrow: ${escrowName}`,
                        description: `Add funds to Safe-Spend escrow account`,
                    },
                    unit_amount: amountCents,
                },
                quantity: 1,
            },
        ],
        metadata: {
            escrow_id: escrowId,
            org_id: orgId,
            funding_type: 'escrow_funding',
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return session;
}

/**
 * Retrieve a Checkout Session by ID
 */
async function retrieveCheckoutSession(sessionId) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Create a refund for a PaymentIntent
 */
async function createRefund({ paymentIntentId, amountCents, reason = 'requested_by_customer' }) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason,
    });

    return refund;
}

/**
 * Construct and verify a Stripe webhook event
 */
function constructWebhookEvent(payload, signature) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (webhookSecret) {
        return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
        // If no webhook secret, parse directly (less secure, for dev only)
        console.warn('WARNING: STRIPE_WEBHOOK_SECRET not set. Skipping signature verification.');
        return JSON.parse(payload);
    }
}

/**
 * List payment intents for a customer
 */
async function listCustomerPaymentIntents(customerId, limit = 10) {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }

    return stripe.paymentIntents.list({
        customer: customerId,
        limit,
    });
}

/**
 * Get the raw Stripe client for advanced operations
 */
function getStripeClient() {
    if (!stripe) {
        throw new Error('Stripe is not configured');
    }
    return stripe;
}

module.exports = {
    stripe,
    getStripeClient,
    isStripeConfigured,
    createStripeCustomer,
    createCheckoutSession,
    retrieveCheckoutSession,
    createRefund,
    constructWebhookEvent,
    listCustomerPaymentIntents,
};
