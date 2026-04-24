const prisma = require('../lib/prisma.js');
/**
 * ARL (Agent Reputation Ledger) Service
 * 
 * Handles outcome reporting to ARL after spends and reputation checks.
 * All ARL calls are async and fire-and-forget — they never block spend responses.
 */

const { logger } = require('../lib/logger');

const ARL_API_URL = process.env.ARL_API_URL || 'https://repledger.agentictrust.app';
const ARL_API_KEY = process.env.ARL_API_KEY || '';
const ARL_ENABLED = process.env.ARL_ENABLED === 'true';
const ARL_TIMEOUT_MS = 5000;

/**
 * Report a spend outcome to ARL (async, fire-and-forget)
 * 
 * @param {string} agentId - agt_ format
 * @param {'success'|'failure'|'timeout'} result
 * @param {string} taskType - e.g. safe_spend:approved, safe_spend:denied:balance_check
 */
async function reportOutcome(agentId, result, taskType) {
    if (!ARL_ENABLED || !ARL_API_KEY || !agentId) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ARL_TIMEOUT_MS);

        const response = await fetch(
            `${ARL_API_URL}/api/v1/agents/${encodeURIComponent(agentId)}/outcomes`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ARL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    result,
                    task_type: taskType,
                    submitter_type: 'operator'
                }),
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn({ status: response.status, agentId, taskType }, 'ARL outcome report failed');
        } else {
            logger.info({ agentId, result, taskType }, 'ARL outcome reported');
        }
    } catch (error) {
        logger.warn({ error: error.message, agentId, taskType }, 'ARL outcome report error');
    }
}

/**
 * Report spend approved to ARL
 */
function reportSpendApproved(agentId) {
    reportOutcome(agentId, 'success', 'safe_spend:approved').catch((err) => {
        logger.warn({ error: err?.message, agentId }, 'ARL reportSpendApproved failed');
    });
}

/**
 * Report spend denied to ARL with the denying rule
 */
function reportSpendDenied(agentId, denyingRule) {
    const taskType = `safe_spend:denied:${denyingRule || 'unknown'}`;
    reportOutcome(agentId, 'failure', taskType).catch((err) => {
        logger.warn({ error: err?.message, agentId, denyingRule }, 'ARL reportSpendDenied failed');
    });
}

/**
 * Report spend expired to ARL
 */
function reportSpendExpired(agentId) {
    reportOutcome(agentId, 'timeout', 'safe_spend:expired').catch((err) => {
        logger.warn({ error: err?.message, agentId }, 'ARL reportSpendExpired failed');
    });
}

/**
 * Fetch agent reputation score from ARL
 * 
 * @param {string} agentId - agt_ format
 * @returns {Promise<{score: number, tier: string}|null>}
 */
async function getReputationScore(agentId) {
    if (!ARL_ENABLED || !ARL_API_KEY || !agentId) return null;

    // Check cache first
    try {
        const cached = await prisma.reputationCache.findUnique({
            where: { agentId }
        });
        // Cache valid for 5 minutes
        if (cached && (Date.now() - cached.lastCheckedAt.getTime()) < 5 * 60 * 1000) {
            return { score: cached.score, tier: cached.tier };
        }
    } catch {
        // Cache miss, continue to API
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ARL_TIMEOUT_MS);

        const response = await fetch(
            `${ARL_API_URL}/api/v1/agents/${encodeURIComponent(agentId)}/score`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${ARL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn({ status: response.status, agentId }, 'ARL score fetch failed');
            return null;
        }

        const data = await response.json();
        const score = data.score ?? data.reputation_score ?? null;
        const tier = data.tier ?? getTierFromScore(score);

        if (score !== null) {
            // Update cache
            await prisma.reputationCache.upsert({
                where: { agentId },
                update: { score, tier, lastCheckedAt: new Date() },
                create: {
                    agentId,
                    score,
                    tier,
                    lastCheckedAt: new Date()
                }
            }).catch(() => {});
        }

        return { score, tier };
    } catch (error) {
        logger.warn({ error: error.message, agentId }, 'ARL score fetch error');
        return null;
    }
}

/**
 * Update cached reputation score (called from internal events)
 */
async function updateCachedScore(agentId, score) {
    const tier = getTierFromScore(score);
    try {
        await prisma.reputationCache.upsert({
            where: { agentId },
            update: { score, tier, lastCheckedAt: new Date() },
            create: { agentId, score, tier, lastCheckedAt: new Date() }
        });
    } catch (error) {
        logger.warn({ error: error.message, agentId }, 'Failed to update reputation cache');
    }
}

/**
 * Get tier name from score
 */
function getTierFromScore(score) {
    if (score === null || score === undefined) return null;
    if (score >= 90) return 'platinum';
    if (score >= 75) return 'gold';
    if (score >= 50) return 'silver';
    return 'bronze';
}

module.exports = {
    reportSpendApproved,
    reportSpendDenied,
    reportSpendExpired,
    getReputationScore,
    updateCachedScore,
    getTierFromScore,
    ARL_ENABLED
};
