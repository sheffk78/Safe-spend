import React from 'react';

const statusStyles = {
    active: {
        bg: 'rgba(16, 185, 129, 0.1)',
        text: '#10B981',
        dot: '#10B981'
    },
    approved: {
        bg: 'rgba(16, 185, 129, 0.1)',
        text: '#10B981',
        dot: '#10B981'
    },
    pending: {
        bg: 'rgba(245, 158, 11, 0.1)',
        text: '#F59E0B',
        dot: '#F59E0B'
    },
    denied: {
        bg: 'rgba(239, 68, 68, 0.1)',
        text: '#EF4444',
        dot: '#EF4444'
    },
    paused: {
        bg: 'rgba(107, 114, 128, 0.1)',
        text: '#6B7280',
        dot: '#6B7280'
    },
    depleted: {
        bg: 'rgba(239, 68, 68, 0.1)',
        text: '#EF4444',
        dot: '#EF4444'
    },
    closed: {
        bg: 'rgba(107, 114, 128, 0.1)',
        text: '#6B7280',
        dot: '#6B7280'
    },
    expired: {
        bg: 'rgba(107, 114, 128, 0.1)',
        text: '#6B7280',
        dot: '#6B7280'
    },
    cancelled: {
        bg: 'rgba(107, 114, 128, 0.1)',
        text: '#6B7280',
        dot: '#6B7280'
    },
    live: {
        bg: 'rgba(16, 185, 129, 0.1)',
        text: '#10B981',
        dot: '#10B981'
    },
    test: {
        bg: 'rgba(245, 158, 11, 0.1)',
        text: '#F59E0B',
        dot: '#F59E0B'
    },
    agent: {
        bg: 'rgba(59, 130, 246, 0.1)',
        text: '#3B82F6',
        dot: '#3B82F6'
    }
};

const StatusBadge = ({ status, className = '' }) => {
    const normalizedStatus = status.toLowerCase();
    const style = statusStyles[normalizedStatus] || statusStyles.paused;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
            style={{ backgroundColor: style.bg, color: style.text }}
            data-testid={`status-badge-${normalizedStatus}`}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: style.dot }}
            />
            {status}
        </span>
    );
};

export default StatusBadge;
