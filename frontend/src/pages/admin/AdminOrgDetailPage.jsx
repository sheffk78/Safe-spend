import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
    Building2,
    ArrowLeft,
    RefreshCw,
    Wallet,
    Shield,
    Key,
    Activity,
    FileText,
    DollarSign,
    Calendar,
    UserCog,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Format cents to dollars
const formatCents = (cents) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(cents / 100);
};

// Format date
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Status badge
const StatusBadge = ({ status }) => {
    const styles = {
        active: 'bg-green-500/20 text-green-400',
        approved: 'bg-green-500/20 text-green-400',
        denied: 'bg-red-500/20 text-red-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        paused: 'bg-orange-500/20 text-orange-400',
        expired: 'bg-ss-text-tertiary/20 text-ss-text-tertiary',
        depleted: 'bg-red-500/20 text-red-400',
        closed: 'bg-ss-text-tertiary/20 text-ss-text-tertiary'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-ss-text-tertiary/20 text-ss-text-tertiary'}`}>
            {status?.toUpperCase()}
        </span>
    );
};

const AdminOrgDetailPage = () => {
    const { orgId } = useParams();
    const { getAdminToken, startImpersonation } = useAdminAuth();
    const [orgData, setOrgData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [impersonating, setImpersonating] = useState(false);

    useEffect(() => {
        fetchOrgDetail();
    }, [orgId]);

    const fetchOrgDetail = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/admin/orgs/${orgId}`, {
                headers: {
                    'Authorization': `Bearer ${getAdminToken()}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Organization not found');
                }
                throw new Error('Failed to fetch organization details');
            }

            const data = await response.json();
            setOrgData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async () => {
        setImpersonating(true);
        try {
            await startImpersonation(orgId);
        } catch (err) {
            setError(err.message);
            setImpersonating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Link
                    to="/admin/orgs"
                    className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Organizations
                </Link>
                <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                    <AlertTriangle className="mx-auto mb-3 text-red-400" size={40} />
                    <h2 className="font-semibold text-ss-text mb-2">Error Loading Organization</h2>
                    <p className="text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    const { organization, escrows, policies, apiKeys, recentTransactions, recentAuditEvents, metrics } = orgData;

    return (
        <div className="space-y-6" data-testid="admin-org-detail-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        to="/admin/orgs"
                        className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors mb-2"
                    >
                        <ArrowLeft size={16} />
                        Back to Organizations
                    </Link>
                    <h1 className="font-heading text-2xl font-bold text-ss-text flex items-center gap-3">
                        <Building2 className="text-ss-accent" size={28} />
                        {organization.name}
                    </h1>
                    <p className="text-ss-text-secondary mt-1">{organization.email}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchOrgDetail}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-gray-200 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={handleImpersonate}
                        disabled={impersonating}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg text-ss-text font-medium transition-all"
                        data-testid="impersonate-btn"
                    >
                        {impersonating ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <UserCog size={16} />
                        )}
                        Impersonate Org
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Calendar className="text-ss-accent" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary">Created</p>
                            <p className="text-sm font-medium text-ss-text">{formatDate(organization.createdAt)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <DollarSign className="text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary">Total Balance</p>
                            <p className="text-lg font-bold text-ss-text">
                                {formatCents(escrows.reduce((sum, e) => sum + e.balanceCents, 0))}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Activity className="text-ss-accent" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary">30-Day Volume</p>
                            <p className="text-lg font-bold text-ss-text">{formatCents(metrics.volume30DaysCents)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Key className="text-orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-ss-text-tertiary">API Keys</p>
                            <p className="text-lg font-bold text-ss-text">{apiKeys.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Escrow Accounts */}
                <div className="bg-ss-surface rounded-xl border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-ss-text flex items-center gap-2">
                            <Wallet size={18} className="text-ss-accent" />
                            Protected Accounts ({escrows.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                        {escrows.length === 0 ? (
                            <div className="p-6 text-center text-ss-text-tertiary">
                                No protected accounts
                            </div>
                        ) : (
                            escrows.map((escrow) => (
                                <div key={escrow.id} className="p-4 hover:bg-ss-elevated/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-ss-text">{escrow.name}</p>
                                            <p className="text-xs text-ss-text-tertiary font-mono">{escrow.id}</p>
                                        </div>
                                        <StatusBadge status={escrow.status} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <p className="text-ss-text-tertiary">Balance</p>
                                            <p className="text-ss-text font-medium">{formatCents(escrow.balanceCents)}</p>
                                        </div>
                                        <div>
                                            <p className="text-ss-text-tertiary">Funded</p>
                                            <p className="text-green-400">{formatCents(escrow.totalFundedCents)}</p>
                                        </div>
                                        <div>
                                            <p className="text-ss-text-tertiary">Spent</p>
                                            <p className="text-ss-text">{formatCents(escrow.totalSpentCents)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Policies */}
                <div className="bg-ss-surface rounded-xl border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-ss-text flex items-center gap-2">
                            <Shield size={18} className="text-ss-accent" />
                            Spending Policies ({policies.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                        {policies.length === 0 ? (
                            <div className="p-6 text-center text-ss-text-tertiary">
                                No policies configured
                            </div>
                        ) : (
                            policies.map((policy) => (
                                <div key={policy.id} className="p-4 hover:bg-ss-elevated/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-ss-text">{policy.name}</p>
                                            <p className="text-xs text-ss-text-tertiary">
                                                Linked to: {policy.escrowName}
                                            </p>
                                        </div>
                                        <span className={`w-2 h-2 rounded-full ${policy.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-ss-surface rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-ss-text flex items-center gap-2">
                        <Activity size={18} className="text-ss-accent" />
                        Recent Transactions
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {recentTransactions.length === 0 ? (
                        <div className="p-6 text-center text-ss-text-tertiary">
                            No transactions yet
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="border-b border-gray-100">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase">Time</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase">Amount</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase">Vendor</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase">Category</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-[rgba(255,255,255,0.04)]">
                                        <td className="py-3 px-4 text-sm text-ss-text-secondary">
                                            {formatDate(tx.createdAt)}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-ss-text">
                                            {formatCents(tx.amountCents)}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-ss-text">{tx.vendor}</td>
                                        <td className="py-3 px-4 text-sm text-ss-text-secondary">{tx.category || '-'}</td>
                                        <td className="py-3 px-4">
                                            <StatusBadge status={tx.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Recent Audit Events */}
            <div className="bg-ss-surface rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="font-semibold text-ss-text flex items-center gap-2">
                        <FileText size={18} className="text-ss-accent" />
                        Recent Audit Events
                    </h2>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {recentAuditEvents.length === 0 ? (
                        <div className="p-6 text-center text-ss-text-tertiary">
                            No audit events yet
                        </div>
                    ) : (
                        recentAuditEvents.map((event) => (
                            <div key={event.id} className="p-4 hover:bg-ss-elevated/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono px-2 py-1 bg-ss-elevated rounded text-ss-text">
                                            {event.eventType}
                                        </span>
                                        <span className="text-xs text-ss-text-tertiary">
                                            by {event.actorType}
                                            {event.actorId && ` (${event.actorId.substring(0, 8)}...)`}
                                        </span>
                                    </div>
                                    <span className="text-xs text-ss-text-tertiary">
                                        {formatDate(event.createdAt)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminOrgDetailPage;
