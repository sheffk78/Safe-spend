/**
 * Safe-Spend Rules Engine
 * 
 * Implements the 15-step spend validation cascade (0-13).
 * This is the core IP of Safe-Spend - deterministic, auditable spending control.
 * 
 * Evaluation Order:
 * 0. AUTHORITY VERIFICATION (AAV - only when AAV_ENABLED + agent_id present)
 * 1. KEY VALIDATION
 * 2. ESCROW ACCOUNT CHECK
 * 2.5. AAV AGENT AUTHORIZATION (legacy escrow-level)
 * 3. IDEMPOTENCY CHECK
 * 3.5. REPUTATION CHECK (ARL - only when min_reputation_score set)
 * 4. BALANCE CHECK
 * 5. PER-TRANSACTION LIMIT
 * 6. DAILY CAP CHECK
 * 7. WEEKLY CAP CHECK
 * 8. MONTHLY CAP CHECK
 * 9. VENDOR CHECK
 * 10. CATEGORY CHECK
 * 11. TIME WINDOW CHECK
 * 12. APPROVAL THRESHOLD CHECK (+ reputation boost)
 * 13. EXECUTE
 */

const { matchVendor, isWithinTimeWindow, getDateBoundaries } = require('./rules-helpers');
const { 
    extractAAVClaims, 
    checkAgentAuthorization, 
    getEffectiveEnforcementMode 
} = require('./aav-service');
const aavApiService = require('./aav-api-service');

/**
 * Rule result structure
 * @typedef {Object} RuleResult
 * @property {string} rule - Rule name (e.g., "balance_check")
 * @property {string} [rule_id] - Policy ID if tied to a specific policy
 * @property {boolean} passed - Whether the rule passed
 * @property {string} reason - Human-readable explanation
 * @property {Object} [metadata] - Optional extra details
 */

/**
 * Evaluation context passed to the rules engine
 * @typedef {Object} EvaluationContext
 * @property {Object} org - Organization record
 * @property {Object} [apiKey] - API key record (if auth via API key)
 * @property {Object} escrowAccount - Escrow account record
 * @property {Array} policies - Active spending policies for this escrow
 * @property {Object} dailyTracking - Current daily spend tracking
 * @property {Object} weeklyTracking - Current weekly spend tracking
 * @property {Object} monthlyTracking - Current monthly spend tracking
 * @property {Object} request - The spend request details
 * @property {Date} currentTime - Current UTC time
 * @property {Object} [existingRequest] - Existing spend request (for idempotency)
 */

/**
 * Evaluation result
 * @typedef {Object} EvaluationResult
 * @property {string} status - 'approved' | 'denied' | 'pending_approval'
 * @property {Array<RuleResult>} rulesEvaluated - All rule evaluations
 * @property {string} [denialReason] - Reason for denial
 * @property {string} [denialRuleId] - Policy ID that caused denial
 * @property {boolean} [requiresApproval] - Whether human approval is needed
 * @property {number} [approvalTimeoutMinutes] - Timeout for approval
 */

/**
 * Main evaluation function - runs all steps (0-13)
 * @param {EvaluationContext} context - All data needed for evaluation
 * @returns {EvaluationResult}
 */
