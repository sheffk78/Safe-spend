/**
 * Internal Events Route
 * 
 * POST /v1/internal/events
 * Receives cross-tool events from AAV and ARL.
 * Auth: HMAC-SHA256 via X-AgenticTrust-Signature header
 */

const express = require('express');
const { verifyInternalSignature, processInternalEvent } = require('../services/cross-tool-events');
const { logger } = require('../lib/logger');

const router = express.Router();

const INTERNAL_EVENTS_SECRET = process.env.INTERNAL_EVENTS_SECRET;

/**
 * POST /v1/internal/events
 * Receive internal cross-tool events
 */
router.post('/', async (req, res) => {
    try {
        const signature = req.headers['x-agentictrust-signature'];

        // Verify HMAC signature
        if (!INTERNAL_EVENTS_SECRET) {
            return res.status(503).json({
                error: 'internal_events_not_configured',
                message: 'Internal events secret not configured'
            });
        }

        // Use req.rawBody if available (stored by express.json verify callback)
        // Otherwise fall back to stringifying req.body
        const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        if (!verifyInternalSignature(rawBody, signature, INTERNAL_EVENTS_SECRET)) {
            return res.status(401).json({
                error: 'invalid_signature',
                message: 'X-AgenticTrust-Signature verification failed'
            });
        }

        const event = req.body;

        // Validate event structure
        if (!event.event_type) {
            return res.status(400).json({
                error: 'invalid_event',
                message: 'event_type is required'
            });
        }

        const acceptedTypes = ['aav.grant.revoked', 'aav.grant.created', 'arl.score.changed'];
        if (!acceptedTypes.includes(event.event_type)) {
            return res.status(400).json({
                error: 'unsupported_event_type',
                message: `Accepted event types: ${acceptedTypes.join(', ')}`,
                received: event.event_type
            });
        }

        // Process event
        const result = await processInternalEvent(event);

        res.json({
            received: true,
            event_type: event.event_type,
            ...result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Internal event processing error');
        res.status(500).json({ error: 'Failed to process internal event' });
    }
});

module.exports = router;
