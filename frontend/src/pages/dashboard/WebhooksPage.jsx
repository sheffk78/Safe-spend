import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { 
    Webhook, 
    Plus, 
    RefreshCw, 
    X,
    Trash2,
    Power,
    PowerOff,
    RotateCw,
    Send,
    ChevronDown,
    ChevronUp,
    Check,
    Copy,
    AlertTriangle,
    ExternalLink,
    BookOpen
} from 'lucide-react';
import {
    listWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    rotateWebhookSecret,
    listWebhookDeliveries,
    formatDate
} from '@/lib/api';

const SUPPORTED_EVENTS = [
    { value: 'spend.approved', label: 'Spend Approved', category: 'Spend' },
    { value: 'spend.denied', label: 'Spend Denied', category: 'Spend' },
    { value: 'spend.expired', label: 'Spend Expired', category: 'Spend' },
    { value: 'approval.requested', label: 'Approval Requested', category: 'Approval' },
    { value: 'approval.approved', label: 'Approval Approved', category: 'Approval' },
    { value: 'approval.denied', label: 'Approval Denied', category: 'Approval' },
    { value: 'approval.expired', label: 'Approval Expired', category: 'Approval' },
    { value: 'escrow.funded', label: 'Escrow Funded', category: 'Escrow' },
    { value: 'escrow.paused', label: 'Escrow Paused', category: 'Escrow' },
    { value: 'escrow.resumed', label: 'Escrow Resumed', category: 'Escrow' },
    { value: 'escrow.closed', label: 'Escrow Closed', category: 'Escrow' }
];

