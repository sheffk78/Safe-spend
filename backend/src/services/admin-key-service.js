/**
 * Admin API Key Service
 * Handles generation and validation of admin API keys for automation (Kit)
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const KEY_PREFIX = 'ss_admin_';

/**
 * Generate a new admin API key
 */
async function generateAdminKey({ name, description, createdBy }) {
    // Generate random key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const fullKey = `${KEY_PREFIX}${randomBytes}`;
    
    // Hash the key for storage
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    
    // Create short prefix for display (first 8 chars after prefix)
    const keyPrefix = `${KEY_PREFIX}${randomBytes.substring(0, 8)}...`;
    
    const adminKey = await prisma.adminApiKey.create({
        data: {
            name,
            description,
            keyHash,
            keyPrefix,
            createdBy
        }
    });
    
    return {
        key_id: adminKey.id,
        name: adminKey.name,
        description: adminKey.description,
        type: 'admin',
        prefix: keyPrefix,
        secret: fullKey, // Only returned once at creation
        created_at: adminKey.createdAt.toISOString()
    };
}

/**
 * Validate an admin API key
 * Returns the key record if valid, null otherwise
 */
async function validateAdminKey(key) {
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
    
    // Update last used timestamp
    await prisma.adminApiKey.update({
        where: { id: adminKey.id },
        data: { lastUsedAt: new Date() }
    });
    
    return adminKey;
}

/**
 * List all admin API keys
 */
async function listAdminKeys() {
    const keys = await prisma.adminApiKey.findMany({
        orderBy: { createdAt: 'desc' }
    });
    
    return keys.map(key => ({
        key_id: key.id,
        name: key.name,
        description: key.description,
        prefix: key.keyPrefix,
        is_active: key.isActive,
        last_used_at: key.lastUsedAt?.toISOString() || null,
        created_at: key.createdAt.toISOString(),
        created_by: key.createdBy
    }));
}

/**
 * Revoke an admin API key
 */
async function revokeAdminKey(keyId) {
    const key = await prisma.adminApiKey.update({
        where: { id: keyId },
        data: { isActive: false }
    });
    
    return {
        key_id: key.id,
        name: key.name,
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

module.exports = {
    generateAdminKey,
    validateAdminKey,
    listAdminKeys,
    revokeAdminKey,
    deleteAdminKey,
    KEY_PREFIX
};
