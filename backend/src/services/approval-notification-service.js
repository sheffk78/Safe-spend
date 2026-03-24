/**
 * Approval Notification Service
 * Sends email notifications for pending approvals
 */

const { PrismaClient } = require('@prisma/client');
const postmark = require('postmark');
const crypto = require('crypto');
const { logger } = require('../lib/logger');
const rbacService = require('./rbac-service');

const prisma = new PrismaClient();

// Initialize Postmark client
const postmarkClient = process.env.POSTMARK_API_KEY 
    ? new postmark.ServerClient(process.env.POSTMARK_API_KEY) 
    : null;

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@contact.agentictrust.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://safespend.agentictrust.app';

// Token expiry (matches approval timeout, default 60 mins)
const ACTION_TOKEN_EXPIRY_MINS = 60;

/**
 * Generate a signed action token for one-click approve/deny
 */
function generateActionToken(approvalId, action, expiresAt) {
    const payload = {
        approval_id: approvalId,
        action, // 'approve' or 'deny'
        expires: expiresAt.getTime()
    };
    
    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
    
    // Sign with secret
    const secret = process.env.JWT_SECRET || 'safespend-secret';
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadBase64)
        .digest('base64url');
    
    return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode an action token
 */
function verifyActionToken(token) {
    try {
        const [payloadBase64, signature] = token.split('.');
        
        if (!payloadBase64 || !signature) {
            return { valid: false, error: 'Invalid token format' };
        }
        
        // Verify signature
        const secret = process.env.JWT_SECRET || 'safespend-secret';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payloadBase64)
            .digest('base64url');
        
        if (signature !== expectedSignature) {
            return { valid: false, error: 'Invalid signature' };
        }
        
        // Decode payload
        const payloadStr = Buffer.from(payloadBase64, 'base64url').toString();
        const payload = JSON.parse(payloadStr);
        
        // Check expiry
        if (payload.expires < Date.now()) {
            return { valid: false, error: 'Token has expired' };
        }
        
        return { 
            valid: true, 
            approvalId: payload.approval_id, 
            action: payload.action 
        };
    } catch (error) {
        return { valid: false, error: 'Token verification failed' };
    }
}

/**
 * Get or create notification settings for an organization
 */
async function getNotificationSettings(orgId) {
    let settings = await prisma.notificationSettings.findUnique({
        where: { orgId }
    });
    
    if (!settings) {
        // Create default settings
        settings = await prisma.notificationSettings.create({
            data: {
                id: crypto.randomUUID(),
                orgId,
                emailEnabled: true,
                emailRecipientsMode: 'finance_and_owner'
            }
        });
    }
    
    return settings;
}

/**
 * Send approval notification email
 */
async function sendApprovalNotification(approval) {
    if (!postmarkClient) {
        logger.warn({ approval_id: approval.id }, 'Postmark not configured - skipping email notification');
        return { sent: false, reason: 'email_not_configured' };
    }
    
    try {
        // Get notification settings
        const settings = await getNotificationSettings(approval.orgId);
        
        if (!settings.emailEnabled) {
            logger.info({ approval_id: approval.id }, 'Email notifications disabled for org');
            return { sent: false, reason: 'email_disabled' };
        }
        
        // Get spend request details
        const spendRequest = await prisma.spendRequest.findUnique({
            where: { id: approval.spendRequestId },
            include: {
                escrowAccount: true,
                spendingPolicy: true
            }
        });
        
        if (!spendRequest) {
            return { sent: false, reason: 'spend_request_not_found' };
        }
        
        // Get recipient emails
        const recipients = await rbacService.getApproverEmails(approval.orgId);
        
        if (recipients.length === 0) {
            return { sent: false, reason: 'no_recipients' };
        }
        
        // Generate action tokens
        const expiresAt = approval.expiresAt || new Date(Date.now() + ACTION_TOKEN_EXPIRY_MINS * 60 * 1000);
        const approveToken = generateActionToken(approval.id, 'approve', expiresAt);
        const denyToken = generateActionToken(approval.id, 'deny', expiresAt);
        
        // Calculate time remaining
        const now = new Date();
        const msRemaining = expiresAt.getTime() - now.getTime();
        const minsRemaining = Math.max(0, Math.floor(msRemaining / 60000));
        const hoursRemaining = Math.floor(minsRemaining / 60);
        const timeRemaining = hoursRemaining > 0 
            ? `${hoursRemaining}h ${minsRemaining % 60}m`
            : `${minsRemaining}m`;
        
        // Format amount
        const amount = (spendRequest.amountCents / 100).toLocaleString('en-US', {
            style: 'currency',
            currency: spendRequest.currency?.toUpperCase() || 'USD'
        });
        
        // Build email HTML
        const htmlBody = buildApprovalEmailHtml({
            amount,
            vendor: spendRequest.vendor,
            category: spendRequest.category,
            description: spendRequest.description,
            escrowName: spendRequest.escrowAccount?.name || 'Unknown',
            policyName: spendRequest.spendingPolicy?.name,
            timeRemaining,
            approveUrl: `${FRONTEND_URL}/approval-action?token=${approveToken}`,
            denyUrl: `${FRONTEND_URL}/approval-action?token=${denyToken}`,
            dashboardUrl: `${FRONTEND_URL}/dashboard/approvals/${approval.id}`,
            requestId: spendRequest.id
        });
        
        // Send to all recipients
        const emailPromises = recipients.map(email => 
            postmarkClient.sendEmail({
                From: SENDER_EMAIL,
                To: email,
                Subject: `[Action Required] Spend Approval: ${amount} to ${spendRequest.vendor}`,
                HtmlBody: htmlBody,
                TextBody: `Approval required for ${amount} spend to ${spendRequest.vendor}. View in dashboard: ${FRONTEND_URL}/dashboard/approvals/${approval.id}`,
                MessageStream: 'outbound'
            })
        );
        
        await Promise.all(emailPromises);
        
        // Update approval record
        await prisma.approval.update({
            where: { id: approval.id },
            data: { notificationSent: true }
        });
        
        logger.info({ 
            approval_id: approval.id, 
            recipients_count: recipients.length 
        }, 'Approval notification sent');
        
        return { sent: true, recipients: recipients.length };
    } catch (error) {
        logger.error({ 
            error: error.message, 
            approval_id: approval.id 
        }, 'Failed to send approval notification');
        return { sent: false, reason: error.message };
    }
}

