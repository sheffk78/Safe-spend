/**
 * Security Alerts Service
 * Detects and reports suspicious activity via email
 */

const { Resend } = require('resend');
const logger = require('../lib/logger');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ALERT_EMAIL = 'support@agentictrust.app';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'alerts@agentictrust.app';

// In-memory tracking for rate limiting alerts (prevents alert spam)
const alertTracker = {
    injectionAttempts: new Map(), // orgId -> { count, lastAlert }
    runawayLoops: new Map(),      // escrowId -> { count, lastAlert }
    keyRevocations: new Map(),    // orgId -> { count, lastAlert }
    failedAuths: new Map(),       // ip -> { count, lastAlert }
};

// Alert thresholds
const THRESHOLDS = {
    INJECTION_ATTEMPTS: 5,        // Alert after 5 injection attempts
    RUNAWAY_DENIALS: 10,          // Alert after 10 consecutive denials
    KEY_REVOCATIONS: 3,           // Alert after 3 key revocations in window
    FAILED_AUTHS: 10,             // Alert after 10 failed auths from same IP
    ALERT_COOLDOWN_MS: 300000,    // 5 minutes between alerts of same type
};

/**
 * Send security alert email
 */
async function sendSecurityAlert(subject, htmlContent, metadata = {}) {
    if (!resend) {
        logger.warn('Security alert not sent - Resend API key not configured', { subject, ...metadata });
        return false;
    }

    try {
        const result = await resend.emails.send({
            from: SENDER_EMAIL,
            to: [ALERT_EMAIL],
            subject: `[SECURITY ALERT] ${subject}`,
            html: htmlContent,
        });

        logger.info('Security alert sent', { 
            subject, 
            emailId: result.data?.id,
            ...metadata 
        });
        return true;
    } catch (error) {
        logger.error('Failed to send security alert', { 
            error: error.message, 
            subject,
            ...metadata 
        });
        return false;
    }
}

/**
 * Check if we should send an alert (rate limiting)
 */
function shouldSendAlert(tracker, key) {
    const now = Date.now();
    const record = tracker.get(key);
    
    if (!record) {
        tracker.set(key, { count: 1, lastAlert: 0 });
        return false; // First occurrence, don't alert yet
    }

    record.count++;
    
    // Check if cooldown has passed since last alert
    if (now - record.lastAlert < THRESHOLDS.ALERT_COOLDOWN_MS) {
        return false;
    }

    return true;
}

/**
 * Mark that an alert was sent
 */
function markAlertSent(tracker, key) {
    const record = tracker.get(key);
    if (record) {
        record.lastAlert = Date.now();
        record.count = 0; // Reset counter after alert
    }
}

/**
 * Detect potential injection attempts in input
 */
