import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Bot, DollarSign, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const flowStep = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    })
};

const pulseGlow = {
    animate: {
        boxShadow: [
            '0 0 20px rgba(16, 185, 129, 0.1)',
            '0 0 40px rgba(16, 185, 129, 0.25)',
            '0 0 20px rgba(16, 185, 129, 0.1)'
        ],
        transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
    }
};

const HeroAnimation = () => {
    const [resultIndex, setResultIndex] = useState(0);
    const results = [
        { label: 'Approved', icon: CheckCircle, color: 'text-[#10B981]', bg: 'bg-[rgba(16,185,129,0.08)]' },
        { label: 'Approved', icon: CheckCircle, color: 'text-[#10B981]', bg: 'bg-[rgba(16,185,129,0.08)]' },
        { label: 'Denied', icon: XCircle, color: 'text-[#DC2626]', bg: 'bg-[rgba(220,38,38,0.08)]' },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setResultIndex(prev => (prev + 1) % results.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const currentResult = results[resultIndex];

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="relative bg-white rounded-xl border border-gray-200 p-8 md:p-10 overflow-hidden shadow-ss-lg">
                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.04]" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(16,185,129,0.5) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }} />

                <div className="relative flex items-center justify-between gap-4 md:gap-8">
                    {/* Agent */}
                    <motion.div
                        custom={0}
                        variants={flowStep}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center gap-2 min-w-[80px]"
                    >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-ss-accent/10 border border-ss-accent/20 flex items-center justify-center">
                            <Bot className="w-7 h-7 md:w-8 md:h-8 text-ss-accent" />
                        </div>
                        <span className="text-xs text-ss-text-tertiary font-mono">Agent</span>
                    </motion.div>

                    {/* Flow arrows left */}
                    <motion.div
                        custom={1}
                        variants={flowStep}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center gap-1"
                    >
                        <DollarSign className="w-4 h-4 text-ss-accent/60" />
                        <div className="flex gap-0.5">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-6 md:w-10 h-0.5 bg-gradient-to-r from-ss-accent/40 to-ss-accent/10 rounded-full"
                                    initial={{ scaleX: 0, opacity: 0 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    transition={{ delay: 0.8 + i * 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* Shield / Policy Gate */}
                    <motion.div
                        custom={2}
                        variants={flowStep}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center gap-2 min-w-[100px]"
                    >
                        <motion.div
                            variants={pulseGlow}
                            animate="animate"
                            className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-ss-accent/10 border-2 border-ss-accent/30 flex items-center justify-center"
                        >
                            <Shield className="w-8 h-8 md:w-10 md:h-10 text-ss-accent" />
                        </motion.div>
                        <span className="text-xs text-ss-accent font-mono font-medium">Policy Gate</span>
                    </motion.div>

                    {/* Flow arrows right */}
                    <motion.div
                        custom={3}
                        variants={flowStep}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center gap-1"
                    >
                        <div className="flex gap-0.5">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-6 md:w-10 h-0.5 bg-gradient-to-r from-ss-accent/10 to-ss-accent/40 rounded-full"
                                    initial={{ scaleX: 0, opacity: 0 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    transition={{ delay: 1.4 + i * 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                />
                            ))}
                        </div>
                        <ArrowRight className="w-4 h-4 text-ss-accent/60" />
                    </motion.div>

                    {/* Result */}
                    <motion.div
                        custom={4}
                        variants={flowStep}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center gap-2 min-w-[80px]"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`icon-${resultIndex}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                                className={`w-14 h-14 md:w-16 md:h-16 rounded-xl ${currentResult.bg} border border-gray-200 flex items-center justify-center`}
                            >
                                <currentResult.icon className={`w-7 h-7 md:w-8 md:h-8 ${currentResult.color}`} />
                            </motion.div>
                        </AnimatePresence>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={`label-${resultIndex}`}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                className={`text-xs font-mono font-medium ${currentResult.color}`}
                            >
                                {currentResult.label}
                            </motion.span>
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Bottom label */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 0.6 }}
                    className="text-center text-xs text-ss-text-tertiary mt-6 font-mono"
                >
                    14-step validation cascade · policy-based spend control · immutable audit trail
                </motion.p>
            </div>
        </div>
    );
};

export default HeroAnimation;