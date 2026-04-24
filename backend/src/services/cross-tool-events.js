const prisma = require('../lib/prisma.js');
/**
 * Cross-Tool Event Service
 * 
 * Handles emitting and receiving cross-tool events between
 * Safe-Spend, AAV, and ARL.
 * 
 * Event envelope format:
 * {
 *   id: "evt_at_{hex12}",
 *   source: "safe_spend",
 *   event_type: "safe_spend.spend.approved",
 *   org_id: "org_...",
 *   uaid: "agt_...",
 *   timestamp: "...",
 *   data: { ... }
 * }
 */

const crypto = require('crypto');
const { logger } = require('../lib/logger');
const { generateHex } = require('../utils/ids');

/**
 * Build a cross-tool event envelope
 */
function buildEventEnvelope(eventType, orgId, agentId, data) {
    return {
        id: `evt_at_${generateHex(12)}`,
        source: 'safe_spend',
        event_type: eventType,
        org_id: orgId,
        uaid: agentId || null,
        timestamp: new Date().toISOString(),
        data
    };
}

/**
 * Emit a cross-tool event (stores locally and could forward to subscribers)
 */
async function emitEvent(eventType, orgId, agentId, data) {
    try {
        const envelope = buildEventEnvelope(eventType, orgId, agentId, data);

        // Store in cross_tool_events table
        await prisma.crossToolEvent.create({
            data: {
                id: envelope.id,
                orgId,
                source: 'safe_spend',
                eventType,
                agentId,
                payload: JSON.stringify(envelope),
                status: 'processed',
                processedAt: new Date()
            }
        });

        logger.info({ eventType, orgId, agentId, eventId: envelope.id }, 'Cross-tool event emitted');
        return envelope;
    } catch (error) {
        logger.warn({ error: error.message, eventType }, 'Failed to emit cross-tool event');
        return null;
    }
}

// Convenience emitters for specific event types

function emitSpendApproved(orgId, agentId, spendData) {
    return emitEvent('safe_spend.spend.approved', orgId, agentId, spendData);
}

function emitSpendDenied(orgId, agentId, spendData) {
    return emitEvent('safe_spend.spend.denied', orgId, agentId, spendData);
}

function emitSpendExpired(orgId, agentId, spendData) {
    return emitEvent('safe_spend.spend.expired', orgId, agentId, spendData);
}

function emitEscrowPaused(orgId, agentId, escrowData) {
    return emitEvent('safe_spend.escrow.paused', orgId, agentId, escrowData);
}

function emitEscrowClosed(orgId, agentId, escrowData) {
    return emitEvent('safe_spend.escrow.closed', orgId, agentId, escrowData);
}

function emitEscrowFunded(orgId, agentId, escrowData) {
    return emitEvent('safe_spend.escrow.funded', orgId, agentId, escrowData);
}

/**
 * Verify HMAC-SHA256 signature for incoming internal events
 */
function verifyInternalSignature(payload, signature, secret) {
    if (!signature || !secret) return false;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('hex');
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expected, 'hex')
        );
    } catch {
        return false;
    }
}

/**
 * Process an incoming internal event
 */
async function processInternalEvent(event) {
    const { event_type, data, org_id, uaid } = event;

    // Store the received event
    await prisma.crossToolEvent.create({
        data: {
            id: event.id || `evt_at_${generateHex(12)}`,
            orgId: org_id,
            source: event.source || 'external',
            eventType: event_type,
            agentId: uaid,
            payload: JSON.stringify(event),
            status: 'received'
        }
    });

    switch (event_type) {
        case 'aav.grant.revoked':
            return await handleGrantRevoked(data, org_id, uaid);
        case 'aav.grant.created':
            return await handleGrantCreated(data, org_id, uaid);
        case 'arl.score.changed':
            return await handleScoreChanged(data, uaid);
        default:
            logger.warn({ event_type }, 'Unknown internal event type');
            return { processed: false, reason: 'unknown_event_type' };
    }
}

/**
 * Handle aav.grant.revoked: Pause linked escrow accounts
 */
async function handleGrantRevoked(data, orgId, agentId) {
    try {
        const where = { status: 'active' };
        if (orgId) where.orgId = orgId;
        
        // Find escrows linked to this agent
        const escrows = await prisma.escrowAccount.findMany({ where });
        
        let pausedCount = 0;
        for (const escrow of escrows) {
            const authorizedAgents = JSON.parse(escrow.authorizedAgentIds || '[]');
            const grantIds = JSON.parse(escrow.aavGrantIds || '[]');
            
            const shouldPause = 
                (agentId && (authorizedAgents.includes(agentId) || escrow.agentId === agentId)) ||
                (data?.grant_id && grantIds.includes(data.grant_id));
            
            if (shouldPause) {
                await prisma.escrowAccount.update({
                    where: { id: escrow.id },
                    data: { status: 'paused' }
                });
                pausedCount++;
                logger.info({ escrowId: escrow.id, agentId }, 'Escrow paused due to grant revocation');
            }
        }
        
        return { processed: true, paused_escrows: pausedCount };
    } catch (error) {
        logger.error({ error: error.message }, 'Error handling grant revoked');
        return { processed: false, error: error.message };
    }
}

/**
 * Handle aav.grant.created: Auto-provision escrow if enabled
 */
async function handleGrantCreated(data, orgId, agentId) {
    // For now, just log — auto-provision can be enabled later
    logger.info({ orgId, agentId, data }, 'Grant created event received');
    return { processed: true, action: 'logged' };
}

/**
 * Handle arl.score.changed: Update cached reputation scores
 */
async function handleScoreChanged(data, agentId) {
    const { updateCachedScore } = require('./arl-service');
    
    if (agentId && data?.score !== undefined) {
        await updateCachedScore(agentId, data.score);
        return { processed: true, agent_id: agentId, new_score: data.score };
    }
    return { processed: false, reason: 'missing_agent_id_or_score' };
}

module.exports = {
    buildEventEnvelope,
    emitEvent,
    emitSpendApproved,
    emitSpendDenied,
    emitSpendExpired,
    emitEscrowPaused,
    emitEscrowClosed,
    emitEscrowFunded,
    verifyInternalSignature,
    processInternalEvent
};
