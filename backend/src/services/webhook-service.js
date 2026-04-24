/**
 * Safe-Spend Webhook Service
 * 
 * Handles webhook delivery, signing, and retry logic.
 * 
 * Security:
 * - HMAC SHA-256 signature in X-SafeSpend-Signature header
 * - Timestamp in X-SafeSpend-Timestamp header for replay protection
 * 
 * Retry Policy:
 * - Exponential backoff: 2^attempt_count * 60 seconds, max 1 hour
 * - Max 10 retry attempts before marking as failed
 */

const prisma = require('../lib/prisma');
const crypto = require('crypto');
const { generateId } = require('../utils/ids');

// Supported webhook event types
const SUPPORTED_EVENTS = [
    'spend.approved',
    'spend.denied',
    'spend.expired',
    'approval.requested',
    'approval.approved',
    'approval.denied',
    'approval.expired',
    'escrow.funded',
    'escrow.paused',
    'escrow.resumed',
    'escrow.closed',
    // AAV Integration Events
    'aav.verification_passed',
    'aav.verification_denied',
    'aav.verification_failed',
    // Cross-tool events
    'safe_spend.spend.approved',
    'safe_spend.spend.denied',
    'safe_spend.spend.expired',
    'safe_spend.escrow.paused',
    'safe_spend.escrow.closed',
    'safe_spend.escrow.funded'
];

const MAX_RETRY_ATTEMPTS = 10;
const MAX_BACKOFF_SECONDS = 3600; // 1 hour

/**
 * Create HMAC signature for webhook payload
 * 
 * How to verify (document this for clients):
 * 1. Get the raw payload body
 * 2. Get X-SafeSpend-Timestamp header value
 * 3. Concatenate: timestamp + '.' + payload
 * 4. Compute HMAC-SHA256 with your webhook secret
 * 5. Compare with X-SafeSpend-Signature (hex-encoded)
 * 
 * @param {string} payload - JSON stringified payload
 * @param {string} secret - Webhook secret
 * @param {string} timestamp - Unix timestamp
 * @returns {string} Hex-encoded HMAC signature
 */
function createSignature(payload, secret, timestamp) {
    const signedPayload = `${timestamp}.${payload}`;
    return crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
}

/**
 * Verify webhook signature (utility for clients)
 * 
 * @param {string} payload - Raw payload body
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret
 * @param {string} timestamp - Timestamp from header
 * @param {number} [toleranceSeconds=300] - Max age of request (5 min default)
 * @returns {boolean}
 */
function verifySignature(payload, signature, secret, timestamp, toleranceSeconds = 300) {
    // Check timestamp is recent (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (Math.abs(now - requestTime) > toleranceSeconds) {
        return false;
    }
    
    const expectedSignature = createSignature(payload, secret, timestamp);
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

/**
 * Build webhook payload for a specific event type
 * 
 * @param {string} eventType - Event type (e.g., 'spend.approved')
 * @param {Object} data - Event-specific data
 * @returns {Object} Formatted webhook payload
 */
function buildPayload(eventType, data) {
    return {
        id: generateId('event'),
        type: eventType,
        created_at: new Date().toISOString(),
        data
    };
}

/**
 * Build spend event data
 */
function buildSpendEventData(spendRequest, escrowAccount, rulesEvaluated = []) {
    return {
        spend_request_id: spendRequest.id,
        escrow_id: spendRequest.escrowId,
        org_id: spendRequest.orgId,
        amount_cents: spendRequest.amountCents,
        currency: spendRequest.currency || 'usd',
        vendor: spendRequest.vendor,
        category: spendRequest.category,
        status: spendRequest.status,
        remaining_balance_cents: escrowAccount?.balanceCents,
        rules_evaluated: rulesEvaluated
    };
}

/**
 * Build approval event data
 */
function buildApprovalEventData(approval, spendRequest, escrowAccount) {
    return {
        approval_id: approval.id,
        spend_request_id: spendRequest.id,
        escrow_id: spendRequest.escrowId,
        org_id: spendRequest.orgId,
        amount_cents: spendRequest.amountCents,
        currency: spendRequest.currency || 'usd',
        vendor: spendRequest.vendor,
        category: spendRequest.category,
        status: spendRequest.status,
        approval_expires_at: approval.expiresAt?.toISOString()
    };
}

/**
 * Build AAV verification event data
 */
function buildAAVEventData(spendRequest, escrowAccount, aavResult) {
    return {
        spend_request_id: spendRequest.id,
        escrow_id: spendRequest.escrowId,
        org_id: spendRequest.orgId,
        amount_cents: spendRequest.amountCents,
        currency: spendRequest.currency || 'usd',
        vendor: spendRequest.vendor,
        aav: {
            agent_id: aavResult?.agentId || spendRequest.aavAgentId,
            grant_id: aavResult?.grantId || spendRequest.aavGrantId,
            certificate_id: spendRequest.aavCertificateId,
            verification_id: aavResult?.verificationId,
            verification_status: spendRequest.aavVerificationStatus,
            autonomy_level: aavResult?.autonomyLevel,
            result: aavResult?.result,
            denial_reason: aavResult?.denialReason,
            response_time_ms: aavResult?.responseTime,
            error: aavResult?.error
        },
        escrow_enforcement_mode: escrowAccount?.aavEnforcementMode
    };
}

/**
 * Queue webhooks for an event
 * 
 * @param {string} orgId - Organization ID
 * @param {string} eventType - Event type
 * @param {Object} eventData - Event data to include in payload
 */
