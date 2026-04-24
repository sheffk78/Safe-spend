/**
 * Export Routes
 * CSV exports for governance reviews and audits
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireOrgAuth, requirePermission } = require('../middleware/auth');
const { exportRateLimiter } = require('../middleware/rate-limit');
const rbacService = require('../services/rbac-service');
const { generateId } = require('../utils/ids');

const router = express.Router();

// ============================================
// Export Configuration
// ============================================
const EXPORT_CONFIG = {
    // Maximum date range in days (90 days = ~3 months)
    maxDateRangeDays: 90,
    
    // PDF Statement feature flags (for future implementation)
    pdf: {
        enabled: false, // Set to true when PDF generation is ready
        maxStatementsPerMonth: 12, // Limit statement generation
    }
};

/**
 * Format date to ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)
 */
function formatDateISO(date) {
    if (!date) return '';
    return new Date(date).toISOString();
}

/**
 * Format cents to dollars string
 */
function formatCents(cents) {
    if (cents === null || cents === undefined) return '0.00';
    return (cents / 100).toFixed(2);
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Convert array of objects to CSV string
 */
function toCSV(data, columns) {
    const header = columns.map(col => escapeCSV(col.label)).join(',');
    const rows = data.map(row => 
        columns.map(col => escapeCSV(col.getValue(row))).join(',')
    );
    return [header, ...rows].join('\n');
}

/**
 * Generate filename for export
 */
function generateFilename(orgName, reportType) {
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const date = new Date().toISOString().split('T')[0];
    return `safe-spend-${slug}-${reportType}-${date}.csv`;
}

/**
 * Validate date range and check max allowed range
 * Returns { valid, startDate, endDate, error }
 */
function validateDateRange(start_date, end_date) {
    if (!start_date || !end_date) {
        return { 
            valid: false, 
            error: 'start_date and end_date are required' 
        };
    }
    
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { 
            valid: false, 
            error: 'Invalid date format. Use ISO 8601 (YYYY-MM-DD)' 
        };
    }
    
    if (startDate > endDate) {
        return {
            valid: false,
            error: 'start_date must be before end_date'
        };
    }
    
    // Check max date range
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > EXPORT_CONFIG.maxDateRangeDays) {
        return {
            valid: false,
            error: `Date range exceeds maximum of ${EXPORT_CONFIG.maxDateRangeDays} days. Please narrow your date range.`,
            max_days: EXPORT_CONFIG.maxDateRangeDays,
            requested_days: daysDiff
        };
    }
    
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    
    return { valid: true, startDate, endDate, daysDiff };
}

/**
 * Log export generation to audit trail
 */
async function logExportAuditEvent(req, reportType, recordCount, filters) {
    try {
        await prisma.auditEvent.create({
            data: {
                id: generateId('auditEvent'),
                orgId: req.org.id,
                eventType: 'export.generated',
                actorType: 'human',
                actorId: req.userEmail || req.org.email,
                details: JSON.stringify({
                    report_type: reportType,
                    record_count: recordCount,
                    filters: {
                        start_date: filters.startDate?.toISOString(),
                        end_date: filters.endDate?.toISOString(),
                        escrow_id: filters.escrowId || null,
                        status: filters.status || null,
                        event_type: filters.eventType || null,
                        actor_type: filters.actorType || null,
                    },
                    exported_by: req.userEmail,
                    user_role: req.userRole,
                }),
                ipAddress: req.ip || req.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown',
            }
        });
    } catch (error) {
        // Log but don't fail the export if audit logging fails
        console.error('Failed to log export audit event:', error);
    }
}

/**
 * Middleware to check export permission (owner or finance_admin)
 */
async function requireExportPermission(req, res, next) {
    try {
        // API key auth is not allowed for exports
        if (req.authType === 'api_key') {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Exports require dashboard authentication, not API key',
                request_id: req.requestId,
            });
        }
        
        const role = await rbacService.getUserRole(req.org.id, req.userEmail);
        
        if (!['owner', 'finance_admin'].includes(role)) {
            return res.status(403).json({
                error: 'forbidden',
                message: 'Only owners and finance admins can generate exports',
                your_role: role,
                request_id: req.requestId,
            });
        }
        
        req.userRole = role;
        next();
    } catch (error) {
        console.error('Export permission check error:', error);
        return res.status(500).json({
            error: 'internal_server_error',
            request_id: req.requestId,
        });
    }
}

/**
 * GET /v1/exports/spend-activity
 * Export spend requests/transactions to CSV
 * 
 * Query params:
 * - start_date: ISO date string (required)
 * - end_date: ISO date string (required)
 * - escrow_id: Filter by escrow account (optional)
 * - status: Filter by status (optional: all, approved, denied, pending, expired)
 * 
 * Rate limited: 10 requests per 5 minutes per org
 * Max date range: 90 days
 */
