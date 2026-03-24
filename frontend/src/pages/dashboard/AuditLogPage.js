import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    RefreshCw, 
    X,
    Filter,
    ChevronDown,
    ExternalLink
} from 'lucide-react';
import {
    listAuditEvents,
    listEscrowAccounts,
    formatDate
} from '@/lib/api';

const EVENT_TYPES = [
    { value: 'escrow.created', label: 'Escrow Created', category: 'Escrow' },
    { value: 'escrow.funded', label: 'Escrow Funded', category: 'Escrow' },
    { value: 'escrow.paused', label: 'Escrow Paused', category: 'Escrow' },
    { value: 'escrow.resumed', label: 'Escrow Resumed', category: 'Escrow' },
    { value: 'escrow.closed', label: 'Escrow Closed', category: 'Escrow' },
    { value: 'policy.created', label: 'Policy Created', category: 'Policy' },
    { value: 'policy.updated', label: 'Policy Updated', category: 'Policy' },
    { value: 'policy.deleted', label: 'Policy Deleted', category: 'Policy' },
    { value: 'spend.requested', label: 'Spend Requested', category: 'Spend' },
    { value: 'spend.approved', label: 'Spend Approved', category: 'Spend' },
    { value: 'spend.denied', label: 'Spend Denied', category: 'Spend' },
    { value: 'spend.expired', label: 'Spend Expired', category: 'Spend' },
    { value: 'approval.requested', label: 'Approval Requested', category: 'Approval' },
    { value: 'approval.approved', label: 'Approval Approved', category: 'Approval' },
    { value: 'approval.denied', label: 'Approval Denied', category: 'Approval' },
    { value: 'approval.expired', label: 'Approval Expired', category: 'Approval' },
    { value: 'api_key.created', label: 'API Key Created', category: 'API Key' },
    { value: 'api_key.revoked', label: 'API Key Revoked', category: 'API Key' },
    { value: 'api_key.deactivated', label: 'API Key Deactivated', category: 'API Key' },
    { value: 'api_key.reactivated', label: 'API Key Reactivated', category: 'API Key' }
];

const ACTOR_TYPES = [
    { value: 'human', label: 'Human' },
    { value: 'agent', label: 'Agent' },
    { value: 'system', label: 'System' }
];

