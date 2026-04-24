import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { 
    BarChart3, 
    TrendingUp, 
    PieChart, 
    DollarSign,
    Building2,
    Users,
    Activity,
    RefreshCw
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const StatCard = ({ title, value, subValue, icon: Icon, color = 'accent' }) => (
    <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
            <span className="text-ss-text-secondary text-sm">{title}</span>
            <div className={`p-2 rounded-lg bg-ss-${color}/10`}>
                <Icon size={18} className={`text-ss-${color}`} />
            </div>
        </div>
        <div className="text-2xl font-semibold text-ss-text">{value}</div>
        {subValue && (
            <div className="text-sm text-ss-text-tertiary mt-1">{subValue}</div>
        )}
    </div>
);

const formatCents = (cents) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(cents / 100);
};

const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};

const MiniBarChart = ({ data, height = 100 }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const barWidth = Math.max(4, Math.min(20, (100 / data.length) - 2));
    
    return (
        <div className="flex items-end justify-between gap-1" style={{ height }}>
            {data.slice(-14).map((d, i) => (
                <div
                    key={i}
                    className="bg-ss-accent/80 hover:bg-ss-accent rounded-t transition-all"
                    style={{
                        width: `${barWidth}%`,
                        height: `${Math.max(4, (d.value / maxValue) * 100)}%`
                    }}
                    title={`${d.label}: ${formatCents(d.value)}`}
                />
            ))}
        </div>
    );
};

const DonutChart = ({ data, size = 120 }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
        return (
            <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                <span className="text-ss-text-tertiary text-sm">No data</span>
            </div>
        );
    }
    
    let currentAngle = 0;
    const colors = ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#8b5cf6'];
    
    return (
        <svg width={size} height={size} viewBox="0 0 100 100">
            {data.map((d, i) => {
                const percentage = d.value / total;
                const angle = percentage * 360;
                const startAngle = currentAngle;
                currentAngle += angle;
                
                const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                const x2 = 50 + 40 * Math.cos((Math.PI * (startAngle + angle - 90)) / 180);
                const y2 = 50 + 40 * Math.sin((Math.PI * (startAngle + angle - 90)) / 180);
                
                const largeArc = angle > 180 ? 1 : 0;
                
                return (
                    <path
                        key={i}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={colors[i % colors.length]}
                        className="hover:opacity-80 transition-opacity"
                    />
                );
            })}
            <circle cx="50" cy="50" r="25" fill="#1a1a2e" />
        </svg>
    );
};