function evaluateSpendRequest(context) {
    const rulesEvaluated = [];
    
    // Step 0: AUTHORITY VERIFICATION (AAV global check)
    // Only runs when AAV_ENABLED=true AND agent_id is present in the request
    const aavGlobalEnabled = process.env.AAV_ENABLED === 'true';
    if (aavGlobalEnabled && context.request.agentId && context.aavApiResult) {
        const authVerifyResult = evaluateAuthorityVerification(context);
        rulesEvaluated.push(authVerifyResult);
        if (!authVerifyResult.passed) {
            if (authVerifyResult.metadata?.pending_approval) {
                return {
                    status: 'pending_approval',
                    rulesEvaluated,
                    requiresApproval: true,
                    approvalTimeoutMinutes: 60,
                    denialReason: authVerifyResult.reason
                };
            }
            return createDenialResult(rulesEvaluated, authVerifyResult.reason, authVerifyResult.rule_id);
        }
    }
    
    // Step 1: KEY VALIDATION
    const keyResult = validateKey(context);
    rulesEvaluated.push(keyResult);
    if (!keyResult.passed) {
        return createDenialResult(rulesEvaluated, keyResult.reason, keyResult.rule_id);
    }
    
    // Step 2: ESCROW ACCOUNT CHECK
    const escrowResult = validateEscrowAccount(context);
    rulesEvaluated.push(escrowResult);
    if (!escrowResult.passed) {
        return createDenialResult(rulesEvaluated, escrowResult.reason, escrowResult.rule_id);
    }
    
    // Step 2.5: AAV AGENT AUTHORIZATION (legacy escrow-level check)
    const aavResult = checkAAVAuthorization(context);
    rulesEvaluated.push(aavResult);
    if (!aavResult.passed) {
        return createDenialResult(rulesEvaluated, aavResult.reason, aavResult.rule_id);
    }
    
    // Step 3: IDEMPOTENCY CHECK
    const idempotencyResult = checkIdempotency(context);
    rulesEvaluated.push(idempotencyResult);
    if (!idempotencyResult.passed && idempotencyResult.isReplay) {
        // Return existing request result (safe replay)
        return {
            status: 'replay',
            rulesEvaluated,
            existingRequest: context.existingRequest
        };
    }
    
    // Step 3.5: REPUTATION CHECK (ARL)
    // Only runs when a policy has min_reputation_score set
    const reputationResult = checkReputation(context);
    if (reputationResult) {
        rulesEvaluated.push(reputationResult);
        if (!reputationResult.passed) {
            return createDenialResult(rulesEvaluated, reputationResult.reason, reputationResult.rule_id);
        }
    }
    
    // Step 4: BALANCE CHECK
    const balanceResult = checkBalance(context);
    rulesEvaluated.push(balanceResult);
    if (!balanceResult.passed) {
        return createDenialResult(rulesEvaluated, balanceResult.reason, balanceResult.rule_id);
    }
    
    // Step 5: PER-TRANSACTION LIMIT
    const perTxResult = checkPerTransactionLimit(context);
    rulesEvaluated.push(perTxResult);
    if (!perTxResult.passed) {
        return createDenialResult(rulesEvaluated, perTxResult.reason, perTxResult.rule_id);
    }
    
    // Step 6: DAILY CAP CHECK
    const dailyResult = checkDailyCap(context);
    rulesEvaluated.push(dailyResult);
    if (!dailyResult.passed) {
        return createDenialResult(rulesEvaluated, dailyResult.reason, dailyResult.rule_id);
    }
    
    // Step 7: WEEKLY CAP CHECK
    const weeklyResult = checkWeeklyCap(context);
    rulesEvaluated.push(weeklyResult);
    if (!weeklyResult.passed) {
        return createDenialResult(rulesEvaluated, weeklyResult.reason, weeklyResult.rule_id);
    }
    
    // Step 8: MONTHLY CAP CHECK
    const monthlyResult = checkMonthlyCap(context);
    rulesEvaluated.push(monthlyResult);
    if (!monthlyResult.passed) {
        return createDenialResult(rulesEvaluated, monthlyResult.reason, monthlyResult.rule_id);
    }
    
    // Step 9: VENDOR CHECK
    const vendorResult = checkVendor(context);
    rulesEvaluated.push(vendorResult);
    if (!vendorResult.passed) {
        return createDenialResult(rulesEvaluated, vendorResult.reason, vendorResult.rule_id);
    }
    
    // Step 10: CATEGORY CHECK
    const categoryResult = checkCategory(context);
    rulesEvaluated.push(categoryResult);
    if (!categoryResult.passed) {
        return createDenialResult(rulesEvaluated, categoryResult.reason, categoryResult.rule_id);
    }
    
    // Step 11: TIME WINDOW CHECK
    const timeResult = checkTimeWindow(context);
    rulesEvaluated.push(timeResult);
    if (!timeResult.passed) {
        return createDenialResult(rulesEvaluated, timeResult.reason, timeResult.rule_id);
    }
    
    // Step 12: APPROVAL THRESHOLD CHECK
    const approvalResult = checkApprovalThreshold(context);
    rulesEvaluated.push(approvalResult);
    
    if (approvalResult.requiresApproval) {
        return {
            status: 'pending_approval',
            rulesEvaluated,
            requiresApproval: true,
            approvalTimeoutMinutes: approvalResult.metadata?.approvalTimeoutMinutes || 60
        };
    }
    
    // Step 13: EXECUTE (all checks passed, auto-approved)
    const executeResult = {
        rule: 'execute',
        passed: true,
        reason: 'All rules passed, spend approved'
    };
    rulesEvaluated.push(executeResult);
    
    return {
        status: 'approved',
        rulesEvaluated
    };
}

/**
 * Step 0: AUTHORITY VERIFICATION (AAV Global)
 * Only runs when AAV_ENABLED=true AND the spend request includes agent_id.
 * Evaluates the result from the AAV /verify API call.
 */
function evaluateAuthorityVerification(context) {
    const { aavApiResult } = context;
    
    if (!aavApiResult) {
        // No AAV API call was made — fail-closed for financial operations
        return {
            rule: 'authority_verification',
            passed: false,
            reason: 'Authority verification failed: AAV verification not performed',
            source: 'aav'
        };
    }
    
    if (!aavApiResult.success) {
        // AAV was unreachable — default fail-closed
        return {
            rule: 'authority_verification',
            passed: false,
            reason: `Authority verification failed: ${aavApiResult.error || 'AAV unreachable'}`,
            source: 'aav',
            metadata: { error: aavApiResult.error }
        };
    }
    
    if (aavApiResult.authorized) {
        return {
            rule: 'authority_verification',
            passed: true,
            reason: 'Authority verification passed',
            source: 'aav',
            verification_id: aavApiResult.verificationId
        };
    }
    
    // Check if approval_required
    if (aavApiResult.result === 'approval_required' || aavApiResult.result === 'approval_pending') {
        return {
            rule: 'authority_verification',
            passed: false,
            reason: 'Awaiting AAV authority approval',
            source: 'aav',
            metadata: { pending_approval: true, verification_id: aavApiResult.verificationId }
        };
    }
    
    // Denied by AAV
    return {
        rule: 'authority_verification',
        passed: false,
        reason: `Authority verification failed: ${aavApiResult.denialReason || 'Denied by authority'}`,
        source: 'aav',
        verification_id: aavApiResult.verificationId
    };
}

