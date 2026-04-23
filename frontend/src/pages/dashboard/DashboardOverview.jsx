import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import QuickStartModal from '@/components/QuickStartModal';
import { TrendingUp, TrendingDown, DollarSign, Shield, Clock, Key, ArrowRight, RefreshCw, Wallet, Rocket } from 'lucide-react';
import {
    listEscrowAccounts,
    listSpendRequests,
    listApprovals,
    listPolicies,
    formatCents
} from '@/lib/api';

const DashboardOverview = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showQuickStart, setShowQuickStart] = useState(false);
    const [stats, setStats] = useState({
        totalEscrowed: 0,
        spentToday: 0,
        activeRules: 0,
        pendingApprovals: 0,
        accountCount: 0
    });
    const [recentTransactions, setRecentTransactions] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [accountsRes, transactionsRes, approvalsRes, policiesRes] = await Promise.all([
                listEscrowAccounts(),
                listSpendRequests({ limit: 5 }),
                listApprovals('pending'),
                listPolicies()
            ]);

            const accounts = accountsRes.data || [];
            const transactions = transactionsRes.data || [];
            const approvals = approvalsRes.data || [];
            const policies = policiesRes.data || [];

            // Calculate stats
            const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance_cents || 0), 0);
            const totalSpentToday = accounts.reduce((sum, acc) => sum + (acc.total_spent_cents || 0), 0);
            const activePolicies = policies.filter(p => p.is_active).length;

            setStats({
                totalEscrowed: totalBalance,
                spentToday: totalSpentToday,
                activeRules: activePolicies,
                pendingApprovals: approvals.length,
                accountCount: accounts.length
            });

            setRecentTransactions(transactions);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        return `${diffDays} days ago`;
    };

    return (
        <div className="space-y-8" data-testid="dashboard-overview">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Dashboard</h1>
                    <p className="text-ss-text-secondary mt-1">Overview of your escrow accounts and activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowQuickStart(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-accent/10 border border-ss-accent/50 hover:bg-ss-accent/20 rounded-lg text-ss-accent font-medium transition-all"
                        data-testid="quickstart-btn"
                    >
                        <Rocket size={16} />
                        Quick Start
                    </button>
                    <button
                        onClick={fetchDashboardData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="refresh-dashboard-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Quick Start Modal */}
            {showQuickStart && (
                <QuickStartModal
                    onClose={() => setShowQuickStart(false)}
                    onSuccess={() => {
                        setShowQuickStart(false);
                        fetchDashboardData();
                    }}
                />
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error">
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Escrowed */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-total-escrowed">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Total Escrowed</span>
                        <DollarSign className="w-5 h-5 text-ss-accent" />
                    </div>
                    <p className="text-2xl font-bold text-ss-accent font-heading">
                        {loading ? '...' : formatCents(stats.totalEscrowed)}
                    </p>
                    <p className="text-ss-text-tertiary text-sm mt-2">
                        Across {stats.accountCount} account{stats.accountCount !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Total Spent */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-spent-today">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Total Spent</span>
                        <TrendingDown className="w-5 h-5 text-ss-warning" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">
                        {loading ? '...' : formatCents(stats.spentToday)}
                    </p>
                    <p className="text-ss-text-tertiary text-sm mt-2">All time</p>
                </div>

                {/* Active Rules */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-active-rules">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Active Rules</span>
                        <Shield className="w-5 h-5 text-ss-accent" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">
                        {loading ? '...' : stats.activeRules}
                    </p>
                    <p className="text-ss-text-tertiary text-sm mt-2">Spending policies</p>
                </div>

                {/* Pending Approvals */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-pending-approvals">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Pending Approvals</span>
                        <Clock className="w-5 h-5 text-ss-warning" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">
                        {loading ? '...' : stats.pendingApprovals}
                    </p>
                    <p className="text-ss-text-tertiary text-sm mt-2">
                        {stats.pendingApprovals > 0 ? 'Requires your attention' : 'All clear'}
                    </p>
                </div>
            </div>

            {/* Quick Actions & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="quick-actions">
                    <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link
                            to="/dashboard/accounts"
                            className="flex items-center justify-between p-3 rounded-lg bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
                            data-testid="quick-action-fund"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-ss-accent" />
                                </div>
                                <span className="text-ss-text font-medium">Manage Accounts</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-ss-text-tertiary group-hover:text-ss-text transition-colors" />
                        </Link>

                        <Link
                            to="/dashboard/rules"
                            className="flex items-center justify-between p-3 rounded-lg bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
                            data-testid="quick-action-create-rule"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-ss-accent" />
                                </div>
                                <span className="text-ss-text font-medium">Spending Rules</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-ss-text-tertiary group-hover:text-ss-text transition-colors" />
                        </Link>

                        <Link
                            to="/dashboard/keys"
                            className="flex items-center justify-between p-3 rounded-lg bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
                            data-testid="quick-action-api-keys"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                                    <Key className="w-5 h-5 text-ss-accent" />
                                </div>
                                <span className="text-ss-text font-medium">API Keys</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-ss-text-tertiary group-hover:text-ss-text transition-colors" />
                        </Link>

                        {stats.pendingApprovals > 0 && (
                            <Link
                                to="/dashboard/approvals"
                                className="flex items-center justify-between p-3 rounded-lg bg-ss-warning/10 hover:bg-ss-warning/20 transition-colors group"
                                data-testid="quick-action-approvals"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-ss-warning/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-ss-warning" />
                                    </div>
                                    <span className="text-ss-warning font-medium">
                                        {stats.pendingApprovals} Pending Approval{stats.pendingApprovals !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-ss-warning/60 group-hover:text-ss-warning transition-colors" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="recent-transactions">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-lg font-semibold text-ss-text">Recent Transactions</h2>
                        <Link to="/dashboard/transactions" className="text-ss-accent hover:text-ss-accent-hover text-sm font-medium transition-colors">
                            View all
                        </Link>
                    </div>
                    
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && recentTransactions.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-ss-text-secondary">No transactions yet</p>
                            <p className="text-ss-text-tertiary text-sm mt-1">Once your agent starts spending, transactions will appear here.</p>
                        </div>
                    )}

                    {!loading && recentTransactions.length > 0 && (
                        <div className="space-y-3">
                            {recentTransactions.map((tx) => (
                                <Link
                                    key={tx.id}
                                    to={`/dashboard/transactions/${tx.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg bg-ss-elevated hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                                    data-testid={`transaction-${tx.id}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-ss-text font-medium">{tx.vendor}</p>
                                            <p className="text-ss-text-tertiary text-xs">
                                                {tx.category || 'Uncategorized'} · {formatTime(tx.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-ss-text font-mono font-semibold">
                                            {formatCents(tx.amount_cents)}
                                        </span>
                                        <StatusBadge status={tx.status} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
