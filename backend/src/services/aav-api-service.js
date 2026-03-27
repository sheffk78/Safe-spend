/**
 * AAV API Service
 * 
 * Handles server-to-server communication with Agent Authority Vault (AAV)
 * at api.agentictrust.app/v1
 * 
 * This service makes real HTTP calls to AAV's /verify endpoint to check
 * if an agent is authorized to perform spending actions.
 */

const { logger } = require('../lib/logger');

const AAV_BASE_URL = 'https://api.agentictrust.app/v1';
const AAV_TIMEOUT_MS = 3000; // 3 second timeout as per spec

/**
 * Verify an agent's authority to perform a spend action with AAV
 * 
 * @param {Object} params
 * @param {string} params.aavApiKey - The org's AAV API key (aav_live_sk_...)
 * @param {string} params.certificateId - Agent's AAV certificate (cert_...)
 * @param {string} params.agentId - Agent ID (agent_...)
 * @param {number} params.amountDollars - Amount in dollars (not cents!)
 * @param {string} params.currency - Currency code (USD)
 * @param {string} params.vendor - Vendor name
 * @param {string} params.description - Transaction description
 * @param {string} params.requestedAction - AAV action (default: purchase_service)
 * @returns {Promise<Object>} AAV verification result
 */
async function verifyWithAAV(params) {
    const {
        aavApiKey,
        certificateId,
        agentId,
        amountDollars,
        currency = 'USD',
        vendor,
        description,
        requestedAction = 'purchase_service'
    } = params;

    if (!aavApiKey) {
        return {
            success: false,
            error: 'AAV_NOT_CONFIGURED',
            message: 'AAV API key not configured on escrow account'
        };
    }

    if (!certificateId && !agentId) {
        return {
            success: false,
            error: 'MISSING_IDENTITY',
            message: 'Either certificate_id or agent_id is required for AAV verification'
        };
    }

    const startTime = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AAV_TIMEOUT_MS);

        const payload = {
            certificate_id: certificateId,
            agent_id: agentId,
            requested_action: requestedAction,
            amount: amountDollars,
            currency: currency.toUpperCase(),
            vendor: vendor,
            description: description
        };

        logger.info({ 
            agentId, 
            certificateId, 
            amount: amountDollars, 
            vendor 
        }, 'Calling AAV /verify endpoint');

        const response = await fetch(`${AAV_BASE_URL}/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${aavApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorBody = await response.text();
            logger.error({ 
                status: response.status, 
                error: errorBody,
                responseTime 
            }, 'AAV verification failed with non-200 response');

            return {
                success: false,
                error: 'AAV_API_ERROR',
                message: `AAV returned ${response.status}: ${errorBody}`,
                statusCode: response.status,
                responseTime
            };
        }

        const data = await response.json();

        logger.info({ 
            result: data.result, 
            agentId: data.agent_id,
            verificationId: data.verification_id,
            responseTime 
        }, 'AAV verification completed');

        return {
            success: true,
            authorized: data.authorized === true || data.result === 'authorized',
            result: data.result, // authorized | denied | suggestion_only | approval_pending | observe_only
            verificationId: data.verification_id,
            grantId: data.grant_id,
            agentId: data.agent_id,
            autonomyLevel: data.autonomy_level,
            dailySpend: data.daily_spend,
            constraints: data.constraints,
            denialReason: data.denial_reason || data.reason,
            responseTime
        };

    } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error.name === 'AbortError') {
            logger.error({ 
                timeout: AAV_TIMEOUT_MS,
                responseTime 
            }, 'AAV verification timed out');

            return {
                success: false,
                error: 'AAV_TIMEOUT',
                message: `AAV verification timed out after ${AAV_TIMEOUT_MS}ms`,
                responseTime
            };
        }

        logger.error({ 
            error: error.message,
            responseTime 
        }, 'AAV verification failed with network error');

        return {
            success: false,
            error: 'AAV_UNREACHABLE',
            message: `AAV API unreachable: ${error.message}`,
            responseTime
        };
    }
}

/**
 * Check if AAV result means the agent is authorized to spend
 * 
 * @param {string} result - AAV result string
 * @returns {boolean}
 */
function isAuthorizedResult(result) {
    return result === 'authorized';
}

/**
 * Check if AAV result requires human approval
 * 
 * @param {string} result - AAV result string
 * @returns {boolean}
 */
function isApprovalPendingResult(result) {
    return result === 'approval_pending';
}

/**
 * Check if AAV result is a hard denial
 * 
 * @param {string} result - AAV result string
 * @returns {boolean}
 */
function isDeniedResult(result) {
    return ['denied', 'observe_only', 'suggestion_only'].includes(result);
}

/**
 * Format AAV verification result for storage in spend request
 * 
 * @param {Object} aavResult - Result from verifyWithAAV
 * @returns {Object} Formatted for database storage
 */
function formatAAVResultForStorage(aavResult) {
    if (!aavResult) {
        return {
            verified: false,
            verification_status: 'not_checked'
        };
    }

    if (!aavResult.success) {
        return {
            verified: false,
            verification_status: aavResult.error === 'AAV_NOT_CONFIGURED' ? 'not_configured' : 'error',
            error: aavResult.error,
            error_message: aavResult.message,
            response_time_ms: aavResult.responseTime
        };
    }

    return {
        verified: true,
        verification_id: aavResult.verificationId,
        agent_id: aavResult.agentId,
        grant_id: aavResult.grantId,
        autonomy_level: aavResult.autonomyLevel,
        result: aavResult.result,
        daily_spend: aavResult.dailySpend,
        constraints: aavResult.constraints,
        denial_reason: aavResult.denialReason,
        checked_at: new Date().toISOString(),
        response_time_ms: aavResult.responseTime
    };
}

/**
 * Apply dual-limit enforcement - stricter limit wins
 * 
 * @param {Object} safespendLimits - Safe-Spend policy limits
 * @param {Object} aavConstraints - AAV grant constraints
 * @returns {Object} Effective limits
 */
function applyDualLimits(safespendLimits, aavConstraints) {
    if (!aavConstraints) {
        return safespendLimits;
    }

    const effective = { ...safespendLimits };

    // Per-transaction limit (Safe-Spend uses cents, AAV uses dollars)
    if (aavConstraints.max_spend_per_tx !== undefined) {
        const aavLimitCents = Math.round(aavConstraints.max_spend_per_tx * 100);
        if (safespendLimits.per_transaction_limit_cents === undefined || 
            aavLimitCents < safespendLimits.per_transaction_limit_cents) {
            effective.per_transaction_limit_cents = aavLimitCents;
            effective.per_transaction_limit_source = 'aav';
        }
    }

    // Daily limit
    if (aavConstraints.max_spend_daily !== undefined) {
        const aavDailyLimitCents = Math.round(aavConstraints.max_spend_daily * 100);
        if (safespendLimits.daily_limit_cents === undefined ||
            aavDailyLimitCents < safespendLimits.daily_limit_cents) {
            effective.daily_limit_cents = aavDailyLimitCents;
            effective.daily_limit_source = 'aav';
        }
    }

    // Approval threshold (require_human_approval_above)
    if (aavConstraints.require_human_approval_above !== undefined) {
        const aavApprovalThresholdCents = Math.round(aavConstraints.require_human_approval_above * 100);
        if (safespendLimits.require_human_above_cents === undefined ||
            aavApprovalThresholdCents < safespendLimits.require_human_above_cents) {
            effective.require_human_above_cents = aavApprovalThresholdCents;
            effective.require_human_above_source = 'aav';
        }
    }

    return effective;
}

/**
 * Check if vendor is approved by both Safe-Spend and AAV
 * 
 * @param {string} vendor - Vendor to check
 * @param {Array} safespendVendors - Safe-Spend allowed vendors
 * @param {Array} aavVendors - AAV approved vendors
 * @param {boolean} mapAavVendors - Whether to enforce AAV vendors
 * @returns {Object} { approved, rejectedBy, reason }
 */
function checkVendorApproval(vendor, safespendVendors, aavVendors, mapAavVendors) {
    const ssVendorsLower = (safespendVendors || []).map(v => v.toLowerCase());
    const aavVendorsLower = (aavVendors || []).map(v => v.toLowerCase());
    const vendorLower = vendor.toLowerCase();

    // Check Safe-Spend first
    if (ssVendorsLower.length > 0 && !ssVendorsLower.includes(vendorLower)) {
        return {
            approved: false,
            rejectedBy: 'policy',
            reason: `Vendor '${vendor}' not in Safe-Spend policy allowed vendors`
        };
    }

    // Check AAV if mapping is enabled
    if (mapAavVendors && aavVendorsLower.length > 0) {
        if (!aavVendorsLower.includes(vendorLower)) {
            return {
                approved: false,
                rejectedBy: 'aav',
                reason: `Vendor '${vendor}' approved by Safe-Spend policy but denied by AAV grant`
            };
        }
    }

    return { approved: true };
}

/**
 * Mock AAV verification for testing/demo mode
 * Simulates realistic AAV responses
 * 
 * @param {Object} params - Same as verifyWithAAV
 * @returns {Object} Mocked AAV response
 */
function mockAAVVerification(params) {
    const { agentId, amountDollars, vendor } = params;

    // Simulate some realistic scenarios
    
    // Agent not found
    if (agentId && agentId.includes('invalid')) {
        return {
            success: true,
            authorized: false,
            result: 'denied',
            verificationId: `verif_mock_${Date.now()}`,
            agentId,
            denialReason: 'agent_not_found',
            responseTime: 50
        };
    }

    // Vendor not approved
    if (vendor && vendor.toLowerCase().includes('blocked')) {
        return {
            success: true,
            authorized: false,
            result: 'denied',
            verificationId: `verif_mock_${Date.now()}`,
            agentId,
            denialReason: 'vendor_not_approved',
            responseTime: 50
        };
    }

    // Amount too high - needs approval
    if (amountDollars > 500) {
        return {
            success: true,
            authorized: false,
            result: 'approval_pending',
            verificationId: `verif_mock_${Date.now()}`,
            agentId,
            grantId: `grant_mock_${agentId || 'default'}`,
            autonomyLevel: 3,
            dailySpend: { used: 250, limit: 1000, currency: 'USD' },
            responseTime: 50
        };
    }

    // Default: authorized
    return {
        success: true,
        authorized: true,
        result: 'authorized',
        verificationId: `verif_mock_${Date.now()}`,
        agentId,
        grantId: `grant_mock_${agentId || 'default'}`,
        autonomyLevel: 4,
        dailySpend: { used: amountDollars + 100, limit: 1000, currency: 'USD' },
        constraints: {
            max_spend_per_tx: 500,
            max_spend_daily: 1000,
            approved_vendors: ['Anthropic', 'OpenAI', 'AWS']
        },
        responseTime: 50
    };
}

module.exports = {
    verifyWithAAV,
    isAuthorizedResult,
    isApprovalPendingResult,
    isDeniedResult,
    formatAAVResultForStorage,
    applyDualLimits,
    checkVendorApproval,
    mockAAVVerification,
    AAV_BASE_URL,
    AAV_TIMEOUT_MS
};