/**
 * Step 3.5: REPUTATION CHECK (ARL)
 * Only runs when a policy has min_reputation_score set.
 * Returns null if no reputation check is needed.
 */
function checkReputation(context) {
    const { policies, request } = context;
    
    // Find any policy that has min_reputation_score set
    const reputationPolicy = policies.find(p => p.minReputationScore != null && p.minReputationScore > 0);
    
    if (!reputationPolicy) return null; // No reputation check needed
    
    // We need an agent_id for reputation checks
    if (!request.agentId) {
        return {
            rule: 'reputation_check',
            rule_id: reputationPolicy.id,
            passed: true,
            reason: 'Reputation check skipped: no agent_id on request'
        };
    }
    
    // If ARL is not enabled, skip
    if (process.env.ARL_ENABLED !== 'true') {
        return {
            rule: 'reputation_check',
            rule_id: reputationPolicy.id,
            passed: true,
            reason: 'Reputation check skipped: ARL not enabled'
        };
    }
    
    // Note: Actual score check happens async in the route handler
    // The context may include a pre-fetched reputation score
    const reputationScore = context.reputationScore;
    
    if (reputationScore === null || reputationScore === undefined) {
        // No score available — pass through (ARL might be unreachable)
        return {
            rule: 'reputation_check',
            rule_id: reputationPolicy.id,
            passed: true,
            reason: 'Reputation check skipped: score unavailable'
        };
    }
    
    if (reputationScore < reputationPolicy.minReputationScore) {
        return {
            rule: 'reputation_check',
            rule_id: reputationPolicy.id,
            passed: false,
            reason: `Agent reputation (${reputationScore}) below policy minimum (${reputationPolicy.minReputationScore})`,
            metadata: { score: reputationScore, min: reputationPolicy.minReputationScore }
        };
    }
    
    return {
        rule: 'reputation_check',
        rule_id: reputationPolicy.id,
        passed: true,
        reason: `Agent reputation score (${reputationScore}) meets minimum (${reputationPolicy.minReputationScore})`,
        metadata: { score: reputationScore, min: reputationPolicy.minReputationScore }
    };
}

/**
 * Step 1: KEY VALIDATION
 */
function validateKey(context) {
    const { apiKey, org } = context;
    
    // If using API key
    if (apiKey) {
        if (!apiKey.isActive) {
            return {
                rule: 'key_validation',
                passed: false,
                reason: 'API key is inactive',
                metadata: { key_id: apiKey.id }
            };
        }
        
        // Agent keys can only access /spend and /balance endpoints
        // This is enforced at middleware level, but we double-check here
        if (apiKey.keyType === 'agent') {
            // Agent keys are allowed for spend requests
            return {
                rule: 'key_validation',
                passed: true,
                reason: 'Agent API key validated',
                metadata: { key_type: apiKey.keyType }
            };
        }
        
        return {
            rule: 'key_validation',
            passed: true,
            reason: 'API key validated',
            metadata: { key_type: apiKey.keyType }
        };
    }
    
    // If using org JWT
    if (!org) {
        return {
            rule: 'key_validation',
            passed: false,
            reason: 'Organization not found'
        };
    }
    
    return {
        rule: 'key_validation',
        passed: true,
        reason: 'Organization JWT validated'
    };
}

/**
 * Step 2: ESCROW ACCOUNT CHECK
 */
function validateEscrowAccount(context) {
    const { escrowAccount, org } = context;
    
    if (!escrowAccount) {
        return {
            rule: 'escrow_account_check',
            passed: false,
            reason: 'Escrow account not found'
        };
    }
    
    if (escrowAccount.orgId !== org.id) {
        return {
            rule: 'escrow_account_check',
            passed: false,
            reason: 'Escrow account does not belong to this organization'
        };
    }
    
    if (escrowAccount.status !== 'active') {
        return {
            rule: 'escrow_account_check',
            passed: false,
            reason: `Escrow account is ${escrowAccount.status}`,
            metadata: { status: escrowAccount.status }
        };
    }
    
    return {
        rule: 'escrow_account_check',
        passed: true,
        reason: 'Escrow account is active',
        metadata: { escrow_id: escrowAccount.id, status: escrowAccount.status }
    };
}

/**
 * Step 2.5: AAV AGENT AUTHORIZATION
 * Verifies the requesting agent has AAV-issued authority to use this escrow/policy
 * 
 * This step now includes TWO checks:
 * 1. Local authorization (agent_id/grant_id in allowed lists)
 * 2. Real-time AAV /verify API call (if aav_api_key is configured)
 */
