import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Play,
    Code,
    ListChecks,
    FileJson,
    Copy,
    Check,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    ExternalLink,
    RefreshCw,
    Info
} from 'lucide-react';
import {
    listEscrowAccounts,
    listApiKeys,
    listPolicies,
    formatCents
} from '@/lib/api';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Scenario Presets
const SCENARIO_PRESETS = [
    {
        id: 'happy-path',
        name: 'Happy Path',
        description: 'Should pass all policies',
        icon: CheckCircle,
        color: 'text-green-400',
        values: {
            amount: '25.00',
            vendor: 'Anthropic',
            category: 'ai_compute',
            description: 'API credits for Claude usage'
        }
    },
    {
        id: 'vendor-blocked',
        name: 'Vendor Not Allowed',
        description: 'Vendor not on allowlist',
        icon: XCircle,
        color: 'text-red-400',
        values: {
            amount: '50.00',
            vendor: 'Unknown Vendor XYZ',
            category: 'ai_compute',
            description: 'Testing vendor restriction'
        }
    },
    {
        id: 'over-limit',
        name: 'Over Daily Cap',
        description: 'Amount exceeds daily limit',
        icon: AlertTriangle,
        color: 'text-yellow-400',
        values: {
            amount: '10000.00',
            vendor: 'Anthropic',
            category: 'ai_compute',
            description: 'Large purchase test'
        }
    },
    {
        id: 'needs-approval',
        name: 'Requires Human Approval',
        description: 'Above auto-approve threshold',
        icon: Clock,
        color: 'text-ss-accent',
        values: {
            amount: '75.00',
            vendor: 'Anthropic',
            category: 'ai_compute',
            description: 'Medium-sized request requiring approval'
        }
    }
];

