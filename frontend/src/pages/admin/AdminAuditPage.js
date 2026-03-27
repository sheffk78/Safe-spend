/**
 * Admin Audit Log Page
 * Cross-org audit event browser
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import {
    ClipboardDocumentListIcon,
    ArrowPathIcon,
    FunnelIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

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

// Event type colors
const eventColors = {
    'spend.approved': 'bg-[rgba(16,185,129,0.1)] text-[#10B981]',
    'spend.denied': 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
    'spend.expired': 'bg-[rgba(107,114,128,0.1)] text-[#6B7280]',
    'approval.requested': 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    'approval.approved': 'bg-[rgba(16,185,129,0.1)] text-[#10B981]',
    'approval.denied': 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
    'escrow.created': 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6]',
    'escrow.funded': 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    'escrow.paused': 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]',
    'escrow.closed': 'bg-[rgba(107,114,128,0.1)] text-[#6B7280]',
    'policy.created': 'bg-[rgba(168,85,247,0.1)] text-[#A855F7]',
    'policy.updated': 'bg-[rgba(168,85,247,0.1)] text-[#A855F7]',
    'org.created': 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6]',
    'key.created': 'bg-[rgba(236,72,153,0.1)] text-[#EC4899]',
    'key.revoked': 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]',
    default: 'bg-[rgba(107,114,128,0.1)] text-[#6B7280]'
};

// Event types for filtering
const EVENT_TYPES = [
    { value: '', label: 'All Events' },
    { value: 'spend.approved', label: 'Spend Approved' },
    { value: 'spend.denied', label: 'Spend Denied' },
    { value: 'approval.requested', label: 'Approval Requested' },
    { value: 'approval.approved', label: 'Approval Approved' },
    { value: 'approval.denied', label: 'Approval Denied' },
    { value: 'escrow.created', label: 'Escrow Created' },
    { value: 'escrow.funded', label: 'Escrow Funded' },
    { value: 'policy.created', label: 'Policy Created' },
    { value: 'org.created', label: 'Org Created' },
    { value: 'key.created', label: 'Key Created' },
    { value: 'key.revoked', label: 'Key Revoked' }
];

// Actor types
const ACTOR_TYPES = [
    { value: '', label: 'All Actors' },
    { value: 'user', label: 'User' },
    { value: 'agent', label: 'Agent' },
    { value: 'system', label: 'System' },
    { value: 'admin', label: 'Admin' }
];

const AdminAuditPage = () => {
    const { adminFetch } = useAdmin();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedEvent, setExpandedEvent] = useState(null);
    
    // Filters
    const [eventType, setEventType] = useState('');
    const [actorType, setActorType] = useState('');
    const [orgId, setOrgId] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // Pagination
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const limit = 50;

    useEffect(() => {
        fetchEvents();
    }, [eventType, actorType, orgId, offset]);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });
            
            if (eventType) params.set('event_type', eventType);
            if (actorType) params.set('actor_type', actorType);
            if (orgId) params.set('org_id', orgId);
            
            const res = await adminFetch(`/api/admin/audit?${params}`);
            
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
                setTotal(data.pagination?.total || 0);
            } else {
                throw new Error('Failed to fetch audit logs');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setEventType('');
        setActorType('');
        setOrgId('');
        setOffset(0);
    };

    const hasActiveFilters = eventType || actorType || orgId;

    return (
        <div className="space-y-6" data-testid="admin-audit-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[#F5F5F5]">Audit Log</h1>
                    <p className="text-[#9CA3AF] mt-1">Cross-org event history</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                            showFilters || hasActiveFilters
                                ? 'bg-[#10B981] text-white'
                                : 'bg-[#141416] border border-[rgba(255,255,255,0.06)] text-[#9CA3AF] hover:text-[#F5F5F5]'
                        }`}
                    >
                        <FunnelIcon className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && <span className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                    <button
                        onClick={() => { setOffset(0); fetchEvents(); }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#141416] border border-[rgba(255,255,255,0.06)] hover:bg-[#1A1A1E] rounded-lg text-[#9CA3AF] hover:text-[#F5F5F5] text-sm transition-all disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Event Type */}
                        <div>
                            <label className="block text-sm text-[#9CA3AF] mb-1">Event Type</label>
                            <select
                                value={eventType}
                                onChange={(e) => { setEventType(e.target.value); setOffset(0); }}
                                className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm focus:outline-none focus:border-[#10B981]"
                            >
                                {EVENT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actor Type */}
                        <div>
                            <label className="block text-sm text-[#9CA3AF] mb-1">Actor Type</label>
                            <select
                                value={actorType}
                                onChange={(e) => { setActorType(e.target.value); setOffset(0); }}
                                className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] text-sm focus:outline-none focus:border-[#10B981]"
                            >
                                {ACTOR_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Org ID */}
                        <div>
                            <label className="block text-sm text-[#9CA3AF] mb-1">Organization ID</label>
                            <input
                                type="text"
                                value={orgId}
                                onChange={(e) => { setOrgId(e.target.value); setOffset(0); }}
                                placeholder="org_..."
                                className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] font-mono text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981]"
                            />
                        </div>
                    </div>
                    
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-3 text-sm text-[#EF4444] hover:text-[#F87171]"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444]">
                    {error}
                </div>
            )}

            {/* Events Table */}
            <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                {loading && events.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-12">
                        <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 text-[#6B7280]" />
                        <p className="text-[#6B7280]">No audit events found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-[rgba(255,255,255,0.06)]">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[160px]">
                                            Timestamp
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[150px]">
                                            Event
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-[100px]">
                                            Actor
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                            Organization
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                            Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event, index) => (
                                        <React.Fragment key={event.id || index}>
                                            <tr 
                                                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                                                onClick={() => setExpandedEvent(expandedEvent === index ? null : index)}
                                            >
                                                <td className="py-3 px-4">
                                                    <span className="text-xs text-[#6B7280] font-mono">
                                                        {formatTime(event.timestamp)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                                        eventColors[event.event_type] || eventColors.default
                                                    }`}>
                                                        {event.event_type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-xs text-[#9CA3AF]">
                                                        {event.actor_type || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-xs text-[#6B7280] font-mono">
                                                        {event.organization_id ? `${event.organization_id.substring(0, 12)}...` : '-'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {expandedEvent === index ? (
                                                            <ChevronDownIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                                                        ) : (
                                                            <ChevronRightIcon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                                                        )}
                                                        <span className="text-xs text-[#9CA3AF] truncate max-w-xs">
                                                            {event.details?.amount_cents && `$${(event.details.amount_cents / 100).toFixed(2)}`}
                                                            {event.details?.name && event.details.name}
                                                            {event.details?.reason && ` (${event.details.reason})`}
                                                            {!event.details?.amount_cents && !event.details?.name && 'View details'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedEvent === index && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-3 bg-[#0A0A0B]">
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-[#6B7280] mb-1">Event ID</p>
                                                                <p className="text-[#9CA3AF] font-mono text-xs">{event.id}</p>
                                                            </div>
                                                            {event.actor_id && (
                                                                <div>
                                                                    <p className="text-[#6B7280] mb-1">Actor ID</p>
                                                                    <p className="text-[#9CA3AF] font-mono text-xs">{event.actor_id}</p>
                                                                </div>
                                                            )}
                                                            {event.escrow_id && (
                                                                <div>
                                                                    <p className="text-[#6B7280] mb-1">Escrow ID</p>
                                                                    <p className="text-[#9CA3AF] font-mono text-xs">{event.escrow_id}</p>
                                                                </div>
                                                            )}
                                                            {event.ip_address && (
                                                                <div>
                                                                    <p className="text-[#6B7280] mb-1">IP Address</p>
                                                                    <p className="text-[#9CA3AF] font-mono text-xs">{event.ip_address}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {event.details && Object.keys(event.details).length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-[#6B7280] mb-1">Full Details</p>
                                                                <pre className="text-xs text-[#9CA3AF] font-mono bg-[#141416] p-2 rounded overflow-x-auto">
                                                                    {JSON.stringify(event.details, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
                            <p className="text-sm text-[#6B7280]">
                                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total} events
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                    disabled={offset === 0}
                                    className="px-3 py-1.5 bg-[#1A1A1E] text-[#9CA3AF] rounded-lg text-sm disabled:opacity-50 hover:text-[#F5F5F5] transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setOffset(offset + limit)}
                                    disabled={offset + limit >= total}
                                    className="px-3 py-1.5 bg-[#1A1A1E] text-[#9CA3AF] rounded-lg text-sm disabled:opacity-50 hover:text-[#F5F5F5] transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminAuditPage;
