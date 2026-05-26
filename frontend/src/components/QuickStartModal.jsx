import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Rocket,
    Megaphone,
    ShoppingCart,
    FlaskConical,
    Bot,
    X,
    CheckCircle,
    DollarSign,
    Shield,
    ArrowRight,
    Sparkles,
    ExternalLink
} from 'lucide-react';
import {
    createEscrowAccount,
    fundEscrowAccount,
    createPolicy,
    dollarsToCents
} from '@/lib/api';

// Quick Start Template definitions
const QUICK_START_TEMPLATES = [
    {
        id: 'marketing-budget',
        name: 'Marketing Budget',
        icon: Megaphone,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        description: 'Launch a marketing agent with ad spend and AI compute budget',
        escrow: {
            name: 'Marketing Agent Budget',
            initial_balance: 500000 // $5,000 in cents
        },
        policy: {
            name: 'Marketing Agent Policy',
            per_transaction_limit_cents: 10000,
            daily_limit_cents: 50000,
            monthly_limit_cents: 500000,
            allowed_vendors: ['Google Ads', 'Meta Ads', 'Anthropic', 'OpenAI'],
            allowed_categories: ['advertising', 'ai_compute'],
            blocked_categories: ['transfers', 'wire'],
            auto_approve_under_cents: 5000,
            require_human_above_cents: 5000,
            approval_timeout_minutes: 240,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri']
        },
        summary: {
            budget: '$5,000',
            perTx: '$100',
            daily: '$500',
            autoApprove: 'Under $50'
        }
    },
    {
        id: 'procurement-tools',
        name: 'Procurement Tools',
        icon: ShoppingCart,
        color: 'text-ss-accent',
        bgColor: 'bg-ss-accent/10',
        description: 'Enable SaaS subscriptions and developer tool purchases',
        escrow: {
            name: 'Procurement Agent Budget',
            initial_balance: 300000 // $3,000 in cents
        },
        policy: {
            name: 'Procurement Agent Policy',
            per_transaction_limit_cents: 30000,
            daily_limit_cents: 100000,
            monthly_limit_cents: 300000,
            allowed_vendors: ['AWS', 'Google Cloud', 'Vercel', 'Supabase', 'OpenAI', 'Anthropic', 'GitHub', 'Notion'],
            allowed_categories: ['saas_subscription', 'developer_tools', 'ai_compute', 'cloud_compute'],
            auto_approve_under_cents: 15000,
            require_human_above_cents: 15000,
            approval_timeout_minutes: 480,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri']
        },
        summary: {
            budget: '$3,000',
            perTx: '$300',
            daily: '$1,000',
            autoApprove: 'Under $150'
        }
    },
    {
        id: 'rd-sandbox',
        name: 'R&D Sandbox',
        icon: FlaskConical,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        description: 'Bounded-loss experimentation budget for research agents',
        escrow: {
            name: 'R&D Sandbox Budget',
            initial_balance: 50000 // $500 in cents
        },
        policy: {
            name: 'R&D Sandbox Policy',
            per_transaction_limit_cents: 2000,
            daily_limit_cents: 10000,
            monthly_limit_cents: 50000,
            allowed_categories: ['ai_compute', 'api_credits', 'saas_subscription', 'developer_tools', 'research', 'testing'],
            blocked_categories: ['transfers'],
            auto_approve_under_cents: 1000,
            require_human_above_cents: 1000,
            approval_timeout_minutes: 60,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        },
        summary: {
            budget: '$500',
            perTx: '$20',
            daily: '$100',
            autoApprove: 'Under $10'
        }
    },
    {
        id: 'devops-infra',
        name: 'DevOps Infrastructure',
        icon: Bot,
        color: 'text-ss-accent',
        bgColor: 'bg-ss-accent/10',
        description: 'Cloud infrastructure and monitoring tool budget for DevOps agents',
        escrow: {
            name: 'DevOps Agent Budget',
            initial_balance: 1000000 // $10,000 in cents
        },
        policy: {
            name: 'DevOps Agent Policy',
            per_transaction_limit_cents: 50000,
            daily_limit_cents: 200000,
            monthly_limit_cents: 1000000,
            allowed_vendors: ['AWS', 'Google Cloud', 'Azure', 'Datadog', 'PagerDuty', 'Cloudflare'],
            allowed_categories: ['infrastructure', 'cloud_compute', 'monitoring', 'security'],
            auto_approve_under_cents: 25000,
            require_human_above_cents: 25000,
            approval_timeout_minutes: 120,
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        },
        summary: {
            budget: '$10,000',
            perTx: '$500',
            daily: '$2,000',
            autoApprove: 'Under $250'
        }
    }
];

