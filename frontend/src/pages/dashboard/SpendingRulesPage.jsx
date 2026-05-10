import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import PolicyBuilderWizard from '@/components/PolicyBuilderWizard';
import { 
    Shield, 
    Plus, 
    RefreshCw, 
    X,
    Pencil,
    Trash2,
    ChevronDown,
    ChevronUp,
    Clock,
    DollarSign,
    Users,
    Tag,
    BookOpen,
    Wand2,
    Lock,
    Unlock,
    FileText,
    AlertCircle
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

const SpendingRulesPage = () => {
    const [policies, setPolicies] = useState([]);
    const [escrowAccounts, setEscrowAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
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
        if (!window.confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
            return;
        }
        try {
            await deletePolicy(id);
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleActive = async (policy) => {
        try {
            await updatePolicy(policy.id, { is_active: !policy.is_active });
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLock = async (policy) => {
        if (!window.confirm(`Lock and activate policy "${policy.name}"?\n\nOnce locked:\n• The policy will be enforced for spend requests\n• It cannot be modified until unlocked\n• An audit trail entry will be created`)) {
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

    const openEditModal = (policy) => {
        setEditingPolicy(policy);
        setShowModal(true);
    };

    const getEscrowName = (escrowId) => {
        const account = escrowAccounts.find(a => a.id === escrowId);
        return account?.name || escrowId?.substring(0, 12) + '...';
    };

    return (
        <div className="space-y-6" data-testid="spending-rules-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Spending Rules</h1>
                    <p className="text-ss-text-secondary mt-1">
                        Define spending policies for your protected accounts.{' '}
                        <Link to="/docs/api#policies" className="text-ss-accent hover:underline inline-flex items-center gap-1">
                            <BookOpen size={14} />
                            Learn how the rules engine works
                        </Link>
                        {' · '}
                        <Link to="/docs/trust-law" className="text-ss-accent hover:underline inline-flex items-center gap-1">
                            New to spending policies? Read the Trust Law Explainer
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
                        onClick={() => setShowWizard(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-ss-accent/50 hover:bg-ss-accent/10 rounded-lg text-ss-accent font-medium transition-all"
                        data-testid="wizard-btn"
                    >
                        <Wand2 size={16} />
                        Policy Wizard
                    </button>
                    <button
                        onClick={() => {
                            setEditingPolicy(null);
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="new-policy-btn"
                    >
                        <Plus size={16} />
                        New Policy
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error" data-testid="error-message">
                    {error}
                </div>
            )}

            {/* Draft Policies Alert */}
            {!loading && policies.filter(p => p.status === 'draft').length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg" data-testid="draft-alert">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-medium text-amber-400">
                                {policies.filter(p => p.status === 'draft').length} draft {policies.filter(p => p.status === 'draft').length === 1 ? 'policy' : 'policies'} pending review
                            </h3>
                            <p className="text-sm text-amber-400/70 mt-1">
                                Your agent has configured policies that need your approval. Review each draft and click "Approve & Lock" to activate them.
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
                        <Shield className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">No spending rules yet</h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto mb-6">
                        Add a policy to define spending limits for your agent.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="empty-new-policy-btn"
                    >
                        <Plus size={18} />
                        New Policy
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
                            onEdit={() => openEditModal(policy)}
                            onDelete={() => handleDelete(policy.id)}
                            onToggleActive={() => handleToggleActive(policy)}
                            onLock={() => handleLock(policy)}
                            onUnlock={() => handleUnlock(policy)}
                            onRefresh={fetchData}
                        />
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <PolicyModal
                    policy={editingPolicy}
                    escrowAccounts={escrowAccounts}
                    onClose={() => {
                        setShowModal(false);
                        setEditingPolicy(null);
                    }}
                    onSuccess={() => {
                        setShowModal(false);
                        setEditingPolicy(null);
                        fetchData();
                    }}
                />
            )}

            {/* Policy Builder Wizard */}
            {showWizard && (
                <PolicyBuilderWizard
                    escrowAccounts={escrowAccounts}
                    onClose={() => setShowWizard(false)}
                    onSuccess={() => {
                        setShowWizard(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

// Policy Card Component
const PolicyCard = ({ policy, escrowName, expanded, onToggleExpand, onEdit, onDelete, onToggleActive, onLock, onUnlock, onRefresh }) => {
    const isDraft = policy.status === 'draft';
    const isLocked = policy.is_locked;
    const isArchived = policy.status === 'archived';
    const agentSummary = policy.metadata?.summary;
    
    return (
        <div className={`bg-ss-surface rounded-xl border overflow-hidden ${
            isDraft ? 'border-amber-500/50' : 
            isLocked ? 'border-teal-500/30' : 
            'border-[rgba(255,255,255,0.06)]'
        }`} data-testid={`policy-card-${policy.id}`}>
            {/* Draft Banner */}
            {isDraft && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
                    <FileText size={14} className="text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">DRAFT - Review and lock to activate</span>
                </div>
            )}
            
            {/* Agent Summary (if present) */}
            {agentSummary && isDraft && (
                <div className="bg-ss-elevated/50 border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
                    <p className="text-sm text-ss-text-secondary italic">"{agentSummary}"</p>
                    <p className="text-xs text-ss-text-tertiary mt-1">— Agent-provided summary</p>
                </div>
            )}
            
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDraft ? 'bg-amber-500/10' : 
                        isLocked ? 'bg-teal-500/10' : 
                        'bg-ss-accent/10'
                    }`}>
                        {isLocked ? (
                            <Lock className="w-5 h-5 text-teal-400" />
                        ) : isDraft ? (
                            <FileText className="w-5 h-5 text-amber-400" />
                        ) : (
                            <Shield className="w-5 h-5 text-ss-accent" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-ss-text truncate">{policy.name}</h3>
                        <p className="text-xs text-ss-text-tertiary truncate">
                            Linked to: {escrowName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Status Badges */}
                    {isLocked && (
                        <span className="px-2 py-1 bg-teal-500/10 border border-teal-500/30 rounded text-xs font-medium text-teal-400 flex items-center gap-1">
                            <Lock size={12} />
                            Locked
                        </span>
                    )}
                    {isDraft && (
                        <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-medium text-amber-400">
                            Draft
                        </span>
                    )}
                    {isArchived && (
                        <span className="px-2 py-1 bg-ss-text-tertiary/10 border border-[rgba(255,255,255,0.06)] rounded text-xs font-medium text-ss-text-tertiary">
                            Archived
                        </span>
                    )}
                    {!isDraft && !isArchived && (
                        <StatusBadge status={policy.is_active ? 'active' : 'paused'} />
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
                {policy.allowed_vendors?.length > 0 && (
                    <span className="px-2 py-1 bg-ss-elevated rounded text-xs text-ss-text-secondary">
                        {policy.allowed_vendors.length} allowed vendors
                    </span>
                )}
                {policy.auto_approve_under_cents && (
                    <span className="px-2 py-1 bg-ss-accent/10 rounded text-xs text-ss-accent">
                        Auto-approve &lt; {formatCents(policy.auto_approve_under_cents)}
                    </span>
                )}
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4 bg-ss-elevated/50">
                    {/* Limits Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                                <span className="text-xs font-medium text-ss-text-secondary">Vendor Rules</span>
                            </div>
                            {policy.allowed_vendors?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {policy.allowed_vendors.map((v, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-ss-accent/10 text-ss-accent rounded text-xs">{v}</span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-ss-text-tertiary">All vendors allowed</span>
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
                                <span className="text-xs font-medium text-ss-text-secondary">Category Rules</span>
                            </div>
                            {policy.allowed_categories?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {policy.allowed_categories.map((c, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-ss-accent/10 text-ss-accent rounded text-xs">{c}</span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-ss-text-tertiary">All categories allowed</span>
                            )}
                        </div>
                    </div>

                    {/* Time & Approval Rules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="p-3 bg-ss-surface rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield size={14} className="text-ss-text-tertiary" />
                                <span className="text-xs font-medium text-ss-text-secondary">Approval Rules</span>
                            </div>
                            <div className="space-y-1 text-xs">
                                {policy.auto_approve_under_cents && (
                                    <div className="text-ss-accent">Auto-approve under {formatCents(policy.auto_approve_under_cents)}</div>
                                )}
                                {policy.require_human_above_cents && (
                                    <div className="text-ss-warning">Require human above {formatCents(policy.require_human_above_cents)}</div>
                                )}
                                {!policy.auto_approve_under_cents && !policy.require_human_above_cents && (
                                    <div className="text-ss-text-tertiary">No approval thresholds set</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="flex items-center gap-2">
                            {/* Lock/Unlock Button */}
                            {isDraft && (
                                <button
                                    onClick={onLock}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg text-teal-400 text-xs font-medium transition-all"
                                    data-testid={`lock-btn-${policy.id}`}
                                >
                                    <Lock size={12} />
                                    Approve & Lock
                                </button>
                            )}
                            {isLocked && (
                                <button
                                    onClick={onUnlock}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-medium transition-all"
                                    data-testid={`unlock-btn-${policy.id}`}
                                >
                                    <Unlock size={12} />
                                    Unlock for Editing
                                </button>
                            )}
                            {!isDraft && !isLocked && (
                                <button
                                    onClick={onToggleActive}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        policy.is_active 
                                            ? 'bg-ss-warning/10 text-ss-warning hover:bg-ss-warning/20' 
                                            : 'bg-ss-accent/10 text-ss-accent hover:bg-ss-accent/20'
                                    }`}
                                    data-testid={`toggle-active-${policy.id}`}
                                >
                                    {policy.is_active ? 'Deactivate' : 'Activate'}
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
                                <span className="text-xs text-ss-text-tertiary">
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

const LimitItem = ({ icon: Icon, label, value }) => (
    <div className="p-3 bg-ss-surface rounded-lg">
        <div className="flex items-center gap-1.5 mb-1">
            <Icon size={12} className="text-ss-text-tertiary" />
            <span className="text-xs text-ss-text-tertiary">{label}</span>
        </div>
        <p className="text-sm font-medium text-ss-text">{value}</p>
    </div>
);

// Policy Modal Component
const PolicyModal = ({ policy, escrowAccounts, onClose, onSuccess }) => {
    const isEditing = !!policy;
    
    const [formData, setFormData] = useState({
        name: policy?.name || '',
        escrow_id: policy?.escrow_id || '',
        is_active: policy?.is_active ?? true,
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
        approval_timeout_minutes: policy?.approval_timeout_minutes?.toString() || '60'
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState('basic');

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                name: formData.name,
                escrow_id: formData.escrow_id,
                is_active: formData.is_active,
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
                approval_timeout_minutes: parseInt(formData.approval_timeout_minutes) || 60
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

    const sections = [
        { id: 'basic', label: 'Basic Info' },
        { id: 'limits', label: 'Amount Limits' },
        { id: 'vendors', label: 'Vendor Controls' },
        { id: 'categories', label: 'Categories' },
        { id: 'time', label: 'Time Window' },
        { id: 'approval', label: 'Approval Rules' }
    ];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="policy-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <h2 className="font-heading text-lg font-semibold text-ss-text">
                        {isEditing ? 'Edit Policy' : 'New Spending Policy'}
                    </h2>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>

                {/* Section Tabs */}
                <div className="flex overflow-x-auto border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                                activeSection === section.id
                                    ? 'text-ss-accent border-b-2 border-ss-accent'
                                    : 'text-ss-text-secondary hover:text-ss-text'
                            }`}
                            data-testid={`section-tab-${section.id}`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm">
                                {error}
                            </div>
                        )}

                        {/* Basic Info */}
                        {activeSection === 'basic' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Policy Name <span className="text-ss-error">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        placeholder="e.g., Marketing Agent Policy"
                                        required
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="policy-name-input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                    Protected Account <span className="text-ss-error">*</span>
                                    </label>
                                    <select
                                        value={formData.escrow_id}
                                        onChange={(e) => handleChange('escrow_id', e.target.value)}
                                        required
                                        disabled={isEditing}
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent disabled:opacity-50"
                                        data-testid="escrow-select"
                                    >
                                        <option value="">Select a protected account...</option>
                                        {escrowAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => handleChange('is_active', e.target.checked)}
                                            className="sr-only peer"
                                            data-testid="is-active-toggle"
                                        />
                                        <div className="w-11 h-6 bg-ss-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-ss-text after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ss-accent"></div>
                                    </label>
                                    <span className="text-sm text-ss-text-secondary">Policy Active</span>
                                </div>
                            </div>
                        )}

                        {/* Amount Limits */}
                        {activeSection === 'limits' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                            Per-Transaction Limit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                            <input
                                                type="number"
                                                value={formData.per_transaction_limit}
                                                onChange={(e) => handleChange('per_transaction_limit', e.target.value)}
                                                placeholder="100.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                                data-testid="per-tx-limit-input"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                            Daily Limit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                            <input
                                                type="number"
                                                value={formData.daily_limit}
                                                onChange={(e) => handleChange('daily_limit', e.target.value)}
                                                placeholder="500.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                                data-testid="daily-limit-input"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                            Weekly Limit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                            <input
                                                type="number"
                                                value={formData.weekly_limit}
                                                onChange={(e) => handleChange('weekly_limit', e.target.value)}
                                                placeholder="2000.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                                data-testid="weekly-limit-input"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                            Monthly Limit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                            <input
                                                type="number"
                                                value={formData.monthly_limit}
                                                onChange={(e) => handleChange('monthly_limit', e.target.value)}
                                                placeholder="10000.00"
                                                min="0"
                                                step="0.01"
                                                className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                                data-testid="monthly-limit-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-ss-text-tertiary">
                                    Leave empty for no limit on that period.
                                </p>
                            </div>
                        )}

                        {/* Vendor Controls */}
                        {activeSection === 'vendors' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Allowed Vendors
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.allowed_vendors}
                                        onChange={(e) => handleChange('allowed_vendors', e.target.value)}
                                        placeholder="Google Ads, Meta Ads, Anthropic"
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="allowed-vendors-input"
                                    />
                                    <p className="text-xs text-ss-text-tertiary mt-1">Comma-separated. Leave empty to allow all.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Blocked Vendors
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.blocked_vendors}
                                        onChange={(e) => handleChange('blocked_vendors', e.target.value)}
                                        placeholder="Competitor1, UnsafeVendor"
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="blocked-vendors-input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Vendor Match Mode
                                    </label>
                                    <div className="flex gap-4">
                                        {['exact', 'contains', 'regex'].map(mode => (
                                            <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="vendor_match_mode"
                                                    value={mode}
                                                    checked={formData.vendor_match_mode === mode}
                                                    onChange={(e) => handleChange('vendor_match_mode', e.target.value)}
                                                    className="text-ss-accent focus:ring-ss-accent"
                                                    data-testid={`vendor-mode-${mode}`}
                                                />
                                                <span className="text-sm text-ss-text capitalize">{mode}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Categories */}
                        {activeSection === 'categories' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Allowed Categories
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.allowed_categories}
                                        onChange={(e) => handleChange('allowed_categories', e.target.value)}
                                        placeholder="advertising, ai_compute, saas"
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="allowed-categories-input"
                                    />
                                    <p className="text-xs text-ss-text-tertiary mt-1">Comma-separated. Leave empty to allow all.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Blocked Categories
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.blocked_categories}
                                        onChange={(e) => handleChange('blocked_categories', e.target.value)}
                                        placeholder="gambling, transfers"
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="blocked-categories-input"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Time Window */}
                        {activeSection === 'time' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Active Days
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OPTIONS.map(day => (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                    formData.active_days.includes(day.value)
                                                        ? 'bg-ss-accent text-white'
                                                        : 'bg-ss-elevated text-ss-text-secondary hover:bg-[rgba(255,255,255,0.1)]'
                                                }`}
                                                data-testid={`day-${day.value}`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                            Start Hour
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.active_hours_start}
                                            onChange={(e) => handleChange('active_hours_start', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                            data-testid="start-hour-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                            End Hour
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.active_hours_end}
                                            onChange={(e) => handleChange('active_hours_end', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                            data-testid="end-hour-input"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Timezone
                                    </label>
                                    <select
                                        value={formData.active_timezone}
                                        onChange={(e) => handleChange('active_timezone', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                        data-testid="timezone-select"
                                    >
                                        {TIMEZONES.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Approval Rules */}
                        {activeSection === 'approval' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Auto-Approve Under
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                        <input
                                            type="number"
                                            value={formData.auto_approve_under}
                                            onChange={(e) => handleChange('auto_approve_under', e.target.value)}
                                            placeholder="50.00"
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                            data-testid="auto-approve-input"
                                        />
                                    </div>
                                    <p className="text-xs text-ss-text-tertiary mt-1">Transactions under this amount are auto-approved.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Require Human Above
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                        <input
                                            type="number"
                                            value={formData.require_human_above}
                                            onChange={(e) => handleChange('require_human_above', e.target.value)}
                                            placeholder="100.00"
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                            data-testid="require-human-input"
                                        />
                                    </div>
                                    <p className="text-xs text-ss-text-tertiary mt-1">Transactions above this amount require human approval.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                        Approval Timeout (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.approval_timeout_minutes}
                                        onChange={(e) => handleChange('approval_timeout_minutes', e.target.value)}
                                        placeholder="60"
                                        min="1"
                                        className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="approval-timeout-input"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 p-6 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                            data-testid="cancel-policy-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.name || !formData.escrow_id}
                            className="flex-1 px-4 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                            data-testid="submit-policy-btn"
                        >
                            {loading ? 'Saving...' : isEditing ? 'Update Policy' : 'Create Policy'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SpendingRulesPage;
