const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateId, validateAgentId } = require('../utils/ids');
const { requireAuth } = require('../middleware/auth');
const { spendRateLimiter } = require('../middleware/rate-limit');
const { evaluateSpendRequest } = require('../services/rules-engine');
const { getDateBoundaries } = require('../services/rules-helpers');
const { queueWebhooks, buildSpendEventData, buildApprovalEventData, buildAAVEventData } = require('../services/webhook-service');
const { detectInjection, trackInjectionAttempt, trackRunawayLoop } = require('../services/security-alerts');
const { sendApprovalNotification } = require('../services/approval-notification-service');
const { extractAAVClaims } = require('../services/aav-service');
const aavApiService = require('../services/aav-api-service');
const { reportSpendApproved, reportSpendDenied } = require('../services/arl-service');
const { emitSpendApproved, emitSpendDenied } = require('../services/cross-tool-events');

const router = express.Router();
const prisma = new PrismaClient();

// Track consecutive denials per escrow for runaway detection
const denialTracker = new Map();

/**
 * POST /v1/spend
 * Create a spend request - runs the full 14-step rules engine (including AAV check)
 * Rate limited to 60 requests per minute per API key/org
 */
router.post('/', spendRateLimiter, requireAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        const {
            escrow_id,
            amount_cents,
            currency = 'usd',
            vendor,
            category,
            description,
            idempotency_key,
            agent_id,              // New: agt_ format agent identifier
            aav_agent_id,          // AAV agent identifier (legacy)
            aav_grant_id,          // AAV grant identifier
            aav_certificate_id,    // AAV certificate (new per spec)
            metadata = {}
        } = req.body;
        
        // Validate agent_id format if provided
        if (agent_id && !validateAgentId(agent_id)) {
            return res.status(400).json({
                error: 'invalid_agent_id',
                message: 'agent_id must be in agt_ + 24 hex characters format (e.g. agt_1a2b3c4d5e6f7890abcdef12)'
            });
        }
        
        // Extract AAV claims from headers or body
        const aavClaims = extractAAVClaims(req);
        
        // If body has AAV fields but headers didn't, use body values
        if (!aavClaims.agent_id && (aav_agent_id || agent_id)) {
            aavClaims.agent_id = aav_agent_id || agent_id;
            aavClaims.grant_id = aav_grant_id;
            aavClaims.source = 'body';
        }
        
        // Add certificate_id from body if not in headers
        if (!aavClaims.certificate_id && aav_certificate_id) {
            aavClaims.certificate_id = aav_certificate_id;
        }
        
        // Auto-lookup certificate_id from agent certificate mapping
        if (!aavClaims.certificate_id && (agent_id || aavClaims.agent_id)) {
            const lookupAgentId = agent_id || aavClaims.agent_id;
            try {
                const certMapping = await prisma.agentCertificate.findUnique({
                    where: {
                        orgId_agentId: {
                            orgId: req.org.id,
                            agentId: lookupAgentId
                        }
                    }
                });
                if (certMapping) {
                    aavClaims.certificate_id = certMapping.certificateId;
                }
            } catch {}
        }
        
        // Fallback to API key's AAV settings if set
        if (req.apiKey) {
            if (!aavClaims.agent_id && req.apiKey.aavAgentId) {
                aavClaims.agent_id = req.apiKey.aavAgentId;
            }
            if (!aavClaims.certificate_id && req.apiKey.aavCertificateId) {
                aavClaims.certificate_id = req.apiKey.aavCertificateId;
            }
        }
        
        // Check for injection attempts in input fields
        const fieldsToCheck = { vendor, category, description };
        for (const [field, value] of Object.entries(fieldsToCheck)) {
            if (value) {
                const injectionType = detectInjection(value);
                if (injectionType) {
                    // Track but don't block - Prisma handles safely
                    // Fire and forget - don't await, errors logged internally
                    trackInjectionAttempt(
                        req.org.id,
                        req.org.name,
                        field,
                        value,
                        injectionType,
                        req.requestId
                    ).catch(() => {}); // Suppress unhandled rejection
                }
            }
        }
        
        // Validate required fields
        if (!escrow_id || amount_cents === undefined || !vendor) {
            return res.status(400).json({ 
                error: 'escrow_id, amount_cents, and vendor are required' 
            });
        }
        
        // Validate amount_cents type and range
        const amountCentsNum = Number(amount_cents);
        if (isNaN(amountCentsNum)) {
            return res.status(400).json({ 
                error: 'amount_cents must be a number',
                received_type: typeof amount_cents
            });
        }
        
        if (amountCentsNum <= 0) {
            return res.status(400).json({ error: 'amount_cents must be positive' });
        }
        
        // Prevent integer overflow - max $10 billion
        const MAX_AMOUNT_CENTS = 1000000000000; // 10 billion cents = $10B
        if (amountCentsNum > MAX_AMOUNT_CENTS) {
            return res.status(400).json({ 
                error: 'amount_cents exceeds maximum allowed value',
                max_allowed: MAX_AMOUNT_CENTS,
                max_dollars: '$10,000,000,000'
            });
        }
        
        // Validate field lengths to prevent abuse
        const MAX_STRING_LENGTH = 500;
        if (vendor && vendor.length > MAX_STRING_LENGTH) {
            return res.status(400).json({ 
                error: 'vendor name too long',
                max_length: MAX_STRING_LENGTH
            });
        }
        if (category && category.length > MAX_STRING_LENGTH) {
            return res.status(400).json({ 
                error: 'category too long',
                max_length: MAX_STRING_LENGTH
            });
        }
        if (description && description.length > 2000) {
            return res.status(400).json({ 
                error: 'description too long',
                max_length: 2000
            });
        }
        
        // Use validated number
        const validatedAmountCents = Math.floor(amountCentsNum);
        
        // Build context for rules engine
        const currentTime = new Date();
        
        // Fetch all required data
        const [escrowAccount, existingRequest] = await Promise.all([
            prisma.escrowAccount.findFirst({
                where: { id: escrow_id, orgId: req.org.id }
            }),
            idempotency_key ? prisma.spendRequest.findUnique({
                where: { idempotencyKey: idempotency_key }
            }) : null
        ]);
        
        // If idempotent replay, return existing request
        if (existingRequest) {
            return res.json(formatSpendRequest(existingRequest));
        }
        
        // Escrow account not found
        if (!escrowAccount) {
            // Return 404 without creating a spend request record
            // (can't create record with non-existent escrow_id due to FK constraint)
            return res.status(404).json({
                status: 'denied',
                denial_reason: 'escrow_not_found',
                error: 'Escrow account not found',
                rules_evaluated: [{ rule: 'escrow_account_check', passed: false, reason: 'Escrow account not found' }]
            });
        }
        
        // Fetch active policies for this escrow
        const policies = await prisma.spendingPolicy.findMany({
            where: { escrowId: escrow_id, orgId: req.org.id, isActive: true }
        });
        
        // Parse policy JSON fields
        const parsedPolicies = policies.map(p => ({
            ...p,
            allowedVendors: parseJson(p.allowedVendors, []),
            blockedVendors: parseJson(p.blockedVendors, []),
            allowedCategories: parseJson(p.allowedCategories, []),
            blockedCategories: parseJson(p.blockedCategories, []),
            activeDays: parseJson(p.activeDays, ['mon', 'tue', 'wed', 'thu', 'fri'])
        }));
        
        // === AAV AUTHORITY VERIFICATION (Step 0) ===
        // If AAV_ENABLED globally AND agent_id is present, do authority verification
        const aavEnabled = process.env.AAV_ENABLED === 'true';
        let aavApiResult = null;
        
        if (aavEnabled && (agent_id || aavClaims.agent_id)) {
            const enforcementMode = escrowAccount.aavEnforcementMode || 'verify';
            
            if (enforcementMode !== 'none') {
                // Use global AAV config or escrow-level API key
                const aavApiKey = escrowAccount.aavApiKey || process.env.AAV_API_KEY;
                const aavApiUrl = process.env.AAV_API_URL || 'https://agentauthority.dev';
                
                if (aavApiKey) {
                    aavApiResult = await aavApiService.verifyWithAAV({
                        aavApiKey,
                        certificateId: aavClaims.certificate_id,
                        agentId: agent_id || aavClaims.agent_id,
                        amountDollars: validatedAmountCents / 100,
                        currency: currency.toUpperCase(),
                        vendor,
                        description,
                        requestedAction: 'spend'
                    });
                    
                    // Queue AAV webhooks based on result
                    if (aavApiResult) {
                        const aavEventData = buildAAVEventData(
                            { id: idempotency_key || 'pending', escrowId: escrow_id, orgId: req.org.id, amountCents: validatedAmountCents, currency, vendor, aavAgentId: agent_id || aavClaims.agent_id, aavGrantId: aavClaims.grant_id, aavCertificateId: aavClaims.certificate_id, aavVerificationStatus: aavApiResult.success ? (aavApiResult.authorized ? 'verified' : 'denied') : 'error' },
                            escrowAccount,
                            aavApiResult
                        );
                        
                        if (!aavApiResult.success) {
                            queueWebhooks(req.org.id, 'aav.verification_failed', aavEventData);
                        } else if (aavApiResult.authorized) {
                            queueWebhooks(req.org.id, 'aav.verification_passed', aavEventData);
                        } else {
                            queueWebhooks(req.org.id, 'aav.verification_denied', aavEventData);
                        }
                    }
                }
            }
        } else if (escrowAccount.aavEnabled && escrowAccount.aavApiKey) {
            // Legacy: escrow-level AAV verification
            const enforcementMode = escrowAccount.aavEnforcementMode || 'verify';
            
            if (enforcementMode !== 'none') {
                aavApiResult = await aavApiService.verifyWithAAV({
                    aavApiKey: escrowAccount.aavApiKey,
                    certificateId: aavClaims.certificate_id,
                    agentId: aavClaims.agent_id,
                    amountDollars: validatedAmountCents / 100,
                    currency: currency.toUpperCase(),
                    vendor,
                    description,
                    requestedAction: 'purchase_service'
                });
                
                if (aavApiResult) {
                    const aavEventData = buildAAVEventData(
                        { id: idempotency_key || 'pending', escrowId: escrow_id, orgId: req.org.id, amountCents: validatedAmountCents, currency, vendor, aavAgentId: aavClaims.agent_id, aavGrantId: aavClaims.grant_id, aavCertificateId: aavClaims.certificate_id, aavVerificationStatus: aavApiResult.success ? (aavApiResult.authorized ? 'verified' : 'denied') : 'error' },
                        escrowAccount,
                        aavApiResult
                    );
                    
                    if (!aavApiResult.success) {
                        queueWebhooks(req.org.id, 'aav.verification_failed', aavEventData);
                    } else if (aavApiResult.authorized) {
                        queueWebhooks(req.org.id, 'aav.verification_passed', aavEventData);
                    } else {
                        queueWebhooks(req.org.id, 'aav.verification_denied', aavEventData);
                    }
                }
            }
        }
        
        // Get date boundaries for tracking
        const timezone = parsedPolicies[0]?.activeTimezone || 'UTC';
        const { today, weekStart, monthStart } = getDateBoundaries(currentTime, timezone);
        
        // Fetch spend tracking
        const [dailyTracking, weeklyTracking, monthlyTracking] = await Promise.all([
            prisma.dailySpendTracking.findUnique({
                where: { escrowId_date: { escrowId: escrow_id, date: today } }
            }),
            prisma.weeklySpendTracking.findUnique({
                where: { escrowId_weekStart: { escrowId: escrow_id, weekStart } }
            }),
            prisma.monthlySpendTracking.findUnique({
                where: { escrowId_monthStart: { escrowId: escrow_id, monthStart } }
            })
        ]);
        
        // Fetch ARL reputation score if needed (for reputation policies)
        const { getReputationScore, ARL_ENABLED: arlEnabled } = require('../services/arl-service');
        let reputationScore = null;
        const effectiveAgentId = agent_id || aavClaims?.agent_id;
        
        if (arlEnabled && effectiveAgentId) {
            const reputationData = await getReputationScore(effectiveAgentId);
            if (reputationData) {
                reputationScore = reputationData.score;
            }
        }

        // Build evaluation context
        const context = {
            org: req.org,
            apiKey: req.apiKey,
            escrowAccount,
            policies: parsedPolicies,
            dailyTracking,
            weeklyTracking,
            monthlyTracking,
            request: {
                amountCents: validatedAmountCents,
                currency,
                vendor,
                category,
                description,
                idempotencyKey: idempotency_key,
                agentId: agent_id || null
            },
            currentTime,
            existingRequest,
            aavClaims,
            aavApiResult,
            reputationScore
        };
        
        // Run the 13-step rules engine
        const result = evaluateSpendRequest(context);
        
        // Handle replay (idempotency)
        if (result.status === 'replay') {
            return res.json(formatSpendRequest(result.existingRequest));
        }
        
        // Handle denial
        if (result.status === 'denied') {
            // Find the AAV rule result for denial_source
            const aavRule = result.rulesEvaluated.find(r => r.rule === 'aav_authorization');
            const denialSource = aavRule?.denial_source || 
                (result.denialReason?.includes('AAV') ? 'aav' : 
                 result.denialReason?.includes('balance') ? 'balance' :
                 result.denialReason?.includes('escrow') ? 'account' : 'policy');
            
            const deniedRequest = await createDeniedSpendRequest({
                escrowId: escrow_id,
                orgId: req.org.id,
                apiKeyId: req.apiKey?.id,
                agentId: agent_id || null,
                amountCents: validatedAmountCents,
                currency,
                vendor,
                category,
                description,
                idempotencyKey: idempotency_key,
                denialReason: result.denialReason,
                denialRuleId: result.denialRuleId,
                denialSource,
                rulesEvaluated: result.rulesEvaluated,
                balanceBeforeCents: escrowAccount.balanceCents,
                metadata,
                // AAV fields - enhanced
                aavAgentId: aavClaims?.agent_id || aavApiResult?.agentId,
                aavGrantId: aavClaims?.grant_id || aavApiResult?.grantId,
                aavCertificateId: aavClaims?.certificate_id,
                aavVerificationStatus: aavApiResult?.success ? 
                    (aavApiResult.authorized ? 'verified' : 'denied') :
                    (aavClaims?.agent_id ? (aavClaims.verified ? 'verified' : 'unverified') : null),
                aavVerificationId: aavApiResult?.verificationId,
                aavAutonomyLevel: aavApiResult?.autonomyLevel,
                aavResult: aavApiResult?.result,
                aavDailySpend: aavApiResult?.dailySpend ? JSON.stringify(aavApiResult.dailySpend) : null,
                aavCheckedAt: aavApiResult?.success ? new Date() : null
            });
            
            // ARL outcome reporting (async, fire-and-forget)
            const effectiveAgentId = agent_id || aavClaims?.agent_id;
            if (effectiveAgentId) {
                const denyingRule = result.rulesEvaluated.find(r => !r.passed)?.rule || denialSource;
                reportSpendDenied(effectiveAgentId, denyingRule);
            }
            
            // Cross-tool event emission (async)
            emitSpendDenied(req.org.id, effectiveAgentId, {
                spend_request_id: deniedRequest.id,
                escrow_id: escrow_id,
                amount_cents: validatedAmountCents,
                vendor,
                denial_reason: result.denialReason,
                rules_evaluated: result.rulesEvaluated
            }).catch(() => {});
            
            // Track consecutive denials for runaway detection
            const trackerKey = escrow_id;
            const currentCount = (denialTracker.get(trackerKey) || 0) + 1;
            denialTracker.set(trackerKey, currentCount);
            
            // Alert on potential runaway agent
            if (currentCount >= 10) {
                trackRunawayLoop(
                    escrow_id,
                    escrowAccount.name,
                    req.org.id,
                    req.org.name,
                    currentCount,
                    result.denialReason
                ).catch(() => {}); // Fire and forget
            }
            
            // Update denied total
            await prisma.escrowAccount.update({
                where: { id: escrow_id },
                data: { totalDeniedCents: escrowAccount.totalDeniedCents + amount_cents }
            });
            
            // Audit event
            await createAuditEvent({
                orgId: req.org.id,
                escrowId: escrow_id,
                eventType: 'spend.denied',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
                details: {
                    spend_request_id: deniedRequest.id,
                    amount_cents,
                    vendor,
                    category,
                    denial_reason: result.denialReason,
                    denial_rule_id: result.denialRuleId,
                    rules_evaluated: result.rulesEvaluated,
                    evaluation_time_ms: Date.now() - startTime
                },
                ipAddress: req.ip
            });
            
            // Trigger webhook for denial
            await queueWebhooks(req.org.id, 'spend.denied', buildSpendEventData(
                deniedRequest,
                escrowAccount,
                result.rulesEvaluated
            ));
            
            return res.status(400).json({
                ...formatSpendRequest(deniedRequest),
                error: result.denialReason
            });
        }
        
        // Handle pending approval
        if (result.status === 'pending_approval') {
            const expiresAt = new Date(currentTime.getTime() + result.approvalTimeoutMinutes * 60 * 1000);
            
            // Create spend request with pending status
            const pendingRequest = await prisma.spendRequest.create({
                data: {
                    id: generateId('spendRequest'),
                    escrowId: escrow_id,
                    orgId: req.org.id,
                    apiKeyId: req.apiKey?.id,
                    agentId: agent_id || null,
                    amountCents: amount_cents,
                    currency,
                    vendor,
                    category,
                    description,
                    idempotencyKey: idempotency_key,
                    status: 'pending',
                    rulesEvaluated: JSON.stringify(result.rulesEvaluated),
                    balanceBeforeCents: escrowAccount.balanceCents,
                    metadata: JSON.stringify(metadata),
                    // AAV fields
                    aavAgentId: aavClaims?.agent_id || null,
                    aavGrantId: aavClaims?.grant_id || null,
                    aavVerificationStatus: aavClaims?.agent_id ? (aavClaims.verified ? 'verified' : 'unverified') : null
                }
            });
            
            // Create approval record
            const approval = await prisma.approval.create({
                data: {
                    id: generateId('approval'),
                    spendRequestId: pendingRequest.id,
                    orgId: req.org.id,
                    status: 'pending',
                    expiresAt
                }
            });
            
            // Audit event
            await createAuditEvent({
                orgId: req.org.id,
                escrowId: escrow_id,
                eventType: 'approval.requested',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
                details: {
                    spend_request_id: pendingRequest.id,
                    approval_id: approval.id,
                    amount_cents,
                    vendor,
                    category,
                    expires_at: expiresAt.toISOString(),
                    rules_evaluated: result.rulesEvaluated,
                    evaluation_time_ms: Date.now() - startTime
                },
                ipAddress: req.ip
            });
            
            // Trigger webhook for approval requested
            await queueWebhooks(req.org.id, 'approval.requested', buildApprovalEventData(
                approval,
                pendingRequest,
                escrowAccount
            ));
            
            // Send email notification to approvers (async, fire-and-forget)
            sendApprovalNotification(approval).catch(err => {
                console.error('Failed to send approval notification:', err.message);
            });
            
            return res.status(202).json({
                ...formatSpendRequest(pendingRequest),
                approval_id: approval.id,
                approval_expires_at: expiresAt.toISOString()
            });
        }
        
        // Handle approved - execute the spend with OPTIMISTIC LOCKING
        // to prevent race conditions in concurrent spend requests
        
        // Use interactive transaction with conditional update for atomicity
        // This prevents race conditions where two concurrent requests both pass balance check
        // SQLite approach: Use conditional update that checks balance in the WHERE clause
        try {
            const transactionResult = await prisma.$transaction(async (tx) => {
                // Atomic conditional update - only succeeds if balance is sufficient
                // This is the key to preventing race conditions in SQLite
                // Note: Using actual table/column names from schema @@map directives
                const updateResult = await tx.$executeRaw`
                    UPDATE escrow_accounts 
                    SET balance_cents = balance_cents - ${amount_cents},
                        total_spent_cents = total_spent_cents + ${amount_cents},
                        status = CASE WHEN balance_cents - ${amount_cents} <= 0 THEN 'depleted' ELSE status END,
                        updated_at = ${new Date().toISOString()}
                    WHERE id = ${escrow_id} 
                      AND balance_cents >= ${amount_cents}
                      AND status = 'active'
                `;
                
                // If no rows updated, the balance check failed (race condition caught)
                if (updateResult === 0) {
                    // Re-fetch to determine why it failed
                    const currentEscrow = await tx.escrowAccount.findUnique({
                        where: { id: escrow_id }
                    });
                    
                    if (!currentEscrow || currentEscrow.status !== 'active') {
                        throw new Error('ACCOUNT_NOT_ACTIVE');
                    }
                    if (currentEscrow.balanceCents < amount_cents) {
                        throw new Error('INSUFFICIENT_BALANCE');
                    }
                    throw new Error('UPDATE_FAILED');
                }
                
                // Fetch the updated escrow account
                const updatedEscrow = await tx.escrowAccount.findUnique({
                    where: { id: escrow_id }
                });
                
                const actualBalanceAfter = updatedEscrow.balanceCents;
                const actualBalanceBefore = actualBalanceAfter + amount_cents;
                
                // Create spend request
                const spendRequest = await tx.spendRequest.create({
                    data: {
                        id: generateId('spendRequest'),
                        escrowId: escrow_id,
                        orgId: req.org.id,
                        apiKeyId: req.apiKey?.id,
                        agentId: agent_id || null,
                        amountCents: amount_cents,
                        currency,
                        vendor,
                        category,
                        description,
                        idempotencyKey: idempotency_key,
                        status: 'approved',
                        resolvedAt: new Date(),
                        resolvedBy: req.authType === 'api_key' ? 'system:auto_approved' : 'human:' + req.org.id,
                        rulesEvaluated: JSON.stringify(result.rulesEvaluated),
                        balanceBeforeCents: actualBalanceBefore,
                        balanceAfterCents: actualBalanceAfter,
                        metadata: JSON.stringify(metadata),
                        // AAV fields
                        aavAgentId: aavClaims?.agent_id || null,
                        aavGrantId: aavClaims?.grant_id || null,
                        aavVerificationStatus: aavClaims?.agent_id ? (aavClaims.verified ? 'verified' : 'unverified') : null
                    }
                });
                
                return { updatedEscrow, spendRequest, actualBalanceAfter };
            });
            
            const { updatedEscrow, spendRequest, actualBalanceAfter } = transactionResult;
            
            // Reset denial tracker on successful spend
            denialTracker.delete(escrow_id);
        
            // Update spend tracking (outside transaction for performance)
            await Promise.all([
                prisma.dailySpendTracking.upsert({
                    where: { escrowId_date: { escrowId: escrow_id, date: today } },
                    update: {
                        totalSpentCents: { increment: amount_cents },
                        transactionCount: { increment: 1 }
                    },
                    create: {
                        escrowId: escrow_id,
                        date: today,
                        totalSpentCents: amount_cents,
                        transactionCount: 1
                    }
                }),
                prisma.weeklySpendTracking.upsert({
                    where: { escrowId_weekStart: { escrowId: escrow_id, weekStart } },
                    update: {
                        totalSpentCents: { increment: amount_cents },
                        transactionCount: { increment: 1 }
                    },
                    create: {
                        escrowId: escrow_id,
                        weekStart,
                        totalSpentCents: amount_cents,
                        transactionCount: 1
                    }
                }),
                prisma.monthlySpendTracking.upsert({
                    where: { escrowId_monthStart: { escrowId: escrow_id, monthStart } },
                    update: {
                        totalSpentCents: { increment: amount_cents },
                        transactionCount: { increment: 1 }
                    },
                    create: {
                        escrowId: escrow_id,
                        monthStart,
                        totalSpentCents: amount_cents,
                        transactionCount: 1
                    }
                })
            ]);
        
            // Audit event
            await createAuditEvent({
                orgId: req.org.id,
                escrowId: escrow_id,
                eventType: 'spend.approved',
                actorType: req.authType === 'api_key' ? 'agent' : 'human',
                actorId: req.apiKey?.id || req.org.id,
                details: {
                    spend_request_id: spendRequest.id,
                    amount_cents,
                    vendor,
                    category,
                    balance_before: escrowAccount.balanceCents,
                    balance_after: actualBalanceAfter,
                    rules_evaluated: result.rulesEvaluated,
                    evaluation_time_ms: Date.now() - startTime
                },
                ipAddress: req.ip
            });
        
            // Trigger webhook for auto-approved spend
            await queueWebhooks(req.org.id, 'spend.approved', buildSpendEventData(
                spendRequest,
                updatedEscrow,
                result.rulesEvaluated
            ));
            
            // ARL outcome reporting (async, fire-and-forget)
            const effectiveAgentIdApproved = agent_id || aavClaims?.agent_id;
            if (effectiveAgentIdApproved) {
                reportSpendApproved(effectiveAgentIdApproved);
            }
            
            // Cross-tool event emission (async)
            emitSpendApproved(req.org.id, effectiveAgentIdApproved, {
                spend_request_id: spendRequest.id,
                escrow_id: escrow_id,
                amount_cents: amount_cents,
                vendor,
                rules_evaluated: result.rulesEvaluated
            }).catch(() => {});
        
            res.status(201).json({
                ...formatSpendRequest(spendRequest),
                remaining_balance_cents: actualBalanceAfter
            });
            
        } catch (txError) {
            // Handle race condition - another request got there first
            if (txError.message === 'INSUFFICIENT_BALANCE') {
                return res.status(400).json({
                    error: 'Insufficient balance',
                    status: 'denied',
                    denial_reason: 'insufficient_balance_concurrent'
                });
            }
            if (txError.message === 'ACCOUNT_NOT_ACTIVE') {
                return res.status(400).json({
                    error: 'Account is not active',
                    status: 'denied',
                    denial_reason: 'account_not_active'
                });
            }
            throw txError; // Re-throw other errors to outer catch
        }
        
    } catch (error) {
        console.error('Spend request error:', error);
        res.status(500).json({ error: 'Failed to process spend request' });
    }
});

