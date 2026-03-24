const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { hashApiKey } = require('../utils/ids');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate with JWT (org session from dashboard)
 */
async function requireOrgAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const token = authHeader.substring(7);
        
        // Check if it's an API key (starts with sk_)
        if (token.startsWith('sk_')) {
            return res.status(401).json({ error: 'API key not allowed for this endpoint. Use JWT token.' });
        }
        
        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Load organization
        const org = await prisma.organization.findUnique({
            where: { id: decoded.org_id }
        });
        
        if (!org) {
            return res.status(401).json({ error: 'Organization not found' });
        }
        
        req.org = org;
        req.authType = 'jwt';
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Middleware to authenticate with API key
 * Supports both "Authorization: Bearer sk_xxx" and "X-API-Key: sk_xxx" headers
 */
async function requireApiKeyAuth(req, res, next) {
    try {
        let token = null;
        
        // Check X-API-Key header first (preferred for API keys)
        if (req.headers['x-api-key']) {
            token = req.headers['x-api-key'];
        } else {
            // Fall back to Authorization: Bearer header
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }
        
        if (!token) {
            return res.status(401).json({ error: 'Missing API key. Use X-API-Key header or Authorization: Bearer header.' });
        }
        
        // Must be an API key
        if (!token.startsWith('sk_')) {
            return res.status(401).json({ error: 'API key required for this endpoint' });
        }
        
        // Hash the key and look it up
        const keyHash = hashApiKey(token);
        
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                keyHash: keyHash,
                isActive: true
            },
            include: {
                organization: true
            }
        });
        
        if (!apiKey) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Update last used
        await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() }
        });
        
        req.org = apiKey.organization;
        req.apiKey = apiKey;
        req.authType = 'api_key';
        next();
    } catch (error) {
        console.error('API Key auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Middleware that accepts either JWT or API key
 * Supports X-API-Key header, Authorization: Bearer sk_xxx, or Authorization: Bearer <JWT>
 */
async function requireAuth(req, res, next) {
    try {
        // Check X-API-Key header first (prioritize API key auth)
        if (req.headers['x-api-key']) {
            return requireApiKeyAuth(req, res, next);
        }
        
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const token = authHeader.substring(7);
        
        // Check if it's an API key
        if (token.startsWith('sk_')) {
            return requireApiKeyAuth(req, res, next);
        } else {
            return requireOrgAuth(req, res, next);
        }
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Middleware to restrict agent keys to specific endpoints
 * Use after requireAuth
 */
function restrictAgentKeys(allowedEndpoints = []) {
    return (req, res, next) => {
        if (req.authType === 'api_key' && req.apiKey.keyType === 'agent') {
            const path = req.path;
            const isAllowed = allowedEndpoints.some(endpoint => {
                if (endpoint.endsWith('*')) {
                    return path.startsWith(endpoint.slice(0, -1));
                }
                return path === endpoint || path.startsWith(endpoint + '/');
            });
            
            if (!isAllowed) {
                return res.status(403).json({ 
                    error: 'Agent keys can only access spend and balance endpoints' 
                });
            }
        }
        next();
    };
}

module.exports = {
    requireAuth,
    requireOrgAuth,
    requireApiKeyAuth,
    restrictAgentKeys,
    prisma
};