// Mode Indicator Component
const ModeIndicator = ({ apiKey }) => {
    const isTestMode = apiKey?.key_prefix?.startsWith('sk_test') || apiKey?.key_prefix?.startsWith('sk_agent');
    
    if (!apiKey) return null;

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            isTestMode 
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
        }`}>
            {isTestMode ? (
                <>
                    <Zap size={14} />
                    <span className="font-medium">Test Mode</span>
                    <span className="text-xs opacity-75">— No real money moves</span>
                </>
            ) : (
                <>
                    <AlertTriangle size={14} />
                    <span className="font-medium">Live Mode</span>
                    <span className="text-xs opacity-75">— Real funds may move!</span>
                </>
            )}
        </div>
    );
};

// Code Snippet Component
const CodeSnippet = ({ language, code, onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopy?.();
    };

    return (
        <div className="relative">
            <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 bg-ss-elevated hover:bg-ss-surface rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                data-testid={`copy-${language}`}
            >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            <pre className="bg-ss-code rounded-lg p-4 overflow-x-auto text-sm">
                <code className="text-ss-text-secondary font-mono whitespace-pre">{code}</code>
            </pre>
        </div>
    );
};

// Rules Timeline Component
const RulesTimeline = ({ rules }) => {
    if (!rules || rules.length === 0) {
        return (
            <div className="text-center py-8 text-ss-text-tertiary">
                <ListChecks size={32} className="mx-auto mb-2 opacity-50" />
                <p>No rules evaluated yet</p>
            </div>
        );
    }

    const getRuleLabel = (rule) => {
        const labels = {
            'escrow_exists': 'Escrow Account Exists',
            'escrow_active': 'Escrow Account Active',
            'sufficient_balance': 'Sufficient Balance',
            'per_transaction_limit': 'Per-Transaction Limit',
            'daily_limit': 'Daily Spending Cap',
            'weekly_limit': 'Weekly Spending Cap',
            'monthly_limit': 'Monthly Spending Cap',
            'allowed_vendors': 'Vendor Allowlist',
            'blocked_vendors': 'Vendor Blocklist',
            'allowed_categories': 'Category Allowlist',
            'blocked_categories': 'Category Blocklist',
            'time_window': 'Time Window',
            'auto_approve_limit': 'Auto-Approve Limit',
            'auto_approve_limit_exceeded': 'Auto-Approve Limit Exceeded',
            'approval_threshold': 'Approval Threshold',
            'human_approval': 'Human Approval',
            'human_denial': 'Human Denial'
        };
        return labels[rule.rule] || rule.rule;
    };

    return (
        <div className="space-y-2">
            {rules.map((rule, index) => (
                <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                        rule.passed
                            ? 'bg-green-500/5 border border-green-500/20'
                            : 'bg-red-500/5 border border-red-500/20'
                    }`}
                >
                    <div className={`mt-0.5 ${rule.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {rule.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-ss-text text-sm">{getRuleLabel(rule)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                rule.passed
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                            }`}>
                                {rule.passed ? 'PASSED' : 'FAILED'}
                            </span>
                        </div>
                        {rule.reason && (
                            <p className="text-xs text-ss-text-tertiary mt-1">{rule.reason}</p>
                        )}
                        {rule.details && (
                            <p className="text-xs text-ss-text-secondary mt-1">
                                {typeof rule.details === 'object' 
                                    ? JSON.stringify(rule.details) 
                                    : rule.details}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Human-readable labels for denial reasons
const DENIAL_REASON_LABELS = {
    insufficient_balance: 'Insufficient Balance',
    vendor_not_allowed: 'Vendor Not Allowed',
    vendor_blocked: 'Vendor Blocked',
    over_daily_limit: 'Over Daily Limit',
    over_weekly_limit: 'Over Weekly Limit',
    over_monthly_limit: 'Over Monthly Limit',
    over_per_transaction_limit: 'Over Per-Transaction Limit',
    auto_approve_limit_exceeded: 'Exceeds Auto-Approve Limit',
    escrow_not_found: 'Escrow Account Not Found',
    agent_mismatch: 'Agent Not Authorized'
};

const getDenialLabel = (reason) => DENIAL_REASON_LABELS[reason] || reason?.replace(/_/g, ' ') || 'Unknown';

const PlaygroundPage = () => {
    const [escrowAccounts, setEscrowAccounts] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('response');
    const [codeLanguage, setCodeLanguage] = useState('curl');

    // Form state
    const [formData, setFormData] = useState({
        escrow_id: '',
        api_key_id: '',
        amount: '',
        vendor: '',
        category: '',
        description: ''
    });

    // Selected API key object (for full key access)
    const [selectedKeyFull, setSelectedKeyFull] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [escrows, keys, pols] = await Promise.all([
                listEscrowAccounts(),
                listApiKeys(),
                listPolicies()
            ]);
            setEscrowAccounts(escrows.data || []);
            setApiKeys(keys.data || []);
            setPolicies(pols.data || []);

            // Auto-select first escrow and test key
            const activeEscrows = (escrows.data || []).filter(e => e.status === 'active');
            const testKeys = (keys.data || []).filter(k => 
                k.is_active && (k.key_prefix?.startsWith('sk_test') || k.key_prefix?.startsWith('sk_agent'))
            );

            if (activeEscrows.length > 0) {
                setFormData(prev => ({ ...prev, escrow_id: activeEscrows[0].id }));
            }
            if (testKeys.length > 0) {
                setFormData(prev => ({ ...prev, api_key_id: testKeys[0].id }));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const applyPreset = (preset) => {
        setFormData(prev => ({
            ...prev,
            ...preset.values
        }));
    };

    const getSelectedKey = () => {
        return apiKeys.find(k => k.id === formData.api_key_id);
    };

    const generateIdempotencyKey = () => {
        return `playground-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const runSpendRequest = async () => {
        if (!formData.escrow_id || !formData.api_key_id || !formData.amount) {
            setError('Please fill in all required fields');
            return;
        }

        setRunning(true);
        setError(null);
        setResponse(null);

        try {
            const amountCents = Math.round(parseFloat(formData.amount) * 100);
            const idempotencyKey = generateIdempotencyKey();

            const payload = {
                escrow_id: formData.escrow_id,
                amount_cents: amountCents,
                currency: 'usd',
                vendor: formData.vendor || undefined,
                category: formData.category || undefined,
                description: formData.description || 'Playground test',
                idempotency_key: idempotencyKey
            };

            // Use the selected API key for authentication
            const selectedKey = getSelectedKey();
            
            // Note: In a real implementation, we'd need the full key value
            // For now, we use the JWT token but show the API key in snippets
            const res = await fetch(`${API_URL}/api/v1/spend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ss_token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (!res.ok) {
                setResponse({
                    success: false,
                    status: res.status,
                    data,
                    request: payload
                });
            } else {
                setResponse({
                    success: true,
                    status: res.status,
                    data,
                    request: payload
                });
            }
            
            setActiveTab('response');
        } catch (err) {
            setError(err.message);
        } finally {
            setRunning(false);
        }
    };

    const generateCodeSnippet = (language) => {
        const selectedKey = getSelectedKey();
        const keyPlaceholder = selectedKey?.key_prefix 
            ? `${selectedKey.key_prefix}...your_key_here` 
            : 'sk_test_your_key_here';
        
        const amountCents = formData.amount ? Math.round(parseFloat(formData.amount) * 100) : 0;

        const payload = {
            escrow_id: formData.escrow_id || 'esc_your_escrow_id',
            amount_cents: amountCents,
            currency: 'usd',
            vendor: formData.vendor || 'Anthropic',
            category: formData.category || 'ai_compute',
            description: formData.description || 'Agent spend request',
            idempotency_key: '${unique_operation_id}' // Template variable
        };

        switch (language) {
            case 'curl':
                return `curl -X POST "${API_URL}/api/v1/spend" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${keyPlaceholder}" \\
  -d '${JSON.stringify(payload, null, 2)}'`;

            case 'python':
                return `import requests

API_KEY = "${keyPlaceholder}"
API_URL = "${API_URL}/api/v1/spend"

# Generate a unique idempotency key per operation
# This prevents duplicate charges if the request is retried
idempotency_key = f"agent-{your_operation_id}"

response = requests.post(
    API_URL,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    },
    json={
        "escrow_id": "${formData.escrow_id || 'esc_your_escrow_id'}",
        "amount_cents": ${amountCents},
        "currency": "usd",
        "vendor": "${formData.vendor || 'Anthropic'}",
        "category": "${formData.category || 'ai_compute'}",
        "description": "${formData.description || 'Agent spend request'}",
        "idempotency_key": idempotency_key
    }
)

result = response.json()

if result.get("status") == "approved":
    print(f"Spend approved! Transaction ID: {result['id']}")
elif result.get("status") == "pending_approval":
    print(f"Awaiting human approval. Approval ID: {result.get('approval_id')}")
else:
    print(f"Spend denied: {result.get('denial_reason')}")`;

            case 'typescript':
                return `const API_KEY = "${keyPlaceholder}";
const API_URL = "${API_URL}/api/v1/spend";

// Generate a unique idempotency key per operation
// This prevents duplicate charges if the request is retried
const idempotencyKey = \`agent-\${yourOperationId}\`;

const response = await fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${API_KEY}\`
  },
  body: JSON.stringify({
    escrow_id: "${formData.escrow_id || 'esc_your_escrow_id'}",
    amount_cents: ${amountCents},
    currency: "usd",
    vendor: "${formData.vendor || 'Anthropic'}",
    category: "${formData.category || 'ai_compute'}",
    description: "${formData.description || 'Agent spend request'}",
    idempotency_key: idempotencyKey
  })
});

const result = await response.json();

if (result.status === "approved") {
  console.log(\`Spend approved! Transaction ID: \${result.id}\`);
} else if (result.status === "pending_approval") {
  console.log(\`Awaiting human approval. Approval ID: \${result.approval_id}\`);
} else {
  console.log(\`Spend denied: \${result.denial_reason}\`);
}`;

            default:
                return '';
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            approved: 'bg-green-500/20 text-green-400',
            denied: 'bg-red-500/20 text-red-400',
            pending_approval: 'bg-yellow-500/20 text-yellow-400',
            cancelled: 'bg-ss-text-tertiary/20 text-ss-text-tertiary',
            expired: 'bg-orange-500/20 text-orange-400'
        };
        return styles[status] || 'bg-ss-text-tertiary/20 text-ss-text-tertiary';
    };

    // Get category suggestions based on policies
    const getCategorySuggestions = () => {
        const categories = new Set();
        policies.forEach(p => {
            (p.allowed_categories || []).forEach(c => categories.add(c));
        });
        return ['ai_compute', 'advertising', 'saas_subscription', 'developer_tools', 'infrastructure', ...categories];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="playground-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Playground</h1>
                    <p className="text-ss-text-secondary mt-1">
                        Test spend requests and explore the rules engine.{' '}
                        <Link to="/docs/trust-law" className="text-ss-accent hover:underline inline-flex items-center gap-1">
                            Learn about governance rules <ExternalLink size={12} />
                        </Link>
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-3 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                    data-testid="refresh-btn"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Mode Indicator */}
            <ModeIndicator apiKey={getSelectedKey()} />

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Request Builder */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] p-5">
                        <h2 className="font-semibold text-ss-text mb-4 flex items-center gap-2">
                            <Play size={18} className="text-ss-accent" />
                            Request Builder
                        </h2>

                        {/* Scenario Presets */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-ss-text-tertiary uppercase tracking-wider mb-2">
                                Quick Scenarios
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {SCENARIO_PRESETS.map(preset => {
                                    const Icon = preset.icon;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyPreset(preset)}
                                            className="flex items-center gap-2 p-2 bg-ss-elevated hover:bg-ss-code rounded-lg text-left transition-all group"
                                            data-testid={`preset-${preset.id}`}
                                        >
                                            <Icon size={14} className={preset.color} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-ss-text truncate">{preset.name}</p>
                                                <p className="text-[10px] text-ss-text-tertiary truncate">{preset.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-ss-text-secondary mb-1.5">
                                    Escrow Account <span className="text-ss-error">*</span>
                                </label>
                                <select
                                    value={formData.escrow_id}
                                    onChange={(e) => handleChange('escrow_id', e.target.value)}
                                    className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm focus:outline-none focus:border-ss-accent"
                                    data-testid="escrow-select"
                                >
                                    <option value="">Select escrow...</option>
                                    {escrowAccounts.filter(e => e.status === 'active').map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} ({formatCents(acc.balance_cents)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-ss-text-secondary mb-1.5">
                                    API Key <span className="text-ss-error">*</span>
                                </label>
                                <select
                                    value={formData.api_key_id}
                                    onChange={(e) => handleChange('api_key_id', e.target.value)}
                                    className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm focus:outline-none focus:border-ss-accent"
                                    data-testid="api-key-select"
                                >
                                    <option value="">Select API key...</option>
                                    {apiKeys.filter(k => k.is_active).map(key => (
                                        <option key={key.id} value={key.id}>
                                            {key.name} ({key.key_prefix}...)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-ss-text-secondary mb-1.5">
                                    Amount (USD) <span className="text-ss-error">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => handleChange('amount', e.target.value)}
                                        placeholder="49.99"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-7 pr-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                        data-testid="amount-input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-ss-text-secondary mb-1.5">Vendor</label>
                                <input
                                    type="text"
                                    value={formData.vendor}
                                    onChange={(e) => handleChange('vendor', e.target.value)}
                                    placeholder="e.g., Anthropic"
                                    className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                    data-testid="vendor-input"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-ss-text-secondary mb-1.5">Category</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    placeholder="e.g., ai_compute"
                                    list="category-suggestions"
                                    className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                    data-testid="category-input"
                                />
                                <datalist id="category-suggestions">
                                    {getCategorySuggestions().map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-xs text-ss-text-secondary mb-1.5">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Optional description..."
                                    rows={2}
                                    className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent resize-none"
                                    data-testid="description-input"
                                />
                            </div>
                        </div>

                        {/* Run Button */}
                        <button
                            onClick={runSpendRequest}
                            disabled={running || !formData.escrow_id || !formData.api_key_id || !formData.amount}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                            data-testid="run-btn"
                        >
                            {running ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    Run Spend Request
                                </>
                            )}
                        </button>
                    </div>

                    {/* Help Links */}
                    <div className="bg-ss-surface/50 rounded-lg p-4 border border-[rgba(255,255,255,0.04)]">
                        <div className="flex items-start gap-2">
                            <Info size={14} className="text-ss-text-tertiary mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-ss-text-secondary space-y-1">
                                <p>
                                    <Link to="/docs/api#spend-requests" className="text-ss-accent hover:underline">
                                        View full API Reference →
                                    </Link>
                                </p>
                                <p>
                                    <Link to="/docs/trust-law" className="text-ss-accent hover:underline">
                                        Understand governance rules →
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Response & Code */}
                <div className="lg:col-span-3">
                    <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-[rgba(255,255,255,0.06)]">
                            {[
                                { id: 'response', label: 'Response', icon: FileJson },
                                { id: 'rules', label: 'Rules', icon: ListChecks },
                                { id: 'code', label: 'Code Snippets', icon: Code }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'text-ss-accent border-b-2 border-ss-accent bg-ss-accent/5'
                                            : 'text-ss-text-secondary hover:text-ss-text'
                                    }`}
                                    data-testid={`tab-${tab.id}`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-5 min-h-[400px]">
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Response Tab */}
                            {activeTab === 'response' && (
                                <div>
                                    {response ? (
                                        <div className="space-y-4">
                                            {/* Status Summary */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(response.data?.status)}`}>
                                                    {response.data?.status?.toUpperCase() || 'ERROR'}
                                                </span>
                                                <span className="text-xs text-ss-text-tertiary">
                                                    HTTP {response.status}
                                                </span>
                                                {response.data?.id && (
                                                    <span className="text-xs text-ss-text-secondary font-mono">
                                                        ID: {response.data.id}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Denial Detail */}
                                            {response.data?.status === 'denied' && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <XCircle size={18} className="text-red-400" />
                                                        <span className="font-semibold text-red-400">
                                                            {getDenialLabel(response.data.denial_reason)}
                                                        </span>
                                                    </div>
                                                    {response.data.denial_reason && (
                                                        <p className="text-xs text-red-400/70 font-mono">
                                                            code: {response.data.denial_reason}
                                                        </p>
                                                    )}
                                                    {response.data.error && (
                                                        <p className="text-xs text-red-400/80">
                                                            {response.data.error}
                                                        </p>
                                                    )}
                                                    {response.data.rules_evaluated && response.data.rules_evaluated.length > 0 && (
                                                        <div className="mt-3 space-y-1.5">
                                                            <p className="text-xs font-medium text-red-400/90">Rules Evaluated:</p>
                                                            {response.data.rules_evaluated.map((rule, i) => (
                                                                <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded ${
                                                                    rule.passed
                                                                        ? 'bg-green-500/5 border border-green-500/15'
                                                                        : 'bg-red-500/10 border border-red-500/20'
                                                                }`}>
                                                                    <span className={`mt-0.5 ${rule.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {rule.passed ? <CheckCircle size={13} /> : <XCircle size={13} />}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className={`text-xs font-medium ${rule.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                                            {rule.rule?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                                        </span>
                                                                        {!rule.passed && (
                                                                            <span className="ml-1.5 px-1 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                                                                                FAILED
                                                                            </span>
                                                                        )}
                                                                        {rule.reason && (
                                                                            <p className="text-[11px] text-ss-text-tertiary mt-0.5">{rule.reason}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 500 Server Error Detail */}
                                            {response.status >= 500 && response.data?.status !== 'denied' && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle size={18} className="text-red-400" />
                                                        <span className="font-semibold text-red-400">Server Error</span>
                                                    </div>
                                                    {(response.data?.detail || response.data?.error) && (
                                                        <p className="text-xs text-red-400/80">
                                                            {response.data.detail || response.data.error}
                                                        </p>
                                                    )}
                                                    {response.data?.message && (
                                                        <p className="text-xs text-red-400/70">
                                                            {response.data.message}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* 4xx Error Detail (non-denial) */}
                                            {response.status >= 400 && response.status < 500 && response.data?.status !== 'denied' && (
                                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle size={18} className="text-yellow-400" />
                                                        <span className="font-semibold text-yellow-400">Request Error</span>
                                                    </div>
                                                    {(response.data?.detail || response.data?.error) && (
                                                        <p className="text-xs text-yellow-400/80">
                                                            {response.data.detail || response.data.error}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {response.data?.approval_id && (
                                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                    <p className="text-xs text-yellow-400">
                                                        <strong>Pending Approval:</strong> {response.data.approval_id}
                                                    </p>
                                                    {response.data?.approval_expires_at && (
                                                        <p className="text-xs text-yellow-400/70 mt-1">
                                                            Expires: {new Date(response.data.approval_expires_at).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Approved Amount Summary */}
                                            {response.data?.status === 'approved' && (
                                                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle size={16} className="text-green-400" />
                                                        <span className="text-sm font-medium text-green-400">
                                                            Spend Approved
                                                            {response.data.amount_cents != null && (
                                                                <> — {formatCents(response.data.amount_cents)}</>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {response.data.rules_evaluated && response.data.rules_evaluated.length > 0 && (
                                                        <p className="text-xs text-green-400/70 mt-1">
                                                            {response.data.rules_evaluated.filter(r => r.passed).length}/{response.data.rules_evaluated.length} rules passed
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Full JSON */}
                                            <details className="group">
                                                <summary className="cursor-pointer text-xs text-ss-text-tertiary hover:text-ss-text-secondary transition-colors">
                                                    ▶ Full Response JSON
                                                </summary>
                                                <div className="mt-2">
                                                    <pre className="bg-ss-code rounded-lg p-4 overflow-x-auto text-xs">
                                                        <code className="text-ss-text-secondary font-mono">
                                                            {JSON.stringify(response.data, null, 2)}
                                                        </code>
                                                    </pre>
                                                </div>
                                            </details>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-ss-text-tertiary">
                                            <FileJson size={40} className="mx-auto mb-3 opacity-50" />
                                            <p>Run a spend request to see the response</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Rules Tab */}
                            {activeTab === 'rules' && (
                                <div>
                                    <RulesTimeline rules={response?.data?.rules_evaluated} />
                                </div>
                            )}

                            {/* Code Snippets Tab */}
                            {activeTab === 'code' && (
                                <div className="space-y-4">
                                    {/* Language Selector */}
                                    <div className="flex gap-2">
                                        {['curl', 'python', 'typescript'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setCodeLanguage(lang)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    codeLanguage === lang
                                                        ? 'bg-ss-accent text-white'
                                                        : 'bg-ss-elevated text-ss-text-secondary hover:text-ss-text'
                                                }`}
                                                data-testid={`lang-${lang}`}
                                            >
                                                {lang === 'curl' ? 'cURL' : lang === 'typescript' ? 'TypeScript' : 'Python'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Code Block */}
                                    <CodeSnippet 
                                        language={codeLanguage}
                                        code={generateCodeSnippet(codeLanguage)}
                                    />

                                    <p className="text-xs text-ss-text-tertiary">
                                        💡 Replace the API key placeholder with your actual key. Generate deterministic idempotency keys per operation to prevent duplicate charges.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaygroundPage;