// Template Card Component
const TemplateCard = ({ template, selected, onSelect }) => {
    const Icon = template.icon;
    return (
        <button
            onClick={() => onSelect(template)}
            className={`w-full p-4 rounded-xl border text-left transition-all ${
                selected
                    ? 'bg-ss-accent/10 border-ss-accent'
                    : 'bg-ss-surface border-gray-200 hover:border-ss-accent/50'
            }`}
            data-testid={`template-${template.id}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${template.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={template.color} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${selected ? 'text-ss-accent' : 'text-ss-text'}`}>
                        {template.name}
                    </h3>
                    <p className="text-xs text-ss-text-secondary mt-0.5">{template.description}</p>
                    
                    {/* Quick Stats */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2 py-0.5 bg-ss-elevated rounded text-[10px] text-ss-text-tertiary">
                            Budget: {template.summary.budget}
                        </span>
                        <span className="px-2 py-0.5 bg-ss-elevated rounded text-[10px] text-ss-text-tertiary">
                            Per Tx: {template.summary.perTx}
                        </span>
                        <span className="px-2 py-0.5 bg-ss-elevated rounded text-[10px] text-ss-text-tertiary">
                            Auto: {template.summary.autoApprove}
                        </span>
                    </div>
                </div>
                {selected && (
                    <CheckCircle className="text-ss-accent flex-shrink-0" size={20} />
                )}
            </div>
        </button>
    );
};

// Progress Step Component
const ProgressStep = ({ step, current, label }) => {
    const isComplete = current > step;
    const isCurrent = current === step;
    
    return (
        <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isComplete
                    ? 'bg-ss-accent text-ss-text'
                    : isCurrent
                    ? 'bg-ss-accent/20 text-ss-accent border border-ss-accent'
                    : 'bg-ss-elevated text-ss-text-tertiary'
            }`}>
                {isComplete ? <CheckCircle size={12} /> : step}
            </div>
            <span className={`text-xs ${isCurrent ? 'text-ss-text' : 'text-ss-text-tertiary'}`}>
                {label}
            </span>
        </div>
    );
};

const QuickStartModal = ({ onClose, onSuccess }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [step, setStep] = useState(1); // 1: Select, 2: Confirm, 3: Creating, 4: Done
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [createdItems, setCreatedItems] = useState({ escrow: null, policy: null });

    const handleCreate = async () => {
        if (!selectedTemplate) return;

        setStep(3);
        setLoading(true);
        setError(null);

        let escrowResult = null;

        try {
            // Step 1: Create escrow account
            escrowResult = await createEscrowAccount({
                name: selectedTemplate.escrow.name,
                currency: 'usd'
            });

            // Step 2: Fund the escrow (simulated)
            await fundEscrowAccount(escrowResult.id, selectedTemplate.escrow.initial_balance);

            // Step 3: Create policy
            const policyResult = await createPolicy({
                ...selectedTemplate.policy,
                escrow_id: escrowResult.id,
                draft: false
            });

            setCreatedItems({
                escrow: escrowResult,
                policy: policyResult
            });
            setStep(4);
        } catch (err) {
            // If escrow was created but policy failed, show partial success info
            const detail = err.message || 'Unknown error';
            if (escrowResult) {
                setError(`Protected account created, but policy creation failed: ${detail}. Your account "${selectedTemplate.escrow.name}" is available in the dashboard. You can create a policy manually from the Policies page.`);
            } else {
                setError(detail);
            }
            setStep(2); // Go back to confirm step
        } finally {
            setLoading(false);
        }
    };

    const handleDone = () => {
        onSuccess?.(createdItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="quickstart-modal">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-ss-accent" />
                        </div>
                        <div>
                            <h2 className="font-heading text-lg font-semibold text-ss-text">Quick Start Templates</h2>
                            <p className="text-xs text-ss-text-tertiary">Create protected account + policy in one click</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text p-2" data-testid="quickstart-close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Progress */}
                <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-center gap-4">
                    <ProgressStep step={1} current={step} label="Select" />
                    <ArrowRight size={14} className="text-ss-text-tertiary" />
                    <ProgressStep step={2} current={step} label="Confirm" />
                    <ArrowRight size={14} className="text-ss-text-tertiary" />
                    <ProgressStep step={3} current={step} label="Create" />
                    <ArrowRight size={14} className="text-ss-text-tertiary" />
                    <ProgressStep step={4} current={step} label="Done" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Select Template */}
                    {step === 1 && (
                        <div className="space-y-3">
                            <p className="text-sm text-ss-text-secondary mb-4">
                                Choose a template to create a pre-configured protected account and spending policy:
                            </p>
                            {QUICK_START_TEMPLATES.map(template => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    selected={selectedTemplate?.id === template.id}
                                    onSelect={setSelectedTemplate}
                                />
                            ))}
                        </div>
                    )}

                    {/* Step 2: Confirm */}
                    {step === 2 && selectedTemplate && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                {React.createElement(selectedTemplate.icon, { 
                                    className: `${selectedTemplate.color}`, 
                                    size: 24 
                                })}
                                <h3 className="font-semibold text-ss-text text-lg">{selectedTemplate.name}</h3>
                            </div>

                            <div className="p-4 bg-ss-surface rounded-lg border border-gray-200">
                                <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <DollarSign size={12} />
                                Protected Account
                            </h4>
                                <p className="text-ss-text font-medium">{selectedTemplate.escrow.name}</p>
                                <p className="text-sm text-ss-text-secondary">
                                    Initial Balance: <span className="text-ss-accent">{selectedTemplate.summary.budget}</span>
                                </p>
                            </div>

                            <div className="p-4 bg-ss-surface rounded-lg border border-gray-200">
                                <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Shield size={12} />
                                    Spending Policy
                                </h4>
                                <p className="text-ss-text font-medium mb-2">{selectedTemplate.policy.name}</p>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-ss-text-tertiary">Per Transaction:</span>
                                        <span className="text-ss-text ml-1">{selectedTemplate.summary.perTx}</span>
                                    </div>
                                    <div>
                                        <span className="text-ss-text-tertiary">Daily Limit:</span>
                                        <span className="text-ss-text ml-1">{selectedTemplate.summary.daily}</span>
                                    </div>
                                    <div>
                                        <span className="text-ss-text-tertiary">Auto-Approve:</span>
                                        <span className="text-ss-text ml-1">{selectedTemplate.summary.autoApprove}</span>
                                    </div>
                                    <div>
                                        <span className="text-ss-text-tertiary">Categories:</span>
                                        <span className="text-ss-text ml-1">{selectedTemplate.policy.allowed_categories?.length || 0}</span>
                                    </div>
                                </div>

                                {selectedTemplate.policy.allowed_vendors?.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)]">
                                        <span className="text-xs text-ss-text-tertiary">Allowed Vendors: </span>
                                        <span className="text-xs text-ss-text">
                                            {selectedTemplate.policy.allowed_vendors.slice(0, 4).join(', ')}
                                            {selectedTemplate.policy.allowed_vendors.length > 4 && ` +${selectedTemplate.policy.allowed_vendors.length - 4} more`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-xs text-yellow-400">
                                    <strong>Note:</strong> This will create a simulated protected account balance for testing. 
                                    Use Stripe funding for real money.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Creating */}
                    {step === 3 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ss-accent/10 flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-ss-accent/30 border-t-ss-accent rounded-full animate-spin" />
                            </div>
                            <h3 className="font-semibold text-ss-text mb-2">Creating your setup...</h3>
                            <p className="text-sm text-ss-text-secondary">Setting up protected account and spending policy</p>
                        </div>
                    )}

                    {/* Step 4: Done */}
                    {step === 4 && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="font-semibold text-ss-text mb-2">Setup Complete!</h3>
                            <p className="text-sm text-ss-text-secondary mb-6">
                                Your {selectedTemplate?.name} is ready to use
                            </p>

                            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
                                <div className="p-3 bg-ss-surface rounded-lg border border-gray-200">
                                    <p className="text-[10px] text-ss-text-tertiary uppercase">Account</p>
                                    <p className="text-sm text-ss-text font-mono truncate">{createdItems.escrow?.id}</p>
                                </div>
                                <div className="p-3 bg-ss-surface rounded-lg border border-gray-200">
                                    <p className="text-[10px] text-ss-text-tertiary uppercase">Policy</p>
                                    <p className="text-sm text-ss-text font-mono truncate">{createdItems.policy?.id}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 mt-6">
                                <Link
                                    to="/dashboard/playground"
                                    className="flex items-center gap-2 px-4 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text-secondary hover:text-ss-text text-sm transition-all"
                                >
                                    <Sparkles size={14} />
                                    Try in Playground
                                </Link>
                                <Link
                                    to="/dashboard/accounts"
                                    className="flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover rounded-lg text-ss-text text-sm font-medium transition-all"
                                >
                                    View Account
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(step === 1 || step === 2) && (
                    <div className="flex items-center justify-between p-5 border-t border-gray-200 flex-shrink-0">
                        <div>
                            {step === 2 && (
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-ss-text-secondary hover:text-ss-text text-sm"
                                >
                                    ← Back to templates
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/docs/trust-law"
                                target="_blank"
                                className="flex items-center gap-1.5 text-xs text-ss-text-tertiary hover:text-ss-accent transition-colors"
                            >
                                <ExternalLink size={12} />
                                Learn about governance
                            </Link>
                            {step === 1 ? (
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!selectedTemplate}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-ss-text font-medium transition-all"
                                    data-testid="quickstart-continue-btn"
                                >
                                    Continue
                                    <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleCreate}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-ss-text font-medium transition-all"
                                    data-testid="quickstart-create-btn"
                                >
                                    <Rocket size={16} />
                                    Create Setup
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Done Footer */}
                {step === 4 && (
                    <div className="flex items-center justify-center p-5 border-t border-gray-200">
                        <button
                            onClick={handleDone}
                            className="px-6 py-2 bg-ss-surface border border-[rgba(255,255,255,0.1)] hover:bg-ss-elevated rounded-lg text-ss-text font-medium transition-all"
                            data-testid="quickstart-done-btn"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuickStartModal;
