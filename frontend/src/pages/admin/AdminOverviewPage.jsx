/**
 * Admin Overview Page
 * Main dashboard showing platform status, stats, and recent activity
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import {
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowRightIcon
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

// Format uptime
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
};

// Format time ago
const timeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

// Event type badge colors
const eventColors = {
    'org.created': 'bg-[rgba(16,185,129,0.1)] text-[#14B8A6]',
    'spend.approved': 'bg-[rgba(16,185,129,0.1)] text-[#14B8A6]',
    'spend.denied': 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
    'escrow.funded': 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6]',
    'approval.requested': 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    'policy.created': 'bg-[rgba(168,85,247,0.1)] text-[#A855F7]',
    default: 'bg-[rgba(107,114,128,0.1)] text-[#6B7280]'
};

const AdminOverviewPage = () => {
    const { adminFetch } = useAdmin();
    const [status, setStatus] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [activity, setActivity] = useState([]);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch all data in parallel
            const [statusRes, metricsRes, activityRes, errorsRes] = await Promise.all([
                adminFetch('/api/admin/status'),
                adminFetch('/api/admin/metrics/overview'),
                adminFetch('/api/admin/metrics/activity?limit=15'),
                adminFetch('/api/admin/errors?limit=5')
            ]);

            if (statusRes.ok) {
                setStatus(await statusRes.json());
            }
            if (metricsRes.ok) {
                setMetrics(await metricsRes.json());
            }
            if (activityRes.ok) {
                const data = await activityRes.json();
                setActivity(data.events || []);
            }
            if (errorsRes.ok) {
                const data = await errorsRes.json();
                setErrors(data.errors || []);
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

    return (
        <div className="space-y-6" data-testid="admin-overview-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[#F5F5F5]">Overview</h1>
                    <p className="text-[#9CA3AF] mt-1">Platform status and activity at a glance</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-[#141416] border border-[rgba(255,255,255,0.1)] hover:bg-[#1A1A1E] rounded-lg text-[#9CA3AF] hover:text-[#F5F5F5] text-sm transition-all"
                    data-testid="refresh-btn"
                >
                    Refresh
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444]">
                    {error}
                </div>
            )}

            {/* Service Status Pills */}
            <div className="flex flex-wrap gap-3">
                {/* Database */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    status?.services?.database?.status === 'connected'
                        ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]'
                        : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        status?.services?.database?.status === 'connected' ? 'bg-[#14B8A6]' : 'bg-[#EF4444]'
                    }`} />
                    <span className={`text-sm font-medium ${
                        status?.services?.database?.status === 'connected' ? 'text-[#14B8A6]' : 'text-[#EF4444]'
                    }`}>
                        Database: {status?.services?.database?.status === 'connected' ? 'Connected' : 'Error'}
                        {status?.services?.database?.latency_ms && (
                            <span className="text-xs ml-1 opacity-75">({status.services.database.latency_ms}ms)</span>
                        )}
                    </span>
                </div>

                {/* Stripe */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                    status?.services?.stripe?.status === 'configured'
                        ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]'
                        : 'bg-[rgba(107,114,128,0.1)] border-[rgba(107,114,128,0.2)]'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        status?.services?.stripe?.status === 'configured' ? 'bg-[#14B8A6]' : 'bg-[#6B7280]'
                    }`} />
                    <span className={`text-sm font-medium ${
                        status?.services?.stripe?.status === 'configured' ? 'text-[#14B8A6]' : 'text-[#6B7280]'
                    }`}>
                        Stripe: {status?.services?.stripe?.status === 'configured' ? 'Connected' : 'Not Configured'}
                    </span>
                </div>

                {/* Uptime */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]">
                    <ClockIcon className="w-4 h-4 text-[#14B8A6]" />
                    <span className="text-sm font-medium text-[#14B8A6]">
                        Uptime: {status?.uptime_seconds ? formatUptime(status.uptime_seconds) : 'N/A'}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Organizations */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                            <BuildingOfficeIcon className="w-5 h-5 text-[#3B82F6]" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                        {metrics?.organizations?.total || 0}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">Organizations</p>
                    {metrics?.organizations?.created_this_week > 0 && (
                        <p className="text-xs text-[#14B8A6] mt-1">+{metrics.organizations.created_this_week} this week</p>
                    )}
                </div>

                {/* Active Escrows */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-[#14B8A6]" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                        {metrics?.escrow_accounts?.active || 0}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">Active Escrows</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                        {metrics?.escrow_accounts?.total || 0} total, {metrics?.escrow_accounts?.paused || 0} paused
                    </p>
                </div>

                {/* Spend Requests Today */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(168,85,247,0.1)] flex items-center justify-center">
                            <CheckCircleIcon className="w-5 h-5 text-[#A855F7]" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                        {metrics?.spend_requests?.today || 0}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">Spend Requests Today</p>
                    <p className="text-xs text-[#14B8A6] mt-1">
                        {(parseFloat(metrics?.spend_requests?.approved_rate || 0) * 100).toFixed(0)}% approved
                    </p>
                </div>

                {/* Pending Approvals */}
                <div className={`bg-[#141416] rounded-xl border p-4 ${
                    (metrics?.approvals?.pending || 0) > 0 
                        ? 'border-[rgba(245,158,11,0.3)]' 
                        : 'border-[rgba(255,255,255,0.06)]'
                }`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            (metrics?.approvals?.pending || 0) > 0
                                ? 'bg-[rgba(245,158,11,0.1)]'
                                : 'bg-[rgba(107,114,128,0.1)]'
                        }`}>
                            <ClockIcon className={`w-5 h-5 ${
                                (metrics?.approvals?.pending || 0) > 0 ? 'text-[#F59E0B]' : 'text-[#6B7280]'
                            }`} />
                        </div>
                    </div>
                    <p className={`text-2xl font-bold font-mono ${
                        (metrics?.approvals?.pending || 0) > 0 ? 'text-[#F59E0B]' : 'text-[#F5F5F5]'
                    }`}>
                        {metrics?.approvals?.pending || 0}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">Pending Approvals</p>
                </div>

                {/* Total Balance */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
                            <CurrencyDollarIcon className="w-5 h-5 text-[#22C55E]" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                        {formatCents(metrics?.escrow_accounts?.total_balance_cents || 0)}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">Total Balance Held</p>
                </div>

                {/* API Keys */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(236,72,153,0.1)] flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#EC4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-[#F5F5F5] font-mono">
                        {metrics?.api_keys?.total_active || 0}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">Active API Keys</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                        {metrics?.api_keys?.by_type?.live || 0} live, {metrics?.api_keys?.by_type?.agent || 0} agent
                    </p>
                </div>
            </div>

            {/* Error Alert (if any errors in last 24h) */}
            {errors.length > 0 && (
                <div className="p-4 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-[#F59E0B]" />
                            <span className="text-[#F59E0B] font-medium">
                                {errors.length} error{errors.length !== 1 ? 's' : ''} in the last 24 hours
                            </span>
                        </div>
                        <Link
                            to="/admin/health"
                            className="flex items-center gap-1 text-sm text-[#F59E0B] hover:text-[#FCD34D] transition-colors"
                        >
                            View Error Log
                            <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-heading font-semibold text-[#F5F5F5]">Recent Activity</h2>
                    <Link
                        to="/admin/audit"
                        className="text-sm text-[#14B8A6] hover:text-[#2DD4BF] transition-colors"
                    >
                        View all →
                    </Link>
                </div>
                
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {activity.length === 0 ? (
                        <div className="px-6 py-8 text-center text-[#6B7280]">
                            No recent activity
                        </div>
                    ) : (
                        activity.map((event, index) => (
                            <div key={index} className="px-6 py-3 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.02)]">
                                <span className="text-xs text-[#6B7280] font-mono w-20 flex-shrink-0">
                                    {timeAgo(event.timestamp)}
                                </span>
                                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                    eventColors[event.type] || eventColors.default
                                }`}>
                                    {event.type}
                                </span>
                                <span className="text-sm text-[#9CA3AF] flex-1 truncate">
                                    {event.details?.name || event.details?.amount_cents 
                                        ? `${event.details.name || formatCents(event.details.amount_cents)}`
                                        : event.type.split('.').pop()
                                    }
                                    {event.details?.reason && (
                                        <span className="text-[#6B7280]"> ({event.details.reason})</span>
                                    )}
                                </span>
                                {event.org_id && (
                                    <span className="text-xs text-[#6B7280] font-mono">
                                        {event.org_id.substring(0, 8)}...
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminOverviewPage;