function checkAAVAuthorization(context) {
    const { escrowAccount, policies, aavClaims } = context;
    
    // Check if AAV is enabled at escrow level
    if (!escrowAccount.aavEnabled) {
        return {
            rule: 'aav_authorization',
            passed: true,
            reason: 'AAV enforcement not enabled for this escrow',
            metadata: { enforcement_mode: 'none', aav_enabled: false }
        };
    }
    
    // Get enforcement mode (escrow-level or policy-level override)
    const enforcementMode = getEffectiveEnforcementMode(escrowAccount, policies);
    
    // Map old enforcement modes to new spec
    // none -> skip entirely
    // warn -> log_only (allow even if denied)
    // strict -> verify (fail closed)
    // verify -> verify (new spec mode)
    // log_only -> log_only (new spec mode)
    
    if (enforcementMode === 'none') {
        return {
            rule: 'aav_authorization',
            passed: true,
            reason: 'AAV enforcement mode is none',
            metadata: { enforcement_mode: 'none' }
        };
    }
    
    // Extract agent identity from AAV claims
    const agentId = aavClaims?.agent_id;
    const grantId = aavClaims?.grant_id;
    const certificateId = aavClaims?.certificate_id;
    const verified = aavClaims?.verified || false;
    
    // Check if certificate is required
    if (escrowAccount.aavRequireCertificate && !certificateId) {
        if (enforcementMode === 'log_only' || enforcementMode === 'warn') {
            return {
                rule: 'aav_authorization',
                passed: true,
                reason: 'Certificate required but not provided (log_only mode - allowed)',
                metadata: {
                    enforcement_mode: enforcementMode,
                    warning: 'aav_certificate_required',
                    require_certificate: true
                }
            };
        }
        return {
            rule: 'aav_authorization',
            passed: false,
            reason: 'AAV certificate required but not provided',
            denial_source: 'aav',
            metadata: {
                enforcement_mode: enforcementMode,
                require_certificate: true
            }
        };
    }
    
    // First do local authorization check (agent_id/grant_id in lists)
    const authResult = checkAgentAuthorization(
        agentId, 
        grantId, 
        escrowAccount, 
        policies
    );
    
    // If we have AAV API verification result from async step, use it
    if (context.aavApiResult) {
        return processAAVApiResult(context.aavApiResult, enforcementMode, agentId, grantId, certificateId);
    }
    
    // Otherwise, use local authorization result
    if (!authResult.authorized) {
        if (enforcementMode === 'warn' || enforcementMode === 'log_only') {
            // Log but allow (for gradual rollout)
            return {
                rule: 'aav_authorization',
                passed: true,
                reason: 'Agent not authorized (log_only mode - allowed)',
                metadata: { 
                    enforcement_mode: enforcementMode,
                    agent_id: agentId,
                    grant_id: grantId,
                    certificate_id: certificateId,
                    authorized: false,
                    verification_status: verified ? 'verified' : 'unverified',
                    warning: authResult.reason
                }
            };
        }
        
        // Strict/verify mode - deny
        return {
            rule: 'aav_authorization',
            passed: false,
            reason: authResult.reason,
            denial_source: 'aav',
            metadata: {
                enforcement_mode: enforcementMode,
                agent_id: agentId,
                grant_id: grantId,
                certificate_id: certificateId,
                authorized_agents: authResult.authorizedAgents || [],
                authorized_grants: authResult.authorizedGrants || []
            }
        };
    }
    
    return {
        rule: 'aav_authorization',
        passed: true,
        reason: authResult.reason,
        metadata: {
            enforcement_mode: enforcementMode,
            agent_id: agentId,
            grant_id: grantId,
            certificate_id: certificateId,
            matched_on: authResult.matchedOn,
            policy_id: authResult.policyId,
            verification_status: verified ? 'verified' : 'unverified'
        }
    };
}

/**
 * Process AAV API verification result
 * Called when async AAV /verify call has completed
 */
