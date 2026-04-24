const crypto = require('crypto');

/**
 * ID Prefixes following Safe-Spend convention
 */
const ID_PREFIXES = {
    organization: 'org_',
    apiKey: 'key_',
    escrowAccount: 'esc_',
    spendingPolicy: 'pol_',
    spendRequest: 'spr_',
    approval: 'apr_',
    auditEvent: 'evt_',
    webhook: 'whk_',
    webhookDelivery: 'dlv_',
    event: 'evt_',
    orgMember: 'mbr_',
    agentCertificate: 'acrt_',
    crossToolEvent: 'evt_at_',
    reputationCache: 'rep_'
};

/**
 * Generate a random alphanumeric string
 * @param {number} length - Length of the string
 * @returns {string}
 */
function generateRandomString(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    return result;
}

/**
 * Generate a prefixed ID
 * @param {string} type - The type of entity
 * @returns {string}
 */
function generateId(type) {
    const prefix = ID_PREFIXES[type];
    if (!prefix) {
        throw new Error(`Unknown ID type: ${type}`);
    }
    return `${prefix}${generateRandomString(12)}`;
}

/**
 * Generate an API key with proper prefix
 * @param {string} keyType - 'live' | 'test' | 'agent'
 * @returns {{ fullKey: string, keyHash: string, keyPrefix: string }}
 */
function generateApiKey(keyType) {
    const prefixMap = {
        live: 'sk_live_',
        test: 'sk_test_',
        agent: 'sk_agent_'
    };
    
    const prefix = prefixMap[keyType];
    if (!prefix) {
        throw new Error(`Unknown key type: ${keyType}`);
    }
    
    const randomPart = generateRandomString(24);
    const fullKey = `${prefix}${randomPart}`;
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    const keyPrefix = fullKey.substring(0, 12) + '...';
    
    return { fullKey, keyHash, keyPrefix };
}

/**
 * Hash an API key for lookup
 * @param {string} apiKey - The full API key
 * @returns {string}
 */
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a webhook secret
 * @returns {string}
 */
function generateWebhookSecret() {
    return `whsec_${generateRandomString(32)}`;
}

/**
 * Validate agent_id format: agt_ + 24 hex characters
 * @param {string} agentId
 * @returns {boolean}
 */
function validateAgentId(agentId) {
    if (!agentId) return false;
    return /^agt_[0-9a-f]{24}$/.test(agentId);
}

/**
 * Generate a hex string
 * @param {number} length
 * @returns {string}
 */
function generateHex(length = 12) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

module.exports = {
    ID_PREFIXES,
    generateId,
    generateApiKey,
    hashApiKey,
    generateRandomString,
    generateWebhookSecret,
    validateAgentId,
    generateHex
};