const WebhooksPage = () => {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSecretResult, setNewSecretResult] = useState(null);
    const [expandedWebhook, setExpandedWebhook] = useState(null);

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listWebhooks();
            setWebhooks(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
            return;
        }
        try {
            await deleteWebhook(id);
            fetchWebhooks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleActive = async (webhook) => {
        try {
            await updateWebhook(webhook.id, { is_active: !webhook.is_active });
            fetchWebhooks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleTest = async (webhook) => {
        try {
            const result = await testWebhook(webhook.id);
            alert(result.success 
                ? `Test webhook sent successfully! Status: ${result.status_code}` 
                : `Test webhook failed: ${result.error}`
            );
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRotateSecret = async (webhook) => {
        if (!window.confirm('Are you sure you want to rotate this webhook\'s secret? You will need to update your endpoint to use the new secret.')) {
            return;
        }
        try {
            const result = await rotateWebhookSecret(webhook.id);
            setNewSecretResult({ webhookId: webhook.id, secret: result.secret });
            fetchWebhooks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCreateSuccess = (result) => {
        setShowCreateModal(false);
        if (result.secret) {
            setNewSecretResult({ webhookId: result.id, secret: result.secret });
        }
        fetchWebhooks();
    };

    return (
        <div className="space-y-6" data-testid="webhooks-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Webhooks</h1>
                    <p className="text-ss-text-secondary mt-1">
                        Configure webhook endpoints to receive real-time event notifications.{' '}
                        <Link to="/docs/webhooks" className="text-ss-accent hover:underline inline-flex items-center gap-1">
                            <BookOpen size={14} />
                            Payloads & signature verification
                        </Link>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchWebhooks}
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
                        data-testid="new-webhook-btn"
                    >
                        <Plus size={16} />
                        New Webhook Endpoint
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error" data-testid="error-message">
                    {error}
                </div>
            )}

            {/* New Secret Alert */}
            {newSecretResult && (
                <SecretAlert 
                    secret={newSecretResult.secret}
                    onDismiss={() => setNewSecretResult(null)}
                />
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!loading && webhooks.length === 0 && (
                <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center" data-testid="empty-state">
                    <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                        <Webhook className="w-8 h-8 text-ss-accent" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">No webhooks configured</h2>
                    <p className="text-ss-text-secondary max-w-md mx-auto mb-6">
                        Set up webhooks to receive real-time notifications when spend events occur.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-white font-medium transition-all"
                        data-testid="empty-new-webhook-btn"
                    >
                        <Plus size={18} />
                        New Webhook Endpoint
                    </button>
                </div>
            )}

            {/* Webhooks list */}
            {!loading && webhooks.length > 0 && (
                <div className="space-y-4">
                    {webhooks.map((webhook) => (
                        <WebhookCard
                            key={webhook.id}
                            webhook={webhook}
                            expanded={expandedWebhook === webhook.id}
                            onToggleExpand={() => setExpandedWebhook(expandedWebhook === webhook.id ? null : webhook.id)}
                            onToggleActive={() => handleToggleActive(webhook)}
                            onTest={() => handleTest(webhook)}
                            onRotateSecret={() => handleRotateSecret(webhook)}
                            onDelete={() => handleDelete(webhook.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateWebhookModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}
        </div>
    );
};

// Secret Alert Component
const SecretAlert = ({ secret, onDismiss }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-ss-warning/10 border border-ss-warning/30 rounded-xl p-6" data-testid="secret-alert">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-ss-warning/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-ss-warning" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-ss-text mb-1">Save Your Webhook Secret</h3>
                    <p className="text-sm text-ss-text-secondary mb-4">
                        This secret will only be shown once. Use it to verify webhook signatures.
                    </p>
                    
                    <div className="flex items-center gap-2 p-3 bg-ss-code rounded-lg font-mono text-sm break-all">
                        <span className="flex-1 text-ss-accent" data-testid="secret-value">{secret}</span>
                        <button
                            onClick={handleCopy}
                            className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all flex-shrink-0"
                            data-testid="copy-secret-btn"
                        >
                            {copied ? <Check size={16} className="text-ss-accent" /> : <Copy size={16} />}
                        </button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-ss-code rounded-lg">
                        <p className="text-xs text-ss-text-tertiary mb-2">Signature Verification:</p>
                        <code className="text-xs text-ss-text-secondary">
                            HMAC-SHA256(timestamp + "." + payload, secret)
                        </code>
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    className="p-2 hover:bg-ss-warning/20 rounded-lg text-ss-warning transition-all flex-shrink-0"
                    data-testid="dismiss-secret-btn"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

// Webhook Card Component
const WebhookCard = ({ webhook, expanded, onToggleExpand, onToggleActive, onTest, onRotateSecret, onDelete }) => {
    const [deliveries, setDeliveries] = useState([]);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);

    const loadDeliveries = async () => {
        if (deliveries.length > 0) return; // Already loaded
        setLoadingDeliveries(true);
        try {
            const data = await listWebhookDeliveries(webhook.id, { limit: 10 });
            setDeliveries(data.data || []);
        } catch (err) {
            console.error('Failed to load deliveries:', err);
        } finally {
            setLoadingDeliveries(false);
        }
    };

    useEffect(() => {
        if (expanded) {
            loadDeliveries();
        }
    }, [expanded]);

    return (
        <div className="bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden" data-testid={`webhook-card-${webhook.id}`}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                        <Webhook className="w-5 h-5 text-ss-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-ss-text truncate">{webhook.url}</p>
                        <p className="text-xs text-ss-text-tertiary">
                            {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''} subscribed
                            {webhook.last_triggered_at && ` · Last triggered ${formatDate(webhook.last_triggered_at)}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={webhook.is_active ? 'active' : 'paused'} />
                    <button
                        onClick={onToggleExpand}
                        className="p-2 hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text transition-all"
                        data-testid={`expand-btn-${webhook.id}`}
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Events Summary */}
            <div className="px-4 pb-4 flex flex-wrap gap-2">
                {webhook.events.map((event, i) => (
                    <span key={i} className="px-2 py-1 bg-ss-elevated rounded text-xs text-ss-text-secondary">
                        {event}
                    </span>
                ))}
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4 bg-ss-elevated/50">
                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onTest}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-ss-surface hover:bg-ss-elevated rounded-lg text-ss-text-secondary text-xs transition-all"
                                data-testid={`test-btn-${webhook.id}`}
                            >
                                <Send size={12} />
                                Test
                            </button>
                            <button
                                onClick={onRotateSecret}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-ss-surface hover:bg-ss-elevated rounded-lg text-ss-text-secondary text-xs transition-all"
                                data-testid={`rotate-btn-${webhook.id}`}
                            >
                                <RotateCw size={12} />
                                Rotate Secret
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onToggleActive}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    webhook.is_active 
                                        ? 'bg-ss-warning/10 text-ss-warning hover:bg-ss-warning/20' 
                                        : 'bg-ss-accent/10 text-ss-accent hover:bg-ss-accent/20'
                                }`}
                                data-testid={`toggle-btn-${webhook.id}`}
                            >
                                {webhook.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                                {webhook.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-ss-error/10 hover:bg-ss-error/20 rounded-lg text-ss-error text-xs transition-all"
                                data-testid={`delete-btn-${webhook.id}`}
                            >
                                <Trash2 size={12} />
                                Delete
                            </button>
                        </div>
                    </div>

                    {/* Recent Deliveries */}
                    <div>
                        <h4 className="text-sm font-medium text-ss-text-secondary mb-2">Recent Deliveries</h4>
                        {loadingDeliveries ? (
                            <div className="text-center py-4">
                                <div className="w-5 h-5 border-2 border-ss-accent border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : deliveries.length === 0 ? (
                            <p className="text-xs text-ss-text-tertiary text-center py-4">No deliveries yet</p>
                        ) : (
                            <div className="space-y-2">
                                {deliveries.map((delivery) => (
                                    <div 
                                        key={delivery.id}
                                        className="flex items-center justify-between p-2 bg-ss-surface rounded-lg text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                delivery.status === 'success' ? 'bg-ss-accent' :
                                                delivery.status === 'failed' ? 'bg-ss-error' : 'bg-ss-warning'
                                            }`} />
                                            <span className="text-ss-text">{delivery.event_type}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-ss-text-tertiary">
                                            <span>{delivery.attempt_count} attempt{delivery.attempt_count !== 1 ? 's' : ''}</span>
                                            <span>{formatDate(delivery.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Create Webhook Modal Component
const CreateWebhookModal = ({ onClose, onSuccess }) => {
    const [url, setUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const toggleEvent = (event) => {
        setSelectedEvents(prev => 
            prev.includes(event) 
                ? prev.filter(e => e !== event)
                : [...prev, event]
        );
    };

    const selectAllEvents = () => {
        setSelectedEvents(SUPPORTED_EVENTS.map(e => e.value));
    };

    const clearAllEvents = () => {
        setSelectedEvents([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!url) {
            setError('URL is required');
            return;
        }
        
        if (selectedEvents.length === 0) {
            setError('Select at least one event');
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            const result = await createWebhook({
                url,
                events: selectedEvents
            });
            onSuccess(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Group events by category
    const eventsByCategory = SUPPORTED_EVENTS.reduce((acc, event) => {
        if (!acc[event.category]) acc[event.category] = [];
        acc[event.category].push(event);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="create-webhook-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <h2 className="font-heading text-lg font-semibold text-ss-text">New Webhook Endpoint</h2>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm">
                                {error}
                            </div>
                        )}

                        {/* URL */}
                        <div>
                            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                                Endpoint URL <span className="text-ss-error">*</span>
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://your-server.com/webhook"
                                required
                                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                                data-testid="webhook-url-input"
                            />
                        </div>

                        {/* Events */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-ss-text-secondary">
                                    Events <span className="text-ss-error">*</span>
                                </label>
                                <div className="flex items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={selectAllEvents}
                                        className="text-ss-accent hover:underline"
                                    >
                                        Select all
                                    </button>
                                    <span className="text-ss-text-tertiary">|</span>
                                    <button
                                        type="button"
                                        onClick={clearAllEvents}
                                        className="text-ss-text-secondary hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {Object.entries(eventsByCategory).map(([category, events]) => (
                                    <div key={category}>
                                        <p className="text-xs font-medium text-ss-text-tertiary mb-2">{category}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {events.map(event => (
                                                <label 
                                                    key={event.value}
                                                    className="flex items-center gap-2 p-2 bg-ss-elevated rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEvents.includes(event.value)}
                                                        onChange={() => toggleEvent(event.value)}
                                                        className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-ss-surface text-ss-accent focus:ring-ss-accent"
                                                        data-testid={`event-${event.value}`}
                                                    />
                                                    <span className="text-xs text-ss-text">{event.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 p-6 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
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
                            disabled={loading || !url || selectedEvents.length === 0}
                            className="flex-1 px-4 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                            data-testid="submit-create-btn"
                        >
                            {loading ? 'Creating...' : 'Create Webhook'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WebhooksPage;