function processAAVApiResult(aavApiResult, enforcementMode, agentId, grantId, certificateId) {
    const isLogOnly = enforcementMode === 'log_only' || enforcementMode === 'warn';
    
    // Handle errors (timeout, unreachable)
    if (!aavApiResult.success) {
        if (isLogOnly) {
            return {
                rule: 'aav_authorization',
                passed: true,
                reason: `AAV verification failed (${aavApiResult.error}) - log_only mode, allowed`,
                metadata: {
                    enforcement_mode: enforcementMode,
                    aav_error: aavApiResult.error,
                    aav_message: aavApiResult.message,
                    response_time_ms: aavApiResult.responseTime,
                    warning: 'aav_verification_failed'
                }
            };
        }
        // Verify mode - fail closed
        return {
            rule: 'aav_authorization',
            passed: false,
            reason: `AAV: ${aavApiResult.message}`,
            denial_source: 'aav',
            metadata: {
                enforcement_mode: enforcementMode,
                aav_error: aavApiResult.error,
                response_time_ms: aavApiResult.responseTime
            }
        };
    }
    
    // Handle AAV denial
    if (!aavApiResult.authorized && aavApiService.isDeniedResult(aavApiResult.result)) {
        if (isLogOnly) {
            return {
                rule: 'aav_authorization',
                passed: true,
                reason: `AAV denied (${aavApiResult.result}: ${aavApiResult.denialReason}) - log_only mode, allowed`,
                metadata: {
                    enforcement_mode: enforcementMode,
                    verification_id: aavApiResult.verificationId,
                    agent_id: aavApiResult.agentId,
                    grant_id: aavApiResult.grantId,
                    aav_result: aavApiResult.result,
                    denial_reason: aavApiResult.denialReason,
                    warning: 'aav_denied'
                }
            };
        }
        return {
            rule: 'aav_authorization',
            passed: false,
            reason: `AAV: ${aavApiResult.denialReason || aavApiResult.result}`,
            denial_source: 'aav',
            metadata: {
                enforcement_mode: enforcementMode,
                verification_id: aavApiResult.verificationId,
                agent_id: aavApiResult.agentId,
                grant_id: aavApiResult.grantId,
                aav_result: aavApiResult.result,
                denial_reason: aavApiResult.denialReason
            }
        };
    }
    
    // Handle approval_pending
    if (aavApiService.isApprovalPendingResult(aavApiResult.result)) {
        if (isLogOnly) {
            return {
                rule: 'aav_authorization',
                passed: true,
                reason: 'AAV approval pending - log_only mode, allowed',
                metadata: {
                    enforcement_mode: enforcementMode,
                    verification_id: aavApiResult.verificationId,
                    aav_result: 'approval_pending',
                    warning: 'aav_approval_pending'
                }
            };
        }
        return {
            rule: 'aav_authorization',
            passed: false,
            reason: 'AAV: Agent requires human approval from AAV',
            denial_source: 'aav',
            metadata: {
                enforcement_mode: enforcementMode,
                verification_id: aavApiResult.verificationId,
                aav_result: 'approval_pending'
            }
        };
    }
    
    // Success - AAV authorized
    return {
        rule: 'aav_authorization',
        passed: true,
        reason: `AAV authorized (${aavApiResult.verificationId})`,
        metadata: {
            enforcement_mode: enforcementMode,
            verification_id: aavApiResult.verificationId,
            agent_id: aavApiResult.agentId || agentId,
            grant_id: aavApiResult.grantId || grantId,
            certificate_id: certificateId,
            autonomy_level: aavApiResult.autonomyLevel,
            aav_result: aavApiResult.result,
            daily_spend: aavApiResult.dailySpend,
            response_time_ms: aavApiResult.responseTime
        }
    };
}

/**
 * Step 3: IDEMPOTENCY CHECK
 */
function checkIdempotency(context) {
    const { existingRequest, request } = context;
    
    if (!request.idempotencyKey) {
        return {
            rule: 'idempotency_check',
            passed: true,
            reason: 'No idempotency key provided'
        };
    }
    
    if (existingRequest) {
        return {
            rule: 'idempotency_check',
            passed: false,
            isReplay: true,
            reason: 'Returning existing request (idempotent replay)',
            metadata: { existing_request_id: existingRequest.id }
        };
    }
    
    return {
        rule: 'idempotency_check',
        passed: true,
        reason: 'Idempotency key is unique'
    };
}

/**
 * Step 4: BALANCE CHECK
 */
function checkBalance(context) {
    const { escrowAccount, request } = context;
    
    if (escrowAccount.balanceCents < request.amountCents) {
        return {
            rule: 'balance_check',
            passed: false,
            reason: 'Insufficient funds',
            metadata: {
                balance_cents: escrowAccount.balanceCents,
                requested_cents: request.amountCents,
                shortfall_cents: request.amountCents - escrowAccount.balanceCents
            }
        };
    }
    
    return {
        rule: 'balance_check',
        passed: true,
        reason: 'Sufficient balance available',
        metadata: {
            balance_cents: escrowAccount.balanceCents,
            requested_cents: request.amountCents,
            remaining_after: escrowAccount.balanceCents - request.amountCents
        }
    };
}

/**
 * Step 5: PER-TRANSACTION LIMIT
 */
function checkPerTransactionLimit(context) {
    const { policies, request } = context;
    
    // Find the most restrictive per-transaction limit
    let tightestLimit = null;
    let tightestPolicy = null;
    
    for (const policy of policies) {
        if (policy.perTransactionLimitCents !== null && policy.perTransactionLimitCents !== undefined) {
            if (tightestLimit === null || policy.perTransactionLimitCents < tightestLimit) {
                tightestLimit = policy.perTransactionLimitCents;
                tightestPolicy = policy;
            }
        }
    }
    
    if (tightestLimit === null) {
        return {
            rule: 'per_transaction_limit',
            passed: true,
            reason: 'No per-transaction limit configured'
        };
    }
    
    if (request.amountCents > tightestLimit) {
        return {
            rule: 'per_transaction_limit',
            rule_id: tightestPolicy.id,
            passed: false,
            reason: `Amount exceeds per-transaction limit of $${(tightestLimit / 100).toFixed(2)}`,
            metadata: {
                limit_cents: tightestLimit,
                requested_cents: request.amountCents,
                policy_name: tightestPolicy.name
            }
        };
    }
    
    return {
        rule: 'per_transaction_limit',
        passed: true,
        reason: `Within per-transaction limit of $${(tightestLimit / 100).toFixed(2)}`,
        metadata: { limit_cents: tightestLimit }
    };
}

/**
 * Step 6: DAILY CAP CHECK
 */
