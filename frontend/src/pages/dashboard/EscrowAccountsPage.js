import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { 
    Wallet, 
    Plus, 
    RefreshCw, 
    DollarSign, 
    Pause, 
    Play, 
    X,
    MoreVertical,
    ArrowRight,
    CreditCard,
    History,
    ExternalLink,
    CheckCircle,
    AlertTriangle,
    Shield,
    Bot,
    Key,
    Info
} from 'lucide-react';
import {
    listEscrowAccounts,
    createEscrowAccount,
    fundEscrowAccount,
    createFundingSession,
    confirmFunding,
    getFundingHistory,
    pauseEscrowAccount,
    resumeEscrowAccount,
    closeEscrowAccount,
    formatCents,
    dollarsToCents,
    formatDate
} from '@/lib/api';

const EscrowAccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showFundModal, setShowFundModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [actionMenuOpen, setActionMenuOpen] = useState(null);
    const [fundingSuccess, setFundingSuccess] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        fetchAccounts();
        
        // Check for funding callback
        const funding = searchParams.get('funding');
        if (funding === 'success') {
            setFundingSuccess({ type: 'success', message: 'Payment initiated! Your balance will update shortly.' });
            searchParams.delete('funding');
            setSearchParams(searchParams);
        } else if (funding === 'cancel') {
            setFundingSuccess({ type: 'warning', message: 'Funding was cancelled.' });
            searchParams.delete('funding');
            setSearchParams(searchParams);
        }
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listEscrowAccounts();
            setAccounts(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePause = async (id) => {
        try {
            await pauseEscrowAccount(id);
            fetchAccounts();
        } catch (err) {
            setError(err.message);
        }
        setActionMenuOpen(null);
    };

    const handleResume = async (id) => {
        try {
            await resumeEscrowAccount(id);
            fetchAccounts();
        } catch (err) {
            setError(err.message);
        }
        setActionMenuOpen(null);
    };

    const handleClose = async (id) => {
        if (!window.confirm('Are you sure you want to close this escrow account? This action cannot be undone.')) {
            return;
        }
        try {
            await closeEscrowAccount(id);
            fetchAccounts();
        } catch (err) {
            setError(err.message);
        }
        setActionMenuOpen(null);
    };

    const openFundModal = (account) => {
        setSelectedAccount(account);
        setShowFundModal(true);
        setActionMenuOpen(null);
    };

    const openHistoryModal = (account) => {
        setSelectedAccount(account);
        setShowHistoryModal(true);
        setActionMenuOpen(null);
    };

    // Calculate summary metrics
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance_cents || 0), 0);
    const totalFunded = accounts.reduce((sum, acc) => sum + (acc.total_funded_cents || 0), 0);
    const totalSpent = accounts.reduce((sum, acc) => sum + (acc.total_spent_cents || 0), 0);
    const activeCount = accounts.filter(acc => acc.status === 'active').length;

    return (
        <div className="space-y-6" data-testid="escrow-accounts-page">
            {/* Funding Success/Cancel Message */}
            {fundingSuccess && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                    fundingSuccess.type === 'success' 
                        ? 'bg-ss-accent/10 border-ss-accent/30' 
                        : 'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                    {fundingSuccess.type === 'success' ? (
                        <CheckCircle className="text-ss-accent flex-shrink-0" size={20} />
                    ) : (
                        <AlertTriangle className="text-yellow-400 flex-shrink-0" size={20} />
                    )}
                    <span className={fundingSuccess.type === 'success' ? 'text-ss-accent' : 'text-yellow-400'}>
                        {fundingSuccess.message}
                    </span>
                    <button 
                        onClick={() => setFundingSuccess(null)}
                        className="ml-auto text-ss-text-tertiary hover:text-ss-text"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Escrow Accounts</h1>
                    <p className="text-ss-text-secondary mt-1">Manage your segregated escrow accounts and fund balances</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAccounts}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="refresh-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="new-account-btn"
                    >
                        <Plus size={16} />
                        New Escrow Account
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-ss-surface p-5 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="summary-total-balance">
                    <p className="text-ss-text-tertiary text-sm mb-1">Total Balance</p>
                    <p className="text-2xl font-bold text-ss-accent font-heading">{formatCents(totalBalance)}</p>
                </div>
                <div className="bg-ss-surface p-5 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="summary-total-funded">
                    <p className="text-ss-text-tertiary text-sm mb-1">Total Funded</p>
                    <p className="text-2xl font-bold text-ss-text font-heading">{formatCents(totalFunded)}</p>
                </div>
                <div className="bg-ss-surface p-5 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="summary-total-spent">
                    <p className="text-ss-text-tertiary text-sm mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-ss-text font-heading">{formatCents(totalSpent)}</p>
                </div>
                <div className="bg-ss-surface p-5 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="summary-active-accounts">
                    <p className="text-ss-text-tertiary text-sm mb-1">Active Accounts</p>
                    <p className="text-2xl font-bold text-ss-text font-heading">{activeCount} / {accounts.length}</p>
                </div>
            </div>

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
            {!loading && accounts.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center" data-testid="empty-state">
                    <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                        <Wallet className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">No escrow accounts yet</h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto mb-6">
                        Create your first trust account to start controlling agent spending.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="empty-new-account-btn"
                    >
                        <Plus size={18} />
                        New Escrow Account
                    </button>
                </div>
            )}

            {/* Accounts table */}
            {!loading && accounts.length > 0 && (
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-ss-elevated">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Account</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Balance</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Funded</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Spent</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Agent Access</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Created</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((account) => (
                                    <tr 
                                        key={account.id}
                                        className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                        data-testid={`account-row-${account.id}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-ss-text">{account.name}</p>
                                                <p className="text-xs font-mono text-ss-text-tertiary">{account.id.substring(0, 16)}...</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono font-semibold text-ss-accent">
                                            {formatCents(account.balance_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-ss-text-secondary">
                                            {formatCents(account.total_funded_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-ss-text-secondary">
                                            {formatCents(account.total_spent_cents)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {account.aav_enabled && (account.authorized_agent_ids?.length > 0 || account.aav_grant_ids?.length > 0) ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs font-medium text-blue-400" data-testid={`aav-indicator-${account.id}`}>
                                                    <Shield size={12} />
                                                    {(account.authorized_agent_ids?.length || 0) + (account.aav_grant_ids?.length || 0)} Agent{((account.authorized_agent_ids?.length || 0) + (account.aav_grant_ids?.length || 0)) !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-500/10 border border-slate-500/30 rounded-full text-xs font-medium text-slate-400" data-testid={`aav-indicator-${account.id}`}>
                                                    <Key size={12} />
                                                    Any Key
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={account.status} />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-ss-text-secondary">
                                            {formatDate(account.created_at).split(',')[0]}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActionMenuOpen(actionMenuOpen === account.id ? null : account.id)}
                                                    className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                                                    data-testid={`action-menu-${account.id}`}
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {actionMenuOpen === account.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg shadow-lg z-10" data-testid={`action-dropdown-${account.id}`}>
                                                        <button
                                                            onClick={() => openFundModal(account)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ss-text hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                            data-testid={`fund-btn-${account.id}`}
                                                        >
                                                            <DollarSign size={14} />
                                                            Fund Account
                                                        </button>
                                                        <button
                                                            onClick={() => openHistoryModal(account)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ss-text hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                            data-testid={`history-btn-${account.id}`}
                                                        >
                                                            <History size={14} />
                                                            Funding History
                                                        </button>
                                                        {account.status === 'active' && (
                                                            <button
                                                                onClick={() => handlePause(account.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ss-warning hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                                data-testid={`pause-btn-${account.id}`}
                                                            >
                                                                <Pause size={14} />
                                                                Pause Spending
                                                            </button>
                                                        )}
                                                        {account.status === 'paused' && (
                                                            <button
                                                                onClick={() => handleResume(account.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ss-accent hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                                data-testid={`resume-btn-${account.id}`}
                                                            >
                                                                <Play size={14} />
                                                                Resume Spending
                                                            </button>
                                                        )}
                                                        {account.status !== 'closed' && (
                                                            <button
                                                                onClick={() => handleClose(account.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ss-error hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                                data-testid={`close-btn-${account.id}`}
                                                            >
                                                                <X size={14} />
                                                                Close Account
                                                            </button>
                                                        )}
                                                        <Link
                                                            to={`/dashboard/accounts/${account.id}`}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ss-text hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                            data-testid={`view-btn-${account.id}`}
                                                        >
                                                            <ArrowRight size={14} />
                                                            View Details
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateAccountModal 
                    onClose={() => setShowCreateModal(false)} 
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchAccounts();
                    }}
                />
            )}

            {/* Fund Modal */}
            {showFundModal && selectedAccount && (
                <FundAccountModal 
                    account={selectedAccount}
                    onClose={() => {
                        setShowFundModal(false);
                        setSelectedAccount(null);
                    }} 
                    onSuccess={() => {
                        setShowFundModal(false);
                        setSelectedAccount(null);
                        fetchAccounts();
                    }}
                />
            )}

            {/* History Modal */}
            {showHistoryModal && selectedAccount && (
                <FundingHistoryModal 
                    account={selectedAccount}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setSelectedAccount(null);
                    }} 
                />
            )}

            {/* Click outside to close action menu */}
            {actionMenuOpen && (
                <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setActionMenuOpen(null)}
                />
            )}
        </div>
    );
};

// Create Account Modal
const CreateAccountModal = ({ onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [initialFunding, setInitialFunding] = useState('');
    const [aavEnabled, setAavEnabled] = useState(false);
    const [aavEnforcementMode, setAavEnforcementMode] = useState('log_only');
    const [agentIdsInput, setAgentIdsInput] = useState('');
    const [aavApiKey, setAavApiKey] = useState('');
    const [aavRequireCertificate, setAavRequireCertificate] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Parse agent IDs from comma-separated input
            const authorizedAgentIds = agentIdsInput
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0);

            const account = await createEscrowAccount({ 
                name, 
                description,
                aav_enabled: aavEnabled,
                aav_enforcement_mode: aavEnabled ? aavEnforcementMode : undefined,
                authorized_agent_ids: aavEnabled && authorizedAgentIds.length > 0 ? authorizedAgentIds : undefined,
                aav_api_key: aavEnabled && aavApiKey ? aavApiKey : undefined,
                aav_require_certificate: aavEnabled ? aavRequireCertificate : undefined
            });
            
            // Fund if initial amount provided
            if (initialFunding && parseFloat(initialFunding) > 0) {
                await fundEscrowAccount(account.id, dollarsToCents(initialFunding));
            }
            
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="create-account-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-heading text-lg font-semibold text-ss-text">New Escrow Account</h2>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Account Name <span className="text-ss-error">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Marketing Agent Funds"
                            required
                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                            data-testid="account-name-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent resize-none"
                            data-testid="account-description-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Initial Funding (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={initialFunding}
                                onChange={(e) => setInitialFunding(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                data-testid="initial-funding-input"
                            />
                        </div>
                        <p className="text-xs text-ss-text-tertiary mt-1">Leave empty to create without initial funding</p>
                    </div>

                    {/* AAV Configuration Section */}
                    <div className="border-t border-[rgba(255,255,255,0.06)] pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-blue-400" />
                                <span className="text-sm font-medium text-ss-text">Agent Authorization</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={aavEnabled}
                                    onChange={(e) => setAavEnabled(e.target.checked)}
                                    className="sr-only peer"
                                    data-testid="aav-toggle"
                                />
                                <div 
                                    onClick={() => setAavEnabled(!aavEnabled)}
                                    className="w-9 h-5 bg-ss-elevated rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full cursor-pointer"
                                    data-testid="aav-toggle-visual"
                                ></div>
                            </label>
                        </div>
                        
                        {aavEnabled && (
                            <div className="space-y-3 pl-6 border-l-2 border-blue-500/30">
                                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Info size={14} className="text-blue-400 mt-0.5" />
                                        <p className="text-xs text-blue-300">
                                            When enabled, only agents with matching IDs can spend from this account. Leave empty to allow any agent initially.
                                        </p>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-ss-text-secondary mb-1.5">
                                        Enforcement Mode
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAavEnforcementMode('log_only')}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                aavEnforcementMode === 'log_only'
                                                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                                                    : 'bg-ss-elevated border border-[rgba(255,255,255,0.1)] text-ss-text-secondary hover:text-ss-text'
                                            }`}
                                            data-testid="aav-mode-log-only"
                                        >
                                            Log Only
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAavEnforcementMode('verify')}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                aavEnforcementMode === 'verify'
                                                    ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                                                    : 'bg-ss-elevated border border-[rgba(255,255,255,0.1)] text-ss-text-secondary hover:text-ss-text'
                                            }`}
                                            data-testid="aav-mode-verify"
                                        >
                                            Verify (Strict)
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-ss-text-tertiary mt-1">
                                        {aavEnforcementMode === 'log_only' 
                                            ? 'Check AAV but allow if unauthorized (for testing)' 
                                            : 'Require AAV authorization - deny if check fails'}
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-ss-text-secondary mb-1.5">
                                        AAV API Key <span className="text-ss-text-tertiary">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={aavApiKey}
                                            onChange={(e) => setAavApiKey(e.target.value)}
                                            placeholder="aav_live_sk_..."
                                            className="w-full px-3 py-2 pr-10 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-blue-500"
                                            data-testid="aav-api-key-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary hover:text-ss-text"
                                        >
                                            {showApiKey ? <X size={14} /> : <Key size={14} />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-ss-text-tertiary mt-1">
                                        Get from <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">agentictrust.app</a> for server-to-server verification
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-ss-text-secondary mb-1.5">
                                        Authorized Agent IDs
                                    </label>
                                    <input
                                        type="text"
                                        value={agentIdsInput}
                                        onChange={(e) => setAgentIdsInput(e.target.value)}
                                        placeholder="agent_xyz123, agent_abc456"
                                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-blue-500"
                                        data-testid="authorized-agents-input"
                                    />
                                    <p className="text-[11px] text-ss-text-tertiary mt-1">Comma-separated list of AAV agent identifiers</p>
                                </div>
                                
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <span className="text-xs font-medium text-ss-text">Require Certificate</span>
                                        <p className="text-[11px] text-ss-text-tertiary">Agents must present a valid AAV certificate</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={aavRequireCertificate}
                                            onChange={(e) => setAavRequireCertificate(e.target.checked)}
                                            className="sr-only peer"
                                            data-testid="aav-require-cert-toggle"
                                        />
                                        <div 
                                            onClick={() => setAavRequireCertificate(!aavRequireCertificate)}
                                            className="w-9 h-5 bg-ss-elevated rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full cursor-pointer"
                                        ></div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                            data-testid="cancel-create-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="flex-1 px-4 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                            data-testid="submit-create-btn"
                        >
                            {loading ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Fund Account Modal with Stripe integration
const FundAccountModal = ({ account, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [useStripe, setUseStripe] = useState(true);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return;
        
        setLoading(true);
        setError(null);

        try {
            if (useStripe) {
                // Create Stripe checkout session
                const baseUrl = window.location.origin;
                const result = await createFundingSession(
                    account.id,
                    dollarsToCents(amount),
                    `${baseUrl}/dashboard/accounts?funding=success`,
                    `${baseUrl}/dashboard/accounts?funding=cancel`
                );
                
                // Redirect to Stripe Checkout
                if (result.checkout_url) {
                    window.location.href = result.checkout_url;
                } else {
                    throw new Error('No checkout URL returned');
                }
            } else {
                // Use simulated funding (for testing)
                await fundEscrowAccount(account.id, dollarsToCents(amount));
                onSuccess();
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="fund-account-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
                    <div>
                        <h2 className="font-heading text-lg font-semibold text-ss-text">Fund Account</h2>
                        <p className="text-sm text-ss-text-tertiary mt-0.5">{account.name}</p>
                    </div>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm">
                            {error}
                        </div>
                    )}
                    <div className="p-4 bg-ss-elevated rounded-lg">
                        <p className="text-xs text-ss-text-tertiary mb-1">Current Balance</p>
                        <p className="text-xl font-bold font-mono text-ss-accent">{formatCents(account.balance_cents)}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Amount to Add (USD) <span className="text-ss-error">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="100.00"
                                min="0.01"
                                step="0.01"
                                required
                                className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                data-testid="fund-amount-input"
                            />
                        </div>
                    </div>
                    
                    {/* Payment method selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-ss-text-secondary">Payment Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setUseStripe(true)}
                                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                                    useStripe 
                                        ? 'border-ss-accent bg-ss-accent/10 text-ss-accent' 
                                        : 'border-[rgba(255,255,255,0.1)] bg-ss-elevated text-ss-text-secondary hover:border-ss-accent/50'
                                }`}
                            >
                                <CreditCard size={18} />
                                <div className="text-left">
                                    <p className="text-sm font-medium">Stripe</p>
                                    <p className="text-xs opacity-70">Test cards</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setUseStripe(false)}
                                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                                    !useStripe 
                                        ? 'border-ss-accent bg-ss-accent/10 text-ss-accent' 
                                        : 'border-[rgba(255,255,255,0.1)] bg-ss-elevated text-ss-text-secondary hover:border-ss-accent/50'
                                }`}
                            >
                                <DollarSign size={18} />
                                <div className="text-left">
                                    <p className="text-sm font-medium">Simulated</p>
                                    <p className="text-xs opacity-70">Instant</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {amount && parseFloat(amount) > 0 && (
                        <div className="p-4 bg-ss-accent/10 border border-ss-accent/20 rounded-lg">
                            <p className="text-xs text-ss-text-tertiary mb-1">New Balance After Funding</p>
                            <p className="text-xl font-bold font-mono text-ss-accent">
                                {formatCents(account.balance_cents + dollarsToCents(amount))}
                            </p>
                        </div>
                    )}

                    {useStripe && (
                        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm">
                            <ExternalLink size={16} className="flex-shrink-0" />
                            <span>You'll be redirected to Stripe to complete payment</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                            data-testid="cancel-fund-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount || parseFloat(amount) <= 0}
                            className="flex-1 px-4 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
                            data-testid="submit-fund-btn"
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : useStripe ? (
                                <>
                                    <CreditCard size={16} />
                                    Pay with Stripe
                                </>
                            ) : (
                                'Fund Account'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Funding History Modal
const FundingHistoryModal = ({ account, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, [account.id]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await getFundingHistory(account.id);
            setHistory(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            succeeded: 'bg-green-500/20 text-green-400',
            failed: 'bg-red-500/20 text-red-400',
            refunded: 'bg-purple-500/20 text-purple-400',
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="funding-history-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
                    <div>
                        <h2 className="font-heading text-lg font-semibold text-ss-text">Funding History</h2>
                        <p className="text-sm text-ss-text-tertiary mt-0.5">{account.name}</p>
                    </div>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="animate-spin text-ss-text-tertiary" size={24} />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-ss-error">{error}</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-ss-text-tertiary">
                            <History size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No funding history yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((event) => (
                                <div 
                                    key={event.id} 
                                    className="flex items-center justify-between p-4 bg-ss-elevated rounded-lg border border-[rgba(255,255,255,0.06)]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            event.type === 'refund' ? 'bg-purple-500/20' : 'bg-ss-accent/20'
                                        }`}>
                                            {event.type === 'refund' ? (
                                                <History size={16} className="text-purple-400" />
                                            ) : (
                                                <DollarSign size={16} className="text-ss-accent" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-ss-text">
                                                {event.type === 'refund' ? 'Refund' : 'Funding'}
                                            </p>
                                            <p className="text-xs text-ss-text-tertiary">
                                                {formatDate(event.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-mono font-semibold ${
                                            event.type === 'refund' ? 'text-purple-400' : 'text-ss-accent'
                                        }`}>
                                            {event.type === 'refund' ? '-' : '+'}{formatCents(event.amount_cents)}
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(event.status)}`}>
                                            {event.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-[rgba(255,255,255,0.06)]">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EscrowAccountsPage;