router.get('/spend-activity', requireOrgAuth, requireExportPermission, exportRateLimiter, async (req, res) => {
    try {
        const { start_date, end_date, escrow_id, status } = req.query;
        
        // Validate date range with max limit
        const validation = validateDateRange(start_date, end_date);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                max_days: validation.max_days,
                requested_days: validation.requested_days,
                request_id: req.requestId,
            });
        }
        
        const { startDate, endDate } = validation;
        
        // Build query
        const where = {
            orgId: req.org.id,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };
        
        if (escrow_id) {
            where.escrowId = escrow_id;
        }
        
        if (status && status !== 'all') {
            where.status = status;
        }
        
        // Fetch spend requests with related data
        const spendRequests = await prisma.spendRequest.findMany({
            where,
            include: {
                escrowAccount: {
                    select: { id: true, name: true }
                },
                approvals: {
                    select: {
                        id: true,
                        status: true,
                        decidedBy: true,
                        decidedAt: true,
                        decisionNote: true,
                    }
                },
                apiKey: {
                    select: { keyPrefix: true, keyType: true, label: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        
        // Define CSV columns
        const columns = [
            { label: 'Timestamp', getValue: (r) => formatDateISO(r.createdAt) },
            { label: 'Request ID', getValue: (r) => r.id },
            { label: 'Escrow Account', getValue: (r) => r.escrowAccount?.name || r.escrowId },
            { label: 'Escrow ID', getValue: (r) => r.escrowId },
            { label: 'Amount (USD)', getValue: (r) => formatCents(r.amountCents) },
            { label: 'Currency', getValue: (r) => r.currency?.toUpperCase() || 'USD' },
            { label: 'Vendor', getValue: (r) => r.vendor },
            { label: 'Category', getValue: (r) => r.category || '' },
            { label: 'Description', getValue: (r) => r.description || '' },
            { label: 'Status', getValue: (r) => r.status },
            { label: 'Resolved At', getValue: (r) => formatDateISO(r.resolvedAt) },
            { label: 'Resolved By', getValue: (r) => r.resolvedBy || '' },
            { label: 'Denial Reason', getValue: (r) => r.denialReason || '' },
            { label: 'Balance Before (USD)', getValue: (r) => r.balanceBeforeCents ? formatCents(r.balanceBeforeCents) : '' },
            { label: 'Balance After (USD)', getValue: (r) => r.balanceAfterCents ? formatCents(r.balanceAfterCents) : '' },
            { label: 'API Key', getValue: (r) => r.apiKey?.label || r.apiKey?.keyPrefix || '' },
            { label: 'API Key Type', getValue: (r) => r.apiKey?.keyType || '' },
            { label: 'Approval ID', getValue: (r) => r.approvals?.[0]?.id || '' },
            { label: 'Approval Status', getValue: (r) => r.approvals?.[0]?.status || '' },
            { label: 'Approver', getValue: (r) => r.approvals?.[0]?.decidedBy || '' },
            { label: 'Approval Note', getValue: (r) => r.approvals?.[0]?.decisionNote || '' },
            { label: 'Idempotency Key', getValue: (r) => r.idempotencyKey || '' },
        ];
        
        // Generate CSV
        const csv = toCSV(spendRequests, columns);
        const filename = generateFilename(req.org.name, 'spend-activity');
        
        // Log export to audit trail
        await logExportAuditEvent(req, 'spend-activity', spendRequests.length, {
            startDate,
            endDate,
            escrowId: escrow_id,
            status,
        });
        
        // Send response
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        
    } catch (error) {
        console.error('Export spend activity error:', error);
        res.status(500).json({
            error: 'Failed to generate export',
            request_id: req.requestId,
        });
    }
});

/**
 * GET /v1/exports/audit-events
 * Export audit events to CSV
 * 
 * Query params:
 * - start_date: ISO date string (required)
 * - end_date: ISO date string (required)
 * - escrow_id: Filter by escrow account (optional)
 * - event_type: Filter by event type (optional)
 * - actor_type: Filter by actor type (optional: human, agent, system)
 * 
 * Rate limited: 10 requests per 5 minutes per org
 * Max date range: 90 days
 */
router.get('/audit-events', requireOrgAuth, requireExportPermission, exportRateLimiter, async (req, res) => {
    try {
        const { start_date, end_date, escrow_id, event_type, actor_type } = req.query;
        
        // Validate date range with max limit
        const validation = validateDateRange(start_date, end_date);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                max_days: validation.max_days,
                requested_days: validation.requested_days,
                request_id: req.requestId,
            });
        }
        
        const { startDate, endDate } = validation;
        
        // Build query
        const where = {
            orgId: req.org.id,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };
        
        if (escrow_id) {
            where.escrowId = escrow_id;
        }
        
        if (event_type) {
            where.eventType = event_type;
        }
        
        if (actor_type) {
            where.actorType = actor_type;
        }
        
        // Fetch audit events with related data
        const auditEvents = await prisma.auditEvent.findMany({
            where,
            include: {
                escrowAccount: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        
        // Parse and flatten details JSON
        const flattenedEvents = auditEvents.map(event => {
            let details = {};
            try {
                details = JSON.parse(event.details || '{}');
            } catch (e) {
                details = {};
            }
            return { ...event, parsedDetails: details };
        });
        
        // Define CSV columns
        const columns = [
            { label: 'Timestamp', getValue: (r) => formatDateISO(r.createdAt) },
            { label: 'Event ID', getValue: (r) => r.id },
            { label: 'Event Type', getValue: (r) => r.eventType },
            { label: 'Actor Type', getValue: (r) => r.actorType },
            { label: 'Actor ID', getValue: (r) => r.actorId || '' },
            { label: 'Escrow Account', getValue: (r) => r.escrowAccount?.name || '' },
            { label: 'Escrow ID', getValue: (r) => r.escrowId || '' },
            { label: 'IP Address', getValue: (r) => r.ipAddress || '' },
            // Flatten common detail fields
            { label: 'Amount (USD)', getValue: (r) => r.parsedDetails.amount_cents ? formatCents(r.parsedDetails.amount_cents) : '' },
            { label: 'Vendor', getValue: (r) => r.parsedDetails.vendor || '' },
            { label: 'Spend Request ID', getValue: (r) => r.parsedDetails.spend_request_id || '' },
            { label: 'Approval ID', getValue: (r) => r.parsedDetails.approval_id || '' },
            { label: 'Policy ID', getValue: (r) => r.parsedDetails.policy_id || '' },
            { label: 'API Key ID', getValue: (r) => r.parsedDetails.api_key_id || '' },
            { label: 'Reason', getValue: (r) => r.parsedDetails.reason || r.parsedDetails.denial_reason || '' },
            { label: 'Note', getValue: (r) => r.parsedDetails.note || '' },
            { label: 'Details (JSON)', getValue: (r) => JSON.stringify(r.parsedDetails) },
        ];
        
        // Generate CSV
        const csv = toCSV(flattenedEvents, columns);
        const filename = generateFilename(req.org.name, 'audit-events');
        
        // Log export to audit trail
        await logExportAuditEvent(req, 'audit-events', auditEvents.length, {
            startDate,
            endDate,
            escrowId: escrow_id,
            eventType: event_type,
            actorType: actor_type,
        });
        
        // Send response
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        
    } catch (error) {
        console.error('Export audit events error:', error);
        res.status(500).json({
            error: 'Failed to generate export',
            request_id: req.requestId,
        });
    }
});

/**
 * GET /v1/exports/summary
 * Get export summary/preview without generating full CSV
 * Shows max date range limit info
 */
router.get('/summary', requireOrgAuth, requireExportPermission, async (req, res) => {
    try {
        const { start_date, end_date, escrow_id, report_type } = req.query;
        
        // Validate date range with max limit
        const validation = validateDateRange(start_date, end_date);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
                max_days: validation.max_days,
                requested_days: validation.requested_days,
                request_id: req.requestId,
            });
        }
        
        const { startDate, endDate, daysDiff } = validation;
        
        const baseWhere = {
            orgId: req.org.id,
            createdAt: { gte: startDate, lte: endDate },
        };
        
        if (escrow_id) {
            baseWhere.escrowId = escrow_id;
        }
        
        // Get counts for both report types
        const [spendCount, auditCount] = await Promise.all([
            prisma.spendRequest.count({ where: baseWhere }),
            prisma.auditEvent.count({ where: baseWhere }),
        ]);
        
        // Get status breakdown for spend requests
        const spendByStatus = await prisma.spendRequest.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { status: true },
        });
        
        // Get event type breakdown for audit events
        const auditByType = await prisma.auditEvent.groupBy({
            by: ['eventType'],
            where: baseWhere,
            _count: { eventType: true },
            orderBy: { _count: { eventType: 'desc' } },
            take: 10,
        });
        
        res.json({
            date_range: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                days: daysDiff,
                max_days: EXPORT_CONFIG.maxDateRangeDays,
            },
            spend_activity: {
                total_records: spendCount,
                by_status: spendByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {}),
            },
            audit_events: {
                total_records: auditCount,
                top_event_types: auditByType.map(item => ({
                    event_type: item.eventType,
                    count: item._count.eventType,
                })),
            },
            config: {
                max_date_range_days: EXPORT_CONFIG.maxDateRangeDays,
                pdf_enabled: EXPORT_CONFIG.pdf.enabled,
            },
        });
        
    } catch (error) {
        console.error('Export summary error:', error);
        res.status(500).json({
            error: 'Failed to generate summary',
            request_id: req.requestId,
        });
    }
});

module.exports = router;
