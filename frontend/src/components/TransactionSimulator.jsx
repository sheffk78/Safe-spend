import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Bot, CheckCircle, XCircle, AlertTriangle, DollarSign, Clock } from 'lucide-react';

const transactions = [
    {
        vendor: 'Anthropic',
        amount: 4999,
        displayAmount: '$49.99',
        category: 'AI Compute',
        description: 'Claude API credits top-up',
        result: 'approved',
        reason: 'Within daily cap · Vendor allowed · Auto-approve under $50'
    },
    {
        vendor: 'Google Ads',
        amount: 12500,
        displayAmount: '$125.00',
        category: 'Advertising',
        description: 'Campaign budget refresh',
        result: 'approved',
        reason: 'Approved by policy · Vendor whitelisted · Under monthly cap'
    },
    {
        vendor: 'Unknown Vendor',
        amount: 45000,
        displayAmount: '$450.00',
        category: 'Software',
        description: 'Premium domain purchase',
        result: 'denied',
        reason: 'Exceeds per-transaction limit · Vendor not in allowlist · Requires human approval'
    }
];

const validationSteps = [
    { id: 'pool_balance', label: 'Pool Balance', icon: DollarSign },
    { id: 'amount_limit', label: 'Amount Limit', icon: DollarSign },
    { id: 'vendor_check', label: 'Vendor Check', icon: Shield },
    { id: 'category_check', label: 'Category', icon: Shield },
    { id: 'daily_cap', label: 'Daily Cap', icon: Clock },
    { id: 'approval_rule', label: 'Approval', icon: CheckCircle },
];

const easeOutExpo = [0.22, 1, 0.36, 1];

const TransactionSimulator = () => {
    const [txIndex, setTxIndex] = useState(0);
    const [phase, setPhase] = useState('idle'); // idle, requesting, validating, result
    const [currentStep, setCurrentStep] = useState(-1);
    const [stepResults, setStepResults] = useState({});

    const tx = transactions[txIndex];
    const isApproved = tx.result === 'approved';

    const runTransaction = useCallback(() => {
        setPhase('requesting');
        setCurrentStep(-1);
        setStepResults({});

        // Agent requests spend
        setTimeout(() => setPhase('validating'), 1200);

        // Validation cascade
        validationSteps.forEach((step, i) => {
            setTimeout(() => {
                setCurrentStep(i);
                setStepResults(prev => ({
                    ...prev,
                    [step.id]: true // All pass for approved, last fails for denied
                }));
            }, 1200 + (i + 1) * 350);
        });

        // Show result
        setTimeout(() => setPhase('result'), 1200 + (validationSteps.length + 1) * 350 + 300);
    }, [txIndex]);

    // Cycle through transactions
    useEffect(() => {
        if (phase === 'idle') {
            const timer = setTimeout(runTransaction, 800);
            return () => clearTimeout(timer);
        }
        if (phase === 'result') {
            const timer = setTimeout(() => {
                setTxIndex(prev => (prev + 1) % transactions.length);
                setPhase('idle');
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [phase, runTransaction]);

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-ss-lg">
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.015] mix-blend-multiply pointer-events-none" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: '128px 128px'
                }} />

                <div className="relative p-6 md:p-8">
                    {/* Header bar */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-ss-accent animate-pulse" />
                            <span className="text-xs font-mono text-ss-text-tertiary uppercase tracking-wider">Live Transaction</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                        </div>
                    </div>

                    {/* Transaction request */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={txIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: easeOutExpo }}
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-ss-accent/10 border border-ss-accent/20 flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5 text-ss-accent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-ss-text font-medium">Agent requests spend</p>
                                    <div className="mt-2 flex items-baseline gap-2">
                                        <span className="text-2xl font-heading font-bold text-ss-text">{tx.displayAmount}</span>
                                        <span className="text-sm text-ss-text-secondary">→ {tx.vendor}</span>
                                    </div>
                                    <p className="text-xs text-ss-text-tertiary mt-1 font-mono">{tx.category} · {tx.description}</p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Validation cascade */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-ss-accent" />
                            <span className="text-xs font-mono text-ss-text-tertiary uppercase tracking-wider">Policy Gate</span>
                        </div>
                        <div className="space-y-1.5">
                            {validationSteps.map((step, i) => {
                                const isActive = currentStep === i;
                                const isDone = currentStep > i || (currentStep === i && stepResults[step.id]);
                                const isDenied = !isApproved && i === validationSteps.length - 1 && phase === 'result';

                                return (
                                    <motion.div
                                        key={step.id}
                                        initial={false}
                                        animate={{
                                            opacity: isDone || isActive ? 1 : 0.3,
                                            x: isDone ? 0 : isActive ? 4 : 0
                                        }}
                                        transition={{ duration: 0.2, ease: easeOutExpo }}
                                        className="flex items-center gap-3 py-1.5 px-3 rounded-lg"
                                        style={{
                                            backgroundColor: isActive ? 'rgba(16,185,129,0.06)' : isDone && !isDenied ? 'transparent' : isDenied ? 'rgba(220,38,38,0.06)' : 'transparent'
                                        }}
                                    >
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                                            isDenied ? 'bg-ss-error/10' :
                                            isDone ? 'bg-ss-accent/10' :
                                            isActive ? 'bg-ss-accent/5 animate-pulse' : 'bg-gray-100'
                                        }`}>
                                            {isDenied ? (
                                                <XCircle className="w-3 h-3 text-ss-error" />
                                            ) : isDone ? (
                                                <CheckCircle className="w-3 h-3 text-ss-accent" />
                                            ) : isActive ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-3 h-3 border-2 border-ss-accent/30 border-t-ss-accent rounded-full"
                                                />
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                            )}
                                        </div>
                                        <span className={`text-xs font-mono transition-colors duration-300 ${
                                            isDenied ? 'text-ss-error font-medium' :
                                            isDone ? 'text-ss-text' :
                                            isActive ? 'text-ss-accent font-medium' : 'text-ss-text-tertiary'
                                        }`}>
                                            {step.label}
                                        </span>
                                        {isDone && !isDenied && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-[10px] text-ss-accent ml-auto font-mono"
                                            >
                                                PASS
                                            </motion.span>
                                        )}
                                        {isDenied && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-[10px] text-ss-error ml-auto font-mono font-bold"
                                            >
                                                FAIL
                                            </motion.span>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Result */}
                    <AnimatePresence>
                        {phase === 'result' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, ease: easeOutExpo }}
                                className={`rounded-xl p-4 border ${
                                    isApproved
                                        ? 'bg-ss-accent/5 border-ss-accent/20'
                                        : 'bg-ss-error/5 border-ss-error/20'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isApproved ? 'bg-ss-accent/10' : 'bg-ss-error/10'
                                    }`}>
                                        {isApproved
                                            ? <CheckCircle className="w-5 h-5 text-ss-accent" />
                                            : <XCircle className="w-5 h-5 text-ss-error" />
                                        }
                                    </div>
                                    <div>
                                        <p className={`font-heading font-bold text-lg ${isApproved ? 'text-ss-accent' : 'text-ss-error'}`}>
                                            {isApproved ? 'Approved' : 'Denied'}
                                        </p>
                                        <p className="text-xs text-ss-text-secondary font-mono">{tx.reason}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-[10px] text-ss-text-tertiary font-mono">
                            14-step validation cascade · policy-based spend control · immutable audit trail
                        </p>
                        <div className="flex items-center gap-1">
                            {transactions.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                        i === txIndex ? 'bg-ss-accent' : 'bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionSimulator;