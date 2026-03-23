import React, { useState, useEffect } from 'react';
import StatusBadge from '@/components/StatusBadge';
import { 
    Key, 
    Plus, 
    RefreshCw, 
    X,
    Copy,
    Check,
    AlertTriangle,
    Trash2,
    Power,
    PowerOff
} from 'lucide-react';
import {
    listApiKeys,
    createApiKey,
    revokeApiKey,
    deactivateApiKey,
    reactivateApiKey,
    formatDate
} from '@/lib/api';

const ApiKeysPage = () => {
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyResult, setNewKeyResult] = useState(null);

    useEffect(() => {
        fetchApiKeys();
    }, []);

    const fetchApiKeys = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listApiKeys();
            setApiKeys(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            return;
        }
        try {
            await revokeApiKey(id);
            fetchApiKeys();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleActive = async (key) => {
        try {
            if (key.is_active) {
                await deactivateApiKey(key.id);
            } else {
                await reactivateApiKey(key.id);
            }
            fetchApiKeys();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCreateSuccess = (result) => {
        setShowCreateModal(false);
        setNewKeyResult(result);
        fetchApiKeys();
    };

    // Group keys by type
    const liveKeys = apiKeys.filter(k => k.key_type === 'live');
    const testKeys = apiKeys.filter(k => k.key_type === 'test');
    const agentKeys = apiKeys.filter(k => k.key_type === 'agent');

    return (
        <div className="space-y-6" data-testid="api-keys-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">API Keys</h1>
                    <p className="text-ss-text-secondary mt-1">Manage your API keys for live, test, and agent access</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchApiKeys}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid="refresh-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="new-key-btn"
                    >
                        <Plus size={16} />
                        New API Key
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error" data-testid="error-message">
                    {error}
                </div>
            )}

            {/* New Key Result */}
            {newKeyResult && (
                <NewKeyAlert 
                    keyData={newKeyResult} 
                    onDismiss={() => setNewKeyResult(null)} 
                />
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!loading && apiKeys.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center" data-testid="empty-state">
                    <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                        <Key className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">No API keys yet</h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto mb-6">
                        Create your first API key to start integrating Safe-Spend into your agents.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="empty-new-key-btn"
                    >
                        <Plus size={18} />
                        New API Key
                    </button>
                </div>
            )}

            {/* Keys by type */}
            {!loading && apiKeys.length > 0 && (
                <div className="space-y-8">
                    {/* Live Keys */}
                    <KeySection
                        title="Live Keys"
                        description="Use in production environments"
                        keys={liveKeys}
                        badgeColor="emerald"
                        onRevoke={handleRevoke}
                        onToggleActive={handleToggleActive}
                    />

                    {/* Test Keys */}
                    <KeySection
                        title="Test Keys"
                        description="Use in development and testing"
                        keys={testKeys}
                        badgeColor="amber"
                        onRevoke={handleRevoke}
                        onToggleActive={handleToggleActive}
                    />

                    {/* Agent Keys */}
                    <KeySection
                        title="Agent Keys"
                        description="Use for AI agent integrations"
                        keys={agentKeys}
                        badgeColor="blue"
                        onRevoke={handleRevoke}
                        onToggleActive={handleToggleActive}
                    />
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateKeyModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </div>
    );
};

// New Key Alert Component
const NewKeyAlert = ({ keyData, onDismiss }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(keyData.key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-ss-warning/10 border border-ss-warning/30 rounded-xl p-6" data-testid="new-key-alert">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-ss-warning/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-ss-warning" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-ss-text mb-1">Save Your API Key</h3>
                    <p className="text-sm text-ss-text-secondary mb-4">
                        This key will only be shown once. Make sure to copy and store it securely.
                    </p>
                    
                    <div className="flex items-center gap-2 p-3 bg-ss-code rounded-lg font-mono text-sm break-all">
                        <span className="flex-1 text-ss-accent" data-testid="new-key-value">{keyData.key}</span>
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all flex-shrink-0"
                            data-testid="copy-key-btn"
                        >
                            {copied ? <Check size={16} className="text-ss-accent" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    className="p-2 hover:bg-ss-warning/20 rounded-lg text-ss-warning transition-all flex-shrink-0"
                    data-testid="dismiss-alert-btn"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

// Key Section Component
const KeySection = ({ title, description, keys, badgeColor, onRevoke, onToggleActive }) => {
    if (keys.length === 0) return null;

    const badgeStyles = {
        emerald: 'bg-ss-accent/10 text-ss-accent',
        amber: 'bg-ss-warning/10 text-ss-warning',
        blue: 'bg-blue-500/10 text-blue-400'
    };

    return (
        <div data-testid={`key-section-${title.toLowerCase().replace(' ', '-')}`}>
            <div className="flex items-center gap-3 mb-4">
                <h2 className="font-heading text-lg font-semibold text-ss-text">{title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyles[badgeColor]}`}>
                    {keys.length}
                </span>
            </div>
            <p className="text-sm text-ss-text-tertiary mb-4">{description}</p>
            
            <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-ss-elevated">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Key</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Label</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Last Used</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider">Created</th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ss-text-tertiary uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((key) => (
                                <tr 
                                    key={key.id}
                                    className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                    data-testid={`key-row-${key.id}`}
                                >
                                    <td className="px-4 py-3">
                                        <code className="text-sm font-mono text-ss-text bg-ss-code px-2 py-1 rounded">
                                            {key.key_prefix}...
                                        </code>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-ss-text">
                                        {key.label || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={key.is_active ? 'active' : 'paused'} />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-ss-text-secondary">
                                        {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-ss-text-secondary">
                                        {formatDate(key.created_at).split(',')[0]}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onToggleActive(key)}
                                                className={`p-2 rounded-lg transition-all ${
                                                    key.is_active 
                                                        ? 'hover:bg-ss-warning/10 text-ss-warning' 
                                                        : 'hover:bg-ss-accent/10 text-ss-accent'
                                                }`}
                                                title={key.is_active ? 'Deactivate' : 'Reactivate'}
                                                data-testid={`toggle-key-${key.id}`}
                                            >
                                                {key.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                                            </button>
                                            <button
                                                onClick={() => onRevoke(key.id)}
                                                className="p-2 hover:bg-ss-error/10 rounded-lg text-ss-error transition-all"
                                                title="Revoke key"
                                                data-testid={`revoke-key-${key.id}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Create Key Modal Component
const CreateKeyModal = ({ onClose, onSuccess }) => {
    const [keyType, setKeyType] = useState('agent');
    const [label, setLabel] = useState('');
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const permissionOptions = [
        { id: 'manage_escrow', label: 'Manage Escrow Accounts' },
        { id: 'manage_policies', label: 'Manage Policies' },
        { id: 'create_spend', label: 'Create Spend Requests' },
        { id: 'view_transactions', label: 'View Transactions' },
        { id: 'manage_approvals', label: 'Manage Approvals' }
    ];

    const togglePermission = (perm) => {
        setPermissions(prev => 
            prev.includes(perm) 
                ? prev.filter(p => p !== perm) 
                : [...prev, perm]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await createApiKey({
                key_type: keyType,
                label: label || undefined,
                permissions
            });
            onSuccess(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="create-key-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
                    <h2 className="font-heading text-lg font-semibold text-ss-text">New API Key</h2>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm">
                            {error}
                        </div>
                    )}

                    {/* Key Type */}
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-3">
                            Key Type <span className="text-ss-error">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'live', label: 'Live', desc: 'Production', color: 'ss-accent' },
                                { value: 'test', label: 'Test', desc: 'Development', color: 'ss-warning' },
                                { value: 'agent', label: 'Agent', desc: 'AI agents', color: 'blue-400' }
                            ].map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setKeyType(type.value)}
                                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                                        keyType === type.value
                                            ? `border-${type.color} bg-${type.color}/10`
                                            : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
                                    }`}
                                    data-testid={`key-type-${type.value}`}
                                >
                                    <p className={`font-medium ${keyType === type.value ? `text-${type.color}` : 'text-ss-text'}`}>
                                        {type.label}
                                    </p>
                                    <p className="text-xs text-ss-text-tertiary">{type.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Label */}
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Label (optional)
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g., Marketing Agent"
                            className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                            data-testid="key-label-input"
                        />
                    </div>

                    {/* Permissions */}
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-3">
                            Permissions
                        </label>
                        <div className="space-y-2">
                            {permissionOptions.map(perm => (
                                <label 
                                    key={perm.id}
                                    className="flex items-center gap-3 p-3 bg-ss-elevated rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                >
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(perm.id)}
                                        onChange={() => togglePermission(perm.id)}
                                        className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-ss-surface text-ss-accent focus:ring-ss-accent"
                                        data-testid={`perm-${perm.id}`}
                                    />
                                    <span className="text-sm text-ss-text">{perm.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary transition-all"
                            data-testid="cancel-create-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                            data-testid="submit-create-btn"
                        >
                            {loading ? 'Creating...' : 'Create Key'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApiKeysPage;
