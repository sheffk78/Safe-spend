/**
 * Admin Organizations Routes
 * View and manage all client organizations
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin, requireAdminRole, ADMIN_JWT_SECRET } = require('../middleware/admin-auth');
const { logger } = require('../lib/logger');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require admin auth
router.use(requireAdmin);

/**
 * GET /admin/orgs
 * List all organizations with key metrics
 */
router.get('/', async (req, res) => {
    try {
        const { search, sortBy = 'createdAt', sortOrder = 'desc', limit = 50, offset = 0 } = req.query;

        // Build where clause for search
        const where = search ? {
            OR: [
                { name: { contains: search } },
                { email: { contains: search } }
            ]
        } : {};

        // Get organizations with related data
        const orgs = await prisma.organization.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            take: parseInt(limit),
            skip: parseInt(offset),
            include: {
                _count: {
                    select: {
                        escrowAccounts: true,
                        spendingPolicies: true,
                        apiKeys: true
                    }
                }
            }
        });

        // Get additional metrics for each org
        const orgsWithMetrics = await Promise.all(orgs.map(async (org) => {
            // Get 30-day volume
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const volumeResult = await prisma.spendRequest.aggregate({
                where: {
                    orgId: org.id,
                    status: 'approved',
                    createdAt: { gte: thirtyDaysAgo }
                },
                _sum: { amountCents: true }
            });

            // Get last activity
            const lastSpend = await prisma.spendRequest.findFirst({
                where: { orgId: org.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            });

            // Get total balance across all escrows
            const balanceResult = await prisma.escrowAccount.aggregate({
                where: { orgId: org.id, status: 'active' },
                _sum: { balanceCents: true }
            });

            // Count active policies
            const activePolicies = await prisma.spendingPolicy.count({
                where: { orgId: org.id, isActive: true }
            });

            return {
                id: org.id,
                name: org.name,
                email: org.email,
                createdAt: org.createdAt,
                updatedAt: org.updatedAt,
                escrowCount: org._count.escrowAccounts,
                policyCount: org._count.spendingPolicies,
                activePolicyCount: activePolicies,
                apiKeyCount: org._count.apiKeys,
                totalBalanceCents: balanceResult._sum.balanceCents || 0,
                volume30DaysCents: volumeResult._sum.amountCents || 0,
                lastActivityAt: lastSpend?.createdAt || org.createdAt
            };
        }));

        // Get total count for pagination
        const totalCount = await prisma.organization.count({ where });

        logger.info({
            admin_id: req.admin.id,
            count: orgsWithMetrics.length,
            request_id: req.requestId
        }, 'Admin listed organizations');

        res.json({
            data: orgsWithMetrics,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + orgsWithMetrics.length < totalCount
            }
        });
    } catch (error) {
        logger.error({ error: error.message, request_id: req.requestId }, 'Failed to list organizations');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to list organizations',
            request_id: req.requestId
        });
    }
});

/**
 * GET /admin/orgs/:orgId
 * Get detailed view of a single organization
 */
router.get('/:orgId', async (req, res) => {
    try {
        const { orgId } = req.params;

        // Get organization
        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Organization not found',
                request_id: req.requestId
            });
        }

        // Get escrow accounts
        const escrows = await prisma.escrowAccount.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' }
        });

        // Get policies
        const policies = await prisma.spendingPolicy.findMany({
            where: { orgId },
            orderBy: { updatedAt: 'desc' },
            include: {
                escrowAccount: { select: { name: true } }
            }
        });

        // Get recent transactions (last 10)
        const recentTransactions = await prisma.spendRequest.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                amountCents: true,
                currency: true,
                vendor: true,
                category: true,
                status: true,
                createdAt: true
            }
        });

        // Get recent audit events (last 10)
        const recentAuditEvents = await prisma.auditEvent.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Get 30-day volume
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const volumeResult = await prisma.spendRequest.aggregate({
            where: {
                orgId,
                status: 'approved',
                createdAt: { gte: thirtyDaysAgo }
            },
            _sum: { amountCents: true },
            _count: true
        });

        // Get total stats
        const totalStats = await prisma.spendRequest.groupBy({
            by: ['status'],
            where: { orgId },
            _count: true,
            _sum: { amountCents: true }
        });

        // API keys (without hashes)
        const apiKeys = await prisma.apiKey.findMany({
            where: { orgId },
            select: {
                id: true,
                keyPrefix: true,
                keyType: true,
                label: true,
                isActive: true,
                lastUsedAt: true,
                createdAt: true
            }
        });

        logger.info({
            admin_id: req.admin.id,
            org_id: orgId,
            request_id: req.requestId
        }, 'Admin viewed organization detail');

        res.json({
            organization: {
                id: org.id,
                name: org.name,
                email: org.email,
                stripeCustomerId: org.stripeCustomerId,
                createdAt: org.createdAt,
                updatedAt: org.updatedAt
            },
            escrows: escrows.map(e => ({
                id: e.id,
                name: e.name,
                balanceCents: e.balanceCents,
                currency: e.currency,
                status: e.status,
                totalFundedCents: e.totalFundedCents,
                totalSpentCents: e.totalSpentCents,
                totalDeniedCents: e.totalDeniedCents,
                createdAt: e.createdAt
            })),
            policies: policies.map(p => ({
                id: p.id,
                name: p.name,
                escrowName: p.escrowAccount.name,
                escrowId: p.escrowId,
                isActive: p.isActive,
                updatedAt: p.updatedAt
            })),
            apiKeys,
            recentTransactions,
            recentAuditEvents: recentAuditEvents.map(e => ({
                id: e.id,
                eventType: e.eventType,
                actorType: e.actorType,
                actorId: e.actorId,
                createdAt: e.createdAt,
                details: JSON.parse(e.details || '{}')
            })),
            metrics: {
                volume30DaysCents: volumeResult._sum.amountCents || 0,
                transactions30Days: volumeResult._count || 0,
                statusBreakdown: totalStats.reduce((acc, s) => {
                    acc[s.status] = {
                        count: s._count,
                        amountCents: s._sum.amountCents || 0
                    };
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        logger.error({ error: error.message, org_id: req.params.orgId, request_id: req.requestId }, 'Failed to get organization detail');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to get organization details',
            request_id: req.requestId
        });
    }
});