/**
 * GET /v1/spend
 * List spend requests
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const { escrow_id, status, limit = 50, offset = 0 } = req.query;
        
        const where = { orgId: req.org.id };
        if (escrow_id) where.escrowId = escrow_id;
        if (status) where.status = status;
        
        const [spendRequests, total] = await Promise.all([
            prisma.spendRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.spendRequest.count({ where })
        ]);
        
        res.json({
            data: spendRequests.map(formatSpendRequest),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('List spend requests error:', error);
        res.status(500).json({ error: 'Failed to list spend requests' });
    }
});

/**
 * GET /v1/spend/:id
 * Get spend request details
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const spendRequest = await prisma.spendRequest.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!spendRequest) {
            return res.status(404).json({ error: 'Spend request not found' });
        }
        
        res.json(formatSpendRequest(spendRequest));
    } catch (error) {
        console.error('Get spend request error:', error);
        res.status(500).json({ error: 'Failed to get spend request' });
    }
});

/**
 * POST /v1/spend/:id/cancel
 * Cancel a pending spend request
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
    try {
        const spendRequest = await prisma.spendRequest.findFirst({
            where: {
                id: req.params.id,
                orgId: req.org.id
            }
        });
        
        if (!spendRequest) {
            return res.status(404).json({ error: 'Spend request not found' });
        }
        
        if (spendRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Can only cancel pending requests' });
        }
        
        const updated = await prisma.spendRequest.update({
            where: { id: spendRequest.id },
            data: {
                status: 'cancelled',
                resolvedAt: new Date(),
                resolvedBy: 'human:' + req.org.id
            }
        });
        
        // Also update any related approval
        await prisma.approval.updateMany({
            where: { spendRequestId: spendRequest.id, status: 'pending' },
            data: { status: 'cancelled' }
        });
        
        res.json(formatSpendRequest(updated));
    } catch (error) {
        console.error('Cancel spend request error:', error);
        res.status(500).json({ error: 'Failed to cancel spend request' });
    }
});

/**
 * Helper to create a denied spend request
 */
