/**
 * AAV (Agent Authority Vault) Service
 * 
 * Handles agent identity verification and authorization for Safe-Spend.
 * Integrates with AAV to validate that requesting agents have proper authority
 * to access escrow accounts and operate under fiduciary policies.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');

/**
 * Extract AAV claims from the request
 * Priority: JWT header > X-AAV headers > request body
 * 
 * @param {Request} req - Express request object
 * @returns {Object} AAV claims { agent_id, grant_id, verified }
 */
function extractAAVClaims(req) {
    // Option 1: AAV-signed JWT in Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('AAV ')) {
        const token = authHeader.slice(4);
        try {
            const claims = verifyAAVToken(token, req.aavConfig);
            return { ...claims, verified: true, source: 'jwt' };
        } catch (err) {
            logger.warn({ error: err.message }, 'Invalid AAV JWT token');
            return { verified: false, error: err.message, source: 'jwt' };
        }
    }
    
    // Option 2: Direct headers (for simpler integrations)
    const agentIdHeader = req.headers['x-aav-agent-id'];
    const grantIdHeader = req.headers['x-aav-grant-id'];
    const signatureHeader = req.headers['x-aav-signature'];
    
    if (agentIdHeader) {
        let verified = false;
        
        // Optionally verify signature if provided
        if (signatureHeader && req.aavConfig?.aavPublicKey) {
            try {
                verified = verifyAAVSignature(
                    agentIdHeader, 
                    grantIdHeader, 
                    signatureHeader,
                    req.aavConfig.aavPublicKey
                );
            } catch (err) {
                logger.warn({ error: err.message }, 'Invalid AAV signature');
            }
        }
        
        return {
            agent_id: agentIdHeader,
            grant_id: grantIdHeader || null,
            verified,
            source: 'headers'
        };
    }
    
    // Option 3: Request body fields
    const agentId = req.body?.aav_agent_id;
    const grantId = req.body?.aav_grant_id;
    
    if (agentId) {
        return {
            agent_id: agentId,
            grant_id: grantId || null,
            verified: false,
            source: 'body'
        };
    }
    
    return { agent_id: null, grant_id: null, verified: false, source: 'none' };
}

/**
 * Verify AAV JWT token
 * TODO: Implement actual JWT verification when AAV service is available
 * 
 * @param {string} token - JWT token
 * @param {Object} config - AAV configuration
 * @returns {Object} Decoded claims
 */
function verifyAAVToken(token, config) {
    // For now, we'll implement a simple decode without verification
    // In production, this should verify against AAV's public key
    
    if (!config?.aavPublicKey) {
        throw new Error('AAV public key not configured');
    }
    
    try {
        // Decode JWT (without verification for now)
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        // Check expiration
        if (payload.exp && payload.exp < Date.now() / 1000) {
            throw new Error('Token expired');
        }
        
        return {
            agent_id: payload.agent_id || payload.sub,
            grant_id: payload.grant_id,
            permissions: payload.permissions || [],
            exp: payload.exp
        };
    } catch (err) {
        throw new Error(`JWT decode failed: ${err.message}`);
    }
}

/**
 * Verify AAV signature on headers
 * TODO: Implement actual HMAC/RSA verification when AAV service is available
 * 
 * @param {string} agentId - Agent ID
 * @param {string} grantId - Grant ID (optional)
 * @param {string} signature - Signature to verify
 * @param {string} publicKey - AAV public key
 * @returns {boolean} Whether signature is valid
 */
function verifyAAVSignature(agentId, grantId, signature, publicKey) {
    // TODO: Implement actual signature verification
    // For now, accept any signature with the correct format
    return signature && signature.length > 10;
}

/**
 * Check if agent is authorized to use escrow/policy
 * 
 * @param {string} agentId - Agent ID from AAV
 * @param {string} grantId - Grant ID from AAV
 * @param {Object} escrow - Escrow account record
 * @param {Array} policies - Active spending policies
 * @returns {Object} { authorized, reason, matchedOn }
 */
