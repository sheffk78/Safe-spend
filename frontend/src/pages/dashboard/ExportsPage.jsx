import React, { useState, useEffect } from 'react';
import { 
    FileDown, 
    Calendar, 
    Filter, 
    Download,
    FileSpreadsheet,
    Clock,
    AlertCircle,
    CheckCircle,
    Loader2,
    ArrowRightLeft,
    FileText,
    Shield,
    ExternalLink
} from 'lucide-react';
import { listEscrowAccounts, getMyRole } from '@/lib/api';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Export configuration
const EXPORT_CONFIG = {
    maxDateRangeDays: 90, // Must match backend
};

// Report type configurations
const REPORT_TYPES = {
    'spend-activity': {
        label: 'Spend Activity',
        description: 'Export all spend requests with amounts, vendors, statuses, and approvals',
        icon: ArrowRightLeft,
        color: 'text-teal-400',
        bgColor: 'bg-teal-400/10',
    },
    'audit-events': {
        label: 'Audit Events',
        description: 'Export audit trail with all system events and actor information',
        icon: FileText,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
    },
};

// Status filter options for spend activity
const STATUS_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'pending', label: 'Pending' },
    { value: 'expired', label: 'Expired' },
];

// Helper to format date for input
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Export Card Component
const ExportCard = ({ type, config, selected, onSelect }) => {
    const Icon = config.icon;
    
    return (
        <button
            onClick={() => onSelect(type)}
            className={`p-4 rounded-xl border text-left transition-all ${
                selected
                    ? 'border-ss-accent bg-ss-accent/5'
                    : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] bg-ss-card'
            }`}
            data-testid={`export-type-${type}`}
        >
            <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center mb-3`}>
                <Icon size={20} className={config.color} />
            </div>
            <h3 className="font-medium text-ss-text mb-1">{config.label}</h3>
            <p className="text-xs text-ss-text-tertiary">{config.description}</p>
        </button>
    );
};

// Main Exports Page
const ExportsPage = () => {
    const [reportType, setReportType] = useState('spend-activity');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return formatDateForInput(date);
    });
    const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()));
    const [escrowId, setEscrowId] = useState('');
    const [status, setStatus] = useState('all');
    const [escrows, setEscrows] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    
    // Calculate date range days
    const dateRangeDays = startDate && endDate 
        ? Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
        : 0;
    const dateRangeExceeded = dateRangeDays > EXPORT_CONFIG.maxDateRangeDays;
    
    // Fetch escrows and user role on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [escrowData, roleData] = await Promise.all([
                    listEscrowAccounts(),
                    getMyRole()
                ]);
                setEscrows(escrowData.data || []);
                setUserRole(roleData.role);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        };
        fetchData();
    }, []);
    
    // Fetch summary when filters change
    useEffect(() => {
        const fetchSummary = async () => {
            if (!startDate || !endDate) return;
            
            setLoadingSummary(true);
            try {
                const token = localStorage.getItem('ss_token');
                const params = new URLSearchParams({
                    start_date: startDate,
                    end_date: endDate,
                    report_type: reportType,
                });
                if (escrowId) params.append('escrow_id', escrowId);
                
                const response = await fetch(`${API_URL}/api/v1/exports/summary?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setSummary(data);
                }
            } catch (err) {
                console.error('Failed to fetch summary:', err);
            } finally {
                setLoadingSummary(false);
            }
        };
        
        const debounceTimer = setTimeout(fetchSummary, 500);
        return () => clearTimeout(debounceTimer);
    }, [startDate, endDate, escrowId, reportType]);
    
    // Check if user can export
    const canExport = ['owner', 'finance_admin'].includes(userRole);
    
    // Handle export
    const handleExport = async () => {
        if (!canExport) {
            setError('You do not have permission to generate exports');
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const token = localStorage.getItem('ss_token');
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
            });
            
            if (escrowId) params.append('escrow_id', escrowId);
            if (reportType === 'spend-activity' && status !== 'all') {
                params.append('status', status);
            }
            
            const response = await fetch(`${API_URL}/api/v1/exports/${reportType}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Export failed');
            }
            
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `export-${reportType}-${startDate}.csv`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            setSuccess(`Export downloaded: ${filename}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const reportConfig = REPORT_TYPES[reportType];
    const recordCount = reportType === 'spend-activity' 
        ? summary?.spend_activity?.total_records 
        : summary?.audit_events?.total_records;
    
    return (
        <div className="space-y-6" data-testid="exports-page">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-ss-text flex items-center gap-3">
                    <FileDown size={28} className="text-ss-accent" />
                    Exports & Reports
                </h1>
                <p className="text-ss-text-secondary mt-1">
                    Generate CSV exports for governance reviews and audits
                </p>
            </div>
            
            {/* Permission Warning */}
            {userRole && !canExport && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 px-4 py-3 rounded-lg border border-amber-400/20">
                    <Shield size={18} />
                    <span>Only <strong>Owners</strong> and <strong>Finance Admins</strong> can generate exports.</span>
                </div>
            )}
            
            {/* Report Type Selection */}
            <div>
                <h2 className="text-sm font-medium text-ss-text-secondary mb-3">Select Report Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(REPORT_TYPES).map(([type, config]) => (
                        <ExportCard
                            key={type}
                            type={type}
                            config={config}
                            selected={reportType === type}
                            onSelect={setReportType}
                        />
                    ))}
                </div>
            </div>
            
            {/* Filters */}
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                <h2 className="font-medium text-ss-text mb-4 flex items-center gap-2">
                    <Filter size={18} className="text-ss-text-secondary" />
                    Export Filters
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div>
                        <label className="block text-sm text-ss-text-secondary mb-1.5">
                            Start Date
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-ss-bg border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                data-testid="start-date-input"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm text-ss-text-secondary mb-1.5">
                            End Date
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-ss-bg border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                data-testid="end-date-input"
                            />
                        </div>
                    </div>
                    
                    {/* Escrow Filter */}
                    <div>
                        <label className="block text-sm text-ss-text-secondary mb-1.5">
                            Escrow Account
                        </label>
                        <select
                            value={escrowId}
                            onChange={(e) => setEscrowId(e.target.value)}
                            className="w-full px-3 py-2 bg-ss-bg border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                            data-testid="escrow-filter"
                        >
                            <option value="">All Accounts</option>
                            {escrows.map((escrow) => (
                                <option key={escrow.id} value={escrow.id}>
                                    {escrow.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Status Filter (only for spend-activity) */}
                    {reportType === 'spend-activity' && (
                        <div>
                            <label className="block text-sm text-ss-text-secondary mb-1.5">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3 py-2 bg-ss-bg border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                                data-testid="status-filter"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Date Range Warning */}
            {dateRangeExceeded && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 px-4 py-3 rounded-lg border border-amber-400/20">
                    <AlertCircle size={18} />
                    <span>
                        Date range exceeds {EXPORT_CONFIG.maxDateRangeDays} days ({dateRangeDays} days selected). 
                        Please narrow your date range to generate an export.
                    </span>
                </div>
            )}
            
            {/* Summary Preview */}
            <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
                <h2 className="font-medium text-ss-text mb-4 flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-ss-text-secondary" />
                    Export Preview
                </h2>
                
                {loadingSummary ? (
                    <div className="flex items-center gap-2 text-ss-text-secondary">
                        <Loader2 size={16} className="animate-spin" />
                        Loading summary...
                    </div>
                ) : summary ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-ss-bg rounded-lg p-4">
                            <p className="text-xs text-ss-text-tertiary mb-1">Records to Export</p>
                            <p className="text-2xl font-semibold text-ss-text">
                                {recordCount?.toLocaleString() || 0}
                            </p>
                        </div>
                        
                        <div className="bg-ss-bg rounded-lg p-4">
                            <p className="text-xs text-ss-text-tertiary mb-1">Date Range</p>
                            <p className="text-sm text-ss-text">
                                {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}
                            </p>
                        </div>
                        
                        <div className="bg-ss-bg rounded-lg p-4">
                            <p className="text-xs text-ss-text-tertiary mb-1">Report Type</p>
                            <p className="text-sm text-ss-text">{reportConfig.label}</p>
                        </div>
                        
                        {reportType === 'spend-activity' && summary?.spend_activity?.by_status && (
                            <div className="md:col-span-3 bg-ss-bg rounded-lg p-4">
                                <p className="text-xs text-ss-text-tertiary mb-2">By Status</p>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(summary.spend_activity.by_status).map(([status, count]) => (
                                        <span key={status} className="px-2 py-1 bg-black/20 rounded text-sm text-ss-text">
                                            {status}: <strong>{count}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {reportType === 'audit-events' && summary?.audit_events?.top_event_types?.length > 0 && (
                            <div className="md:col-span-3 bg-ss-bg rounded-lg p-4">
                                <p className="text-xs text-ss-text-tertiary mb-2">Top Event Types</p>
                                <div className="flex flex-wrap gap-2">
                                    {summary.audit_events.top_event_types.slice(0, 5).map((item) => (
                                        <span key={item.event_type} className="px-2 py-1 bg-black/20 rounded text-xs text-ss-text">
                                            {item.event_type}: <strong>{item.count}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-ss-text-tertiary">Select filters to preview export</p>
                )}
            </div>
            
            {/* Status Messages */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}
            
            {success && (
                <div className="flex items-center gap-2 text-teal-400 text-sm bg-teal-400/10 px-4 py-3 rounded-lg">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}
            
            {/* Export Button */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-ss-text-tertiary flex items-center gap-1.5">
                    <Clock size={12} />
                    Exports use ISO 8601 date format. Max range: {EXPORT_CONFIG.maxDateRangeDays} days.
                </p>
                
                <button
                    onClick={handleExport}
                    disabled={loading || !canExport || !recordCount || dateRangeExceeded}
                    className="px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    data-testid="generate-export-btn"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Generate CSV Export
                        </>
                    )}
                </button>
            </div>
            
            {/* Trust Law Callout */}
            <div className="bg-gradient-to-r from-ss-accent/5 to-transparent border border-ss-accent/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Shield size={20} className="text-ss-accent mt-0.5" />
                    <div>
                        <h3 className="text-sm font-medium text-ss-text mb-1">
                            Governance & Compliance
                        </h3>
                        <p className="text-xs text-ss-text-secondary">
                            CSV exports provide auditable records of all spend activity and system events. 
                            Use these for quarterly reviews, compliance audits, and fiduciary reporting.
                        </p>
                        <a 
                            href="/docs/trust-law"
                            className="inline-flex items-center gap-1 text-xs text-ss-accent hover:underline mt-2"
                        >
                            Learn about fiduciary governance
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportsPage;