const AdminAnalyticsPage = () => {
    const { token } = useAdminAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState(30);
    const [overview, setOverview] = useState(null);
    const [spendingTrends, setSpendingTrends] = useState(null);
    const [approvalRates, setApprovalRates] = useState(null);
    const [topVendors, setTopVendors] = useState(null);
    const [topCategories, setTopCategories] = useState(null);
    const [escrowBalances, setEscrowBalances] = useState(null);
    const [orgActivity, setOrgActivity] = useState(null);

    const fetchAnalytics = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [
                overviewRes,
                trendsRes,
                ratesRes,
                vendorsRes,
                categoriesRes,
                escrowsRes,
                activityRes
            ] = await Promise.all([
                fetch(`${API_URL}/api/admin/analytics/overview`, { headers }),
                fetch(`${API_URL}/api/admin/analytics/spending-trends?days=${period}`, { headers }),
                fetch(`${API_URL}/api/admin/analytics/approval-rates?days=${period}`, { headers }),
                fetch(`${API_URL}/api/admin/analytics/top-vendors?days=${period}`, { headers }),
                fetch(`${API_URL}/api/admin/analytics/top-categories?days=${period}`, { headers }),
                fetch(`${API_URL}/api/admin/analytics/escrow-balances`, { headers }),
                fetch(`${API_URL}/api/admin/analytics/org-activity?days=${period}`, { headers })
            ]);

            setOverview(await overviewRes.json());
            setSpendingTrends(await trendsRes.json());
            setApprovalRates(await ratesRes.json());
            setTopVendors(await vendorsRes.json());
            setTopCategories(await categoriesRes.json());
            setEscrowBalances(await escrowsRes.json());
            setOrgActivity(await activityRes.json());
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [period, token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ss-accent"></div>
            </div>
        );
    }

    const chartData = spendingTrends?.data?.map(d => ({
        label: d.date,
        value: d.approved_cents
    })) || [];

    const approvalChartData = approvalRates?.data ? [
        { label: 'Approved', value: approvalRates.data.approved.count },
        { label: 'Denied', value: approvalRates.data.denied.count },
        { label: 'Pending', value: approvalRates.data.pending.count },
        { label: 'Expired', value: approvalRates.data.expired.count }
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-ss-text">Analytics Dashboard</h1>
                    <p className="text-ss-text-secondary mt-1">Platform-wide metrics and insights</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value))}
                        className="bg-ss-surface border border-ss-border rounded-lg px-3 py-2 text-sm text-ss-text"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <button
                        onClick={() => fetchAnalytics(true)}
                        disabled={refreshing}
                        className="p-2 bg-ss-surface border border-ss-border rounded-lg hover:bg-ss-elevated transition-colors"
                    >
                        <RefreshCw size={18} className={`text-ss-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Organizations"
                    value={formatNumber(overview?.organizations?.total || 0)}
                    icon={Building2}
                />
                <StatCard
                    title="Active Escrow Accounts"
                    value={formatNumber(overview?.escrow_accounts?.active || 0)}
                    subValue={`${formatNumber(overview?.escrow_accounts?.total || 0)} total`}
                    icon={Users}
                />
                <StatCard
                    title="Total Balance Held"
                    value={formatCents(overview?.escrow_accounts?.total_balance_cents || 0)}
                    icon={DollarSign}
                />
                <StatCard
                    title="Total Spent"
                    value={formatCents(overview?.escrow_accounts?.total_spent_cents || 0)}
                    subValue={`${formatCents(overview?.escrow_accounts?.total_funded_cents || 0)} funded`}
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spending Trends */}
                <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-ss-text flex items-center gap-2">
                            <BarChart3 size={18} className="text-ss-accent" />
                            Spending Trends
                        </h3>
                        <span className="text-xs text-ss-text-tertiary">Last {period} days</span>
                    </div>
                    <MiniBarChart data={chartData} height={120} />
                    <div className="mt-3 pt-3 border-t border-ss-border flex justify-between text-sm">
                        <span className="text-ss-text-secondary">
                            Total: {formatCents(chartData.reduce((sum, d) => sum + d.value, 0))}
                        </span>
                        <span className="text-ss-text-tertiary">
                            {spendingTrends?.data?.reduce((sum, d) => sum + d.total_requests, 0) || 0} requests
                        </span>
                    </div>
                </div>

                {/* Approval Rates */}
                <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-ss-text flex items-center gap-2">
                            <PieChart size={18} className="text-ss-accent" />
                            Approval Breakdown
                        </h3>
                        <span className="text-xs text-ss-text-tertiary">{approvalRates?.total_requests || 0} requests</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <DonutChart data={approvalChartData} size={100} />
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                                <span className="text-ss-text-secondary">Approved:</span>
                                <span className="text-ss-text font-medium">{approvalRates?.approval_rate || 0}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-ss-text-secondary">Denied:</span>
                                <span className="text-ss-text font-medium">{approvalRates?.denial_rate || 0}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-ss-text-secondary">Pending:</span>
                                <span className="text-ss-text font-medium">{approvalRates?.data?.pending?.count || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Vendors & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Vendors */}
                <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
                    <h3 className="font-medium text-ss-text mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-ss-accent" />
                        Top Vendors
                    </h3>
                    {topVendors?.data?.length > 0 ? (
                        <div className="space-y-3">
                            {topVendors.data.slice(0, 5).map((v, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-ss-text-tertiary text-sm w-5">{i + 1}.</span>
                                        <span className="text-ss-text">{v.vendor}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-ss-text font-medium">{formatCents(v.total_spent_cents)}</div>
                                        <div className="text-xs text-ss-text-tertiary">{v.transaction_count} txns</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-ss-text-tertiary text-sm">No vendor data available</p>
                    )}
                </div>

                {/* Top Categories */}
                <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
                    <h3 className="font-medium text-ss-text mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-ss-accent" />
                        Top Categories
                    </h3>
                    {topCategories?.data?.length > 0 ? (
                        <div className="space-y-3">
                            {topCategories.data.slice(0, 5).map((c, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-ss-text-tertiary text-sm w-5">{i + 1}.</span>
                                        <span className="text-ss-text capitalize">{c.category?.replace(/_/g, ' ') || 'Uncategorized'}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-ss-text font-medium">{formatCents(c.total_spent_cents)}</div>
                                        <div className="text-xs text-ss-text-tertiary">{c.transaction_count} txns</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-ss-text-tertiary text-sm">No category data available</p>
                    )}
                </div>
            </div>

            {/* Escrow Balances */}
            <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
                <h3 className="font-medium text-ss-text mb-4 flex items-center gap-2">
                    <DollarSign size={18} className="text-ss-accent" />
                    Top Escrow Accounts by Balance
                </h3>
                {escrowBalances?.top_escrows?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-ss-text-tertiary border-b border-ss-border">
                                    <th className="pb-2 font-medium">Name</th>
                                    <th className="pb-2 font-medium">Organization</th>
                                    <th className="pb-2 font-medium text-right">Balance</th>
                                    <th className="pb-2 font-medium text-right">Total Funded</th>
                                    <th className="pb-2 font-medium text-right">Total Spent</th>
                                    <th className="pb-2 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {escrowBalances.top_escrows.slice(0, 10).map((e, i) => (
                                    <tr key={i} className="border-b border-ss-border/50 last:border-0">
                                        <td className="py-2 text-ss-text">{e.name}</td>
                                        <td className="py-2 text-ss-text-secondary">{e.org_name}</td>
                                        <td className="py-2 text-right text-ss-text font-medium">{formatCents(e.balance_cents)}</td>
                                        <td className="py-2 text-right text-ss-text-secondary">{formatCents(e.total_funded_cents)}</td>
                                        <td className="py-2 text-right text-ss-text-secondary">{formatCents(e.total_spent_cents)}</td>
                                        <td className="py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                e.status === 'active' ? 'bg-teal-500/10 text-teal-400' :
                                                e.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                                                e.status === 'depleted' ? 'bg-red-500/10 text-red-400' :
                                                'bg-gray-500/10 text-gray-400'
                                            }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-ss-text-tertiary text-sm">No escrow accounts found</p>
                )}
            </div>

            {/* Organization Activity */}
            <div className="bg-ss-surface border border-ss-border rounded-lg p-5">
                <h3 className="font-medium text-ss-text mb-4 flex items-center gap-2">
                    <Building2 size={18} className="text-ss-accent" />
                    Organization Activity (Last {period} days)
                </h3>
                {orgActivity?.data?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-ss-text-tertiary border-b border-ss-border">
                                    <th className="pb-2 font-medium">Organization</th>
                                    <th className="pb-2 font-medium">Plan</th>
                                    <th className="pb-2 font-medium text-right">Escrows</th>
                                    <th className="pb-2 font-medium text-right">API Keys</th>
                                    <th className="pb-2 font-medium text-right">Recent Requests</th>
                                    <th className="pb-2 font-medium text-right">Recent Approved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orgActivity.data.slice(0, 10).map((o, i) => (
                                    <tr key={i} className="border-b border-ss-border/50 last:border-0">
                                        <td className="py-2 text-ss-text">{o.name}</td>
                                        <td className="py-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                o.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-400' :
                                                o.plan === 'growth' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-gray-500/10 text-gray-400'
                                            }`}>
                                                {o.plan}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right text-ss-text-secondary">{o.escrow_count}</td>
                                        <td className="py-2 text-right text-ss-text-secondary">{o.api_key_count}</td>
                                        <td className="py-2 text-right text-ss-text-secondary">{o.recent_spend_requests}</td>
                                        <td className="py-2 text-right text-ss-text font-medium">{formatCents(o.recent_approved_cents)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-ss-text-tertiary text-sm">No organization data found</p>
                )}
            </div>
        </div>
    );
};

export default AdminAnalyticsPage;
