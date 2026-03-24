import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import { ArrowRight, RefreshCw, FileDown } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const TransactionsPage = () => {
    const { token } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, [token]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/v1/spend?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Failed to fetch transactions');
            
            const data = await response.json();
            setTransactions(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCents = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    return (
        <div className="space-y-6" data-testid="transactions-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Transactions</h1>
                    <p className="text-ss-text-secondary mt-1">View all spend requests and their outcomes</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/dashboard/exports?type=spend-activity"
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="export-transactions-btn"
                    >
                        <FileDown size={16} />
                        Export CSV
                    </Link>
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="refresh-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error">
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
            {!loading && transactions.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center">
                    <p className="text-ss-text-secondary">No transactions yet</p>
                </div>
            )}

            {/* Transactions table */}
            {!loading && transactions.length > 0 && (
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-ss-elevated">
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Escrow</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Vendor</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Category</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr 
                                        key={tx.id}
                                        className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                        data-testid={`tx-row-${tx.id}`}
                                    >
                                        <td className="px-4 py-3 text-sm text-ss-text-secondary">
                                            {formatTime(tx.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-ss-text-secondary">
                                            {tx.escrow_id?.substring(0, 12)}...
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono font-semibold text-ss-text">
                                            {formatCents(tx.amount_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-ss-text">
                                            {tx.vendor}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-ss-text-secondary">
                                            {tx.category || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={tx.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                to={`/dashboard/transactions/${tx.id}`}
                                                className="flex items-center gap-1 text-ss-accent hover:text-ss-accent-hover text-sm transition-colors"
                                                data-testid={`view-tx-${tx.id}`}
                                            >
                                                View
                                                <ArrowRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;
