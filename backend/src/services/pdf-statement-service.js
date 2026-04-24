/**
 * PDF Statement Service
 * 
 * Defines the data shape and configuration for future PDF statement generation.
 * This service is preparation for the eventual PDF "trust-style" statements.
 * 
 * Currently: Data shape definitions and config flags only.
 * Future: Will include actual PDF generation using a library like PDFKit or Puppeteer.
 */

const prisma = require('../lib/prisma');

// ============================================
// Configuration
// ============================================

const PDF_STATEMENT_CONFIG = {
    // Feature flag - set to true when PDF generation is ready
    enabled: false,
    
    // Rate limits
    maxStatementsPerMonth: 12, // Max statements per org per month
    
    // Statement periods
    allowedPeriods: ['monthly', 'quarterly', 'custom'],
    
    // PDF settings (for future use)
    pageSize: 'letter', // 'letter' or 'a4'
    margins: { top: 72, bottom: 72, left: 72, right: 72 }, // in points (72 points = 1 inch)
    
    // Branding
    companyName: 'Safe-Spend',
    tagline: 'Fiduciary Governance for AI Agents',
};

// ============================================
// Statement Payload Shape
// ============================================

/**
 * Statement Payload - The internal data structure for PDF statements
 * 
 * This shape captures all the data needed for a "trust-style" statement:
 * - Period information
 * - Balance summary (opening, closing, changes)
 * - Activity breakdown
 * - Top vendors
 * - Notable events (rule violations, large approvals)
 * 
 * @typedef {Object} StatementPayload
 * @property {Object} period - Statement period info
 * @property {Object} escrow - Escrow account details
 * @property {Object} organization - Organization info
 * @property {Object} balances - Opening/closing balances
 * @property {Object} activity - Activity summary
 * @property {Array} topVendors - Top vendors by spend
 * @property {Array} notableEvents - Rule violations, large approvals, etc.
 * @property {Object} metadata - Generation metadata
 */

/**
 * Generate a statement payload for an escrow account
 * 
 * This function prepares all the data needed for a PDF statement.
 * The actual PDF rendering is a future implementation.
 * 
 * @param {string} orgId - Organization ID
 * @param {string} escrowId - Escrow account ID
 * @param {Date} periodStart - Statement period start
 * @param {Date} periodEnd - Statement period end
 * @returns {Promise<StatementPayload>} The statement data payload
 */
