import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { 
    CheckCircle, 
    RefreshCw, 
    X,
    Check,
    Clock,
    DollarSign,
    AlertCircle,
    ExternalLink
} from 'lucide-react';
import {
    listApprovals,
    approveApproval,
    denyApproval,
    listEscrowAccounts,
    formatCents,
    formatDate
} from '@/lib/api';

const ApprovalsPage = () => {
    const [approvals, setApprovals] = useState([]);
    const [escrowAccounts, setEscrowAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    const [processingId, setProcessingId] = useState(null);
    const [showDenyModal, setShowDenyModal] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [approvalsData, accountsData] = await Promise.all([
                listApprovals(activeTab),
                listEscrowAccounts()
            ]);
            setApprovals(approvalsData.data || []);
            setEscrowAccounts(accountsData.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setProcessingId(id);
        setError(null);
        try {
            await approveApproval(id);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeny = async (id, reason, note) => {
        setProcessingId(id);
        setError(null);
        try {
            await denyApproval(id, reason, note);
            setShowDenyModal(null);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const getEscrowName = (escrowId) => {
        const account = escrowAccounts.find(a => a.id === escrowId);
        return account?.name || escrowId?.substring(0, 12) + '...';
    };

    const isExpired = (expiresAt) => {
        return expiresAt && new Date() > new Date(expiresAt);
    };

    const tabs = [
        { id: 'pending', label: 'Pending', count: null },
        { id: 'approved', label: 'Approved', count: null },
        { id: 'denied', label: 'Denied', count: null },
        { id: 'expired', label: 'Expired', count: null }
    ];

    return (
        <div className="space-y-6" data-testid="approvals-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Approvals</h1>
                    <p className="text-ss-text-secondary mt-1">Review and approve pending spend requests that exceed auto-approve thresholds</p>
                </div>
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

            {/* Tabs */}
            <div className="flex border-b border-[rgba(255,255,255,0.06)]">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium transition-all ${
                            activeTab === tab.id
                                ? 'text-ss-accent border-b-2 border-ss-accent'
                                : 'text-ss-text-secondary hover:text-ss-text'
                        }`}
                        data-testid={`tab-${tab.id}`}
                    >
                        {tab.label}
                    </button>
                ))}
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
            {!loading && approvals.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center" data-testid="empty-state">
                    <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">
                        {activeTab === 'pending' ? 'No pending approvals' : `No ${activeTab} approvals`}
                    </h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto">
                        {activeTab === 'pending' 
                            ? 'When spend requests exceed approval thresholds, they will appear here for review.'
                            : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} approvals will appear here.`
                        }
                    </p>
                </div>
            )}

            {/* Approvals list */}
            {!loading && approvals.length > 0 && (
                <div className="space-y-4">
                    {approvals.map((approval) => (
                        <ApprovalCard
                            key={approval.id}
                            approval={approval}
                            escrowName={getEscrowName(approval.spend_request?.escrow_id)}
                            isPending={activeTab === 'pending'}
                            isExpired={isExpired(approval.expires_at)}
                            isProcessing={processingId === approval.id}
                            onApprove={() => handleApprove(approval.id)}
                            onDeny={() => setShowDenyModal(approval)}
                        />
                    ))}
                </div>
            )}

            {/* Deny Modal */}
            {showDenyModal && (
                <DenyModal
                    approval={showDenyModal}
                    isProcessing={processingId === showDenyModal.id}
                    onClose={() => setShowDenyModal(null)}
                    onDeny={(reason, note) => handleDeny(showDenyModal.id, reason, note)}
                />
            )}
        </div>
    );
};

// Approval Card Component
const ApprovalCard = ({ approval, escrowName, isPending, isExpired, isProcessing, onApprove, onDeny }) => {
    const sr = approval.spend_request;
    
    return (
        <div 
            className={`bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden ${isExpired && isPending ? 'opacity-60' : ''}`}
            data-testid={`approval-card-${approval.id}`}
        >
            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left side - Request details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-ss-warning/10 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-5 h-5 text-ss-warning" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold font-mono text-ss-text">
                                        {formatCents(sr?.amount_cents)}
                                    </span>
                                    <span className="text-sm text-ss-text-tertiary uppercase">{sr?.currency || 'USD'}</span>
                                </div>
                                <p className="text-sm text-ss-text-secondary truncate">
                                    {sr?.vendor} {sr?.category && `· ${sr.category}`}
                                </p>
                            </div>
                        </div>

                        {/* Request metadata */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-0.5">Protected Account</p>
                                <p className="text-ss-text truncate">{escrowName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-0.5">Requested</p>
                                <p className="text-ss-text">{formatDate(approval.requested_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-0.5">Expires</p>
                                <p className={`${isExpired ? 'text-ss-error' : 'text-ss-text'}`}>
                                    {approval.expires_at ? formatDate(approval.expires_at) : 'Never'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-ss-text-tertiary mb-0.5">Status</p>
                                <StatusBadge status={isExpired && isPending ? 'expired' : approval.status} />
                            </div>
                        </div>

                        {/* Description */}
                        {sr?.description && (
                            <div className="mt-3 p-3 bg-ss-elevated rounded-lg">
                                <p className="text-xs text-ss-text-tertiary mb-1">Description</p>
                                <p className="text-sm text-ss-text">{sr.description}</p>
                            </div>
                        )}

                        {/* Decision note (for non-pending) */}
                        {approval.decision_note && (
                            <div className="mt-3 p-3 bg-ss-elevated rounded-lg">
                                <p className="text-xs text-ss-text-tertiary mb-1">Decision Note</p>
                                <p className="text-sm text-ss-text">{approval.decision_note}</p>
                            </div>
                        )}
                    </div>

                    {/* Right side - Actions (only for pending) */}
                    {isPending && !isExpired && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                                onClick={onApprove}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 rounded-lg text-white font-medium transition-all"
                                data-testid={`approve-btn-${approval.id}`}
                            >
                                <Check size={16} />
                                Approve
                            </button>
                            <button
                                onClick={onDeny}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-ss-error/10 hover:bg-ss-error/20 disabled:opacity-50 rounded-lg text-ss-error font-medium transition-all"
                                data-testid={`deny-btn-${approval.id}`}
                            >
                                <X size={16} />
                                Deny
                            </button>
                            <Link
                                to={`/dashboard/approvals/${approval.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] rounded-lg text-ss-text-secondary text-sm transition-all"
                                data-testid={`view-detail-btn-${approval.id}`}
                            >
                                <ExternalLink size={14} />
                                Details
                            </Link>
                        </div>
                    )}

                    {/* Non-pending actions */}
                    {!isPending && (
                        <div className="flex-shrink-0">
                            <Link
                                to={`/dashboard/approvals/${approval.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] rounded-lg text-ss-text-secondary text-sm transition-all"
                                data-testid={`view-detail-btn-${approval.id}`}
                            >
                                <ExternalLink size={14} />
                                View Details
                            </Link>
                        </div>
                    )}

                    {/* Expired warning */}
                    {isPending && isExpired && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 px-3 py-2 bg-ss-error/10 rounded-lg text-ss-error text-sm">
                                <AlertCircle size={16} />
                                Expired
                            </div>
                            <Link
                                to={`/dashboard/approvals/${approval.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-ss-elevated hover:bg-[rgba(255,255,255,0.06)] rounded-lg text-ss-text-secondary text-sm transition-all"
                            >
                                <ExternalLink size={14} />
                                Details
                            </Link>
                        </div>
                    )}
                </div>
            </div>
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

export default ApprovalsPage;
