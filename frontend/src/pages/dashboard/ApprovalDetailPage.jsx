import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { 
    ArrowLeft, 
    Check, 
    X, 
    Clock, 
    DollarSign,
    AlertCircle,
    RefreshCw,
    CheckCircle,
    XCircle,
    Timer
} from 'lucide-react';
import {
    getApproval,
    approveApproval,
    denyApproval,
    formatCents,
    formatDate
} from '@/lib/api';

const ApprovalDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [approval, setApproval] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingAction, setProcessingAction] = useState(null);
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
        fetchApproval();
    }, [id]);

    // Calculate time remaining
    useEffect(() => {
        if (!approval || approval.status !== 'pending' || !approval.expires_at) return;
        
        const calculateTimeRemaining = () => {
            const now = new Date();
            const expires = new Date(approval.expires_at);
            const diff = expires - now;
            
            if (diff <= 0) {
                setTimeRemaining({ expired: true });
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeRemaining({ hours, minutes, seconds, total: diff });
        };
        
        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);
        
        return () => clearInterval(interval);
    }, [approval]);

    const fetchApproval = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getApproval(id);
            setApproval(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setProcessingAction('approve');
        setError(null);
        try {
            await approveApproval(id);
            await fetchApproval();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingAction(null);
        }
    };

    const handleDeny = async (reason, note) => {
        setProcessingAction('deny');
        setError(null);
        try {
            await denyApproval(id, reason, note);
            setShowDenyModal(false);
            await fetchApproval();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingAction(null);
        }
    };

    const isPending = approval?.status === 'pending';
    const isExpired = timeRemaining?.expired || (approval?.status === 'expired');

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !approval) {
        return (
            <div className="space-y-6" data-testid="approval-detail-error">
                <button
                    onClick={() => navigate('/dashboard/approvals')}
                    className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Approvals
                </button>
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error">
                    {error}
                </div>
            </div>
        );
    }

    const sr = approval?.spend_request;

    return (
        <div className="space-y-6" data-testid="approval-detail-page">
            {/* Back button */}
            <button
                onClick={() => navigate('/dashboard/approvals')}
                className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                data-testid="back-btn"
            >
                <ArrowLeft size={18} />
                Back to Approvals
            </button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="font-heading text-2xl font-bold text-ss-text">
                            {formatCents(sr?.amount_cents)} to {sr?.vendor}
                        </h1>
                        <StatusBadge status={isExpired && isPending ? 'expired' : approval?.status} />
                    </div>
                    <p className="text-ss-text-secondary">
                        Approval ID: <span className="font-mono text-ss-text-tertiary">{approval?.id}</span>
                    </p>
                </div>
                <button
                    onClick={fetchApproval}
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

            {/* Time remaining (for pending) */}
            {isPending && !isExpired && timeRemaining && (
                <div className="bg-ss-warning/10 border border-ss-warning/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Timer className="w-6 h-6 text-ss-warning" />
                        <div>
                            <p className="text-sm font-medium text-ss-warning">Time remaining to decide</p>
                            <p className="text-2xl font-bold font-mono text-ss-text">
                                {String(timeRemaining.hours).padStart(2, '0')}:
                                {String(timeRemaining.minutes).padStart(2, '0')}:
                                {String(timeRemaining.seconds).padStart(2, '0')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expired warning */}
            {isExpired && (
                <div className="bg-ss-error/10 border border-ss-error/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-ss-error" />
                    <p className="text-ss-error">This approval has expired and can no longer be actioned.</p>
                </div>
            )}

            {/* Action buttons (for pending only) */}
            {isPending && !isExpired && (
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleApprove}
                        disabled={!!processingAction}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 rounded-xl text-white font-medium text-lg transition-all"
                        data-testid="approve-btn"
                    >
                        <Check size={22} />
                        {processingAction === 'approve' ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                        onClick={() => setShowDenyModal(true)}
                        disabled={!!processingAction}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-ss-error/10 hover:bg-ss-error/20 disabled:opacity-50 rounded-xl text-ss-error font-medium text-lg transition-all"
                        data-testid="deny-btn"
                    >
                        <X size={22} />
                        {processingAction === 'deny' ? 'Denying...' : 'Deny'}
                    </button>
                </div>
            )}

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Request details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Spend Request Summary */}
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Spend Request</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-1">Amount</p>
                                <p className="text-2xl font-bold font-mono text-ss-accent">
                                    {formatCents(sr?.amount_cents)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-1">Currency</p>
                                <p className="text-lg text-ss-text uppercase">{sr?.currency || 'USD'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-1">Vendor</p>
                                <p className="text-ss-text">{sr?.vendor}</p>
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-1">Category</p>
                                <p className="text-ss-text">{sr?.category || '-'}</p>
                            </div>
                        </div>
                        {sr?.description && (
                            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                                <p className="text-xs text-ss-text-tertiary mb-1">Description</p>
                                <p className="text-ss-text">{sr.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Rules Evaluated */}
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Rules Evaluation</h2>
                        <div className="space-y-3">
                            {sr?.rules_evaluated?.map((rule, index) => (
                                <div 
                                    key={index}
                                    className="flex items-start gap-3 p-3 bg-ss-elevated rounded-lg"
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        rule.passed 
                                            ? 'bg-ss-accent/20' 
                                            : 'bg-ss-error/20'
                                    }`}>
                                        {rule.passed 
                                            ? <CheckCircle className="w-4 h-4 text-ss-accent" />
                                            : <XCircle className="w-4 h-4 text-ss-error" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-ss-text capitalize">
                                            {rule.rule?.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-xs text-ss-text-tertiary">{rule.reason}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Decision (if already decided) */}
                    {!isPending && (
                        <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                            <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Decision</h2>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        approval.status === 'approved' 
                                            ? 'bg-ss-accent/20' 
                                            : approval.status === 'denied' 
                                                ? 'bg-ss-error/20' 
                                                : 'bg-ss-text-tertiary/20'
                                    }`}>
                                        {approval.status === 'approved' 
                                            ? <CheckCircle className="w-5 h-5 text-ss-accent" />
                                            : approval.status === 'denied'
                                                ? <XCircle className="w-5 h-5 text-ss-error" />
                                                : <Clock className="w-5 h-5 text-ss-text-tertiary" />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-ss-text capitalize">{approval.status}</p>
                                        <p className="text-sm text-ss-text-tertiary">
                                            {approval.decided_by || 'System'} · {formatDate(approval.decided_at || approval.expires_at)}
                                        </p>
                                    </div>
                                </div>
                                {approval.decision_note && (
                                    <div className="p-3 bg-ss-elevated rounded-lg">
                                        <p className="text-xs text-ss-text-tertiary mb-1">Note</p>
                                        <p className="text-sm text-ss-text">{approval.decision_note}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Protected Account */}
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Protected Account</h2>
                        {approval?.escrow_account ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">Account</p>
                                    <p className="text-ss-text font-medium">{approval.escrow_account.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">Current Balance</p>
                                    <p className="text-xl font-bold font-mono text-ss-accent">
                                        {formatCents(approval.escrow_account.balance_cents)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-ss-text-tertiary mb-1">After Approval</p>
                                    <p className="text-lg font-mono text-ss-text-secondary">
                                        {formatCents(approval.escrow_account.balance_cents - sr?.amount_cents)}
                                    </p>
                                </div>
                                <Link
                                    to={`/dashboard/accounts/${approval.escrow_account.id}`}
                                    className="block w-full text-center px-4 py-2 bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] rounded-lg text-ss-text-secondary text-sm transition-all"
                                >
                                    View Account
                                </Link>
                            </div>
                        ) : (
                            <p className="text-ss-text-tertiary text-sm">Account information not available</p>
                        )}
                    </div>

                    {/* Timeline */}
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                        <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Timeline</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-ss-accent" />
                                <div>
                                    <p className="text-ss-text">Requested</p>
                                    <p className="text-xs text-ss-text-tertiary">{formatDate(approval?.requested_at)}</p>
                                </div>
                            </div>
                            {approval?.expires_at && (
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isExpired ? 'bg-ss-error' : 'bg-ss-warning'}`} />
                                    <div>
                                        <p className="text-ss-text">{isExpired ? 'Expired' : 'Expires'}</p>
                                        <p className="text-xs text-ss-text-tertiary">{formatDate(approval.expires_at)}</p>
                                    </div>
                                </div>
                            )}
                            {approval?.decided_at && (
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${
                                        approval.status === 'approved' ? 'bg-ss-accent' : 'bg-ss-error'
                                    }`} />
                                    <div>
                                        <p className="text-ss-text capitalize">{approval.status}</p>
                                        <p className="text-xs text-ss-text-tertiary">{formatDate(approval.decided_at)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linked Transaction */}
                    {sr?.id && (
                        <Link
                            to={`/dashboard/transactions/${sr.id}`}
                            className="block bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6 hover:bg-ss-elevated transition-colors"
                            data-testid="view-transaction-link"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-ss-text-tertiary mb-1">View Transaction</p>
                                    <p className="text-ss-text font-mono text-sm">{sr.id.substring(0, 20)}...</p>
                                </div>
                                <DollarSign className="w-5 h-5 text-ss-text-tertiary" />
                            </div>
                        </Link>
                    )}
                </div>
            </div>

            {/* Deny Modal */}
            {showDenyModal && (
                <DenyModal
                    approval={approval}
                    isProcessing={processingAction === 'deny'}
                    onClose={() => setShowDenyModal(false)}
                    onDeny={handleDeny}
                />
            )}
        </div>
    );
};

// Deny Modal Component
const DenyModal = ({ approval, isProcessing, onClose, onDeny }) => {
    const [reason, setReason] = useState('human_denied');
    const [note, setNote] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onDeny(reason, note);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="deny-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-heading text-lg font-semibold text-ss-text">Deny Request</h2>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Request summary */}
                    <div className="p-4 bg-ss-elevated rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-ss-text-secondary">Amount</span>
                            <span className="font-bold font-mono text-ss-text">{formatCents(approval.spend_request?.amount_cents)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-ss-text-secondary">Vendor</span>
                            <span className="text-ss-text">{approval.spend_request?.vendor}</span>
                        </div>
                    </div>

                    {/* Reason selection */}
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Reason
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                            data-testid="deny-reason-select"
                        >
                            <option value="human_denied">Human Denied</option>
                            <option value="suspicious_activity">Suspicious Activity</option>
                            <option value="budget_exceeded">Budget Exceeded</option>
                            <option value="vendor_not_approved">Vendor Not Approved</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Note (optional)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add a note about why this request was denied..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent resize-none"
                            data-testid="deny-note-input"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                            data-testid="cancel-deny-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 px-4 py-2.5 bg-ss-error hover:bg-ss-error/80 disabled:opacity-50 rounded-lg text-white font-medium transition-all"
                            data-testid="confirm-deny-btn"
                        >
                            {isProcessing ? 'Denying...' : 'Deny Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApprovalDetailPage;
