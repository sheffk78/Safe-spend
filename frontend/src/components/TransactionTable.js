import React from 'react';
import StatusBadge from './StatusBadge';

const TransactionTable = ({ transactions }) => {
    const defaultTransactions = [
        {
            time: '14:32:01',
            agent: 'marketing-agent',
            action: 'spend',
            amount: '$49.99',
            vendor: 'Google Ads',
            ruleCheck: 'all rules passed',
            ruleStatus: 'passed',
            status: 'Approved'
        },
        {
            time: '14:33:15',
            agent: 'marketing-agent',
            action: 'spend',
            amount: '$150.00',
            vendor: 'Unknown Vendor',
            ruleCheck: 'vendor not in allowlist',
            ruleStatus: 'failed',
            status: 'Denied'
        },
        {
            time: '14:35:22',
            agent: 'marketing-agent',
            action: 'spend',
            amount: '$75.00',
            vendor: 'Anthropic',
            ruleCheck: 'above auto-approve threshold',
            ruleStatus: 'pending',
            status: 'Pending'
        }
    ];

    const data = transactions || defaultTransactions;

    const getRuleIcon = (status) => {
        switch (status) {
            case 'passed':
                return <span className="text-ss-accent">&#10003;</span>;
            case 'failed':
                return <span className="text-ss-error">&#10007;</span>;
            case 'pending':
                return <span className="text-ss-warning">&#9203;</span>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]" data-testid="transaction-table">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-ss-elevated">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Time</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Agent</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Action</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Amount</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Vendor</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Rule Check</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((tx, index) => (
                            <tr 
                                key={index} 
                                className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150"
                                data-testid={`transaction-row-${index}`}
                            >
                                <td className="px-4 py-3 text-sm font-mono text-ss-text-secondary">{tx.time}</td>
                                <td className="px-4 py-3 text-sm font-mono text-ss-text">{tx.agent}</td>
                                <td className="px-4 py-3 text-sm text-ss-text-secondary">{tx.action}</td>
                                <td className="px-4 py-3 text-sm font-mono font-semibold text-ss-text">{tx.amount}</td>
                                <td className="px-4 py-3 text-sm text-ss-text">{tx.vendor}</td>
                                <td className="px-4 py-3 text-sm text-ss-text-secondary">
                                    <span className="flex items-center gap-1.5">
                                        {getRuleIcon(tx.ruleStatus)}
                                        {tx.ruleCheck}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={tx.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionTable;
