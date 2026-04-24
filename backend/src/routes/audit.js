const express = require('express');
const prisma = require('../lib/prisma');
const { requireOrgAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /v1/audit
 * List audit events
 */
router.get('/', requireOrgAuth, async (req, res) => {
    try {
        const { escrow_id, event_type, actor_type, limit = 100, offset = 0 } = req.query;
        
        const where = { orgId: req.org.id };
        if (escrow_id) where.escrowId = escrow_id;
        if (event_type) where.eventType = event_type;
        if (actor_type) where.actorType = actor_type;
        
        const [events, total] = await Promise.all([
            prisma.auditEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.auditEvent.count({ where })
        ]);
        
        res.json({
            data: events.map(formatAuditEvent),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('List audit events error:', error);
        res.status(500).json({ error: 'Failed to list audit events' });
    }
});

/**
 * GET /v1/audit/:id
 * Get audit event details
 */
router.get('/:id', requireOrgAuth, async (req, res) => {
    try {
        const event = await prisma.auditEvent.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!event) {
            return res.status(404).json({ error: 'Audit event not found' });
        }
        
        res.json(formatAuditEvent(event));
    } catch (error) {
        console.error('Get audit event error:', error);
        res.status(500).json({ error: 'Failed to get audit event' });
    }
});

/**
 * Format audit event for API response
 */
function formatAuditEvent(event) {
    return {
        id: event.id,
        escrow_id: event.escrowId,
        event_type: event.eventType,
        actor_type: event.actorType,
        actor_id: event.actorId,
        details: JSON.parse(event.details || '{}'),
        ip_address: event.ipAddress,
        created_at: event.createdAt
    };
}

module.exports = router;
