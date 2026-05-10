import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    X, 
    ChevronRight, 
    ChevronLeft,
    Scale,
    Megaphone,
    ShoppingCart,
    FlaskConical,
    Bot,
    Sparkles,
    Shield,
    DollarSign,
    Users,
    Tag,
    Clock,
    CheckCircle,
    AlertTriangle,
    Info,
    ExternalLink
} from 'lucide-react';
import { createPolicy, dollarsToCents } from '@/lib/api';

// Governance Pattern Presets
const GOVERNANCE_PATTERNS = [
    {
        id: 'marketing',
        name: 'Marketing Agent',
        icon: Megaphone,
        description: 'Controls ad spend and AI compute for marketing automation',
        trustLawContext: 'Purpose-restricted trust for advertising and AI compute expenses only',
        defaults: {
            per_transaction_limit: '100',
            daily_limit: '500',
            weekly_limit: '',
            monthly_limit: '5000',
            allowed_vendors: 'Google Ads, Meta Ads, Anthropic, OpenAI',
            blocked_vendors: '',
            allowed_categories: 'advertising, ai_compute',
            blocked_categories: 'transfers, wire',
            auto_approve_under: '50',
            require_human_above: '50',
            approval_timeout_minutes: '240',
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start: '06',
            active_hours_end: '22'
        }
    },
    {
        id: 'procurement',
        name: 'Procurement Agent',
        icon: ShoppingCart,
        description: 'SaaS subscriptions, API credits, and tool purchases with approval thresholds',
        trustLawContext: 'Vendor-restricted trust with human oversight for material commitments',
        defaults: {
            per_transaction_limit: '300',
            daily_limit: '1000',
            weekly_limit: '',
            monthly_limit: '3000',
            allowed_vendors: 'AWS, Google Cloud, Vercel, Supabase, OpenAI, Anthropic, GitHub, Notion',
            blocked_vendors: '',
            allowed_categories: 'saas_subscription, developer_tools, ai_compute',
            blocked_categories: '',
            auto_approve_under: '150',
            require_human_above: '150',
            approval_timeout_minutes: '480',
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start: '09',
            active_hours_end: '18'
        }
    },
    {
        id: 'sandbox',
        name: 'R&D Sandbox',
        icon: FlaskConical,
        description: 'Bounded exploration budgets for research and experimentation',
        trustLawContext: 'Small-corpus trust with tight limits for bounded-loss exploration',
        defaults: {
            per_transaction_limit: '20',
            daily_limit: '100',
            weekly_limit: '',
            monthly_limit: '500',
            allowed_vendors: '',
            blocked_vendors: '',
            allowed_categories: 'ai_compute, api_credits, saas_subscription, developer_tools, research, testing',
            blocked_categories: 'transfers',
            auto_approve_under: '10',
            require_human_above: '10',
            approval_timeout_minutes: '60',
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            active_hours_start: '',
            active_hours_end: ''
        }
    },
    {
        id: 'custom',
        name: 'Custom Policy',
        icon: Sparkles,
        description: 'Start from scratch with full control over all settings',
        trustLawContext: 'Define your own trust instrument with custom governance rules',
        defaults: {
            per_transaction_limit: '',
            daily_limit: '',
            weekly_limit: '',
            monthly_limit: '',
            allowed_vendors: '',
            blocked_vendors: '',
            allowed_categories: '',
            blocked_categories: '',
            auto_approve_under: '',
            require_human_above: '',
            approval_timeout_minutes: '60',
            active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
            active_hours_start: '',
            active_hours_end: ''
        }
    }
];

const DAYS_OPTIONS = [
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
    { value: 'sun', label: 'Sun' }
];

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Singapore'
];

// Trust Law Callout Component
const TrustLawCallout = ({ title, children, type = 'info' }) => {
    const styles = {
        info: { bg: 'bg-ss-accent/10', border: 'border-ss-accent/30', icon: Scale, iconColor: 'text-ss-accent' },
        warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, iconColor: 'text-yellow-400' },
        success: { bg: 'bg-ss-accent/10', border: 'border-ss-accent/30', icon: CheckCircle, iconColor: 'text-ss-accent' }
    };
    const style = styles[type];
    const Icon = style.icon;

    return (
        <div className={`${style.bg} ${style.border} border rounded-lg p-3 mb-4`}>
            <div className="flex gap-2">
                <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={16} />
                <div>
                    {title && <h4 className="font-medium text-ss-text text-sm mb-1">{title}</h4>}
                    <div className="text-ss-text-secondary text-xs">{children}</div>
                </div>
            </div>
        </div>
    );
};

