import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { 
    Scale, 
    Plus, 
    RefreshCw, 
    X,
    Pencil,
    Trash2,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    ChevronLeft,
    Clock,
    DollarSign,
    Users,
    Tag,
    BookOpen,
    Lock,
    Unlock,
    FileText,
    AlertCircle,
    CheckCircle,
    Shield,
    Sparkles,
    Info,
    ExternalLink,
    TrendingUp,
    Activity,
    Eye,
    Bot,
    Key
} from 'lucide-react';
import {
    listPolicies,
    listEscrowAccounts,
    createPolicy,
    updatePolicy,
    deletePolicy,
    lockPolicy,
    unlockPolicy,
    formatCents,
    dollarsToCents
} from '@/lib/api';

// Purpose presets for quick selection
const PURPOSE_PRESETS = [
    { id: 'marketing', label: 'Marketing', description: 'Ad spend, campaigns, promotion' },
    { id: 'engineering', label: 'Engineering', description: 'Dev tools, APIs, compute' },
    { id: 'operations', label: 'Operations', description: 'SaaS, subscriptions, admin' },
    { id: 'research', label: 'Research', description: 'R&D, experiments, exploration' },
    { id: 'procurement', label: 'Procurement', description: 'Vendor payments, supplies' },
    { id: 'custom', label: 'Custom', description: 'Define your own purpose' }
];

const DAYS_OPTIONS = [
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
    { value: 'sun', label: 'Sun' }
];

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Singapore'
];

