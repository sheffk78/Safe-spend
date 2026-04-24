/**
 * Admin System Health Page
 * Detailed system health, service status, and error logs
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import {
    HeartIcon,
    ServerIcon,
    CircleStackIcon,
    CreditCardIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

// Format uptime
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
};

// Format bytes
const formatMB = (mb) => `${mb} MB`;

// Format timestamp
const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Time range options
const TIME_RANGES = [
    { label: 'Last hour', value: 1 },
    { label: 'Last 6 hours', value: 6 },
    { label: 'Last 24 hours', value: 24 },
    { label: 'Last 7 days', value: 168 }
];

const AdminHealthPage = () => {
    const { adminFetch } = useAdmin();
    const [status, setStatus] = useState(null);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState(24);
    const [expandedError, setExpandedError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [timeRange]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const sinceDate = new Date(Date.now() - timeRange * 60 * 60 * 1000).toISOString();
            
            const [statusRes, errorsRes] = await Promise.all([
                adminFetch('/api/admin/status'),
                adminFetch(`/api/admin/errors?limit=100&since=${sinceDate}`)
            ]);

            if (statusRes.ok) {
                setStatus(await statusRes.json());
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

    // Memory usage percentage
    const memoryPercent = status?.memory 
        ? Math.round((status.memory.heap_used_mb / status.memory.heap_total_mb) * 100)
        : 0;

    if (loading && !status) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="admin-health-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[#F5F5F5]">System Health</h1>
                    <p className="text-[#9CA3AF] mt-1">Service status and error monitoring</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#141416] border border-[rgba(255,255,255,0.1)] hover:bg-[#1A1A1E] rounded-lg text-[#9CA3AF] hover:text-[#F5F5F5] text-sm transition-all disabled:opacity-50"
                    data-testid="refresh-btn"
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

            {/* Service Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Database Card */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            status?.services?.database?.status === 'connected'
                                ? 'bg-[rgba(16,185,129,0.1)]'
                                : 'bg-[rgba(239,68,68,0.1)]'
                        }`}>
                            <CircleStackIcon className={`w-6 h-6 ${
                                status?.services?.database?.status === 'connected'
                                    ? 'text-[#14B8A6]'
                                    : 'text-[#EF4444]'
                            }`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#F5F5F5]">Database</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${
                                    status?.services?.database?.status === 'connected'
                                        ? 'bg-[#14B8A6]'
                                        : 'bg-[#EF4444]'
                                }`} />
                                <span className={`text-sm ${
                                    status?.services?.database?.status === 'connected'
                                        ? 'text-[#14B8A6]'
                                        : 'text-[#EF4444]'
                                }`}>
                                    {status?.services?.database?.status === 'connected' ? 'Connected' : 'Error'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-[#6B7280]">Latency</span>
                            <span className="text-lg font-mono text-[#F5F5F5]">
                                {status?.services?.database?.latency_ms || 0}ms
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stripe Card */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            status?.services?.stripe?.status === 'configured'
                                ? 'bg-[rgba(16,185,129,0.1)]'
                                : 'bg-[rgba(107,114,128,0.1)]'
                        }`}>
                            <CreditCardIcon className={`w-6 h-6 ${
                                status?.services?.stripe?.status === 'configured'
                                    ? 'text-[#14B8A6]'
                                    : 'text-[#6B7280]'
                            }`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#F5F5F5]">Stripe</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${
                                    status?.services?.stripe?.status === 'configured'
                                        ? 'bg-[#14B8A6]'
                                        : 'bg-[#6B7280]'
                                }`} />
                                <span className={`text-sm ${
                                    status?.services?.stripe?.status === 'configured'
                                        ? 'text-[#14B8A6]'
                                        : 'text-[#6B7280]'
                                }`}>
                                    {status?.services?.stripe?.status === 'configured' ? 'Connected' : 'Not Configured'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-[#6B7280]">Status</span>
                            <span className="text-sm text-[#9CA3AF]">
                                {status?.services?.stripe?.status || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Application Card */}
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                            <ServerIcon className="w-6 h-6 text-[#3B82F6]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#F5F5F5]">Application</h3>
                            <span className="text-xs text-[#6B7280]">v{status?.version || '1.0.0'}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-[#6B7280]">Uptime</span>
                                <span className="text-lg font-mono text-[#F5F5F5]">
                                    {status?.uptime_seconds ? formatUptime(status.uptime_seconds) : 'N/A'}
                                </span>
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-[#6B7280]">Memory</span>
                                <span className="text-sm text-[#9CA3AF]">
                                    {formatMB(status?.memory?.heap_used_mb || 0)} / {formatMB(status?.memory?.heap_total_mb || 0)}
                                </span>
                            </div>
                            <div className="h-2 bg-[#1A1A1E] rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all ${
                                        memoryPercent > 80 ? 'bg-[#EF4444]' :
                                        memoryPercent > 60 ? 'bg-[#F59E0B]' :
                                        'bg-[#14B8A6]'
                                    }`}
                                    style={{ width: `${memoryPercent}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-sm text-[#6B7280]">RSS</span>
                            <span className="text-sm text-[#9CA3AF]">
                                {formatMB(status?.memory?.rss_mb || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Log */}
            <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-heading font-semibold text-[#F5F5F5]">Error Log</h2>
                    
                    {/* Time Range Filter */}
                    <div className="flex items-center gap-2">
                        {TIME_RANGES.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => setTimeRange(range.value)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                                    timeRange === range.value
                                        ? 'bg-[#14B8A6] text-white'
                                        : 'bg-[#1A1A1E] text-[#9CA3AF] hover:text-[#F5F5F5]'
                                }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>
                
                {errors.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <HeartIcon className="w-12 h-12 mx-auto mb-3 text-[#14B8A6]" />
                        <p className="text-[#14B8A6] font-medium">No errors in this time period</p>
                        <p className="text-sm text-[#6B7280] mt-1">Your system is running smoothly</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-[rgba(255,255,255,0.06)]">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[160px]">
                                        Timestamp
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[80px]">
                                        Level
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Message
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[200px]">
                                        Endpoint
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {errors.map((err, index) => (
                                    <React.Fragment key={index}>
                                        <tr 
                                            className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                                            onClick={() => setExpandedError(expandedError === index ? null : index)}
                                        >
                                            <td className="py-3 px-4">
                                                <span className="text-xs text-[#6B7280] font-mono">
                                                    {formatTime(err.timestamp)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                                    err.level === 'error'
                                                        ? 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]'
                                                        : 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
                                                }`}>
                                                    {err.level}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {expandedError === index ? (
                                                        <ChevronDownIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                                                    ) : (
                                                        <ChevronRightIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                                                    )}
                                                    <span className="text-sm text-[#F5F5F5] truncate max-w-md">
                                                        {err.message}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs text-[#6B7280] font-mono">
                                                    {err.endpoint || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedError === index && err.stack && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 bg-[#0A0A0B]">
                                                    <pre className="text-xs text-[#9CA3AF] font-mono whitespace-pre-wrap overflow-x-auto">
                                                        {err.stack}
                                                    </pre>
                                                    {err.request_id && (
                                                        <p className="text-xs text-[#6B7280] mt-2">
                                                            Request ID: {err.request_id}
                                                        </p>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminHealthPage;
