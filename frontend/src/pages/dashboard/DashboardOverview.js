import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { TrendingUp, TrendingDown, DollarSign, Shield, Clock, Key, ArrowRight } from 'lucide-react';

const DashboardOverview = () => {
    // Placeholder data
    const stats = {
        totalEscrowed: '$5,450.00',
        spentToday: '$127.50',
        remaining: '$5,322.50',
        trend: '+12.5%'
    };

    const recentTransactions = [
        {
            id: 'spr_abc123',
            time: '2 min ago',
            agent: 'marketing-agent',
            amount: '$49.99',
            vendor: 'Google Ads',
            status: 'Approved'
        },
        {
            id: 'spr_def456',
            time: '15 min ago',
            agent: 'research-agent',
            amount: '$12.00',
            vendor: 'Anthropic',
            status: 'Approved'
        },
        {
            id: 'spr_ghi789',
            time: '1 hr ago',
            agent: 'marketing-agent',
            amount: '$150.00',
            vendor: 'Unknown',
            status: 'Denied'
        },
        {
            id: 'spr_jkl012',
            time: '2 hrs ago',
            agent: 'dev-agent',
            amount: '$75.00',
            vendor: 'AWS',
            status: 'Pending'
        },
        {
            id: 'spr_mno345',
            time: '3 hrs ago',
            agent: 'marketing-agent',
            amount: '$25.00',
            vendor: 'Meta Ads',
            status: 'Approved'
        }
    ];

    return (
        <div className="space-y-8" data-testid="dashboard-overview">
            {/* Header */}
            <div>
                <h1 className="font-heading text-2xl font-bold text-ss-text">Dashboard</h1>
                <p className="text-ss-text-secondary mt-1">Overview of your escrow accounts and activity</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Escrowed */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-total-escrowed">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Total Escrowed</span>
                        <DollarSign className="w-5 h-5 text-ss-accent" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">{stats.totalEscrowed}</p>
                    <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-ss-accent" />
                        <span className="text-sm text-ss-accent">{stats.trend}</span>
                        <span className="text-ss-text-tertiary text-sm ml-1">vs last month</span>
                    </div>
                </div>

                {/* Spent Today */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-spent-today">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Spent Today</span>
                        <TrendingDown className="w-5 h-5 text-ss-warning" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">{stats.spentToday}</p>
                    <p className="text-ss-text-tertiary text-sm mt-2">Across 5 transactions</p>
                </div>

                {/* Active Rules */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-active-rules">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Active Rules</span>
                        <Shield className="w-5 h-5 text-ss-accent" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">3</p>
                    <p className="text-ss-text-tertiary text-sm mt-2">Across 2 escrow accounts</p>
                </div>

                {/* Pending Approvals */}
                <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="stat-pending-approvals">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-ss-text-tertiary text-sm">Pending Approvals</span>
                        <Clock className="w-5 h-5 text-ss-warning" />
                    </div>
                    <p className="text-2xl font-bold text-ss-text font-heading">1</p>
                    <p className="text-ss-text-tertiary text-sm mt-2">Requires your attention</p>
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
                                    <DollarSign className="w-5 h-5 text-ss-accent" />
                                </div>
                                <span className="text-ss-text font-medium">Fund Account</span>
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
                                <span className="text-ss-text font-medium">Create Rule</span>
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
                                <span className="text-ss-text font-medium">View API Keys</span>
                            </div>
                            <ArrowRight className="w-5 h-5 text-ss-text-tertiary group-hover:text-ss-text transition-colors" />
                        </Link>
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
                    <div className="space-y-3">
                        {recentTransactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-ss-elevated"
                                data-testid={`transaction-${tx.id}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="text-ss-text font-medium">{tx.vendor}</p>
                                        <p className="text-ss-text-tertiary text-xs">{tx.agent} · {tx.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-ss-text font-mono font-semibold">{tx.amount}</span>
                                    <StatusBadge status={tx.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