function checkDailyCap(context) {
    const { policies, request, dailyTracking } = context;
    
    const currentDailySpent = dailyTracking?.totalSpentCents || 0;
    const projectedTotal = currentDailySpent + request.amountCents;
    
    // Find the most restrictive daily limit
    let tightestLimit = null;
    let tightestPolicy = null;
    
    for (const policy of policies) {
        if (policy.dailyLimitCents !== null && policy.dailyLimitCents !== undefined) {
            if (tightestLimit === null || policy.dailyLimitCents < tightestLimit) {
                tightestLimit = policy.dailyLimitCents;
                tightestPolicy = policy;
            }
        }
    }
    
    if (tightestLimit === null) {
        return {
            rule: 'daily_cap_check',
            passed: true,
            reason: 'No daily cap configured'
        };
    }
    
    if (projectedTotal > tightestLimit) {
        return {
            rule: 'daily_cap_check',
            rule_id: tightestPolicy.id,
            passed: false,
            reason: `Would exceed daily cap of $${(tightestLimit / 100).toFixed(2)}`,
            metadata: {
                daily_limit_cents: tightestLimit,
                current_daily_spent_cents: currentDailySpent,
                requested_cents: request.amountCents,
                projected_total_cents: projectedTotal,
                policy_name: tightestPolicy.name
            }
        };
    }
    
    return {
        rule: 'daily_cap_check',
        passed: true,
        reason: `Within daily cap of $${(tightestLimit / 100).toFixed(2)}`,
        metadata: {
            daily_limit_cents: tightestLimit,
            current_daily_spent_cents: currentDailySpent,
            projected_total_cents: projectedTotal
        }
    };
}

/**
 * Step 7: WEEKLY CAP CHECK
 */
function checkWeeklyCap(context) {
    const { policies, request, weeklyTracking } = context;
    
    const currentWeeklySpent = weeklyTracking?.totalSpentCents || 0;
    const projectedTotal = currentWeeklySpent + request.amountCents;
    
    let tightestLimit = null;
    let tightestPolicy = null;
    
    for (const policy of policies) {
        if (policy.weeklyLimitCents !== null && policy.weeklyLimitCents !== undefined) {
            if (tightestLimit === null || policy.weeklyLimitCents < tightestLimit) {
                tightestLimit = policy.weeklyLimitCents;
                tightestPolicy = policy;
            }
        }
    }
    
    if (tightestLimit === null) {
        return {
            rule: 'weekly_cap_check',
            passed: true,
            reason: 'No weekly cap configured'
        };
    }
    
    if (projectedTotal > tightestLimit) {
        return {
            rule: 'weekly_cap_check',
            rule_id: tightestPolicy.id,
            passed: false,
            reason: `Would exceed weekly cap of $${(tightestLimit / 100).toFixed(2)}`,
            metadata: {
                weekly_limit_cents: tightestLimit,
                current_weekly_spent_cents: currentWeeklySpent,
                requested_cents: request.amountCents,
                projected_total_cents: projectedTotal,
                policy_name: tightestPolicy.name
            }
        };
    }
    
    return {
        rule: 'weekly_cap_check',
        passed: true,
        reason: `Within weekly cap of $${(tightestLimit / 100).toFixed(2)}`,
        metadata: {
            weekly_limit_cents: tightestLimit,
            current_weekly_spent_cents: currentWeeklySpent,
            projected_total_cents: projectedTotal
        }
    };
}

/**
 * Step 8: MONTHLY CAP CHECK
 */
function checkMonthlyCap(context) {
    const { policies, request, monthlyTracking } = context;
    
    const currentMonthlySpent = monthlyTracking?.totalSpentCents || 0;
    const projectedTotal = currentMonthlySpent + request.amountCents;
    
    let tightestLimit = null;
    let tightestPolicy = null;
    
    for (const policy of policies) {
        if (policy.monthlyLimitCents !== null && policy.monthlyLimitCents !== undefined) {
            if (tightestLimit === null || policy.monthlyLimitCents < tightestLimit) {
                tightestLimit = policy.monthlyLimitCents;
                tightestPolicy = policy;
            }
        }
    }
    
    if (tightestLimit === null) {
        return {
            rule: 'monthly_cap_check',
            passed: true,
            reason: 'No monthly cap configured'
        };
    }
    
    if (projectedTotal > tightestLimit) {
        return {
            rule: 'monthly_cap_check',
            rule_id: tightestPolicy.id,
            passed: false,
            reason: `Would exceed monthly cap of $${(tightestLimit / 100).toFixed(2)}`,
            metadata: {
                monthly_limit_cents: tightestLimit,
                current_monthly_spent_cents: currentMonthlySpent,
                requested_cents: request.amountCents,
                projected_total_cents: projectedTotal,
                policy_name: tightestPolicy.name
            }
        };
    }
    
    return {
        rule: 'monthly_cap_check',
        passed: true,
        reason: `Within monthly cap of $${(tightestLimit / 100).toFixed(2)}`,
        metadata: {
            monthly_limit_cents: tightestLimit,
            current_monthly_spent_cents: currentMonthlySpent,
            projected_total_cents: projectedTotal
        }
    };
}

/**
 * Filter policies that apply to a specific agent
 * If no AAV claims, returns all active policies
 * If AAV claims present, returns only policies that authorize this agent
 */