function checkAgentAuthorization(agentId, grantId, escrow, policies) {
    if (!agentId && !grantId) {
        return {
            authorized: false,
            reason: 'No agent identity provided',
            matchedOn: null
        };
    }
    
    // Check escrow-level authorization
    const escrowAgents = safeParseJSON(escrow.authorizedAgentIds, []);
    const escrowGrants = safeParseJSON(escrow.aavGrantIds, []);
    
    if (agentId && escrowAgents.includes(agentId)) {
        return {
            authorized: true,
            reason: `Agent '${agentId}' authorized at escrow level`,
            matchedOn: 'escrow_agent_id'
        };
    }
    
    if (grantId && escrowGrants.includes(grantId)) {
        return {
            authorized: true,
            reason: `Grant '${grantId}' authorized at escrow level`,
            matchedOn: 'escrow_grant_id'
        };
    }
    
    // Check policy-level authorization (any matching policy grants access)
    for (const policy of policies) {
        if (!policy.isActive || policy.status !== 'active') continue;
        if (!policy.aavEnabled) continue;
        
        const policyAgents = safeParseJSON(policy.authorizedAgentIds, []);
        const policyGrants = safeParseJSON(policy.aavGrantIds, []);
        
        if (agentId && policyAgents.includes(agentId)) {
            return {
                authorized: true,
                reason: `Agent '${agentId}' authorized by policy '${policy.name}'`,
                matchedOn: 'policy_agent_id',
                policyId: policy.id
            };
        }
        
        if (grantId && policyGrants.includes(grantId)) {
            return {
                authorized: true,
                reason: `Grant '${grantId}' authorized by policy '${policy.name}'`,
                matchedOn: 'policy_grant_id',
                policyId: policy.id
            };
        }
    }
    
    return {
        authorized: false,
        reason: `Agent '${agentId || 'unknown'}' not in authorized list`,
        matchedOn: null,
        authorizedAgents: escrowAgents,
        authorizedGrants: escrowGrants
    };
}

/**
 * Get effective enforcement mode
 * Policy-level overrides escrow-level if explicitly set
 * 
 * @param {Object} escrow - Escrow account
 * @param {Array} policies - Active policies
 * @returns {string} Enforcement mode: none | warn | strict
 */
function getEffectiveEnforcementMode(escrow, policies) {
    // Check if any policy has explicit enforcement mode
    for (const policy of policies) {
        if (!policy.isActive || policy.status !== 'active') continue;
        if (policy.aavEnforcementMode) {
            return policy.aavEnforcementMode;
        }
    }
    
    // Fall back to escrow-level
    return escrow.aavEnforcementMode || 'none';
}

/**
 * Load AAV configuration for an organization
 * 
 * @param {string} orgId - Organization ID
 * @returns {Object|null} AAV configuration or null
 */
async function getAAVConfiguration(orgId) {
    try {
        const config = await prisma.aAVConfiguration.findUnique({
            where: { orgId }
        });
        return config;
    } catch (err) {
        logger.error({ orgId, error: err.message }, 'Failed to load AAV configuration');
        return null;
    }
}

/**
 * Create or update AAV configuration for an organization
 * 
 * @param {string} orgId - Organization ID
 * @param {Object} data - Configuration data
 * @returns {Object} Updated configuration
 */
async function upsertAAVConfiguration(orgId, data) {
    const config = await prisma.aAVConfiguration.upsert({
        where: { orgId },
        create: {
            orgId,
            aavEndpoint: data.aav_endpoint,
            aavPublicKey: data.aav_public_key,
            aavApiKey: data.aav_api_key,
            defaultEnforcementMode: data.default_enforcement_mode || 'none',
            isConfigured: !!(data.aav_endpoint || data.aav_public_key)
        },
        update: {
            aavEndpoint: data.aav_endpoint,
            aavPublicKey: data.aav_public_key,
            aavApiKey: data.aav_api_key !== undefined ? data.aav_api_key : undefined,
            defaultEnforcementMode: data.default_enforcement_mode,
            isConfigured: !!(data.aav_endpoint || data.aav_public_key),
            lastVerifiedAt: data.verified ? new Date() : undefined
        }
    });
    
    return formatAAVConfiguration(config);
}

/**
 * Format AAV configuration for API response (hide sensitive data)
 */
function formatAAVConfiguration(config) {
    if (!config) return null;
    
    return {
        id: config.id,
        aav_endpoint: config.aavEndpoint,
        aav_public_key: config.aavPublicKey ? '***configured***' : null,
        aav_api_key_set: !!config.aavApiKey,
        default_enforcement_mode: config.defaultEnforcementMode,
        is_configured: config.isConfigured,
        last_verified_at: config.lastVerifiedAt,
        created_at: config.createdAt,
        updated_at: config.updatedAt
    };
}

/**
 * Safe JSON parse with fallback
 */
function safeParseJSON(str, fallback = []) {
    try {
        return JSON.parse(str || '[]');
    } catch {
        return fallback;
    }
}

module.exports = {
    extractAAVClaims,
    verifyAAVToken,
    verifyAAVSignature,
    checkAgentAuthorization,
    getEffectiveEnforcementMode,
    getAAVConfiguration,
    upsertAAVConfiguration,
    formatAAVConfiguration,
    safeParseJSON
};