// Step Indicator Component
const StepIndicator = ({ steps, currentStep, onStepClick }) => (
    <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
            <React.Fragment key={step.id}>
                <button
                    onClick={() => onStepClick(index)}
                    disabled={index > currentStep}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        index === currentStep
                            ? 'bg-ss-accent text-white'
                            : index < currentStep
                            ? 'bg-ss-accent/20 text-ss-accent cursor-pointer hover:bg-ss-accent/30'
                            : 'bg-ss-elevated text-ss-text-tertiary cursor-not-allowed'
                    }`}
                    data-testid={`wizard-step-${step.id}`}
                >
                    <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                        {index < currentStep ? '✓' : index + 1}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                    <ChevronRight size={14} className="text-ss-text-tertiary" />
                )}
            </React.Fragment>
        ))}
    </div>
);

const PolicyBuilderWizard = ({ escrowAccounts, onClose, onSuccess }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        escrow_id: '',
        is_active: true,
        per_transaction_limit: '',
        daily_limit: '',
        weekly_limit: '',
        monthly_limit: '',
        allowed_vendors: '',
        blocked_vendors: '',
        vendor_match_mode: 'exact',
        allowed_categories: '',
        blocked_categories: '',
        active_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        active_hours_start: '',
        active_hours_end: '',
        active_timezone: 'America/Denver',
        auto_approve_under: '',
        require_human_above: '',
        approval_timeout_minutes: '60'
    });

    const steps = [
        { id: 'pattern', label: 'Pattern', icon: Scale },
        { id: 'basics', label: 'Basics', icon: Shield },
        { id: 'limits', label: 'Limits', icon: DollarSign },
        { id: 'controls', label: 'Controls', icon: Users },
        { id: 'approval', label: 'Approval', icon: CheckCircle },
        { id: 'review', label: 'Review', icon: Sparkles }
    ];

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleDay = (day) => {
        setFormData(prev => ({
            ...prev,
            active_days: prev.active_days.includes(day)
                ? prev.active_days.filter(d => d !== day)
                : [...prev.active_days, day]
        }));
    };

    const selectPattern = (pattern) => {
        setSelectedPattern(pattern);
        // Apply pattern defaults
        setFormData(prev => ({
            ...prev,
            ...pattern.defaults,
            name: pattern.id !== 'custom' ? `${pattern.name} Policy` : ''
        }));
        setCurrentStep(1);
    };

    const parseList = (str) => {
        return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const payload = {
                name: formData.name,
                escrow_id: formData.escrow_id,
                is_active: formData.is_active,
                per_transaction_limit_cents: formData.per_transaction_limit ? dollarsToCents(formData.per_transaction_limit) : null,
                daily_limit_cents: formData.daily_limit ? dollarsToCents(formData.daily_limit) : null,
                weekly_limit_cents: formData.weekly_limit ? dollarsToCents(formData.weekly_limit) : null,
                monthly_limit_cents: formData.monthly_limit ? dollarsToCents(formData.monthly_limit) : null,
                allowed_vendors: parseList(formData.allowed_vendors),
                blocked_vendors: parseList(formData.blocked_vendors),
                vendor_match_mode: formData.vendor_match_mode,
                allowed_categories: parseList(formData.allowed_categories),
                blocked_categories: parseList(formData.blocked_categories),
                active_days: formData.active_days,
                active_hours_start: formData.active_hours_start || null,
                active_hours_end: formData.active_hours_end || null,
                active_timezone: formData.active_timezone,
                auto_approve_under_cents: formData.auto_approve_under ? dollarsToCents(formData.auto_approve_under) : null,
                require_human_above_cents: formData.require_human_above ? dollarsToCents(formData.require_human_above) : null,
                approval_timeout_minutes: parseInt(formData.approval_timeout_minutes) || 60
            };

            await createPolicy(payload);
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return selectedPattern !== null;
            case 1: return formData.name && formData.escrow_id;
            case 2: return true; // Limits are optional
            case 3: return true; // Controls are optional
            case 4: return true; // Approval rules are optional
            case 5: return true; // Review
            default: return false;
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Render Step Content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return <PatternSelectionStep patterns={GOVERNANCE_PATTERNS} selectedPattern={selectedPattern} onSelect={selectPattern} />;
            case 1:
                return <BasicsStep formData={formData} escrowAccounts={escrowAccounts} onChange={handleChange} selectedPattern={selectedPattern} />;
            case 2:
                return <LimitsStep formData={formData} onChange={handleChange} selectedPattern={selectedPattern} />;
            case 3:
                return <ControlsStep formData={formData} onChange={handleChange} toggleDay={toggleDay} selectedPattern={selectedPattern} />;
            case 4:
                return <ApprovalStep formData={formData} onChange={handleChange} selectedPattern={selectedPattern} />;
            case 5:
                return <ReviewStep formData={formData} selectedPattern={selectedPattern} />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" data-testid="policy-wizard">
            <div className="bg-ss-code border border-[rgba(255,255,255,0.1)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-ss-accent" />
                        </div>
                        <div>
                            <h2 className="font-heading text-lg font-semibold text-ss-text">Policy Builder Wizard</h2>
                            <p className="text-xs text-ss-text-tertiary">Create governance policies using trust law principles</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-ss-text-secondary hover:text-ss-text p-2" data-testid="wizard-close-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-5 pt-4 flex-shrink-0">
                    <StepIndicator steps={steps} currentStep={currentStep} onStepClick={(idx) => idx < currentStep && setCurrentStep(idx)} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {error && (
                        <div className="p-3 bg-[rgba(239,68,68,0.1)] border border-ss-error/30 rounded-lg text-ss-error text-sm mb-4">
                            {error}
                        </div>
                    )}
                    {renderStepContent()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
                    <div>
                        {currentStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-2 px-4 py-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                                data-testid="wizard-back-btn"
                            >
                                <ChevronLeft size={16} />
                                Back
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
                            Trust Law Docs
                        </Link>
                        <button
                            onClick={nextStep}
                            disabled={!canProceed() || loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                            data-testid="wizard-next-btn"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : currentStep === steps.length - 1 ? (
                                <>
                                    <CheckCircle size={16} />
                                    Create Policy
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 0: Pattern Selection
const PatternSelectionStep = ({ patterns, selectedPattern, onSelect }) => (
    <div>
        <TrustLawCallout title="Choose Your Governance Pattern" type="info">
            <p>Each pattern represents a different trust structure. Select the one that best matches your use case, 
            or choose Custom to build from scratch.</p>
            <Link to="/docs/trust-law#pattern-marketing" target="_blank" className="text-ss-accent hover:underline inline-flex items-center gap-1 mt-1">
                Learn more about governance patterns <ExternalLink size={10} />
            </Link>
        </TrustLawCallout>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patterns.map((pattern) => {
                const Icon = pattern.icon;
                const isSelected = selectedPattern?.id === pattern.id;
                return (
                    <button
                        key={pattern.id}
                        onClick={() => onSelect(pattern)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                            isSelected
                                ? 'bg-ss-accent/10 border-ss-accent'
                                : 'bg-ss-surface border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50'
                        }`}
                        data-testid={`pattern-${pattern.id}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-ss-accent/20' : 'bg-ss-elevated'
                            }`}>
                                <Icon className={isSelected ? 'text-ss-accent' : 'text-ss-text-secondary'} size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-medium ${isSelected ? 'text-ss-accent' : 'text-ss-text'}`}>
                                    {pattern.name}
                                </h3>
                                <p className="text-xs text-ss-text-secondary mt-0.5">{pattern.description}</p>
                                <p className="text-xs text-ss-text-tertiary mt-2 italic">
                                    "{pattern.trustLawContext}"
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    </div>
);

// Step 1: Basics
const BasicsStep = ({ formData, escrowAccounts, onChange, selectedPattern }) => (
    <div className="space-y-4">
        <TrustLawCallout title="Trust Identity" type="info">
            <p>Name your policy (trust instrument) and link it to a protected account (trust account). 
            The protected account holds the segregated funds that this policy will govern.</p>
        </TrustLawCallout>

        <div>
            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                Policy Name <span className="text-ss-error">*</span>
            </label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="e.g., Marketing Agent Policy"
                required
                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                data-testid="wizard-policy-name"
            />
            <p className="text-xs text-ss-text-tertiary mt-1">
                A descriptive name for this trust instrument
            </p>
        </div>

        <div>
            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                Protected Account <span className="text-ss-error">*</span>
            </label>
            <select
                value={formData.escrow_id}
                onChange={(e) => onChange('escrow_id', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text focus:outline-none focus:border-ss-accent"
                data-testid="wizard-escrow-select"
            >
                <option value="">Select a protected account...</option>
                {escrowAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
            </select>
            <p className="text-xs text-ss-text-tertiary mt-1">
                The segregated pool of funds this policy governs
            </p>
        </div>

        <div className="flex items-center gap-3 p-3 bg-ss-surface rounded-lg">
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => onChange('is_active', e.target.checked)}
                    className="sr-only peer"
                    data-testid="wizard-is-active"
                />
                <div className="w-11 h-6 bg-ss-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ss-accent"></div>
            </label>
            <div>
                <span className="text-sm text-ss-text">Activate Policy Immediately</span>
                <p className="text-xs text-ss-text-tertiary">When active, this policy will immediately govern spending from the linked protected account</p>
            </div>
        </div>
    </div>
);

// Step 2: Limits
const LimitsStep = ({ formData, onChange, selectedPattern }) => (
    <div className="space-y-4">
        <TrustLawCallout title="Spending Caps" type="info">
            <p>These limits define the maximum exposure at each time scale. Like a trust that caps disbursements, 
            these prevent runaway spending regardless of what the agent attempts.</p>
        </TrustLawCallout>

        {selectedPattern?.id === 'sandbox' && (
            <TrustLawCallout title="Sandbox Pattern: Bounded Loss" type="warning">
                <p>The R&D Sandbox pattern uses very tight limits ($20/tx, $100/day) to create a "bounded loss" environment. 
                Even if something goes wrong, the maximum damage is limited to the small balance.</p>
            </TrustLawCallout>
        )}

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                    Per-Transaction Limit
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                    <input
                        type="number"
                        value={formData.per_transaction_limit}
                        onChange={(e) => onChange('per_transaction_limit', e.target.value)}
                        placeholder="100.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-per-tx-limit"
                    />
                </div>
                <p className="text-xs text-ss-text-tertiary mt-1">Max per single spend</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                    Daily Limit
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                    <input
                        type="number"
                        value={formData.daily_limit}
                        onChange={(e) => onChange('daily_limit', e.target.value)}
                        placeholder="500.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-daily-limit"
                    />
                </div>
                <p className="text-xs text-ss-text-tertiary mt-1">Rolling 24-hour cap</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                    Weekly Limit
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                    <input
                        type="number"
                        value={formData.weekly_limit}
                        onChange={(e) => onChange('weekly_limit', e.target.value)}
                        placeholder="2000.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-weekly-limit"
                    />
                </div>
                <p className="text-xs text-ss-text-tertiary mt-1">Rolling 7-day cap</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                    Monthly Limit
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                    <input
                        type="number"
                        value={formData.monthly_limit}
                        onChange={(e) => onChange('monthly_limit', e.target.value)}
                        placeholder="5000.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-monthly-limit"
                    />
                </div>
                <p className="text-xs text-ss-text-tertiary mt-1">Rolling 30-day cap</p>
            </div>
        </div>

        <div className="p-3 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-start gap-2">
                <Info size={14} className="text-ss-text-tertiary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-ss-text-secondary">
                    <strong className="text-ss-text">Leave blank for no limit.</strong> Empty fields mean the rules engine won't enforce 
                    that particular cap. At minimum, set a per-transaction or monthly limit to prevent unbounded exposure.
                </p>
            </div>
        </div>
    </div>
);

// Step 3: Controls
const ControlsStep = ({ formData, onChange, toggleDay, selectedPattern }) => (
    <div className="space-y-6">
        <TrustLawCallout title="Purpose Restrictions (Trust Instrument Terms)" type="info">
            <p>Vendor and category controls define what the trust funds can be used for. Like a trust that restricts 
            disbursements to "education expenses only," these controls prevent misuse of funds.</p>
        </TrustLawCallout>

        {/* Vendor Controls */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Users size={14} className="text-ss-accent" />
                Vendor Controls
            </h4>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">
                    Allowed Vendors (whitelist)
                </label>
                <input
                    type="text"
                    value={formData.allowed_vendors}
                    onChange={(e) => onChange('allowed_vendors', e.target.value)}
                    placeholder="Google Ads, Meta Ads, Anthropic, OpenAI"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                    data-testid="wizard-allowed-vendors"
                />
                <p className="text-xs text-ss-text-tertiary mt-1">Comma-separated. Leave empty to allow all vendors.</p>
            </div>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">
                    Blocked Vendors (blacklist)
                </label>
                <input
                    type="text"
                    value={formData.blocked_vendors}
                    onChange={(e) => onChange('blocked_vendors', e.target.value)}
                    placeholder="Risky Vendor, Blocked Service"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                    data-testid="wizard-blocked-vendors"
                />
            </div>
        </div>

        {/* Category Controls */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Tag size={14} className="text-ss-accent" />
                Category Controls
            </h4>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">
                    Allowed Categories
                </label>
                <input
                    type="text"
                    value={formData.allowed_categories}
                    onChange={(e) => onChange('allowed_categories', e.target.value)}
                    placeholder="advertising, ai_compute, saas_subscription"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                    data-testid="wizard-allowed-categories"
                />
                <p className="text-xs text-ss-text-tertiary mt-1">Leave empty to allow all categories.</p>
            </div>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-1.5">
                    Blocked Categories
                </label>
                <input
                    type="text"
                    value={formData.blocked_categories}
                    onChange={(e) => onChange('blocked_categories', e.target.value)}
                    placeholder="transfers, wire, gambling"
                    className="w-full px-4 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                    data-testid="wizard-blocked-categories"
                />
            </div>
        </div>

        {/* Time Window */}
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-ss-text flex items-center gap-2">
                <Clock size={14} className="text-ss-accent" />
                Time Window (Optional)
            </h4>
            <div>
                <label className="block text-xs text-ss-text-secondary mb-2">Active Days</label>
                <div className="flex flex-wrap gap-2">
                    {DAYS_OPTIONS.map(day => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                formData.active_days.includes(day.value)
                                    ? 'bg-ss-accent text-white'
                                    : 'bg-ss-elevated text-ss-text-secondary hover:bg-ss-surface'
                            }`}
                            data-testid={`wizard-day-${day.value}`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs text-ss-text-secondary mb-1.5">Start Hour</label>
                    <select
                        value={formData.active_hours_start}
                        onChange={(e) => onChange('active_hours_start', e.target.value)}
                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-start-hour"
                    >
                        <option value="">Any</option>
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}:00
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-ss-text-secondary mb-1.5">End Hour</label>
                    <select
                        value={formData.active_hours_end}
                        onChange={(e) => onChange('active_hours_end', e.target.value)}
                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-end-hour"
                    >
                        <option value="">Any</option>
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}:00
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-ss-text-secondary mb-1.5">Timezone</label>
                    <select
                        value={formData.active_timezone}
                        onChange={(e) => onChange('active_timezone', e.target.value)}
                        className="w-full px-3 py-2 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text text-sm focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-timezone"
                    >
                        {TIMEZONES.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    </div>
);