/**
 * Build approval email HTML
 */
function buildApprovalEmailHtml(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                Spend Approval Required
            </h1>
            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                An agent is requesting to make a spend
            </p>
        </div>
        
        <!-- Amount Card -->
        <div style="background: #1e293b; padding: 30px; text-align: center; border-bottom: 1px solid #334155;">
            <div style="font-size: 42px; font-weight: 700; color: #f8fafc; margin-bottom: 5px;">
                ${data.amount}
            </div>
            <div style="font-size: 16px; color: #94a3b8;">
                to <strong style="color: #f8fafc;">${escapeHtml(data.vendor)}</strong>
            </div>
        </div>
        
        <!-- Details -->
        <div style="background: #1e293b; padding: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
                ${data.category ? `
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; width: 120px;">Category</td>
                    <td style="padding: 10px 0; color: #f8fafc; font-size: 14px;">${escapeHtml(data.category)}</td>
                </tr>
                ` : ''}
                ${data.description ? `
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px; vertical-align: top;">Description</td>
                    <td style="padding: 10px 0; color: #f8fafc; font-size: 14px;">${escapeHtml(data.description)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Escrow</td>
                    <td style="padding: 10px 0; color: #f8fafc; font-size: 14px;">${escapeHtml(data.escrowName)}</td>
                </tr>
                ${data.policyName ? `
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Policy</td>
                    <td style="padding: 10px 0; color: #f8fafc; font-size: 14px;">${escapeHtml(data.policyName)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Request ID</td>
                    <td style="padding: 10px 0; color: #94a3b8; font-size: 12px; font-family: monospace;">${data.requestId}</td>
                </tr>
            </table>
        </div>
        
        <!-- Time Warning -->
        <div style="background: #422006; padding: 15px 25px; border-left: 4px solid #f59e0b;">
            <div style="color: #fbbf24; font-size: 14px; font-weight: 500;">
                ⏱️ Expires in ${data.timeRemaining}
            </div>
            <div style="color: #fcd34d; font-size: 12px; margin-top: 5px;">
                This request will be automatically denied if not approved in time.
            </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="background: #1e293b; padding: 25px; text-align: center; border-radius: 0 0 12px 12px;">
            <div style="margin-bottom: 20px;">
                <a href="${data.approveUrl}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                    ✓ Approve
                </a>
                <a href="${data.denyUrl}" style="display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    ✕ Deny
                </a>
            </div>
            <div style="border-top: 1px solid #334155; padding-top: 20px;">
                <a href="${data.dashboardUrl}" style="color: #10b981; text-decoration: none; font-size: 14px;">
                    View full details in dashboard →
                </a>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">
                This email was sent by Safe-Spend, part of Agentic Trust.
            </p>
            <p style="margin: 10px 0 0 0;">
                <a href="${FRONTEND_URL}/dashboard/settings/notifications" style="color: #64748b;">
                    Manage notification settings
                </a>
            </p>
        </div>
        
    </div>
</body>
</html>
    `;
}

/**
 * Escape HTML to prevent XSS
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

module.exports = {
    generateActionToken,
    verifyActionToken,
    getNotificationSettings,
    sendApprovalNotification,
};
