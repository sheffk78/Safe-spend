import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import {
    ArrowLeft,
    Wallet,
    DollarSign,
    RefreshCw,
    Pause,
    Play,
    X,
    Shield,
    Key,
    Clock,
    Bot,
    Copy,
    Check
} from 'lucide-react';
import {
    getEscrowAccount,
    getFundingHistory,
    formatCents,
    formatDate
} from '@/lib/api';

const EscrowAccountDetailPage = () => {
    const { id } = useParams();
    const [account, setAccount] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copiedId, setCopiedId] = useState(false);

    useEffect(() => {
        fetchAccount();
    }, [id]);

    const fetchAccount = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getEscrowAccount(id);
            setAccount(data);
            // Also fetch funding history
            try {
                const historyData = await getFundingHistory(id);
                setHistory(historyData.data || []);
            } catch {
                // History is non-critical, ignore errors
                setHistory([]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyId = () => {
        if (account?.id) {
            navigator.clipboard.writeText(account.id);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !account) {
        return (
            <div className="space-y-6" data-testid="escrow-detail-error">
                <Link
                    to="/dashboard/accounts"
                    className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Escrow Accounts
                </Link>
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error">
                    {error}
                </div>
            </div>
        );
    }

    if (!account) return null;

    return (
        <div className="space-y-6" data-testid="escrow-detail-page">
            {/* Back link */}
            <Link
                to="/dashboard/accounts"
                className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
            >
                <ArrowLeft size={18} />
                Back to Escrow Accounts
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="font-heading text-2xl font-bold text-ss-text">
                            {account.name}
                        </h1>
                        <StatusBadge status={account.status} />
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-ss-text-tertiary text-sm font-mono">{account.id}</p>
                        <button
                            onClick={handleCopyId}
                            className="text-ss-text-tertiary hover:text-ss-text transition-colors"
                            data-testid="copy-id-btn"
                        >
                            {copiedId ? <Check size={14} className="text-ss-accent" /> : <Copy size={14} />}
                        </button>
                    </div>
                    {account.description && (
                        <p className="text-ss-text-secondary text-sm mt-1">{account.description}</p>
                    )}
                </div>
                <button
                    onClick={fetchAccount}
                    className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                    data-testid="refresh-btn"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error" data-testid="error-message">
                    {error}
                </div>
            )}

            {/* Main info grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Balance card - spans 2 cols */}
                <div className="lg:col-span-2 bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h2 className="font-heading text-lg font-semibold text-ss-text mb-4 flex items-center gap-2">
                        <Wallet size={20} className="text-ss-accent" />
                        Balance
                    </h2>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Current Balance</p>
                            <p className="text-2xl font-bold font-mono text-ss-accent">{formatCents(account.balance_cents)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Total Funded</p>
                            <p className="text-2xl font-bold font-mono text-ss-text">{formatCents(account.total_funded_cents)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary mb-1">Total Spent</p>
                            <p className="text-2xl font-bold font-mono text-ss-text-secondary">{formatCents(account.total_spent_cents)}</p>
                        </div>
                    </div>

                    {/* Spending bar */}
                    {account.total_funded_cents > 0 && (
                        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                            <div className="flex justify-between text-xs text-ss-text-tertiary mb-1">
                                <span>Spent</span>
                                <span>{((account.total_spent_cents / account.total_funded_cents) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-ss-elevated rounded-full h-2">
                                <div
                                    className="bg-ss-accent rounded-full h-2 transition-all"
                                    style={{ width: `${Math.min(100, (account.total_spent_cents / account.total_funded_cents) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: Account info */}
                <div className="space-y-6">
                    {/* Account details card */}
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Details</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-1">Status</p>
                                <StatusBadge status={account.status} />
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-1">Created</p>
                                <p className="text-sm text-ss-text flex items-center gap-1.5">
                                    <Clock size={14} className="text-ss-text-tertiary" />
                                    {formatDate(account.created_at)}
                                </p>
                            </div>
                            {account.closed_at && (
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">Closed</p>
                                    <p className="text-sm text-ss-text flex items-center gap-1.5">
                                        <Clock size={14} className="text-ss-text-tertiary" />
                                        {formatDate(account.closed_at)}
                                    </p>
                                </div>
                            )}
                            {account.currency && (
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">Currency</p>
                                    <p className="text-sm text-ss-text uppercase">{account.currency}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Agent Authorization card */}
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4 flex items-center gap-2">
                            <Shield size={18} className="text-ss-accent" />
                            Agent Authorization
                        </h2>
                        {account.aav_enabled ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">Enforcement Mode</p>
                                    <p className="text-sm text-ss-text">
                                        {account.aav_enforcement_mode === 'verify' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-medium text-red-400">
                                                Verify (Strict)
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-medium text-amber-400">
                                                Log Only
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">Authorized Agents</p>
                                    {(account.authorized_agent_ids?.length > 0 || account.aav_grant_ids?.length > 0) ? (
                                        <div className="space-y-1">
                                            {account.authorized_agent_ids?.map((agentId, i) => (
                                                <div key={`agent-${i}`} className="flex items-center gap-2 text-sm text-ss-text">
                                                    <Bot size={14} className="text-ss-accent flex-shrink-0" />
                                                    <code className="font-mono text-xs">{agentId}</code>
                                                </div>
                                            ))}
                                            {account.aav_grant_ids?.map((grantId, i) => (
                                                <div key={`grant-${i}`} className="flex items-center gap-2 text-sm text-ss-text">
                                                    <Key size={14} className="text-ss-text-tertiary flex-shrink-0" />
                                                    <code className="font-mono text-xs">{grantId}</code>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-ss-text-secondary">Any agent key accepted</p>
                                    )}
                                </div>
                                {account.aav_require_certificate && (
                                    <div className="flex items-center gap-2 text-sm text-ss-text-secondary">
                                        <Shield size={14} className="text-ss-accent" />
                                        Certificate required
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-ss-text-tertiary">
                                <p>Agent authorization is not enabled for this account.</p>
                                <p className="mt-1">Any API key can spend from this account.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Funding History */}
            {history.length > 0 && (
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h2 className="font-heading text-lg font-semibold text-ss-text mb-4 flex items-center gap-2">
                        <DollarSign size={20} />
                        Recent Funding
                    </h2>
                    <div className="space-y-3">
                        {history.slice(0, 10).map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-3 bg-ss-elevated rounded-lg border border-[rgba(255,255,255,0.04)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        event.type === 'refund' ? 'bg-purple-500/20' : 'bg-ss-accent/20'
                                    }`}>
                                        {event.type === 'refund' ? (
                                            <X size={16} className="text-purple-400" />
                                        ) : (
                                            <DollarSign size={16} className="text-ss-accent" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-ss-text">
                                            {event.type === 'refund' ? 'Refund' : 'Funding'}
                                        </p>
                                        <p className="text-xs text-ss-text-tertiary">{formatDate(event.created_at)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-mono font-semibold ${
                                        event.type === 'refund' ? 'text-purple-400' : 'text-ss-accent'
                                    }`}>
                                        {event.type === 'refund' ? '-' : '+'}{formatCents(event.amount_cents)}
                                    </p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        event.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                                        event.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                        event.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                        'bg-ss-text-tertiary/20 text-ss-text-tertiary'
                                    }`}>
                                        {event.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EscrowAccountDetailPage;