// Step 4: Approval Rules
const ApprovalStep = ({ formData, onChange, selectedPattern }) => (
    <div className="space-y-4">
        <TrustLawCallout title="Human Oversight (Trustee Approval)" type="info">
            <p>Approval thresholds define when the human "trustee" must intervene. Like a trust that requires 
            trustee approval for distributions above a certain amount, these ensure human oversight for material decisions.</p>
        </TrustLawCallout>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                    Auto-Approve Under
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                    <input
                        type="number"
                        value={formData.auto_approve_under}
                        onChange={(e) => onChange('auto_approve_under', e.target.value)}
                        placeholder="50.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-auto-approve"
                    />
                </div>
                <p className="text-xs text-ss-text-tertiary mt-1">Spends below this amount are auto-approved</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                    Require Human Above
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ss-text-tertiary">$</span>
                    <input
                        type="number"
                        value={formData.require_human_above}
                        onChange={(e) => onChange('require_human_above', e.target.value)}
                        placeholder="50.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                        data-testid="wizard-require-human"
                    />
                </div>
                <p className="text-xs text-ss-text-tertiary mt-1">Spends at or above require human approval</p>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                Approval Timeout (minutes)
            </label>
            <input
                type="number"
                value={formData.approval_timeout_minutes}
                onChange={(e) => onChange('approval_timeout_minutes', e.target.value)}
                placeholder="60"
                min="1"
                className="w-full px-4 py-2.5 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-ss-accent"
                data-testid="wizard-timeout"
            />
            <p className="text-xs text-ss-text-tertiary mt-1">
                Pending approvals expire after this many minutes. Expired requests are automatically denied.
            </p>
        </div>

        <TrustLawCallout title="Best Practice: Consistent Thresholds" type="success">
            <p>Set auto-approve and require-human thresholds to the same value to create a clear boundary. 
            For example, $50 for both means: anything under $50 is automatic, anything $50+ needs human review.</p>
        </TrustLawCallout>
    </div>
);