const AuditLogPage = () => {
    const [events, setEvents] = useState([]);
    const [escrowAccounts, setEscrowAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    
    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        escrow_id: '',
        event_type: '',
        actor_type: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [eventsData, accountsData] = await Promise.all([
                listAuditEvents({ limit: 200, ...cleanFilters(filters) }),
                listEscrowAccounts()
            ]);
            setEvents(eventsData.data || []);
            setEscrowAccounts(accountsData.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const cleanFilters = (f) => {
        const cleaned = {};
        Object.entries(f).forEach(([k, v]) => {
            if (v) cleaned[k] = v;
        });
        return cleaned;
    };

    const applyFilters = () => {
        fetchData();
        setShowFilters(false);
    };

    const clearFilters = () => {
        setFilters({
            escrow_id: '',
            event_type: '',
            actor_type: ''
        });
    };

    const getEscrowName = (escrowId) => {
        if (!escrowId) return '-';
        const account = escrowAccounts.find(a => a.id === escrowId);
        return account?.name || escrowId.substring(0, 12) + '...';
    };

    const getEventLabel = (eventType) => {
        const event = EVENT_TYPES.find(e => e.value === eventType);
        return event?.label || eventType;
    };

    const getEventBadgeStyle = (eventType) => {
        if (eventType.includes('created') || eventType.includes('approved') || eventType.includes('funded')) {
            return 'bg-ss-accent/10 text-ss-accent';
        }
        if (eventType.includes('denied') || eventType.includes('closed') || eventType.includes('revoked')) {
            return 'bg-ss-error/10 text-ss-error';
        }
        if (eventType.includes('paused') || eventType.includes('expired') || eventType.includes('deactivated')) {
            return 'bg-ss-warning/10 text-ss-warning';
        }
        return 'bg-ss-text-tertiary/10 text-ss-text-secondary';
    };

    const getActorBadgeStyle = (actorType) => {
        switch (actorType) {
            case 'human': return 'bg-blue-500/10 text-blue-400';
            case 'agent': return 'bg-purple-500/10 text-purple-400';
            case 'system': return 'bg-ss-text-tertiary/10 text-ss-text-secondary';
            default: return 'bg-ss-text-tertiary/10 text-ss-text-secondary';
        }
    };

    const formatDetails = (details) => {
        if (!details || Object.keys(details).length === 0) return null;
        return JSON.stringify(details, null, 2);
    };

    const activeFiltersCount = Object.values(filters).filter(v => v).length;

    return (
        <div className="space-y-6" data-testid="audit-log-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Audit Log</h1>
                    <p className="text-ss-text-secondary mt-1">
                        Complete immutable record of all account activity.{' '}
                        <a href="/docs/trust-law#concept-mapping" className="text-ss-accent hover:underline">
                            Learn how audit logs map to trust accounting →
                        </a>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg transition-all ${
                            activeFiltersCount > 0 ? 'text-ss-accent' : 'text-ss-text-secondary hover:text-ss-text'
                        }`}
                        data-testid="filter-btn"
                    >
                        <Filter size={16} />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-ss-accent rounded-full text-xs text-white">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="refresh-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-ss-surface p-4 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="filters-panel">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Event Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                Event Type
                            </label>
                            <select
                                value={filters.event_type}
                                onChange={(e) => setFilters(prev => ({ ...prev, event_type: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                data-testid="event-type-filter"
                            >
                                <option value="">All events</option>
                                {EVENT_TYPES.map(e => (
                                    <option key={e.value} value={e.value}>{e.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actor Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                Actor Type
                            </label>
                            <select
                                value={filters.actor_type}
                                onChange={(e) => setFilters(prev => ({ ...prev, actor_type: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                data-testid="actor-type-filter"
                            >
                                <option value="">All actors</option>
                                {ACTOR_TYPES.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Escrow Account Filter */}
                        <div>
                            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                Escrow Account
                            </label>
                            <select
                                value={filters.escrow_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, escrow_id: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                data-testid="escrow-filter"
                            >
                                <option value="">All accounts</option>
                                {escrowAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-ss-text-secondary hover:text-ss-text transition-all"
                            data-testid="clear-filters-btn"
                        >
                            Clear
                        </button>
                        <button
                            onClick={applyFilters}
                            className="px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white text-sm font-medium transition-all"
                            data-testid="apply-filters-btn"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error" data-testid="error-message">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!loading && events.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center" data-testid="empty-state">
                    <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">No audit events yet</h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto">
                        {activeFiltersCount > 0 
                            ? 'No events match your current filters. Try adjusting your filter criteria.'
                            : 'Activity events will appear here as you use Safe-Spend.'}
                    </p>
                </div>
            )}

            {/* Events table */}
            {!loading && events.length > 0 && (
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-ss-elevated">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Event</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Actor</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Escrow</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Summary</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event) => (
                                    <tr 
                                        key={event.id}
                                        className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                        data-testid={`event-row-${event.id}`}
                                    >
                                        <td className="px-4 py-3 text-sm text-ss-text-secondary whitespace-nowrap">
                                            {formatDate(event.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventBadgeStyle(event.event_type)}`}>
                                                {getEventLabel(event.event_type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getActorBadgeStyle(event.actor_type)}`}>
                                                {event.actor_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-ss-text">
                                            {getEscrowName(event.escrow_id)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-ss-text-secondary max-w-xs truncate">
                                            {getSummary(event)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedEvent(event)}
                                                className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                                                data-testid={`view-details-${event.id}`}
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Event Detail Panel */}
            {selectedEvent && (
                <EventDetailPanel
                    event={selectedEvent}
                    escrowName={getEscrowName(selectedEvent.escrow_id)}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    );
};

// Helper to generate summary from event details
const getSummary = (event) => {
    const details = event.details || {};
    
    switch (event.event_type) {
        case 'escrow.funded':
            return `Added ${formatCentsLocal(details.amount_cents)}`;
        case 'spend.approved':
        case 'spend.denied':
            return `${formatCentsLocal(details.amount_cents)} to ${details.vendor || 'vendor'}`;
        case 'policy.created':
        case 'policy.deleted':
            return details.policy_name || 'Policy';
        case 'api_key.created':
        case 'api_key.revoked':
            return `Key ${details.key_prefix || details.api_key_id?.substring(0, 8) || '...'}`;
        default:
            return Object.keys(details).length > 0 
                ? Object.entries(details).slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`).join(', ')
                : '-';
    }
};

const formatCentsLocal = (cents) => {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
};

// Event Detail Panel Component
const EventDetailPanel = ({ event, escrowName, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="event-detail-panel">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <h2 className="font-heading text-lg font-semibold text-ss-text">Event Details</h2>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Event metadata */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Event Type</p>
                            <p className="text-sm font-mono text-ss-accent">{event.event_type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Timestamp</p>
                            <p className="text-sm text-ss-text">{formatDate(event.created_at)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Actor Type</p>
                            <p className="text-sm text-ss-text capitalize">{event.actor_type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Actor ID</p>
                            <p className="text-sm font-mono text-ss-text-secondary truncate">{event.actor_id}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Escrow Account</p>
                            <p className="text-sm text-ss-text">{escrowName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">IP Address</p>
                            <p className="text-sm font-mono text-ss-text-secondary">{event.ip_address || '-'}</p>
                        </div>
                    </div>

                    {/* Event ID */}
                    <div>
                        <p className="text-xs text-ss-text-tertiary mb-1">Event ID</p>
                        <p className="text-sm font-mono text-ss-text-secondary break-all">{event.id}</p>
                    </div>

                    {/* Details JSON */}
                    {event.details && Object.keys(event.details).length > 0 && (
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-2">Details</p>
                            <pre className="p-4 bg-ss-elevated rounded-lg text-sm font-mono text-ss-text overflow-x-auto">
                                {JSON.stringify(event.details, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                        data-testid="close-detail-btn"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
