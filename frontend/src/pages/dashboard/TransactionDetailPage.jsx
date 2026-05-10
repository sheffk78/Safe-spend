import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const TransactionDetailPage = () => {
    const { id } = useParams();
    const { token } = useAuth();
    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTransaction();
    }, [id, token]);

    const fetchTransaction = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/v1/spend/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Transaction not found');
                }
                throw new Error('Failed to fetch transaction');
            }
            
            const data = await response.json();
            setTransaction(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCents = (cents) => {
        if (cents === null || cents === undefined) return '-';
        return `$${(cents / 100).toFixed(2)}`;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const getRuleIcon = (rule) => {
        if (rule.passed) {
            return <CheckCircle size={16} className="text-ss-accent" />;
        }
        return <XCircle size={16} className="text-ss-error" />;
    };

    const getRuleDisplayName = (ruleName) => {
        const names = {
            'key_validation': 'Key Validation',
            'escrow_account_check': 'Protected Account Check',
            'idempotency_check': 'Idempotency Check',
            'balance_check': 'Balance Check',
            'per_transaction_limit': 'Per-Transaction Limit',
            'daily_cap_check': 'Daily Cap Check',
            'weekly_cap_check': 'Weekly Cap Check',
            'monthly_cap_check': 'Monthly Cap Check',
            'vendor_check': 'Vendor Check',
            'category_check': 'Category Check',
            'time_window_check': 'Time Window Check',
            'approval_threshold_check': 'Approval Threshold',
            'execute': 'Execute'
        };
        return names[ruleName] || ruleName;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <Link 
                    to="/dashboard/transactions" 
                    className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Transactions
                </Link>
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="transaction-detail-page">
            {/* Back link */}
            <Link 
                to="/dashboard/transactions" 
                className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
            >
                <ArrowLeft size={18} />
                Back to Transactions
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">
                        Transaction Details
                    </h1>
                    <p className="text-ss-text-tertiary text-sm mt-1 font-mono">{transaction.id}</p>
                </div>
                <StatusBadge status={transaction.status} />
            </div>

            {/* Main info cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Info */}
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Transaction Info</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Amount</span>
                            <span className="text-ss-text font-semibold font-mono">{formatCents(transaction.amount_cents)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Vendor</span>
                            <span className="text-ss-text">{transaction.vendor}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Category</span>
                            <span className="text-ss-text">{transaction.category || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Currency</span>
                            <span className="text-ss-text uppercase">{transaction.currency}</span>
                        </div>
                        {transaction.description && (
                            <div className="flex justify-between">
                                <span className="text-ss-text-secondary">Description</span>
                                <span className="text-ss-text text-right max-w-[200px]">{transaction.description}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Balance Info */}
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">Balance Impact</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Protected Account</span>
                            <span className="text-ss-text font-mono text-sm">{transaction.escrow_id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Balance Before</span>
                            <span className="text-ss-text font-mono">{formatCents(transaction.balance_before_cents)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Balance After</span>
                            <span className="text-ss-text font-mono">{formatCents(transaction.balance_after_cents)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-ss-text-secondary">Created</span>
                            <span className="text-ss-text">{formatTime(transaction.created_at)}</span>
                        </div>
                        {transaction.resolved_at && (
                            <div className="flex justify-between">
                                <span className="text-ss-text-secondary">Resolved</span>
                                <span className="text-ss-text">{formatTime(transaction.resolved_at)}</span>
                            </div>
                        )}
                    </div>

                    {/* Denial info */}
                    {transaction.status === 'denied' && transaction.denial_reason && (
                        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                            <div className="flex items-start gap-2 text-ss-error">
                                <XCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="font-medium">Denial Reason:</span>
                                    <p className="text-sm mt-1">{transaction.denial_reason}</p>
                                    {transaction.denial_rule_id && (
                                        <p className="text-xs text-ss-text-tertiary mt-1">
                                            Policy: {transaction.denial_rule_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Rules Evaluated Timeline */}
            <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                <h2 className="font-heading text-lg font-semibold text-ss-text mb-4">
                    Rules Evaluation ({transaction.rules_evaluated?.length || 0} steps)
                </h2>
                
                <div className="space-y-1">
                    {transaction.rules_evaluated?.map((rule, index) => (
                        <div 
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg ${
                                !rule.passed 
                                    ? 'bg-[rgba(239,68,68,0.1)] border border-ss-error/20' 
                                    : 'bg-ss-elevated'
                            }`}
                            data-testid={`rule-${rule.rule}`}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                {getRuleIcon(rule)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-ss-text">
                                        {index + 1}. {getRuleDisplayName(rule.rule)}
                                    </span>
                                    {rule.rule_id && (
                                        <span className="text-xs text-ss-text-tertiary font-mono">
                                            ({rule.rule_id})
                                        </span>
                                    )}
                                </div>
                                <p className={`text-sm mt-0.5 ${rule.passed ? 'text-ss-text-secondary' : 'text-ss-error'}`}>
                                    {rule.reason}
                                </p>
                                {rule.metadata && Object.keys(rule.metadata).length > 0 && (
                                    <div className="mt-2 text-xs text-ss-text-tertiary font-mono bg-ss-code rounded p-2">
                                        {Object.entries(rule.metadata).map(([key, value]) => (
                                            <div key={key}>
                                                {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Idempotency Key */}
            {transaction.idempotency_key && (
                <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-6">
                    <h2 className="font-heading text-lg font-semibold text-ss-text mb-2">Idempotency Key</h2>
                    <code className="text-sm text-ss-accent font-mono">{transaction.idempotency_key}</code>
                </div>
            )}
        </div>
    );
};

export default TransactionDetailPage;
