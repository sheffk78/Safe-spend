/**
 * Admin Metrics Page
 * Platform-level metrics and statistics
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import {
    ChartPieIcon,
    ArrowPathIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    KeyIcon
} from '@heroicons/react/24/outline';

// Format cents to dollars
const formatCents = (cents) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cents / 100);
};

// Simple bar chart component
const MiniBarChart = ({ data, max }) => {
    if (!data || data.length === 0) return null;
    const maxValue = max || Math.max(...data.map(d => d.value));
    
    return (
        <div className="flex items-end gap-1 h-16">
            {data.map((item, i) => (
                <div 
                    key={i}
                    className="flex-1 bg-[#14B8A6] rounded-t hover:bg-[#2DD4BF] transition-all"
                    style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '2px' }}
                    title={`${item.label}: ${item.value}`}
                />
            ))}
        </div>
    );
};

const AdminMetricsPage = () => {
    const { adminFetch } = useAdmin();
    const [metrics, setMetrics] = useState(null);
    const [stripeMetrics, setStripeMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [metricsRes, stripeRes] = await Promise.all([
                adminFetch('/api/admin/metrics/overview'),
                adminFetch('/api/admin/metrics/stripe')
            ]);

            if (metricsRes.ok) {
                setMetrics(await metricsRes.json());
            }
            if (stripeRes.ok) {
                setStripeMetrics(await stripeRes.json());
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Calculate approval stats
    const approvedRate = parseFloat(metrics?.spend_requests?.approved_rate || 0) * 100;
    const deniedRate = parseFloat(metrics?.spend_requests?.denied_rate || 0) * 100;
    const pendingRate = parseFloat(metrics?.spend_requests?.pending_rate || 0) * 100;

    return (
        <div className="space-y-6" data-testid="admin-metrics-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[#F5F5F5]">Metrics</h1>
                    <p className="text-[#9CA3AF] mt-1">Platform analytics and statistics</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#141416] border border-[rgba(255,255,255,0.06)] hover:bg-[#1A1A1E] rounded-lg text-[#9CA3AF] hover:text-[#F5F5F5] text-sm transition-all disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444]">
                    {error}
                </div>
            )}

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Organizations */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                            <BuildingOfficeIcon className="w-6 h-6 text-[#3B82F6]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                                {metrics?.organizations?.total || 0}
                            </p>
                            <p className="text-xs text-[#6B7280]">Organizations</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">This week</span>
                            <span className="text-[#14B8A6]">+{metrics?.organizations?.created_this_week || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">This month</span>
                            <span className="text-[#9CA3AF]">+{metrics?.organizations?.created_this_month || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Escrow Accounts */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                            <CurrencyDollarIcon className="w-6 h-6 text-[#14B8A6]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                                {formatCents(metrics?.escrow_accounts?.total_balance_cents || 0)}
                            </p>
                            <p className="text-xs text-[#6B7280]">Total Balance</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Active</span>
                            <span className="text-[#14B8A6]">{metrics?.escrow_accounts?.active || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Paused</span>
                            <span className="text-[#F59E0B]">{metrics?.escrow_accounts?.paused || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Total</span>
                            <span className="text-[#9CA3AF]">{metrics?.escrow_accounts?.total || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Spend Requests */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(168,85,247,0.1)] flex items-center justify-center">
                            <ChartPieIcon className="w-6 h-6 text-[#A855F7]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                                {metrics?.spend_requests?.this_month || 0}
                            </p>
                            <p className="text-xs text-[#6B7280]">Spends This Month</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Today</span>
                            <span className="text-[#9CA3AF]">{metrics?.spend_requests?.today || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">This week</span>
                            <span className="text-[#9CA3AF]">{metrics?.spend_requests?.this_week || 0}</span>
                        </div>
                    </div>
                </div>

                {/* API Keys */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(236,72,153,0.1)] flex items-center justify-center">
                            <KeyIcon className="w-6 h-6 text-[#EC4899]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                                {metrics?.api_keys?.total_active || 0}
                            </p>
                            <p className="text-xs text-[#6B7280]">Active API Keys</p>
                        </div>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Live</span>
                            <span className="text-[#14B8A6]">{metrics?.api_keys?.by_type?.live || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Test</span>
                            <span className="text-[#9CA3AF]">{metrics?.api_keys?.by_type?.test || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6B7280]">Agent</span>
                            <span className="text-[#9CA3AF]">{metrics?.api_keys?.by_type?.agent || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Approval Rate */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h3 className="font-heading font-semibold text-[#F5F5F5] mb-4">Approval Breakdown</h3>
                    
                    {/* Donut representation using bars */}
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-4 h-4 text-[#14B8A6]" />
                                    <span className="text-sm text-[#9CA3AF]">Approved</span>
                                </div>
                                <span className="text-sm font-mono text-[#14B8A6]">{approvedRate.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-[#1A1A1E] rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#14B8A6] rounded-full transition-all"
                                    style={{ width: `${approvedRate}%` }}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <XCircleIcon className="w-4 h-4 text-[#EF4444]" />
                                    <span className="text-sm text-[#9CA3AF]">Denied</span>
                                </div>
                                <span className="text-sm font-mono text-[#EF4444]">{deniedRate.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-[#1A1A1E] rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#EF4444] rounded-full transition-all"
                                    style={{ width: `${deniedRate}%` }}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-[#F59E0B]" />
                                    <span className="text-sm text-[#9CA3AF]">Pending</span>
                                </div>
                                <span className="text-sm font-mono text-[#F59E0B]">{pendingRate.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-[#1A1A1E] rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-[#F59E0B] rounded-full transition-all"
                                    style={{ width: `${pendingRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-[#6B7280] mt-4">
                        Based on {metrics?.spend_requests?.this_month || 0} spend requests this month
                    </p>
                </div>

                {/* Stripe Stats */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h3 className="font-heading font-semibold text-[#F5F5F5] mb-4">Stripe Integration</h3>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <div className={`w-2 h-2 rounded-full ${
                            stripeMetrics?.status === 'configured' ? 'bg-[#14B8A6]' : 'bg-[#6B7280]'
                        }`} />
                        <span className={`text-sm ${
                            stripeMetrics?.status === 'configured' ? 'text-[#14B8A6]' : 'text-[#6B7280]'
                        }`}>
                            {stripeMetrics?.status === 'configured' ? 'Connected' : 'Not Configured'}
                        </span>
                    </div>
                    
                    {stripeMetrics?.fundings_this_month && (
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-[#6B7280]">Fundings this month</span>
                                <span className="text-sm font-mono text-[#F5F5F5]">
                                    {stripeMetrics.fundings_this_month.count}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-[#6B7280]">Total funded</span>
                                <span className="text-sm font-mono text-[#14B8A6]">
                                    {formatCents(stripeMetrics.fundings_this_month.total_cents || 0)}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    {!stripeMetrics?.status || stripeMetrics.status !== 'configured' && (
                        <p className="text-sm text-[#6B7280]">
                            Configure Stripe to enable real payment processing.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminMetricsPage;
