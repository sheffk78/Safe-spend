/**
 * Admin API Key Service
 * Handles generation and validation of admin API keys for automation (Kit)
 * Supports scope-based access control
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const KEY_PREFIX = 'ss_admin_';

// Valid scopes
const VALID_SCOPES = ['health', 'blog', 'metrics', 'audit', 'keys', '*'];

/**
 * Generate a new admin API key with scopes
 */
async function generateAdminKey({ label, description, scopes = ['*'] }) {
    // Validate scopes
    const invalidScopes = scopes.filter(s => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
        throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }
    
    // Generate random key (32 alphanumeric chars)
    const randomBytes = crypto.randomBytes(24).toString('hex').substring(0, 32);
    const fullKey = `${KEY_PREFIX}${randomBytes}`;
    
    // Hash the key for storage
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    
    // Create display prefix (first 12 chars after prefix + last 4)
    const keyPrefix = `${KEY_PREFIX}${randomBytes.substring(0, 8)}...${randomBytes.slice(-4)}`;
    
    const adminKey = await prisma.adminApiKey.create({
        data: {
            label,
            description,
            keyHash,
            keyPrefix,
            scopes: JSON.stringify(scopes)
        }
    });
    
    return {
        id: adminKey.id,
        key: fullKey, // Only returned once at creation!
        label: adminKey.label,
        description: adminKey.description,
        scopes: JSON.parse(adminKey.scopes),
        key_prefix: keyPrefix,
        created_at: adminKey.createdAt.toISOString()
    };
}

/**
 * Validate an admin API key and check scope
 * Returns the key record if valid and has required scope, null otherwise
 */
async function validateAdminKey(key, requiredScope = null) {
    if (!key || !key.startsWith(KEY_PREFIX)) {
        return null;
    }
    
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    const adminKey = await prisma.adminApiKey.findUnique({
        where: { keyHash }
    });
    
    if (!adminKey || !adminKey.isActive) {
        return null;
    }
    
    // Check scope if required
    if (requiredScope) {
        const scopes = JSON.parse(adminKey.scopes || '[]');
        const hasScope = scopes.includes('*') || scopes.includes(requiredScope);
        if (!hasScope) {
            return { error: 'INSUFFICIENT_SCOPE', requiredScope, adminKey };
        }
    }
    
    // Update last used timestamp
    await prisma.adminApiKey.update({
        where: { id: adminKey.id },
        data: { lastUsedAt: new Date() }
    });
    
    return {
        id: adminKey.id,
        label: adminKey.label,
        scopes: JSON.parse(adminKey.scopes),
        key_prefix: adminKey.keyPrefix
    };
}

/**
 * List all admin API keys (without secrets)
 */
async function listAdminKeys() {
    const keys = await prisma.adminApiKey.findMany({
        orderBy: { createdAt: 'desc' }
    });
    
    return keys.map(key => ({
        id: key.id,
        label: key.label,
        description: key.description,
        scopes: JSON.parse(key.scopes || '[]'),
        key_prefix: key.keyPrefix,
        is_active: key.isActive,
        last_used_at: key.lastUsedAt?.toISOString() || null,
        created_at: key.createdAt.toISOString()
    }));
}

/**
 * Revoke (deactivate) an admin API key
 */
async function revokeAdminKey(keyId) {
    const key = await prisma.adminApiKey.update({
        where: { id: keyId },
        data: { isActive: false }
    });
    
    return {
        id: key.id,
        label: key.label,
        is_active: key.isActive,
        revoked_at: new Date().toISOString()
    };
}

/**
 * Delete an admin API key permanently
 */
async function deleteAdminKey(keyId) {
    await prisma.adminApiKey.delete({
        where: { id: keyId }
    });
    
    return { deleted: true };
}

/**
 * Count admin keys (for bootstrap check)
 */
async function countAdminKeys() {
    return await prisma.adminApiKey.count();
}

/**
 * Check if any admin keys exist
 */
async function hasAdminKeys() {
    const count = await countAdminKeys();
    return count > 0;
}

module.exports = {
    generateAdminKey,
    validateAdminKey,
    listAdminKeys,
    revokeAdminKey,
    deleteAdminKey,
    countAdminKeys,
    hasAdminKeys,
    KEY_PREFIX,
    VALID_SCOPES
};