function detectInjection(input) {
    if (!input || typeof input !== 'string') return null;
    
    const patterns = [
        { type: 'sql', regex: /('|"|;|--|\bor\b|\band\b|\bdrop\b|\bdelete\b|\bupdate\b|\binsert\b)/i },
        { type: 'xss', regex: /(<script|javascript:|on\w+\s*=)/i },
        { type: 'template', regex: /(\{\{|\$\{|<%)/i },
        { type: 'path_traversal', regex: /(\.\.\/|\.\.\\)/i },
    ];

    for (const pattern of patterns) {
        if (pattern.regex.test(input)) {
            return pattern.type;
        }
    }
    return null;
}

/**
 * Track and alert on injection attempts
 */
async function trackInjectionAttempt(orgId, orgName, field, value, injectionType, requestId) {
    const key = orgId;
    
    if (!shouldSendAlert(alertTracker.injectionAttempts, key)) {
        const record = alertTracker.injectionAttempts.get(key);
        if (record.count < THRESHOLDS.INJECTION_ATTEMPTS) return;
    }

    const record = alertTracker.injectionAttempts.get(key);
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Potential Injection Attack Detected</h1>
            </div>
            <div style="background: #1f2937; color: #e5e7eb; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Organization:</td>
                        <td style="padding: 8px 0; font-weight: bold;">${orgName} (${orgId})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Injection Type:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #f87171;">${injectionType.toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Field:</td>
                        <td style="padding: 8px 0;">${field}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Attempts in Window:</td>
                        <td style="padding: 8px 0; font-weight: bold;">${record?.count || 1}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Request ID:</td>
                        <td style="padding: 8px 0; font-family: monospace;">${requestId}</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 12px; background: #374151; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">Suspicious Payload (truncated):</p>
                    <code style="color: #fbbf24; word-break: break-all;">${escapeHtml(value?.substring(0, 200))}${value?.length > 200 ? '...' : ''}</code>
                </div>
                <p style="margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    The request was processed safely. Prisma ORM parameterizes all queries.
                </p>
            </div>
            <div style="background: #111827; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
                <a href="https://safespend.agentictrust.app/admin" style="color: #10b981; text-decoration: none;">View Admin Dashboard</a>
            </div>
        </div>
    `;

    await sendSecurityAlert(
        `Injection Attempt - ${orgName}`,
        html,
        { orgId, injectionType, field }
    );
    
    markAlertSent(alertTracker.injectionAttempts, key);
}

/**
 * Track and alert on runaway agent behavior (rapid consecutive denials)
 */
async function trackRunawayLoop(escrowId, escrowName, orgId, orgName, denialCount, denialReason) {
    const key = escrowId;
    
    if (!shouldSendAlert(alertTracker.runawayLoops, key)) {
        const record = alertTracker.runawayLoops.get(key);
        if (record.count < THRESHOLDS.RUNAWAY_DENIALS) return;
    }

    const record = alertTracker.runawayLoops.get(key);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: #1f2937; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Runaway Agent Loop Detected</h1>
            </div>
            <div style="background: #1f2937; color: #e5e7eb; padding: 20px;">
                <p style="margin: 0 0 16px 0;">An agent appears to be stuck in a spending loop with repeated denials.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Organization:</td>
                        <td style="padding: 8px 0; font-weight: bold;">${orgName} (${orgId})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Escrow Account:</td>
                        <td style="padding: 8px 0; font-weight: bold;">${escrowName} (${escrowId})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Consecutive Denials:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #f87171;">${record?.count || denialCount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Primary Denial Reason:</td>
                        <td style="padding: 8px 0;">${denialReason}</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 12px; background: #374151; border-radius: 4px;">
                    <p style="margin: 0; color: #fbbf24;">
                        <strong>Recommended Action:</strong> Contact the organization to investigate their agent's behavior.
                        Consider temporarily pausing the escrow account if abuse continues.
                    </p>
                </div>
            </div>
            <div style="background: #111827; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
                <a href="https://safespend.agentictrust.app/admin/orgs/${orgId}" style="color: #10b981; text-decoration: none;">View Organization Details</a>
            </div>
        </div>
    `;

    await sendSecurityAlert(
        `Runaway Agent - ${escrowName}`,
        html,
        { escrowId, orgId, denialCount: record?.count }
    );
    
    markAlertSent(alertTracker.runawayLoops, key);
}

/**
 * Track and alert on multiple API key revocations
 */
async function trackKeyRevocation(orgId, orgName, keyId, keyLabel, revokedBy) {
    const key = orgId;
    
    if (!shouldSendAlert(alertTracker.keyRevocations, key)) {
        const record = alertTracker.keyRevocations.get(key);
        if (record.count < THRESHOLDS.KEY_REVOCATIONS) return;
    }

    const record = alertTracker.keyRevocations.get(key);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Multiple API Key Revocations</h1>
            </div>
            <div style="background: #1f2937; color: #e5e7eb; padding: 20px;">
                <p style="margin: 0 0 16px 0;">Multiple API keys have been revoked for this organization in a short time window.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Organization:</td>
                        <td style="padding: 8px 0; font-weight: bold;">${orgName} (${orgId})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Latest Revoked Key:</td>
                        <td style="padding: 8px 0; font-family: monospace;">${keyId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Key Label:</td>
                        <td style="padding: 8px 0;">${keyLabel || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Revocations in Window:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #a78bfa;">${record?.count || 1}</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 12px; background: #374151; border-radius: 4px;">
                    <p style="margin: 0; color: #9ca3af;">
                        This could indicate a security incident (compromised keys) or routine key rotation.
                        Verify with the organization if this activity is expected.
                    </p>
                </div>
            </div>
            <div style="background: #111827; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
                <a href="https://safespend.agentictrust.app/admin/orgs/${orgId}" style="color: #10b981; text-decoration: none;">View Organization</a>
            </div>
        </div>
    `;

    await sendSecurityAlert(
        `Key Revocations - ${orgName}`,
        html,
        { orgId, keyId, revocations: record?.count }
    );
    
    markAlertSent(alertTracker.keyRevocations, key);
}

/**
 * Track and alert on failed authentication attempts
 */
async function trackFailedAuth(ip, path, reason) {
    const key = ip;
    
    if (!shouldSendAlert(alertTracker.failedAuths, key)) {
        const record = alertTracker.failedAuths.get(key);
        if (record.count < THRESHOLDS.FAILED_AUTHS) return;
    }

    const record = alertTracker.failedAuths.get(key);

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Repeated Failed Authentication</h1>
            </div>
            <div style="background: #1f2937; color: #e5e7eb; padding: 20px;">
                <p style="margin: 0 0 16px 0;">Multiple failed authentication attempts detected from the same IP address.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">IP Address:</td>
                        <td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${ip}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Failed Attempts:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #f87171;">${record?.count || 1}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Latest Path:</td>
                        <td style="padding: 8px 0; font-family: monospace;">${path}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Failure Reason:</td>
                        <td style="padding: 8px 0;">${reason}</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 12px; background: #374151; border-radius: 4px;">
                    <p style="margin: 0; color: #f87171;">
                        <strong>Warning:</strong> This could indicate a brute force attack or credential stuffing attempt.
                        Consider blocking this IP if attacks continue.
                    </p>
                </div>
            </div>
            <div style="background: #111827; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
                <span style="color: #6b7280;">Safe-Spend Security Monitoring</span>
            </div>
        </div>
    `;

    await sendSecurityAlert(
        `Failed Auth Attempts from ${ip}`,
        html,
        { ip, attempts: record?.count }
    );
    
    markAlertSent(alertTracker.failedAuths, key);
}

/**
 * Alert on approval spam (many pending approvals created rapidly)
 */
async function alertApprovalSpam(orgId, orgName, pendingCount, recentMinutes = 5) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: #1f2937; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Approval Queue Spike Detected</h1>
            </div>
            <div style="background: #1f2937; color: #e5e7eb; padding: 20px;">
                <p style="margin: 0 0 16px 0;">An unusually high number of pending approvals have been created.</p>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Organization:</td>
                        <td style="padding: 8px 0; font-weight: bold;">${orgName} (${orgId})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Pending Approvals:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #fbbf24;">${pendingCount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #9ca3af;">Time Window:</td>
                        <td style="padding: 8px 0;">Last ${recentMinutes} minutes</td>
                    </tr>
                </table>
                <div style="margin-top: 20px; padding: 12px; background: #374151; border-radius: 4px;">
                    <p style="margin: 0; color: #9ca3af;">
                        This may indicate an agent is rapidly requesting large spends that require human approval.
                        Review the pending approvals and consider adjusting policies if needed.
                    </p>
                </div>
            </div>
            <div style="background: #111827; padding: 16px; border-radius: 0 0 8px 8px; text-align: center;">
                <a href="https://safespend.agentictrust.app/admin/orgs/${orgId}" style="color: #10b981; text-decoration: none;">View Organization</a>
            </div>
        </div>
    `;

    await sendSecurityAlert(
        `Approval Spam - ${orgName}`,
        html,
        { orgId, pendingCount }
    );
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Reset tracker (for testing)
 */
function resetTrackers() {
    alertTracker.injectionAttempts.clear();
    alertTracker.runawayLoops.clear();
    alertTracker.keyRevocations.clear();
    alertTracker.failedAuths.clear();
}

module.exports = {
    detectInjection,
    trackInjectionAttempt,
    trackRunawayLoop,
    trackKeyRevocation,
    trackFailedAuth,
    alertApprovalSpam,
    sendSecurityAlert,
    resetTrackers,
    THRESHOLDS,
};