async function generateStatementPayload(orgId, escrowId, periodStart, periodEnd) {
    // Validate period
    const daysDiff = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
    if (daysDiff > 93) { // ~3 months max
        throw new Error('Statement period cannot exceed 93 days');
    }
    
    // Fetch escrow account
    const escrow = await prisma.escrowAccount.findFirst({
        where: { id: escrowId, orgId },
    });
    
    if (!escrow) {
        throw new Error('Escrow account not found');
    }
    
    // Fetch organization
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });
    
    // Fetch spend requests for the period
    const spendRequests = await prisma.spendRequest.findMany({
        where: {
            orgId,
            escrowId,
            createdAt: {
                gte: periodStart,
                lte: periodEnd,
            },
        },
        orderBy: { createdAt: 'asc' },
    });
    
    // Calculate activity summary
    const approved = spendRequests.filter(r => r.status === 'approved');
    const denied = spendRequests.filter(r => r.status === 'denied');
    const pending = spendRequests.filter(r => r.status === 'pending');
    const expired = spendRequests.filter(r => r.status === 'expired');
    
    const totalApproved = approved.reduce((sum, r) => sum + r.amountCents, 0);
    const totalDenied = denied.reduce((sum, r) => sum + r.amountCents, 0);
    
    // Calculate opening balance (first transaction's balance_before or current balance)
    const firstTx = spendRequests[0];
    const openingBalance = firstTx?.balanceBeforeCents ?? escrow.balanceCents;
    
    // Closing balance is current balance
    const closingBalance = escrow.balanceCents;
    
    // Fetch funding events for the period
    const fundingEvents = await prisma.auditEvent.findMany({
        where: {
            orgId,
            escrowId,
            eventType: 'escrow.funded',
            createdAt: {
                gte: periodStart,
                lte: periodEnd,
            },
        },
    });
    
    const totalFunded = fundingEvents.reduce((sum, e) => {
        try {
            const details = JSON.parse(e.details || '{}');
            return sum + (details.amount_cents || 0);
        } catch {
            return sum;
        }
    }, 0);
    
    // Top vendors by spend
    const vendorSpend = {};
    approved.forEach(r => {
        vendorSpend[r.vendor] = (vendorSpend[r.vendor] || 0) + r.amountCents;
    });
    
    const topVendors = Object.entries(vendorSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([vendor, amountCents]) => ({
            vendor,
            amount_cents: amountCents,
            amount_usd: (amountCents / 100).toFixed(2),
            transaction_count: approved.filter(r => r.vendor === vendor).length,
        }));
    
    // Notable events (high-value, rule violations, manual approvals)
    const notableEvents = [];
    
    // Add denied requests (potential rule violations)
    denied.forEach(r => {
        notableEvents.push({
            type: 'denied',
            timestamp: r.createdAt,
            vendor: r.vendor,
            amount_cents: r.amountCents,
            reason: r.denialReason,
        });
    });
    
    // Add large approvals (> $1000)
    approved.filter(r => r.amountCents > 100000).forEach(r => {
        notableEvents.push({
            type: 'large_approval',
            timestamp: r.createdAt,
            vendor: r.vendor,
            amount_cents: r.amountCents,
            resolved_by: r.resolvedBy,
        });
    });
    
    // Sort notable events by timestamp
    notableEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Build the statement payload
    return {
        period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
            days: daysDiff,
            type: daysDiff <= 31 ? 'monthly' : daysDiff <= 93 ? 'quarterly' : 'custom',
        },
        
        escrow: {
            id: escrow.id,
            name: escrow.name,
            currency: escrow.currency || 'USD',
            status: escrow.status,
        },
        
        organization: {
            id: org.id,
            name: org.name,
        },
        
        balances: {
            opening_cents: openingBalance,
            opening_usd: (openingBalance / 100).toFixed(2),
            closing_cents: closingBalance,
            closing_usd: (closingBalance / 100).toFixed(2),
            change_cents: closingBalance - openingBalance,
            change_usd: ((closingBalance - openingBalance) / 100).toFixed(2),
        },
        
        activity: {
            total_funded_cents: totalFunded,
            total_funded_usd: (totalFunded / 100).toFixed(2),
            total_spent_cents: totalApproved,
            total_spent_usd: (totalApproved / 100).toFixed(2),
            total_denied_cents: totalDenied,
            total_denied_usd: (totalDenied / 100).toFixed(2),
            
            counts: {
                approved: approved.length,
                denied: denied.length,
                pending: pending.length,
                expired: expired.length,
                total: spendRequests.length,
            },
            
            approval_rate: spendRequests.length > 0 
                ? ((approved.length / spendRequests.length) * 100).toFixed(1) + '%'
                : 'N/A',
        },
        
        top_vendors: topVendors,
        
        notable_events: notableEvents.slice(0, 20), // Top 20 notable events
        
        metadata: {
            generated_at: new Date().toISOString(),
            statement_version: '1.0',
            pdf_enabled: PDF_STATEMENT_CONFIG.enabled,
        },
    };
}

/**
 * Check if PDF statements are enabled
 * @returns {boolean}
 */
function isPdfEnabled() {
    return PDF_STATEMENT_CONFIG.enabled;
}

/**
 * Get PDF statement configuration
 * @returns {Object} Configuration object
 */
function getConfig() {
    return { ...PDF_STATEMENT_CONFIG };
}

/**
 * Validate statement request
 * @param {string} orgId 
 * @param {Date} periodStart 
 * @param {Date} periodEnd 
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStatementRequest(orgId, periodStart, periodEnd) {
    if (!orgId) {
        return { valid: false, error: 'Organization ID is required' };
    }
    
    if (!periodStart || !periodEnd) {
        return { valid: false, error: 'Period start and end dates are required' };
    }
    
    if (periodStart >= periodEnd) {
        return { valid: false, error: 'Period start must be before period end' };
    }
    
    const daysDiff = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
    if (daysDiff > 93) {
        return { valid: false, error: 'Statement period cannot exceed 93 days (roughly one quarter)' };
    }
    
    return { valid: true };
}

// ============================================
// Exports
// ============================================

module.exports = {
    PDF_STATEMENT_CONFIG,
    generateStatementPayload,
    isPdfEnabled,
    getConfig,
    validateStatementRequest,
};