/**
 * POST /admin/orgs/:orgId/impersonate
 * Generate an impersonation token to access org dashboard
 */
router.post('/:orgId/impersonate', requireAdminRole(['superadmin', 'support']), async (req, res) => {
    try {
        const { orgId } = req.params;

        // Verify org exists
        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return res.status(404).json({
                error: 'not_found',
                message: 'Organization not found',
                request_id: req.requestId
            });
        }

        // Generate impersonation JWT (short-lived, 2 hours)
        const impersonationToken = jwt.sign(
            {
                org_id: org.id,
                email: org.email,
                impersonation: true,
                impersonated_by_admin_id: req.admin.id,
                impersonated_by_admin_email: req.admin.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Log impersonation
        await prisma.auditEvent.create({
            data: {
                orgId: org.id,
                eventType: 'admin_impersonation_started',
                actorType: 'admin',
                actorId: req.admin.id,
                details: JSON.stringify({
                    admin_email: req.admin.email,
                    admin_role: req.admin.role
                }),
                ipAddress: req.ip
            }
        });

        logger.warn({
            admin_id: req.admin.id,
            admin_email: req.admin.email,
            org_id: org.id,
            org_name: org.name,
            request_id: req.requestId
        }, 'Admin started impersonation');

        res.json({
            token: impersonationToken,
            organization: {
                id: org.id,
                name: org.name,
                email: org.email
            },
            expiresIn: '2h'
        });
    } catch (error) {
        logger.error({ error: error.message, org_id: req.params.orgId, request_id: req.requestId }, 'Failed to create impersonation token');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to create impersonation token',
            request_id: req.requestId
        });
    }
});

/**
 * GET /admin/stats
 * Get high-level platform stats
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            totalOrgs,
            activeOrgs,
            totalEscrows,
            totalPolicies,
            totalVolume30Days,
            totalBalance
        ] = await Promise.all([
            prisma.organization.count(),
            prisma.organization.count({
                where: {
                    spendRequests: {
                        some: { createdAt: { gte: thirtyDaysAgo } }
                    }
                }
            }),
            prisma.escrowAccount.count(),
            prisma.spendingPolicy.count({ where: { isActive: true } }),
            prisma.spendRequest.aggregate({
                where: { status: 'approved', createdAt: { gte: thirtyDaysAgo } },
                _sum: { amountCents: true }
            }),
            prisma.escrowAccount.aggregate({
                where: { status: 'active' },
                _sum: { balanceCents: true }
            })
        ]);

        res.json({
            totalOrganizations: totalOrgs,
            activeOrganizations30Days: activeOrgs,
            totalEscrowAccounts: totalEscrows,
            totalActivePolicies: totalPolicies,
            volume30DaysCents: totalVolume30Days._sum.amountCents || 0,
            totalBalanceCents: totalBalance._sum.balanceCents || 0
        });
    } catch (error) {
        logger.error({ error: error.message, request_id: req.requestId }, 'Failed to get platform stats');
        res.status(500).json({
            error: 'internal_server_error',
            message: 'Failed to get platform stats',
            request_id: req.requestId
        });
    }
});

module.exports = router;
