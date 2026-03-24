const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/admin-auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/analytics/overview
 * Get high-level platform statistics
 */
router.get('/overview', requireAdmin, async (req, res) => {
    try {
        const [
            totalOrgs,
            totalEscrows,
            totalSpendRequests,
            totalApprovals,
            activeEscrows,
            pendingApprovals
        ] = await Promise.all([
            prisma.organization.count(),
            prisma.escrowAccount.count(),
            prisma.spendRequest.count(),
            prisma.approval.count(),
            prisma.escrowAccount.count({ where: { status: 'active' } }),
            prisma.approval.count({ where: { status: 'pending' } })
        ]);

        // Calculate totals
        const escrowStats = await prisma.escrowAccount.aggregate({
            _sum: {
                balanceCents: true,
                totalFundedCents: true,
                totalSpentCents: true
            }
        });

        res.json({
            organizations: {
                total: totalOrgs
            },
            escrow_accounts: {
                total: totalEscrows,
                active: activeEscrows,
                total_balance_cents: escrowStats._sum.balanceCents || 0,
                total_funded_cents: escrowStats._sum.totalFundedCents || 0,
                total_spent_cents: escrowStats._sum.totalSpentCents || 0
            },
            spend_requests: {
                total: totalSpendRequests
            },
            approvals: {
                total: totalApprovals,
                pending: pendingApprovals
            }
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
});

/**
 * GET /api/admin/analytics/spending-trends
 * Get spending trends over time (last 30 days by default)
 */
router.get('/spending-trends', requireAdmin, async (req, res) => {
    try {
        const { days = 30, org_id } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const where = {
            createdAt: { gte: startDate }
        };
        if (org_id) where.orgId = org_id;

        // Get daily spend data
        const spendRequests = await prisma.spendRequest.findMany({
            where,
            select: {
                createdAt: true,
                amountCents: true,
                status: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by date
        const dailyData = {};
        spendRequests.forEach(sr => {
            const date = sr.createdAt.toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = {
                    date,
                    total_requests: 0,
                    approved_cents: 0,
                    denied_cents: 0,
                    pending_cents: 0,
                    approved_count: 0,
                    denied_count: 0,
                    pending_count: 0
                };
            }
            dailyData[date].total_requests++;
            if (sr.status === 'approved') {
                dailyData[date].approved_cents += sr.amountCents;
                dailyData[date].approved_count++;
            } else if (sr.status === 'denied') {
                dailyData[date].denied_cents += sr.amountCents;
                dailyData[date].denied_count++;
            } else if (sr.status === 'pending') {
                dailyData[date].pending_cents += sr.amountCents;
                dailyData[date].pending_count++;
            }
        });

        // Fill in missing dates
        const result = [];
        const current = new Date(startDate);
        const today = new Date();
        while (current <= today) {
            const dateStr = current.toISOString().split('T')[0];
            result.push(dailyData[dateStr] || {
                date: dateStr,
                total_requests: 0,
                approved_cents: 0,
                denied_cents: 0,
                pending_cents: 0,
                approved_count: 0,
                denied_count: 0,
                pending_count: 0
            });
            current.setDate(current.getDate() + 1);
        }

        res.json({ data: result, period_days: parseInt(days) });
    } catch (error) {
        console.error('Spending trends error:', error);
        res.status(500).json({ error: 'Failed to fetch spending trends' });
    }
});

/**
 * GET /api/admin/analytics/approval-rates
 * Get approval/denial rates breakdown
 */
router.get('/approval-rates', requireAdmin, async (req, res) => {
    try {
        const { days = 30, org_id } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const where = {
            createdAt: { gte: startDate }
        };
        if (org_id) where.orgId = org_id;

        const statusCounts = await prisma.spendRequest.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
            _sum: { amountCents: true }
        });

        const result = {
            approved: { count: 0, amount_cents: 0 },
            denied: { count: 0, amount_cents: 0 },
            pending: { count: 0, amount_cents: 0 },
            expired: { count: 0, amount_cents: 0 },
            cancelled: { count: 0, amount_cents: 0 }
        };

        statusCounts.forEach(sc => {
            if (result[sc.status]) {
                result[sc.status].count = sc._count.id;
                result[sc.status].amount_cents = sc._sum.amountCents || 0;
            }
        });

        const total = Object.values(result).reduce((sum, v) => sum + v.count, 0);
        
        res.json({
            data: result,
            total_requests: total,
            approval_rate: total > 0 ? (result.approved.count / total * 100).toFixed(1) : 0,
            denial_rate: total > 0 ? (result.denied.count / total * 100).toFixed(1) : 0,
            period_days: parseInt(days)
        });
    } catch (error) {
        console.error('Approval rates error:', error);
        res.status(500).json({ error: 'Failed to fetch approval rates' });
    }
});

/**
 * GET /api/admin/analytics/top-vendors
 * Get top vendors by spend amount
 */
router.get('/top-vendors', requireAdmin, async (req, res) => {
    try {
        const { days = 30, limit = 10, org_id } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const where = {
            createdAt: { gte: startDate },
            status: 'approved'
        };
        if (org_id) where.orgId = org_id;

        const vendorStats = await prisma.spendRequest.groupBy({
            by: ['vendor'],
            where,
            _count: { id: true },
            _sum: { amountCents: true },
            orderBy: { _sum: { amountCents: 'desc' } },
            take: parseInt(limit)
        });

        const result = vendorStats.map(vs => ({
            vendor: vs.vendor,
            transaction_count: vs._count.id,
            total_spent_cents: vs._sum.amountCents || 0
        }));

        res.json({ data: result, period_days: parseInt(days) });
    } catch (error) {
        console.error('Top vendors error:', error);
        res.status(500).json({ error: 'Failed to fetch top vendors' });
    }
});

/**
 * GET /api/admin/analytics/top-categories
 * Get top categories by spend amount
 */
router.get('/top-categories', requireAdmin, async (req, res) => {
    try {
        const { days = 30, limit = 10, org_id } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const where = {
            createdAt: { gte: startDate },
            status: 'approved',
            category: { not: null }
        };
        if (org_id) where.orgId = org_id;

        const categoryStats = await prisma.spendRequest.groupBy({
            by: ['category'],
            where,
            _count: { id: true },
            _sum: { amountCents: true },
            orderBy: { _sum: { amountCents: 'desc' } },
            take: parseInt(limit)
        });

        const result = categoryStats.map(cs => ({
            category: cs.category || 'uncategorized',
            transaction_count: cs._count.id,
            total_spent_cents: cs._sum.amountCents || 0
        }));

        res.json({ data: result, period_days: parseInt(days) });
    } catch (error) {
        console.error('Top categories error:', error);
        res.status(500).json({ error: 'Failed to fetch top categories' });
    }
});

/**
 * GET /api/admin/analytics/escrow-balances
 * Get escrow balance distribution
 */
router.get('/escrow-balances', requireAdmin, async (req, res) => {
    try {
        const { org_id } = req.query;

        const where = {};
        if (org_id) where.orgId = org_id;

        const escrows = await prisma.escrowAccount.findMany({
            where,
            select: {
                id: true,
                name: true,
                balanceCents: true,
                totalFundedCents: true,
                totalSpentCents: true,
                status: true,
                organization: {
                    select: { name: true }
                }
            },
            orderBy: { balanceCents: 'desc' },
            take: 20
        });

        // Status distribution
        const statusCounts = await prisma.escrowAccount.groupBy({
            by: ['status'],
            where,
            _count: { id: true }
        });

        const statusDistribution = {};
        statusCounts.forEach(sc => {
            statusDistribution[sc.status] = sc._count.id;
        });

        res.json({
            top_escrows: escrows.map(e => ({
                id: e.id,
                name: e.name,
                org_name: e.organization.name,
                balance_cents: e.balanceCents,
                total_funded_cents: e.totalFundedCents,
                total_spent_cents: e.totalSpentCents,
                status: e.status
            })),
            status_distribution: statusDistribution
        });
    } catch (error) {
        console.error('Escrow balances error:', error);
        res.status(500).json({ error: 'Failed to fetch escrow balances' });
    }
});

/**
 * GET /api/admin/analytics/org-activity
 * Get per-organization activity summary
 */
router.get('/org-activity', requireAdmin, async (req, res) => {
    try {
        const { days = 30, limit = 20 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                plan: true,
                createdAt: true,
                _count: {
                    select: {
                        escrowAccounts: true,
                        spendRequests: true,
                        apiKeys: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });

        // Get recent activity counts
        const orgActivity = await Promise.all(orgs.map(async (org) => {
            const recentSpends = await prisma.spendRequest.count({
                where: {
                    orgId: org.id,
                    createdAt: { gte: startDate }
                }
            });

            const approvedAmount = await prisma.spendRequest.aggregate({
                where: {
                    orgId: org.id,
                    status: 'approved',
                    createdAt: { gte: startDate }
                },
                _sum: { amountCents: true }
            });

            return {
                id: org.id,
                name: org.name,
                plan: org.plan,
                created_at: org.createdAt,
                escrow_count: org._count.escrowAccounts,
                total_spend_requests: org._count.spendRequests,
                api_key_count: org._count.apiKeys,
                recent_spend_requests: recentSpends,
                recent_approved_cents: approvedAmount._sum.amountCents || 0
            };
        }));

        res.json({ data: orgActivity, period_days: parseInt(days) });
    } catch (error) {
        console.error('Org activity error:', error);
        res.status(500).json({ error: 'Failed to fetch org activity' });
    }
});

module.exports = router;