async function createDeniedSpendRequest(data) {
    return await prisma.spendRequest.create({
        data: {
            id: generateId('spendRequest'),
            escrowId: data.escrowId,
            orgId: data.orgId,
            apiKeyId: data.apiKeyId,
            agentId: data.agentId || null,
            amountCents: data.amountCents,
            currency: data.currency || 'usd',
            vendor: data.vendor,
            category: data.category,
            description: data.description,
            idempotencyKey: data.idempotencyKey,
            status: 'denied',
            resolvedAt: new Date(),
            resolvedBy: 'system',
            denialReason: data.denialReason,
            denialRuleId: data.denialRuleId,
            denialSource: data.denialSource || null,
            rulesEvaluated: JSON.stringify(data.rulesEvaluated || []),
            balanceBeforeCents: data.balanceBeforeCents,
            metadata: JSON.stringify(data.metadata || {}),
            // AAV fields - enhanced per spec
            aavAgentId: data.aavAgentId || null,
            aavGrantId: data.aavGrantId || null,
            aavCertificateId: data.aavCertificateId || null,
            aavVerificationStatus: data.aavVerificationStatus || null,
            aavVerificationId: data.aavVerificationId || null,
            aavAutonomyLevel: data.aavAutonomyLevel || null,
            aavResult: data.aavResult || null,
            aavDailySpend: data.aavDailySpend || null,
            aavCheckedAt: data.aavCheckedAt || null
        }
    });
}

