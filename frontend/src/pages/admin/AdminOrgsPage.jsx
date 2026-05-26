import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
    Building2,
    Search,
    RefreshCw,
    ChevronRight,
    DollarSign,
    Calendar,
    Activity,
    Users,
    ExternalLink,
    UserCog
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
        year: 'numeric'
    });
};

// Time ago formatter
const timeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(date);
};

const AdminOrgsPage = () => {
    const { getAdminToken, startImpersonation } = useAdminAuth();
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [impersonating, setImpersonating] = useState(null);

    useEffect(() => {
        fetchOrgs();
    }, [sortBy, sortOrder]);

    const fetchOrgs = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                sortBy,
                sortOrder,
                limit: '100'
            });
            if (search) params.set('search', search);

            const response = await fetch(`${API_URL}/api/admin/orgs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${getAdminToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch organizations');
            }

            const data = await response.json();
            setOrgs(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchOrgs();
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const handleImpersonate = async (orgId) => {
        setImpersonating(orgId);
        try {
            await startImpersonation(orgId);
        } catch (err) {
            setError(err.message);
            setImpersonating(null);
        }
    };

    const SortHeader = ({ field, children }) => (
        <th
            onClick={() => handleSort(field)}
            className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider cursor-pointer hover:text-ss-text transition-colors"
        >
            <span className="flex items-center gap-1">
                {children}
                {sortBy === field && (
                    <span className="text-ss-accent">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
            </span>
        </th>
    );

    return (
        <div className="space-y-6" data-testid="admin-orgs-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Organizations</h1>
                    <p className="text-ss-text-secondary mt-1">
                        Manage all client organizations on the platform
                    </p>
                </div>
                <button
                    onClick={fetchOrgs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-gray-200 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                    data-testid="refresh-orgs-btn"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-ss-surface border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="search-input"
                    />
                </div>
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-ss-text font-medium transition-all"
                >
                    Search
                </button>
            </form>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Building2 className="text-ss-accent" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ss-text">{orgs.length}</p>
                            <p className="text-xs text-ss-text-tertiary">Total Orgs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <DollarSign className="text-green-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ss-text">
                                {formatCents(orgs.reduce((sum, o) => sum + (o.totalBalanceCents || 0), 0))}
                            </p>
                            <p className="text-xs text-ss-text-tertiary">Total Balance</p>
                        </div>
                    </div>
                </div>
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Activity className="text-ss-accent" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ss-text">
                                {formatCents(orgs.reduce((sum, o) => sum + (o.volume30DaysCents || 0), 0))}
                            </p>
                            <p className="text-xs text-ss-text-tertiary">30-Day Volume</p>
                        </div>
                    </div>
                </div>
                <div className="bg-ss-surface rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Users className="text-orange-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ss-text">
                                {orgs.reduce((sum, o) => sum + (o.escrowCount || 0), 0)}
                            </p>
                            <p className="text-xs text-ss-text-tertiary">Total Protected Accounts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-ss-surface rounded-xl border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : orgs.length === 0 ? (
                    <div className="text-center py-12 text-ss-text-tertiary">
                        <Building2 size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No organizations found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-100">
                                <tr>
                                    <SortHeader field="name">Organization</SortHeader>
                                    <SortHeader field="createdAt">Created</SortHeader>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider">
                                        Protected Accounts
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider">
                                        Policies
                                    </th>
                                    <SortHeader field="volume30DaysCents">30d Volume</SortHeader>
                                    <SortHeader field="lastActivityAt">Last Active</SortHeader>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {orgs.map((org) => (
                                    <tr
                                        key={org.id}
                                        className="border-b border-[rgba(255,255,255,0.04)] hover:bg-ss-elevated/50 transition-colors"
                                    >
                                        <td className="py-4 px-4">
                                            <div>
                                                <p className="font-medium text-ss-text">{org.name}</p>
                                                <p className="text-xs text-ss-text-tertiary">{org.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-ss-text-secondary">
                                            {formatDate(org.createdAt)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-ss-text">{org.escrowCount}</span>
                                            <span className="text-xs text-ss-text-tertiary ml-1">
                                                ({formatCents(org.totalBalanceCents)})
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-ss-text">{org.activePolicyCount}</span>
                                            <span className="text-xs text-ss-text-tertiary">/{org.policyCount}</span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-ss-text">
                                            {formatCents(org.volume30DaysCents)}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-ss-text-secondary">
                                            {timeAgo(org.lastActivityAt)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/admin/orgs/${org.id}`}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-ss-elevated hover:bg-ss-code rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                                                    data-testid={`view-org-${org.id}`}
                                                >
                                                    View
                                                    <ChevronRight size={12} />
                                                </Link>
                                                <button
                                                    onClick={() => handleImpersonate(org.id)}
                                                    disabled={impersonating === org.id}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition-all disabled:opacity-50"
                                                    data-testid={`impersonate-org-${org.id}`}
                                                >
                                                    {impersonating === org.id ? (
                                                        <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                                    ) : (
                                                        <UserCog size={12} />
                                                    )}
                                                    Impersonate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOrgsPage;
