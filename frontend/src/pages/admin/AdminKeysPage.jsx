/**
 * Admin Keys Management Page
 * Create, view, and revoke admin API keys
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import {
    KeyIcon,
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
    ClipboardIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

// Format date
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Available scopes
const AVAILABLE_SCOPES = [
    { value: 'health', label: 'Health', description: 'System health and status endpoints' },
    { value: 'blog', label: 'Blog', description: 'Blog CRUD operations' },
    { value: 'metrics', label: 'Metrics', description: 'Platform metrics and analytics' },
    { value: 'audit', label: 'Audit', description: 'Cross-org audit log access' },
    { value: 'keys', label: 'Keys', description: 'Admin key management' },
    { value: '*', label: 'All (Superadmin)', description: 'Full access to all admin endpoints' }
];

const AdminKeysPage = () => {
    const { adminFetch } = useAdmin();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [newKey, setNewKey] = useState(null);
    const [copied, setCopied] = useState(false);

    // Create form state
    const [label, setLabel] = useState('');
    const [selectedScopes, setSelectedScopes] = useState([]);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await adminFetch('/api/admin/keys');
            
            if (res.ok) {
                const data = await res.json();
                setKeys(data.keys || []);
            } else {
                throw new Error('Failed to fetch keys');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!label) {
            setError('Label is required');
            return;
        }
        if (selectedScopes.length === 0) {
            setError('At least one scope is required');
            return;
        }

        setCreating(true);
        setError(null);

        try {
            const res = await adminFetch('/api/admin/keys', {
                method: 'POST',
                body: JSON.stringify({
                    label,
                    scopes: selectedScopes
                })
            });

            if (res.ok) {
                const data = await res.json();
                setNewKey(data);
                setLabel('');
                setSelectedScopes([]);
                fetchKeys();
            } else {
                const errData = await res.json();
                throw new Error(errData.error?.message || 'Failed to create key');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (keyId) => {
        if (!confirm('Are you sure you want to revoke this admin key? This cannot be undone.')) {
            return;
        }

        setDeleting(keyId);
        setError(null);

        try {
            const res = await adminFetch(`/api/admin/keys/${keyId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchKeys();
            } else {
                throw new Error('Failed to revoke key');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleScope = (scope) => {
        if (scope === '*') {
            setSelectedScopes(['*']);
        } else {
            let newScopes = selectedScopes.filter(s => s !== '*');
            if (newScopes.includes(scope)) {
                newScopes = newScopes.filter(s => s !== scope);
            } else {
                newScopes.push(scope);
            }
            setSelectedScopes(newScopes);
        }
    };

    return (
        <div className="space-y-6" data-testid="admin-keys-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-[#F5F5F5]">Admin Keys</h1>
                    <p className="text-[#9CA3AF] mt-1">Manage admin API keys for internal tools</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#14B8A6] hover:bg-[#2DD4BF] rounded-lg text-white font-medium transition-all"
                    data-testid="create-key-btn"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create Key
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444]">
                    {error}
                </div>
            )}

            {/* New Key Display (shown after creation) */}
            {newKey && (
                <div className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.2)] flex items-center justify-center">
                                <KeyIcon className="w-5 h-5 text-[#14B8A6]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[#14B8A6]">Key Created Successfully</h3>
                                <p className="text-xs text-[#14B8A6]/70">Copy and save this key now - it won't be shown again</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setNewKey(null)}
                            className="text-[#14B8A6] hover:text-[#2DD4BF]"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="bg-[#0A0A0B] rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <code className="text-sm text-[#14B8A6] font-mono break-all">
                                {newKey.key}
                            </code>
                            <button
                                onClick={() => copyToClipboard(newKey.key)}
                                className="ml-3 p-2 bg-[#141416] rounded-lg text-[#14B8A6] hover:bg-[#1A1A1E] transition-all flex-shrink-0"
                            >
                                {copied ? (
                                    <CheckIcon className="w-4 h-4" />
                                ) : (
                                    <ClipboardIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#14B8A6]/70">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        This key has {newKey.scopes?.join(', ')} scope(s)
                    </div>
                </div>
            )}

            {/* Create Key Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
                            <h2 className="font-heading font-semibold text-[#F5F5F5]">Create Admin Key</h2>
                            <button
                                onClick={() => { setShowCreate(false); setLabel(''); setSelectedScopes([]); }}
                                className="text-[#6B7280] hover:text-[#F5F5F5]"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {/* Label */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-1">Label</label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="e.g., Kit Operations, Blog Publisher"
                                    className="w-full px-3 py-2 bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#F5F5F5] placeholder-[#6B7280] focus:outline-none focus:border-[#14B8A6]"
                                    data-testid="key-label-input"
                                />
                            </div>

                            {/* Scopes */}
                            <div>
                                <label className="block text-sm text-[#9CA3AF] mb-2">Scopes</label>
                                <div className="space-y-2">
                                    {AVAILABLE_SCOPES.map((scope) => (
                                        <label
                                            key={scope.value}
                                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                                selectedScopes.includes(scope.value)
                                                    ? 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)]'
                                                    : 'bg-[#1A1A1E] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedScopes.includes(scope.value)}
                                                onChange={() => toggleScope(scope.value)}
                                                className="mt-0.5 accent-[#14B8A6]"
                                            />
                                            <div>
                                                <p className={`text-sm font-medium ${
                                                    selectedScopes.includes(scope.value) ? 'text-[#14B8A6]' : 'text-[#F5F5F5]'
                                                }`}>
                                                    {scope.label}
                                                </p>
                                                <p className="text-xs text-[#6B7280]">{scope.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-[rgba(255,255,255,0.06)]">
                            <button
                                onClick={() => { setShowCreate(false); setLabel(''); setSelectedScopes([]); }}
                                className="px-4 py-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !label || selectedScopes.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-[#14B8A6] hover:bg-[#2DD4BF] rounded-lg text-white font-medium transition-all disabled:opacity-50"
                                data-testid="create-key-submit-btn"
                            >
                                {creating ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <PlusIcon className="w-4 h-4" />
                                )}
                                Create Key
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keys Table */}
            <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-12">
                        <KeyIcon className="w-12 h-12 mx-auto mb-3 text-[#6B7280]" />
                        <p className="text-[#6B7280]">No admin keys found</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 mt-4 text-sm text-[#14B8A6] hover:text-[#2DD4BF]"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create your first key
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-[rgba(255,255,255,0.06)]">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Key
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Label
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Scopes
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Last Used
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map((key) => (
                                    <tr 
                                        key={key.id}
                                        className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                                    >
                                        <td className="py-4 px-4">
                                            <code className="text-sm text-[#14B8A6] font-mono">
                                                {key.key_prefix}...
                                            </code>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-sm text-[#F5F5F5]">{key.label}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(key.scopes || []).map((scope, i) => (
                                                    <span 
                                                        key={i}
                                                        className={`px-1.5 py-0.5 text-xs rounded ${
                                                            scope === '*'
                                                                ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
                                                                : 'bg-[#1A1A1E] text-[#9CA3AF]'
                                                        }`}
                                                    >
                                                        {scope === '*' ? 'superadmin' : scope}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-[#9CA3AF]">
                                            {formatDate(key.created_at)}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-[#6B7280]">
                                            {key.last_used_at ? formatDate(key.last_used_at) : 'Never'}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => handleDelete(key.id)}
                                                    disabled={deleting === key.id}
                                                    className="p-2 text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-all disabled:opacity-50"
                                                    title="Revoke key"
                                                >
                                                    {deleting === key.id ? (
                                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <TrashIcon className="w-4 h-4" />
                                                    )}
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

            {/* Help Text */}
            <div className="bg-[#141416] rounded-xl border border-[rgba(255,255,255,0.06)] p-4">
                <h3 className="font-medium text-[#F5F5F5] mb-2">About Admin Keys</h3>
                <ul className="text-sm text-[#9CA3AF] space-y-1">
                    <li>• Admin keys use the format <code className="text-[#14B8A6]">ss_admin_...</code></li>
                    <li>• Keys are hashed and cannot be recovered after creation</li>
                    <li>• Assign minimal scopes needed for each use case</li>
                    <li>• Use separate keys for different services (Kit, CI/CD, etc.)</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminKeysPage;
