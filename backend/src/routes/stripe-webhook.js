/**
 * Stripe Webhook Routes
 * Handles incoming Stripe webhook events
 * 
 * Endpoint: POST /stripe/webhook (NOT prefixed with /api/v1)
 */

const express = require('express');
const stripeLib = require('../lib/stripe');
const stripeService = require('../services/stripe-service');
const subscriptionService = require('../services/subscription-service');

const router = express.Router();

/**
 * Stripe Webhook Handler
 * POST /stripe/webhook
 * 
 * This endpoint receives webhook events from Stripe.
 * Important: This route must receive raw body, not parsed JSON.
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // Construct and verify the webhook event
        event = stripeLib.constructWebhookEvent(req.body, signature);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    try {
        switch (event.type) {
            // ========== ESCROW FUNDING EVENTS ==========
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log(`Processing checkout.session.completed: ${session.id}, mode: ${session.mode}`);
                
                // Handle subscription checkout
                if (session.mode === 'subscription') {
                    const result = await subscriptionService.processSubscriptionCheckout(session);
                    if (result.success) {
                        console.log(`Subscription activated: ${session.subscription} for plan ${result.plan}`);
                    } else {
                        console.error(`Failed to process subscription checkout: ${result.error}`);
                    }
                }
                // Handle payment (escrow funding) checkout
                else if (session.mode === 'payment' && session.payment_status === 'paid') {
                    const result = await stripeService.processCompletedCheckout(session);
                    if (result.success) {
                        console.log(`Funding processed successfully for escrow ${session.metadata?.escrow_id}`);
                    } else {
                        console.error(`Failed to process funding: ${result.error}`);
                    }
                }
                break;
            }

            case 'checkout.session.expired': {
                const session = event.data.object;
                console.log(`Checkout session expired: ${session.id}`);
                // Could update funding_events status to 'expired' here
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log(`Payment intent succeeded: ${paymentIntent.id}`);
                // Already handled by checkout.session.completed, but logged for debugging
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log(`Payment intent failed: ${paymentIntent.id}`);
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object;
                console.log(`Charge refunded: ${charge.id}`);
                // Could update funding_events here if needed
                break;
            }

            // ========== SUBSCRIPTION EVENTS ==========
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
                const result = await subscriptionService.processSubscriptionUpdated(subscription);
                if (!result.success) {
                    console.error(`Failed to process subscription update: ${result.error}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                console.log(`Subscription deleted/canceled: ${subscription.id}`);
                const result = await subscriptionService.processSubscriptionDeleted(subscription);
                if (!result.success) {
                    console.error(`Failed to process subscription deletion: ${result.error}`);
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object;
                console.log(`Invoice paid: ${invoice.id}`);
                // Invoice paid confirms ongoing subscription - no action needed
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                console.log(`Invoice payment failed: ${invoice.id}`);
                const result = await subscriptionService.processInvoicePaymentFailed(invoice);
                if (!result.success) {
                    console.error(`Failed to process payment failure: ${result.error}`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (err) {
        console.error(`Error handling webhook event ${event.type}:`, err);
        // Still return 200 to prevent Stripe from retrying (we'll handle errors internally)
        res.status(200).json({ received: true, error: err.message });
    }
});

module.exports = router;