/**
 * Helper to create audit event
 */
async function createAuditEvent(data) {
    return await prisma.auditEvent.create({
        data: {
            id: generateId('auditEvent'),
            orgId: data.orgId,
            escrowId: data.escrowId,
            eventType: data.eventType,
            actorType: data.actorType,
            actorId: data.actorId,
            details: JSON.stringify(data.details),
            ipAddress: data.ipAddress
        }
    });
}

/**
 * Helper to parse JSON
 */
function parseJson(str, defaultValue) {
    if (!str) return defaultValue;
    if (typeof str !== 'string') return str;
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

/**
 * Format spend request for API response
 */
function formatSpendRequest(sr) {
    return {
        id: sr.id,
        escrow_id: sr.escrowId,
        agent_id: sr.agentId,
        amount_cents: sr.amountCents,
        currency: sr.currency,
        vendor: sr.vendor,
        category: sr.category,
        description: sr.description,
        idempotency_key: sr.idempotencyKey,
        status: sr.status,
        resolved_at: sr.resolvedAt,
        resolved_by: sr.resolvedBy,
        denial_reason: sr.denialReason,
        denial_rule_id: sr.denialRuleId,
        denial_source: sr.denialSource,
        rules_evaluated: parseJson(sr.rulesEvaluated, []),
        balance_before_cents: sr.balanceBeforeCents,
        balance_after_cents: sr.balanceAfterCents,
        // AAV fields
        aav_agent_id: sr.aavAgentId,
        aav_grant_id: sr.aavGrantId,
        aav_verification_status: sr.aavVerificationStatus,
        metadata: parseJson(sr.metadata, {}),
        created_at: sr.createdAt
    };
}

module.exports = router;