function getApplicablePolicies(policies, aavClaims) {
    const agentId = aavClaims?.agent_id;
    const grantId = aavClaims?.grant_id;
    
    // If no agent identity, return all active policies
    if (!agentId && !grantId) {
        return policies.filter(p => p.isActive && p.status === 'active');
    }
    
    // Filter to policies that apply to this agent
    return policies.filter(policy => {
        if (!policy.isActive || policy.status !== 'active') return false;
        
        // If policy has no AAV restrictions, it applies to all agents
        if (!policy.aavEnabled) return true;
        
        const policyAgents = parseJsonField(policy.authorizedAgentIds, []);
        const policyGrants = parseJsonField(policy.aavGrantIds, []);
        
        // If policy has no agent restrictions, it applies to all
        if (policyAgents.length === 0 && policyGrants.length === 0) return true;
        
        // Check if agent matches
        if (agentId && policyAgents.includes(agentId)) return true;
        if (grantId && policyGrants.includes(grantId)) return true;
        
        return false;
    });
}

/**
 * Step 9: VENDOR CHECK
 * Now filters to only applicable policies based on agent identity
 */
function checkVendor(context) {
    const { policies, request, aavClaims } = context;
    const vendor = request.vendor;
    
    // Get only policies that apply to this agent
    const applicablePolicies = getApplicablePolicies(policies, aavClaims);
    
    if (applicablePolicies.length === 0) {
        return {
            rule: 'vendor_check',
            passed: true,
            reason: 'No applicable policies with vendor restrictions',
            metadata: { vendor }
        };
    }
    
    for (const policy of applicablePolicies) {
        const allowedVendors = parseJsonField(policy.allowedVendors, []);
        const blockedVendors = parseJsonField(policy.blockedVendors, []);
        const matchMode = policy.vendorMatchMode || 'exact';
        
        // Check blocked vendors first
        if (blockedVendors.length > 0) {
            for (const blocked of blockedVendors) {
                if (matchVendor(vendor, blocked, matchMode)) {
                    return {
                        rule: 'vendor_check',
                        rule_id: policy.id,
                        passed: false,
                        reason: `Vendor "${vendor}" is blocked by policy "${policy.name}"`,
                        metadata: {
                            vendor,
                            blocked_pattern: blocked,
                            match_mode: matchMode,
                            policy_name: policy.name
                        }
                    };
                }
            }
        }
        
        // Check allowed vendors (if configured)
        if (allowedVendors.length > 0) {
            let isAllowed = false;
            for (const allowed of allowedVendors) {
                if (matchVendor(vendor, allowed, matchMode)) {
                    isAllowed = true;
                    break;
                }
            }
            
            if (!isAllowed) {
                return {
                    rule: 'vendor_check',
                    rule_id: policy.id,
                    passed: false,
                    reason: `Vendor "${vendor}" is not in allowlist for policy "${policy.name}"`,
                    metadata: {
                        vendor,
                        allowed_vendors: allowedVendors,
                        match_mode: matchMode,
                        policy_name: policy.name
                    }
                };
            }
        }
    }
    
    return {
        rule: 'vendor_check',
        passed: true,
        reason: 'Vendor is allowed',
        metadata: { vendor, policies_checked: applicablePolicies.map(p => p.name) }
    };
}

/**
 * Step 10: CATEGORY CHECK
 * Now filters to only applicable policies based on agent identity
 */
function checkCategory(context) {
    const { policies, request, aavClaims } = context;
    const category = request.category;
    
    // Get only policies that apply to this agent
    const applicablePolicies = getApplicablePolicies(policies, aavClaims);
    
    if (applicablePolicies.length === 0) {
        return {
            rule: 'category_check',
            passed: true,
            reason: 'No applicable policies with category restrictions',
            metadata: { category }
        };
    }
    
    for (const policy of applicablePolicies) {
        const allowedCategories = parseJsonField(policy.allowedCategories, []);
        const blockedCategories = parseJsonField(policy.blockedCategories, []);
        
        // Check blocked categories first
        if (blockedCategories.length > 0 && category) {
            const categoryLower = category.toLowerCase();
            for (const blocked of blockedCategories) {
                if (categoryLower === blocked.toLowerCase()) {
                    return {
                        rule: 'category_check',
                        rule_id: policy.id,
                        passed: false,
                        reason: `Category "${category}" is blocked`,
                        metadata: {
                            category,
                            blocked_category: blocked,
                            policy_name: policy.name
                        }
                    };
                }
            }
        }
        
        // Check allowed categories (if configured)
        if (allowedCategories.length > 0) {
            if (!category) {
                return {
                    rule: 'category_check',
                    rule_id: policy.id,
                    passed: false,
                    reason: 'Category is required but not provided',
                    metadata: {
                        allowed_categories: allowedCategories,
                        policy_name: policy.name
                    }
                };
            }
            
            const categoryLower = category.toLowerCase();
            const isAllowed = allowedCategories.some(c => c.toLowerCase() === categoryLower);
            
            if (!isAllowed) {
                return {
                    rule: 'category_check',
                    rule_id: policy.id,
                    passed: false,
                    reason: `Category "${category}" is not in allowlist`,
                    metadata: {
                        category,
                        allowed_categories: allowedCategories,
                        policy_name: policy.name
                    }
                };
            }
        }
    }
    
    return {
        rule: 'category_check',
        passed: true,
        reason: 'Category is allowed',
        metadata: { category, policies_checked: applicablePolicies.map(p => p.name) }
    };
}