const FiduciaryPoliciesPage = () => {
    const [policies, setPolicies] = useState([]);
    const [escrowAccounts, setEscrowAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showWizard, setShowWizard] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [expandedPolicy, setExpandedPolicy] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [policiesData, accountsData] = await Promise.all([
                listPolicies(),
                listEscrowAccounts()
            ]);
            setPolicies(policiesData.data || []);
            setEscrowAccounts(accountsData.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this fiduciary policy? This action cannot be undone.')) {
            return;
        }
        try {
            await deletePolicy(id);
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLock = async (policy) => {
        if (!window.confirm(`Activate fiduciary policy "${policy.name}"?\n\nOnce activated:\n• The Trust Mandate will be enforced\n• It cannot be modified until unlocked\n• An audit trail entry will be created`)) {
            return;
        }
        try {
            await lockPolicy(policy.id);
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUnlock = async (policy) => {
        if (!window.confirm(`Unlock policy "${policy.name}" for editing?\n\nThis will:\n• Allow modifications to the policy\n• Create an audit trail entry\n• The policy will remain active until you deactivate it`)) {
            return;
        }
        try {
            await unlockPolicy(policy.id);
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const getEscrowName = (escrowId) => {
        const account = escrowAccounts.find(a => a.id === escrowId);
        return account?.name || escrowId?.substring(0, 12) + '...';
    };

    // Calculate stats
    const stats = {
        total: policies.length,
        active: policies.filter(p => p.status === 'active' && p.is_locked).length,
        drafts: policies.filter(p => p.status === 'draft').length,
        archived: policies.filter(p => p.status === 'archived').length,
        aavRestricted: policies.filter(p => p.aav_enabled && (p.authorized_agent_ids?.length > 0 || p.aav_grant_ids?.length > 0)).length
    };

    return (
        <div className="space-y-6" data-testid="fiduciary-policies-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text flex items-center gap-3">
                        <Scale className="w-7 h-7 text-ss-accent" />
                        Fiduciary Policies
                    </h1>
                    <p className="text-ss-text-secondary mt-1">
                        Define Trust Mandates that govern how your agents can spend.{' '}
                        <Link to="/docs/trust-law" className="text-ss-accent hover:underline inline-flex items-center gap-1">
                            <BookOpen size={14} />
                            Learn about Trust Law principles
                        </Link>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="refresh-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => {
                            setEditingPolicy(null);
                            setShowWizard(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="new-policy-btn"
                    >
                        <Plus size={16} />
                        New Policy
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatsCard 
                    icon={Scale} 
                    label="Total Policies" 
                    value={stats.total} 
                    color="text-ss-accent" 
                    bg="bg-ss-accent/10" 
                />
                <StatsCard 
                    icon={Lock} 
                    label="Active (Locked)" 
                    value={stats.active} 
                    color="text-emerald-400" 
                    bg="bg-emerald-500/10" 
                />
                <StatsCard 
                    icon={FileText} 
                    label="Drafts Pending" 
                    value={stats.drafts} 
                    color="text-amber-400" 
                    bg="bg-amber-500/10" 
                />
                <StatsCard 
                    icon={Shield} 
                    label="AAV Restricted" 
                    value={stats.aavRestricted} 
                    color="text-blue-400" 
                    bg="bg-blue-500/10" 
                />
                <StatsCard 
                    icon={Eye} 
                    label="Archived" 
                    value={stats.archived} 
                    color="text-slate-400" 
                    bg="bg-slate-500/10" 
                />
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error" data-testid="error-message">
                    {error}
                </div>
            )}

            {/* Draft Policies Alert */}
            {!loading && stats.drafts > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg" data-testid="draft-alert">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-medium text-amber-400">
                                {stats.drafts} draft {stats.drafts === 1 ? 'policy' : 'policies'} pending review
                            </h3>
                            <p className="text-sm text-amber-400/70 mt-1">
                                Review each draft Trust Mandate and click "Activate & Lock" to begin enforcement.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!loading && policies.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center" data-testid="empty-state">
                    <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                        <Scale className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">No fiduciary policies yet</h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto mb-6">
                        Create a Trust Mandate to define purpose-restricted spending rules for your AI agents.
                    </p>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="empty-new-policy-btn"
                    >
                        <Plus size={18} />
                        Create Trust Mandate
                    </button>
                </div>
            )}

            {/* Policies list */}
            {!loading && policies.length > 0 && (
                <div className="space-y-4">
                    {policies.map((policy) => (
                        <PolicyCard
                            key={policy.id}
                            policy={policy}
                            escrowName={getEscrowName(policy.escrow_id)}
                            expanded={expandedPolicy === policy.id}
                            onToggleExpand={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                            onEdit={() => {
                                setEditingPolicy(policy);
                                setShowWizard(true);
                            }}
                            onDelete={() => handleDelete(policy.id)}
                            onLock={() => handleLock(policy)}
                            onUnlock={() => handleUnlock(policy)}
                        />
                    ))}
                </div>
            )}

            {/* Policy Wizard */}
            {showWizard && (
                <PolicyWizard
                    policy={editingPolicy}
                    escrowAccounts={escrowAccounts}
                    onClose={() => {
                        setShowWizard(false);
                        setEditingPolicy(null);
                    }}
                    onSuccess={() => {
                        setShowWizard(false);
                        setEditingPolicy(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color, bg }) => (
    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
                <p className="text-2xl font-bold text-ss-text">{value}</p>
                <p className="text-xs text-ss-text-tertiary">{label}</p>
            </div>
        </div>
    </div>
);

// Policy Card Component
const PolicyCard = ({ policy, escrowName, expanded, onToggleExpand, onEdit, onDelete, onLock, onUnlock }) => {
    const isDraft = policy.status === 'draft';
    const isLocked = policy.is_locked;
    const isArchived = policy.status === 'archived';
    
    // Calculate AAV status
    const hasAgentIds = policy.authorized_agent_ids?.length > 0;
    const hasGrantIds = policy.aav_grant_ids?.length > 0;
    const isAAVRestricted = policy.aav_enabled && (hasAgentIds || hasGrantIds);
    const agentCount = (policy.authorized_agent_ids?.length || 0) + (policy.aav_grant_ids?.length || 0);
    
    return (
        <div className={`bg-ss-surface rounded-xl border overflow-hidden transition-all ${
            isDraft ? 'border-amber-500/50' : 
            isLocked ? 'border-emerald-500/30' : 
            'border-[rgba(255,255,255,0.06)]'
        }`} data-testid={`policy-card-${policy.id}`}>
            {/* Draft Banner */}
            {isDraft && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
                    <FileText size={14} className="text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">DRAFT - Review and activate to enforce this Trust Mandate</span>
                </div>
            )}
            
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isDraft ? 'bg-amber-500/10' : 
                        isLocked ? 'bg-emerald-500/10' : 
                        'bg-ss-accent/10'
                    }`}>
                        {isLocked ? (
                            <Lock className="w-6 h-6 text-emerald-400" />
                        ) : isDraft ? (
                            <FileText className="w-6 h-6 text-amber-400" />
                        ) : (
                            <Scale className="w-6 h-6 text-ss-accent" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-ss-text truncate">{policy.name}</h3>
                        {policy.purpose && (
                            <p className="text-xs text-ss-accent mt-0.5 truncate">
                                Purpose: {policy.purpose}
                            </p>
                        )}
                        <p className="text-xs text-ss-text-tertiary mt-0.5">
                            Trust Account: {escrowName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* AAV Status Badges */}
                    {isAAVRestricted ? (
                        <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-medium text-blue-400 flex items-center gap-1.5" data-testid={`aav-badge-${policy.id}`}>
                            <Shield size={12} />
                            {agentCount} Agent{agentCount !== 1 ? 's' : ''}
                        </span>
                    ) : policy.aav_enabled ? (
                        <span className="px-2.5 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-medium text-slate-400 flex items-center gap-1.5" data-testid={`aav-badge-${policy.id}`}>
                            <Shield size={12} />
                            AAV (No IDs)
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-medium text-slate-500 flex items-center gap-1.5" data-testid={`aav-badge-${policy.id}`}>
                            <Key size={12} />
                            Any Key
                        </span>
                    )}
                    {isLocked && (
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                            <Lock size={12} />
                            Active
                        </span>
                    )}
                    {isDraft && (
                        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-medium text-amber-400">
                            Draft
                        </span>
                    )}
                    {isArchived && (
                        <span className="px-2.5 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-medium text-slate-400">
                            Archived
                        </span>
                    )}
                    <button
                        onClick={onToggleExpand}
                        className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid={`expand-btn-${policy.id}`}
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Quick Summary */}
            <div className="px-4 pb-4 flex flex-wrap gap-2">
                {policy.per_transaction_limit_cents && (
                    <span className="px-2 py-1 bg-ss-elevated rounded text-xs text-ss-text-secondary">
                        Max: {formatCents(policy.per_transaction_limit_cents)}/tx
                    </span>
                )}
                {policy.daily_limit_cents && (
                    <span className="px-2 py-1 bg-ss-elevated rounded text-xs text-ss-text-secondary">
                        Daily: {formatCents(policy.daily_limit_cents)}
                    </span>
                )}
                {policy.auto_approve_under_cents && (
                    <span className="px-2 py-1 bg-emerald-500/10 rounded text-xs text-emerald-400">
                        Auto &lt; {formatCents(policy.auto_approve_under_cents)}
                    </span>
                )}
                {policy.require_human_above_cents && (
                    <span className="px-2 py-1 bg-amber-500/10 rounded text-xs text-amber-400">
                        Human &gt; {formatCents(policy.require_human_above_cents)}
                    </span>
                )}
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4 bg-ss-elevated/50">
                    {/* Approval Thresholds Visualization */}
                    <ThresholdVisualization 
                        autoApprove={policy.auto_approve_under_cents}
                        humanReview={policy.require_human_above_cents}
                        perTxLimit={policy.per_transaction_limit_cents}
                    />

                    {/* Limits Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <LimitItem 
                            icon={DollarSign} 
                            label="Per Transaction" 
                            value={policy.per_transaction_limit_cents ? formatCents(policy.per_transaction_limit_cents) : 'No limit'} 
                        />
                        <LimitItem 
                            icon={DollarSign} 
                            label="Daily" 
                            value={policy.daily_limit_cents ? formatCents(policy.daily_limit_cents) : 'No limit'} 
                        />
                        <LimitItem 
                            icon={DollarSign} 
                            label="Weekly" 
                            value={policy.weekly_limit_cents ? formatCents(policy.weekly_limit_cents) : 'No limit'} 
                        />
                        <LimitItem 
                            icon={DollarSign} 
                            label="Monthly" 
                            value={policy.monthly_limit_cents ? formatCents(policy.monthly_limit_cents) : 'No limit'} 
                        />
                    </div>

                    {/* Vendor & Category Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-ss-surface rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={14} className="text-ss-text-tertiary" />
                                <span className="text-xs font-medium text-ss-text-secondary">Vendor Restrictions</span>
                            </div>
                            {policy.allowed_vendors?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {policy.allowed_vendors.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-ss-accent/10 text-ss-accent rounded text-xs">{v}</span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-ss-text-tertiary">All vendors permitted</span>
                            )}
                            {policy.blocked_vendors?.length > 0 && (
                                <div className="mt-2">
                                    <span className="text-xs text-ss-text-tertiary">Blocked: </span>
                                    {policy.blocked_vendors.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-ss-error/10 text-ss-error rounded text-xs ml-1">{v}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-ss-surface rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag size={14} className="text-ss-text-tertiary" />
                                <span className="text-xs font-medium text-ss-text-secondary">Category Restrictions</span>
                            </div>
                            {policy.allowed_categories?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {policy.allowed_categories.map((c, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-ss-accent/10 text-ss-accent rounded text-xs">{c}</span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-ss-text-tertiary">All categories permitted</span>
                            )}
                        </div>
                    </div>

                    {/* Time Window */}
                    <div className="p-3 bg-ss-surface rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-ss-text-tertiary" />
                            <span className="text-xs font-medium text-ss-text-secondary">Time Window</span>
                        </div>
                        <div className="text-xs text-ss-text">
                            Days: {policy.active_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') || 'All days'}
                        </div>
                        {policy.active_hours_start && policy.active_hours_end && (
                            <div className="text-xs text-ss-text-tertiary mt-1">
                                Hours: {policy.active_hours_start} - {policy.active_hours_end} ({policy.active_timezone || 'UTC'})
                            </div>
                        )}
                    </div>

                    {/* AAV Agent Authorization Section */}
                    <div className="p-3 bg-ss-surface rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield size={14} className="text-ss-text-tertiary" />
                            <span className="text-xs font-medium text-ss-text-secondary">Agent Authorization</span>
                        </div>
                        {isAAVRestricted ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs font-medium">
                                        AAV Restricted
                                    </span>
                                    {policy.aav_enforcement_mode && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            policy.aav_enforcement_mode === 'strict' 
                                                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                                                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                        }`}>
                                            {policy.aav_enforcement_mode === 'strict' ? 'Strict' : 'Warn'}
                                        </span>
                                    )}
                                </div>
                                {hasAgentIds && (
                                    <div>
                                        <span className="text-xs text-ss-text-tertiary">Authorized Agents: </span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {policy.authorized_agent_ids.map((id, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs flex items-center gap-1">
                                                    <Bot size={10} />
                                                    {id}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {hasGrantIds && (
                                    <div>
                                        <span className="text-xs text-ss-text-tertiary">Grant IDs: </span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {policy.aav_grant_ids.map((id, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">
                                                    {id}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : policy.aav_enabled ? (
                            <div className="text-xs text-amber-400">
                                AAV enabled but no agent IDs configured - all agents can spend
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-ss-text-tertiary">
                                <Key size={12} />
                                Any agent with a valid API key can spend under this policy
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="flex items-center gap-2">
                            {isDraft && (
                                <button
                                    onClick={onLock}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition-all"
                                    data-testid={`lock-btn-${policy.id}`}
                                >
                                    <Lock size={14} />
                                    Activate & Lock
                                </button>
                            )}
                            {isLocked && (
                                <button
                                    onClick={onUnlock}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-all"
                                    data-testid={`unlock-btn-${policy.id}`}
                                >
                                    <Unlock size={14} />
                                    Unlock for Editing
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!isLocked && (
                                <>
                                    <button
                                        onClick={onEdit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-ss-surface hover:bg-ss-elevated rounded-lg text-ss-text-secondary text-xs transition-all"
                                        data-testid={`edit-btn-${policy.id}`}
                                    >
                                        <Pencil size={12} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={onDelete}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-ss-error/10 hover:bg-ss-error/20 rounded-lg text-ss-error text-xs transition-all"
                                        data-testid={`delete-btn-${policy.id}`}
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                </>
                            )}
                            {isLocked && (
                                <span className="text-xs text-slate-500">
                                    Unlock to edit or delete
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Threshold Visualization Component (Dual Slider Visual)
const ThresholdVisualization = ({ autoApprove, humanReview, perTxLimit }) => {
    const max = perTxLimit || Math.max(autoApprove || 0, humanReview || 0, 10000);
    const autoPercent = autoApprove ? Math.min((autoApprove / max) * 100, 100) : 0;
    const humanPercent = humanReview ? Math.min((humanReview / max) * 100, 100) : 0;

    if (!autoApprove && !humanReview) return null;

    return (
        <div className="p-4 bg-ss-surface rounded-lg">
            <h4 className="text-xs font-medium text-ss-text-secondary mb-3 flex items-center gap-2">
                <Shield size={14} className="text-ss-accent" />
                Approval Thresholds Visualization
            </h4>
            <div className="relative h-8 bg-ss-elevated rounded-full overflow-hidden">
                {/* Auto-approve zone */}
                <div 
                    className="absolute inset-y-0 left-0 bg-emerald-500/30 border-r-2 border-emerald-500"
                    style={{ width: `${autoPercent}%` }}
                />
                {/* Human review zone (if different from auto-approve) */}
                {humanReview && humanReview > (autoApprove || 0) && (
                    <div 
                        className="absolute inset-y-0 bg-amber-500/20 border-r-2 border-amber-500"
                        style={{ left: `${autoPercent}%`, width: `${humanPercent - autoPercent}%` }}
                    />
                )}
                {/* Deny zone */}
                <div 
                    className="absolute inset-y-0 right-0 bg-red-500/10"
                    style={{ left: `${Math.max(autoPercent, humanPercent)}%` }}
                />
            </div>
            <div className="flex justify-between mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/50" />
                    <span className="text-emerald-400">Auto-approve: {autoApprove ? formatCents(autoApprove) : 'None'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-500/50" />
                    <span className="text-amber-400">Human review: {humanReview ? formatCents(humanReview) : 'None'}</span>
                </div>
            </div>
        </div>
    );
};

const LimitItem = ({ icon: Icon, label, value }) => (
    <div className="p-3 bg-ss-surface rounded-lg">
        <div className="flex items-center gap-1.5 mb-1">
            <Icon size={12} className="text-ss-text-tertiary" />
            <span className="text-xs text-ss-text-tertiary">{label}</span>
        </div>
        <p className="text-sm font-medium text-ss-text">{value}</p>
    </div>
);

// ============ Policy Wizard ============
const PolicyWizard = ({ policy, escrowAccounts, onClose, onSuccess }) => {
    const isEditing = !!policy;
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        name: policy?.name || '',
        purpose: policy?.purpose || '',
        escrow_id: policy?.escrow_id || '',
        per_transaction_limit: policy?.per_transaction_limit_cents ? (policy.per_transaction_limit_cents / 100).toString() : '',
        daily_limit: policy?.daily_limit_cents ? (policy.daily_limit_cents / 100).toString() : '',
        weekly_limit: policy?.weekly_limit_cents ? (policy.weekly_limit_cents / 100).toString() : '',
        monthly_limit: policy?.monthly_limit_cents ? (policy.monthly_limit_cents / 100).toString() : '',
        allowed_vendors: policy?.allowed_vendors?.join(', ') || '',
        blocked_vendors: policy?.blocked_vendors?.join(', ') || '',
        vendor_match_mode: policy?.vendor_match_mode || 'exact',
        allowed_categories: policy?.allowed_categories?.join(', ') || '',
        blocked_categories: policy?.blocked_categories?.join(', ') || '',
        active_days: policy?.active_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
        active_hours_start: policy?.active_hours_start || '',
        active_hours_end: policy?.active_hours_end || '',
        active_timezone: policy?.active_timezone || 'America/Denver',
        auto_approve_under: policy?.auto_approve_under_cents ? (policy.auto_approve_under_cents / 100).toString() : '',
        require_human_above: policy?.require_human_above_cents ? (policy.require_human_above_cents / 100).toString() : '',
        // AAV fields
        aav_enabled: policy?.aav_enabled || false,
        authorized_agent_ids: policy?.authorized_agent_ids?.join(', ') || '',
        aav_grant_ids: policy?.aav_grant_ids?.join(', ') || '',
        aav_enforcement_mode: policy?.aav_enforcement_mode || ''
    });

    const steps = [
        { id: 'basics', label: 'Basics & Purpose', icon: Scale },
        { id: 'thresholds', label: 'Amount Thresholds', icon: DollarSign },
        { id: 'restrictions', label: 'Restrictions', icon: Shield },
        { id: 'review', label: 'Review & Activate', icon: CheckCircle }
    ];

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleDay = (day) => {
        setFormData(prev => ({
            ...prev,
            active_days: prev.active_days.includes(day)
                ? prev.active_days.filter(d => d !== day)
                : [...prev.active_days, day]
        }));
    };

    const parseList = (str) => {
        return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    };

    const handleSubmit = async (asDraft = true) => {
        setLoading(true);
        setError(null);

        try {
            const payload = {
                name: formData.name,
                purpose: formData.purpose || null,
                escrow_id: formData.escrow_id,
                draft: asDraft,
                per_transaction_limit_cents: formData.per_transaction_limit ? dollarsToCents(formData.per_transaction_limit) : null,
                daily_limit_cents: formData.daily_limit ? dollarsToCents(formData.daily_limit) : null,
                weekly_limit_cents: formData.weekly_limit ? dollarsToCents(formData.weekly_limit) : null,
                monthly_limit_cents: formData.monthly_limit ? dollarsToCents(formData.monthly_limit) : null,
                allowed_vendors: parseList(formData.allowed_vendors),
                blocked_vendors: parseList(formData.blocked_vendors),
                vendor_match_mode: formData.vendor_match_mode,
                allowed_categories: parseList(formData.allowed_categories),
                blocked_categories: parseList(formData.blocked_categories),
                active_days: formData.active_days,
                active_hours_start: formData.active_hours_start || null,
                active_hours_end: formData.active_hours_end || null,
                active_timezone: formData.active_timezone,
                auto_approve_under_cents: formData.auto_approve_under ? dollarsToCents(formData.auto_approve_under) : null,
                require_human_above_cents: formData.require_human_above ? dollarsToCents(formData.require_human_above) : null,
                // AAV fields
                aav_enabled: formData.aav_enabled,
                authorized_agent_ids: parseList(formData.authorized_agent_ids),
                aav_grant_ids: parseList(formData.aav_grant_ids),
                aav_enforcement_mode: formData.aav_enforcement_mode || null
            };

            if (isEditing) {
                await updatePolicy(policy.id, payload);
            } else {
                await createPolicy(payload);
            }
            
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return formData.name && formData.escrow_id;
            case 1: return true;
            case 2: return true;
            case 3: return true;
            default: return false;
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="policy-wizard">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-ss-accent" />
                        </div>
                        <div>
                            <h2 className="font-heading text-lg font-semibold text-ss-text">
                                {isEditing ? 'Edit Fiduciary Policy' : 'Create Fiduciary Policy'}
                            </h2>
                            <p className="text-xs text-ss-text-tertiary">Define a Trust Mandate for your AI agent</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text p-2" data-testid="wizard-close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-5 pt-4 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <button
                                    onClick={() => index < currentStep && setCurrentStep(index)}
                                    disabled={index > currentStep}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        index === currentStep
                                            ? 'bg-ss-accent text-white'
                                            : index < currentStep
                                            ? 'bg-ss-accent/20 text-ss-accent cursor-pointer hover:bg-ss-accent/30'
                                            : 'bg-ss-elevated text-ss-text-tertiary cursor-not-allowed'
                                    }`}
                                    data-testid={`wizard-step-${step.id}`}
                                >
                                    <step.icon size={14} />
                                    <span className="hidden sm:inline">{step.label}</span>
                                </button>
                                {index < steps.length - 1 && (
                                    <ChevronRight size={14} className="text-ss-text-tertiary" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {error && (
                        <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {currentStep === 0 && (
                        <Step1Basics 
                            formData={formData} 
                            escrowAccounts={escrowAccounts} 
                            onChange={handleChange} 
                        />
                    )}
                    {currentStep === 1 && (
                        <Step2Thresholds 
                            formData={formData} 
                            onChange={handleChange} 
                        />
                    )}
                    {currentStep === 2 && (
                        <Step3Restrictions 
                            formData={formData} 
                            onChange={handleChange}
                            toggleDay={toggleDay}
                        />
                    )}
                    {currentStep === 3 && (
                        <Step4Review 
                            formData={formData}
                            escrowAccounts={escrowAccounts}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <div>
                        {currentStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-2 px-4 py-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                                data-testid="wizard-back-btn"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {currentStep === steps.length - 1 ? (
                            <>
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary font-medium transition-all disabled:opacity-50"
                                    data-testid="wizard-save-draft-btn"
                                >
                                    <FileText size={16} />
                                    Save as Draft
                                </button>
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={loading || !canProceed()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                                    data-testid="wizard-activate-btn"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={16} />
                                            {isEditing ? 'Save Changes' : 'Activate Policy'}
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                                data-testid="wizard-next-btn"
                            >
                                Continue
                                <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 1: Basics & Purpose
const Step1Basics = ({ formData, escrowAccounts, onChange }) => (
    <div className="space-y-6">
        <TrustLawCallout>
            A <strong>Fiduciary Policy</strong> is like a trust instrument that governs how funds can be spent. 
            Define the purpose (Trust Mandate) to ensure spending aligns with your organization's intent.
        </TrustLawCallout>

        <div>
            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                Policy Name <span className="text-ss-error">*</span>
            </label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="e.g., Marketing Agent Policy"
                required
                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                data-testid="wizard-policy-name"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                Trust Account (Escrow) <span className="text-ss-error">*</span>
            </label>
            <select
                value={formData.escrow_id}
                onChange={(e) => onChange('escrow_id', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                data-testid="wizard-escrow-select"
            >
                <option value="">Select an escrow account...</option>
                {escrowAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
            </select>
            <p className="text-xs text-ss-text-tertiary mt-1">
                The segregated pool of funds this policy governs
            </p>
        </div>

        <div>
            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                Purpose (Trust Mandate)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
                {PURPOSE_PRESETS.filter(p => p.id !== 'custom').map(preset => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => onChange('purpose', preset.label)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            formData.purpose === preset.label
                                ? 'bg-ss-accent text-white'
                                : 'bg-ss-elevated text-ss-text-secondary hover:bg-ss-surface'
                        }`}
                        data-testid={`purpose-preset-${preset.id}`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
            <input
                type="text"
                value={formData.purpose}
                onChange={(e) => onChange('purpose', e.target.value)}
                placeholder="Describe the permitted purpose for these funds..."
                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                data-testid="wizard-purpose-input"
            />
            <p className="text-xs text-ss-text-tertiary mt-1">
                Free-form text describing what these funds can be used for
            </p>
        </div>
    </div>
);

// Step 2: Amount Thresholds with Dual Slider
const Step2Thresholds = ({ formData, onChange }) => {
    const autoApprove = parseFloat(formData.auto_approve_under) || 0;
    const humanReview = parseFloat(formData.require_human_above) || 0;
    const perTxLimit = parseFloat(formData.per_transaction_limit) || 0;
    const maxLimit = Math.max(perTxLimit, humanReview, autoApprove, 100);

    return (
        <div className="space-y-6">
            <TrustLawCallout>
                Set spending limits and approval thresholds. The dual-slider below visualizes how transactions 
                will be handled: auto-approved, sent for human review, or denied.
            </TrustLawCallout>

            {/* Dual Slider Visualization */}
            <div className="p-4 bg-ss-surface rounded-lg">
                <h4 className="text-sm font-medium text-ss-text mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-ss-accent" />
                    Approval Threshold Configuration
                </h4>
                
                {/* Visual representation */}
                <div className="relative h-12 bg-ss-elevated rounded-lg overflow-hidden mb-4">
                    {autoApprove > 0 && (
                        <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/40 to-emerald-500/20 flex items-center justify-center"
                            style={{ width: `${Math.min((autoApprove / maxLimit) * 100, 100)}%` }}
                        >
                            <span className="text-xs font-medium text-emerald-400">Auto</span>
                        </div>
                    )}
                    {humanReview > autoApprove && (
                        <div 
                            className="absolute inset-y-0 bg-gradient-to-r from-amber-500/30 to-amber-500/10 flex items-center justify-center"
                            style={{ 
                                left: `${(autoApprove / maxLimit) * 100}%`, 
                                width: `${((humanReview - autoApprove) / maxLimit) * 100}%` 
                            }}
                        >
                            <span className="text-xs font-medium text-amber-400">Review</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-emerald-400 mb-2">
                            Auto-Approve Under
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={formData.auto_approve_under}
                                onChange={(e) => onChange('auto_approve_under', e.target.value)}
                                placeholder="50"
                                min="0"
                                step="1"
                                className="w-full pl-7 pr-4 py-2.5 bg-ss-elevated border border-emerald-500/30 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-emerald-500"
                                data-testid="wizard-auto-approve"
                            />
                        </div>
                        <p className="text-xs text-ss-text-tertiary mt-1">Transactions below this are instant</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-amber-400 mb-2">
                            Require Human Above
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={formData.require_human_above}
                                onChange={(e) => onChange('require_human_above', e.target.value)}
                                placeholder="50"
                                min="0"
                                step="1"
                                className="w-full pl-7 pr-4 py-2.5 bg-ss-elevated border border-amber-500/30 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-amber-500"
                                data-testid="wizard-require-human"
                            />
                        </div>
                        <p className="text-xs text-ss-text-tertiary mt-1">Transactions at/above need approval</p>
                    </div>
                </div>
            </div>

            {/* Spending Limits */}
            <div>
                <h4 className="text-sm font-medium text-ss-text mb-3 flex items-center gap-2">
                    <DollarSign size={16} className="text-ss-accent" />
                    Spending Limits (Fiduciary Caps)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">Per Transaction</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={formData.per_transaction_limit}
                                onChange={(e) => onChange('per_transaction_limit', e.target.value)}
                                placeholder="100"
                                min="0"
                                className="w-full pl-7 pr-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                                data-testid="wizard-per-tx-limit"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">Daily Limit</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={formData.daily_limit}
                                onChange={(e) => onChange('daily_limit', e.target.value)}
                                placeholder="500"
                                min="0"
                                className="w-full pl-7 pr-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                                data-testid="wizard-daily-limit"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">Weekly Limit</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={formData.weekly_limit}
                                onChange={(e) => onChange('weekly_limit', e.target.value)}
                                placeholder="2000"
                                min="0"
                                className="w-full pl-7 pr-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                                data-testid="wizard-weekly-limit"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">Monthly Limit</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={formData.monthly_limit}
                                onChange={(e) => onChange('monthly_limit', e.target.value)}
                                placeholder="5000"
                                min="0"
                                className="w-full pl-7 pr-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                                data-testid="wizard-monthly-limit"
                            />
                        </div>
                    </div>
                </div>
                <p className="text-xs text-ss-text-tertiary mt-2">
                    Leave blank for no limit on that period.
                </p>
            </div>
        </div>
    );
};

// Step 3: Restrictions
const Step3Restrictions = ({ formData, onChange, toggleDay }) => (
    <div className="space-y-6">
        <TrustLawCallout>
            Define vendor and category restrictions to ensure funds are only used for their intended purpose. 
            Time windows can limit when the agent can spend.
        </TrustLawCallout>

        {/* Vendor Controls */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Users size={14} className="text-ss-accent" />
                Vendor Restrictions
            </h4>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">Allowed Vendors</label>
                <input
                    type="text"
                    value={formData.allowed_vendors}
                    onChange={(e) => onChange('allowed_vendors', e.target.value)}
                    placeholder="Google Ads, Meta Ads, Anthropic, OpenAI"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary"
                    data-testid="wizard-allowed-vendors"
                />
                <p className="text-xs text-ss-text-tertiary mt-1">Comma-separated. Leave empty to allow all.</p>
            </div>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">Blocked Vendors</label>
                <input
                    type="text"
                    value={formData.blocked_vendors}
                    onChange={(e) => onChange('blocked_vendors', e.target.value)}
                    placeholder="Risky Vendor, Blocked Service"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary"
                    data-testid="wizard-blocked-vendors"
                />
            </div>
        </div>

        {/* Category Controls */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Tag size={14} className="text-ss-accent" />
                Category Restrictions
            </h4>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">Allowed Categories</label>
                <input
                    type="text"
                    value={formData.allowed_categories}
                    onChange={(e) => onChange('allowed_categories', e.target.value)}
                    placeholder="advertising, ai_compute, saas_subscription"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary"
                    data-testid="wizard-allowed-categories"
                />
                <p className="text-xs text-ss-text-tertiary mt-1">Leave empty to allow all categories.</p>
            </div>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">Blocked Categories</label>
                <input
                    type="text"
                    value={formData.blocked_categories}
                    onChange={(e) => onChange('blocked_categories', e.target.value)}
                    placeholder="transfers, wire, gambling"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary"
                    data-testid="wizard-blocked-categories"
                />
            </div>
        </div>

        {/* Time Window */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Clock size={14} className="text-ss-accent" />
                Time Window (Business Hours)
            </h4>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-2">Active Days</label>
                <div className="flex flex-wrap gap-2">
                    {DAYS_OPTIONS.map(day => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                formData.active_days.includes(day.value)
                                    ? 'bg-ss-accent text-white'
                                    : 'bg-ss-elevated text-ss-text-secondary hover:bg-ss-surface'
                            }`}
                            data-testid={`wizard-day-${day.value}`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs text-ss-text-secondary mb-1.5">Start Hour</label>
                    <select
                        value={formData.active_hours_start}
                        onChange={(e) => onChange('active_hours_start', e.target.value)}
                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                        data-testid="wizard-start-hour"
                    >
                        <option value="">Any</option>
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}:00
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-ss-text-secondary mb-1.5">End Hour</label>
                    <select
                        value={formData.active_hours_end}
                        onChange={(e) => onChange('active_hours_end', e.target.value)}
                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                        data-testid="wizard-end-hour"
                    >
                        <option value="">Any</option>
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}:00
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-ss-text-secondary mb-1.5">Timezone</label>
                    <select
                        value={formData.active_timezone}
                        onChange={(e) => onChange('active_timezone', e.target.value)}
                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                        data-testid="wizard-timezone"
                    >
                        {TIMEZONES.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* AAV Agent Authorization */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Shield size={14} className="text-ss-accent" />
                Agent Authorization (AAV Integration)
            </h4>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                    Restrict this policy to specific AI agents verified through Agent Authority Vault (AAV). 
                    When enabled, only agents with matching IDs can spend under this mandate.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.aav_enabled}
                        onChange={(e) => onChange('aav_enabled', e.target.checked)}
                        className="sr-only peer"
                        data-testid="wizard-aav-enabled"
                    />
                    <div className="w-11 h-6 bg-ss-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ss-accent"></div>
                </label>
                <span className="text-sm text-ss-text">Enable AAV agent verification</span>
            </div>
            
            {formData.aav_enabled && (
                <div className="space-y-3 pt-2">
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">Authorized Agent IDs</label>
                        <input
                            type="text"
                            value={formData.authorized_agent_ids}
                            onChange={(e) => onChange('authorized_agent_ids', e.target.value)}
                            placeholder="agent_marketing_bot, agent_procurement"
                            className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary"
                            data-testid="wizard-agent-ids"
                        />
                        <p className="text-xs text-ss-text-tertiary mt-1">Comma-separated list of AAV agent identifiers</p>
                    </div>
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">AAV Grant IDs (Optional)</label>
                        <input
                            type="text"
                            value={formData.aav_grant_ids}
                            onChange={(e) => onChange('aav_grant_ids', e.target.value)}
                            placeholder="grant_marketing_q1, grant_ops_2026"
                            className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary"
                            data-testid="wizard-grant-ids"
                        />
                        <p className="text-xs text-ss-text-tertiary mt-1">Time-bound grants from AAV (alternative to agent IDs)</p>
                    </div>
                    <div>
                        <label className="block text-xs text-ss-text-secondary mb-1.5">Enforcement Mode</label>
                        <select
                            value={formData.aav_enforcement_mode}
                            onChange={(e) => onChange('aav_enforcement_mode', e.target.value)}
                            className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm"
                            data-testid="wizard-aav-mode"
                        >
                            <option value="">Inherit from escrow</option>
                            <option value="warn">Warn (log but allow)</option>
                            <option value="strict">Strict (deny unauthorized)</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    </div>
);

// Step 4: Review & Activate
const Step4Review = ({ formData, escrowAccounts }) => {
    const formatCurrency = (val) => val ? `$${parseFloat(val).toFixed(2)}` : 'No limit';
    const formatList = (val) => val ? val.split(',').map(s => s.trim()).filter(s => s).join(', ') : 'All permitted';
    const escrowName = escrowAccounts.find(a => a.id === formData.escrow_id)?.name || 'Unknown';

    return (
        <div className="space-y-4">
            <TrustLawCallout type="success">
                Review your Trust Mandate below. You can save as a draft for later review, or activate immediately 
                to begin enforcement.
            </TrustLawCallout>

            <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-ss-accent/10 flex items-center justify-center">
                        <Scale className="w-6 h-6 text-ss-accent" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-ss-text">{formData.name || 'Unnamed Policy'}</h3>
                        {formData.purpose && (
                            <p className="text-xs text-ss-accent mt-0.5">Purpose: {formData.purpose}</p>
                        )}
                        <p className="text-xs text-ss-text-tertiary">Trust Account: {escrowName}</p>
                    </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                    {/* Approval Thresholds */}
                    <div>
                        <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            Approval Thresholds
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {formData.auto_approve_under && (
                                <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium">
                                    Auto-approve under ${formData.auto_approve_under}
                                </span>
                            )}
                            {formData.require_human_above && (
                                <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium">
                                    Human review above ${formData.require_human_above}
                                </span>
                            )}
                            {!formData.auto_approve_under && !formData.require_human_above && (
                                <span className="text-xs text-ss-text-tertiary">No thresholds configured</span>
                            )}
                        </div>
                    </div>

                    {/* Limits */}
                    <div>
                        <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            Spending Limits
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Per Tx</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.per_transaction_limit)}</p>
                            </div>
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Daily</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.daily_limit)}</p>
                            </div>
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Weekly</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.weekly_limit)}</p>
                            </div>
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Monthly</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.monthly_limit)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Restrictions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                                Vendor Restrictions
                            </h4>
                            <p className="text-xs text-ss-text-secondary">
                                <span className="text-ss-accent">Allowed:</span> {formatList(formData.allowed_vendors)}
                            </p>
                            {formData.blocked_vendors && (
                                <p className="text-xs text-ss-text-secondary mt-1">
                                    <span className="text-ss-error">Blocked:</span> {formData.blocked_vendors}
                                </p>
                            )}
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                                Category Restrictions
                            </h4>
                            <p className="text-xs text-ss-text-secondary">
                                <span className="text-ss-accent">Allowed:</span> {formatList(formData.allowed_categories)}
                            </p>
                            {formData.blocked_categories && (
                                <p className="text-xs text-ss-text-secondary mt-1">
                                    <span className="text-ss-error">Blocked:</span> {formData.blocked_categories}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Time Window */}
                    <div>
                        <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            Time Window
                        </h4>
                        <p className="text-xs text-ss-text-secondary">
                            Days: {formData.active_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        </p>
                        {formData.active_hours_start && formData.active_hours_end && (
                            <p className="text-xs text-ss-text-tertiary mt-1">
                                Hours: {formData.active_hours_start}:00 - {formData.active_hours_end}:00 ({formData.active_timezone})
                            </p>
                        )}
                    </div>

                    {/* AAV Agent Authorization */}
                    {formData.aav_enabled && (
                        <div>
                            <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                                Agent Authorization (AAV)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs">
                                    AAV Enabled
                                </span>
                                {formData.aav_enforcement_mode && (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs ${
                                        formData.aav_enforcement_mode === 'strict' 
                                            ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                    }`}>
                                        Mode: {formData.aav_enforcement_mode}
                                    </span>
                                )}
                            </div>
                            {formData.authorized_agent_ids && (
                                <p className="text-xs text-ss-text-secondary mt-2">
                                    <span className="text-ss-accent">Agents:</span> {formData.authorized_agent_ids}
                                </p>
                            )}
                            {formData.aav_grant_ids && (
                                <p className="text-xs text-ss-text-secondary mt-1">
                                    <span className="text-ss-accent">Grants:</span> {formData.aav_grant_ids}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Trust Law Callout Component
const TrustLawCallout = ({ children, type = 'info' }) => {
    const styles = {
        info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Scale, iconColor: 'text-blue-400' },
        success: { bg: 'bg-ss-accent/10', border: 'border-ss-accent/30', icon: CheckCircle, iconColor: 'text-ss-accent' }
    };
    const style = styles[type];
    const Icon = style.icon;

    return (
        <div className={`${style.bg} ${style.border} border rounded-lg p-3 mb-4`}>
            <div className="flex gap-2">
                <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={16} />
                <div className="text-ss-text-secondary text-xs">{children}</div>
            </div>
        </div>
    );
};

export default FiduciaryPoliciesPage;