async function queueWebhooks(orgId, eventType, eventData) {
    try {
        // Find all active webhooks for this org subscribed to this event
        const webhooks = await prisma.webhook.findMany({
            where: {
                orgId,
                isActive: true
            }
        });
        
        const matchingWebhooks = webhooks.filter(w => {
            const events = JSON.parse(w.events || '[]');
            return events.includes(eventType) || events.includes('*');
        });
        
        if (matchingWebhooks.length === 0) {
            return { queued: 0 };
        }
        
        // Build payload
        const payload = buildPayload(eventType, eventData);
        const payloadJson = JSON.stringify(payload);
        
        // Create delivery records for each webhook
        const deliveries = await Promise.all(
            matchingWebhooks.map(webhook =>
                prisma.webhookDelivery.create({
                    data: {
                        id: generateId('webhookDelivery'),
                        webhookId: webhook.id,
                        eventId: payload.id,
                        eventType,
                        payload: payloadJson,
                        status: 'pending',
                        attemptCount: 0,
                        nextAttemptAt: new Date()
                    }
                })
            )
        );
        
        return { queued: deliveries.length };
    } catch (error) {
        console.error('Error queueing webhooks:', error);
        return { queued: 0, error: error.message };
    }
}

/**
 * Deliver a single webhook
 * 
 * @param {Object} delivery - WebhookDelivery record
 * @param {Object} webhook - Webhook record
 * @returns {Object} Result with success/failure status
 */
async function deliverWebhook(delivery, webhook) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createSignature(delivery.payload, webhook.secret, timestamp);
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-SafeSpend-Signature': signature,
                'X-SafeSpend-Timestamp': timestamp,
                'X-SafeSpend-Event': delivery.eventType,
                'User-Agent': 'SafeSpend-Webhook/1.0'
            },
            body: delivery.payload,
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
            // Success
            await prisma.$transaction([
                prisma.webhookDelivery.update({
                    where: { id: delivery.id },
                    data: {
                        status: 'success',
                        attemptCount: delivery.attemptCount + 1,
                        lastAttemptAt: new Date(),
                        nextAttemptAt: null,
                        errorMessage: null
                    }
                }),
                prisma.webhook.update({
                    where: { id: webhook.id },
                    data: { lastTriggeredAt: new Date() }
                })
            ]);
            
            return { success: true, statusCode: response.status };
        } else {
            // Non-2xx response
            const errorText = await response.text().catch(() => 'Unable to read response');
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }
    } catch (error) {
        // Network error or non-2xx
        const newAttemptCount = delivery.attemptCount + 1;
        const shouldRetry = newAttemptCount < MAX_RETRY_ATTEMPTS;
        
        // Calculate next retry time with exponential backoff
        let nextAttemptAt = null;
        if (shouldRetry) {
            const backoffSeconds = Math.min(
                Math.pow(2, newAttemptCount) * 60,
                MAX_BACKOFF_SECONDS
            );
            nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
        }
        
        await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
                status: shouldRetry ? 'pending' : 'failed',
                attemptCount: newAttemptCount,
                lastAttemptAt: new Date(),
                nextAttemptAt,
                errorMessage: error.message?.substring(0, 500)
            }
        });
        
        return {
            success: false,
            error: error.message,
            willRetry: shouldRetry,
            attemptCount: newAttemptCount
        };
    }
}

/**
 * Process pending webhook deliveries
 * 
 * This should be called periodically (e.g., via cron or maintenance endpoint)
 * 
 * @param {number} [limit=50] - Max deliveries to process
 * @returns {Object} Results summary
 */
async function processPendingDeliveries(limit = 50) {
    const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        willRetry: 0,
        errors: []
    };
    
    try {
        // Get pending deliveries that are due
        const deliveries = await prisma.webhookDelivery.findMany({
            where: {
                status: 'pending',
                nextAttemptAt: { lte: new Date() }
            },
            include: {
                webhook: true
            },
            orderBy: { nextAttemptAt: 'asc' },
            take: limit
        });
        
        for (const delivery of deliveries) {
            if (!delivery.webhook || !delivery.webhook.isActive) {
                // Skip inactive webhooks
                await prisma.webhookDelivery.update({
                    where: { id: delivery.id },
                    data: {
                        status: 'failed',
                        errorMessage: 'Webhook is inactive or deleted'
                    }
                });
                results.failed++;
                continue;
            }
            
            const result = await deliverWebhook(delivery, delivery.webhook);
            results.processed++;
            
            if (result.success) {
                results.succeeded++;
            } else if (result.willRetry) {
                results.willRetry++;
            } else {
                results.failed++;
                results.errors.push({
                    deliveryId: delivery.id,
                    error: result.error
                });
            }
        }
    } catch (error) {
        console.error('Error processing webhook deliveries:', error);
        results.errors.push({ error: error.message });
    }
    
    return results;
}

/**
 * Validate event types in subscription
 */
function validateEventTypes(events) {
    if (!Array.isArray(events) || events.length === 0) {
        return { valid: false, error: 'events must be a non-empty array' };
    }
    
    const invalidEvents = events.filter(e => 
        e !== '*' && !SUPPORTED_EVENTS.includes(e)
    );
    
    if (invalidEvents.length > 0) {
        return { 
            valid: false, 
            error: `Unsupported event types: ${invalidEvents.join(', ')}. Supported: ${SUPPORTED_EVENTS.join(', ')}` 
        };
    }
    
    return { valid: true };
}

module.exports = {
    SUPPORTED_EVENTS,
    createSignature,
    verifySignature,
    buildPayload,
    buildSpendEventData,
    buildApprovalEventData,
    buildAAVEventData,
    queueWebhooks,
    deliverWebhook,
    processPendingDeliveries,
    validateEventTypes
};