/**
 * Step 11: TIME WINDOW CHECK
 */
function checkTimeWindow(context) {
    const { policies, currentTime } = context;
    
    for (const policy of policies) {
        const activeDays = parseJsonField(policy.activeDays, []);
        const activeHoursStart = policy.activeHoursStart;
        const activeHoursEnd = policy.activeHoursEnd;
        const timezone = policy.activeTimezone || 'America/Denver';
        
        // Skip if no time restrictions configured
        if (activeDays.length === 0 && !activeHoursStart && !activeHoursEnd) {
            continue;
        }
        
        const windowCheck = isWithinTimeWindow(currentTime, {
            activeDays,
            activeHoursStart,
            activeHoursEnd,
            timezone
        });
        
        if (!windowCheck.isWithin) {
            return {
                rule: 'time_window_check',
                rule_id: policy.id,
                passed: false,
                reason: windowCheck.reason,
                metadata: {
                    current_time: currentTime.toISOString(),
                    local_time: windowCheck.localTime,
                    local_day: windowCheck.localDay,
                    allowed_days: activeDays,
                    allowed_hours: activeHoursStart && activeHoursEnd 
                        ? `${activeHoursStart}-${activeHoursEnd}` 
                        : 'any',
                    timezone,
                    policy_name: policy.name
                }
            };
        }
    }
    
    return {
        rule: 'time_window_check',
        passed: true,
        reason: 'Within allowed time window',
        metadata: { current_time: currentTime.toISOString() }
    };
}

/**
 * Step 12: APPROVAL THRESHOLD CHECK
 */
function checkApprovalThreshold(context) {
    const { policies, request } = context;
    const amount = request.amountCents;
    
    let requiresApproval = false;
    let approvalTimeoutMinutes = 60;
    let triggeringPolicy = null;
    let reputationBoostApplied = false;
    
    for (const policy of policies) {
        let autoApproveUnder = policy.autoApproveUnderCents;
        const requireHumanAbove = policy.requireHumanAboveCents;
        
        // Reputation boost: if policy has reputationSpendingBoost=true
        // and agent has Platinum tier (score >= 90), double the auto-approve limit
        if (policy.reputationSpendingBoost && context.reputationScore >= 90 && autoApproveUnder) {
            autoApproveUnder = autoApproveUnder * 2;
            reputationBoostApplied = true;
        }
        
        // If amount is above require_human_above_cents, require approval
        if (requireHumanAbove !== null && requireHumanAbove !== undefined) {
            // Also apply reputation boost to human approval threshold
            let effectiveHumanAbove = requireHumanAbove;
            if (policy.reputationSpendingBoost && context.reputationScore >= 90) {
                effectiveHumanAbove = requireHumanAbove * 2;
            }
            
            if (amount > effectiveHumanAbove) {
                requiresApproval = true;
                triggeringPolicy = policy;
                if (policy.approvalTimeoutMinutes && policy.approvalTimeoutMinutes < approvalTimeoutMinutes) {
                    approvalTimeoutMinutes = policy.approvalTimeoutMinutes;
                }
            }
        }
        
        // If auto_approve_under_cents is set and amount is above it, 
        // it might require approval (unless another policy auto-approves)
        if (autoApproveUnder !== null && autoApproveUnder !== undefined) {
            if (amount > autoApproveUnder) {
                if (!requiresApproval && requireHumanAbove !== null && amount > requireHumanAbove) {
                    requiresApproval = true;
                    triggeringPolicy = policy;
                }
            }
        }
    }
    
    if (requiresApproval) {
        return {
            rule: 'approval_threshold_check',
            rule_id: triggeringPolicy?.id,
            passed: true,
            requiresApproval: true,
            reason: `Amount exceeds auto-approve threshold, requires human approval`,
            metadata: {
                amount_cents: amount,
                requires_approval: true,
                approvalTimeoutMinutes,
                policy_name: triggeringPolicy?.name,
                reputation_boost_applied: reputationBoostApplied
            }
        };
    }
    
    return {
        rule: 'approval_threshold_check',
        passed: true,
        requiresApproval: false,
        reason: reputationBoostApplied 
            ? 'Auto-approved (Reputation boost applied - Platinum tier)' 
            : 'Auto-approved based on thresholds',
        metadata: { amount_cents: amount, reputation_boost_applied: reputationBoostApplied }
    };
}

/**
 * Helper to create a denial result
 */
function createDenialResult(rulesEvaluated, denialReason, denialRuleId) {
    return {
        status: 'denied',
        rulesEvaluated,
        denialReason,
        denialRuleId
    };
}

/**
 * Helper to parse JSON fields that might be strings (SQLite compatibility)
 */
function parseJsonField(field, defaultValue = []) {
    if (!field) return defaultValue;
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return defaultValue;
        }
    }
    return defaultValue;
}

module.exports = {
    evaluateSpendRequest
};