// Step 5: Review
const ReviewStep = ({ formData, selectedPattern }) => {
    const formatCurrency = (val) => val ? `$${parseFloat(val).toFixed(2)}` : 'No limit';
    const formatList = (val) => val ? val.split(',').map(s => s.trim()).filter(s => s).join(', ') : 'All allowed';

    return (
        <div className="space-y-4">
            <TrustLawCallout title="Review Your Trust Instrument" type="success">
                <p>Review the policy configuration below. This trust instrument will govern all spend requests 
                from the linked protected account according to these rules.</p>
            </TrustLawCallout>

            <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-3">
                    {selectedPattern && (
                        <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center">
                            {React.createElement(selectedPattern.icon, { className: 'w-5 h-5 text-ss-accent' })}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-ss-text">{formData.name || 'Unnamed Policy'}</h3>
                        <p className="text-xs text-ss-text-tertiary">
                            Pattern: {selectedPattern?.name || 'Custom'} • {formData.is_active ? 'Active' : 'Inactive'}
                        </p>
                    </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-4">
                    {/* Limits */}
                    <div>
                        <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            Spending Limits
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Per Tx</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.per_transaction_limit)}</p>
                            </div>
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Daily</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.daily_limit)}</p>
                            </div>
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Weekly</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.weekly_limit)}</p>
                            </div>
                            <div className="p-2 bg-ss-elevated rounded text-center">
                                <p className="text-xs text-ss-text-tertiary">Monthly</p>
                                <p className="text-sm font-medium text-ss-text">{formatCurrency(formData.monthly_limit)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                                Vendor Controls
                            </h4>
                            <p className="text-xs text-ss-text-secondary">
                                <span className="text-ss-accent">Allowed:</span> {formatList(formData.allowed_vendors)}
                            </p>
                            {formData.blocked_vendors && (
                                <p className="text-xs text-ss-text-secondary mt-1">
                                    <span className="text-ss-error">Blocked:</span> {formData.blocked_vendors}
                                </p>
                            )}
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                                Category Controls
                            </h4>
                            <p className="text-xs text-ss-text-secondary">
                                <span className="text-ss-accent">Allowed:</span> {formatList(formData.allowed_categories)}
                            </p>
                            {formData.blocked_categories && (
                                <p className="text-xs text-ss-text-secondary mt-1">
                                    <span className="text-ss-error">Blocked:</span> {formData.blocked_categories}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Approval */}
                    <div>
                        <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            Approval Rules
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {formData.auto_approve_under && (
                                <span className="px-2 py-1 bg-ss-accent/10 text-ss-accent rounded text-xs">
                                    Auto-approve under ${formData.auto_approve_under}
                                </span>
                            )}
                            {formData.require_human_above && (
                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                                    Human required above ${formData.require_human_above}
                                </span>
                            )}
                            <span className="px-2 py-1 bg-ss-elevated text-ss-text-secondary rounded text-xs">
                                Timeout: {formData.approval_timeout_minutes} min
                            </span>
                        </div>
                    </div>

                    {/* Time Window */}
                    <div>
                        <h4 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            Time Window
                        </h4>
                        <p className="text-xs text-ss-text-secondary">
                            Days: {formData.active_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        </p>
                        {formData.active_hours_start && formData.active_hours_end && (
                            <p className="text-xs text-ss-text-tertiary mt-1">
                                Hours: {formData.active_hours_start}:00 - {formData.active_hours_end}:00 ({formData.active_timezone})
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolicyBuilderWizard;
