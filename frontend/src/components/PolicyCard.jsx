import React from 'react';
import StatusBadge from './StatusBadge';

const PolicyCard = ({ policy }) => {
    const {
        name = 'Marketing Agent Budget',
        accountId = 'esc_9f3k2m',
        balance = '$950.01',
        status = 'Active',
        limits = {
            perTransaction: '$100.00',
            daily: '$500.00',
            monthly: '$5,000.00'
        },
        vendorRules = {
            allowed: ['Google Ads', 'Meta Ads', 'Anthropic'],
            blocked: []
        },
        categories = {
            allowed: ['advertising', 'ai_compute'],
            blocked: ['transfers']
        },
        approval = {
            autoApproveUnder: '$50.00',
            requireHumanAbove: '$50.00',
            timeWindow: 'Mon–Fri, 6am–10pm MT'
        }
    } = policy || {};

    const isActive = status.toLowerCase() === 'active';

    return (
        <div
            className={`bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${
                isActive ? 'border-l-[3px] border-l-ss-accent' : ''
            }`}
            data-testid="policy-card"
        >
            {/* Header */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.04)]">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <p className="text-xs text-ss-text-tertiary uppercase tracking-wider mb-1">Escrow Policy</p>
                        <h3 className="text-lg font-semibold text-ss-text font-heading">{name}</h3>
                    </div>
                    <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Account</p>
                        <p className="text-sm font-mono text-ss-text-secondary">{accountId}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Balance</p>
                        <p className="text-sm font-semibold text-ss-text">{balance}</p>
                    </div>
                </div>
            </div>

            {/* Limits */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.04)]">
                <p className="text-xs text-ss-text-tertiary uppercase tracking-wider mb-3">Limits</p>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Per Transaction</p>
                        <p className="text-sm font-semibold text-ss-text">{limits.perTransaction}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Daily Cap</p>
                        <p className="text-sm font-semibold text-ss-text">{limits.daily}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Monthly Cap</p>
                        <p className="text-sm font-semibold text-ss-text">{limits.monthly}</p>
                    </div>
                </div>
            </div>

            {/* Vendor Rules */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.04)]">
                <p className="text-xs text-ss-text-tertiary uppercase tracking-wider mb-3">Vendor Rules</p>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-ss-text-secondary">Allowed:</span>
                        {vendorRules.allowed.length > 0 ? (
                            vendorRules.allowed.map((vendor, i) => (
                                <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-ss-accent"
                                >
                                    {vendor}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-ss-text-tertiary">(all)</span>
                        )}
                    </div>
                    {vendorRules.blocked.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-ss-text-secondary">Blocked:</span>
                            {vendorRules.blocked.map((vendor, i) => (
                                <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-ss-error"
                                >
                                    {vendor}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Categories */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.04)]">
                <p className="text-xs text-ss-text-tertiary uppercase tracking-wider mb-3">Categories</p>
                <div className="flex items-center gap-2 flex-wrap">
                    {categories.allowed.map((cat, i) => (
                        <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-ss-accent flex items-center gap-1"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {cat}
                        </span>
                    ))}
                    {categories.blocked.map((cat, i) => (
                        <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-ss-error flex items-center gap-1"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {cat}
                        </span>
                    ))}
                </div>
            </div>

            {/* Approval */}
            <div className="p-6">
                <p className="text-xs text-ss-text-tertiary uppercase tracking-wider mb-3">Approval</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Auto-approve under</p>
                        <p className="text-ss-text">{approval.autoApproveUnder}</p>
                    </div>
                    <div>
                        <p className="text-xs text-ss-text-tertiary">Require human above</p>
                        <p className="text-ss-text">{approval.requireHumanAbove}</p>
                    </div>
                </div>
                <div className="mt-3">
                    <p className="text-xs text-ss-text-tertiary">Time window</p>
                    <p className="text-sm text-ss-text">{approval.timeWindow}</p>
                </div>
            </div>
        </div>
    );
};

export default PolicyCard;
