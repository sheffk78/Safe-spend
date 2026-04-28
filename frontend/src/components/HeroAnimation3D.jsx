import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Shield, DollarSign, CheckCircle, XCircle } from 'lucide-react';

const easeOutExpo = [0.22, 1, 0.36, 1];

// Floating particles that represent money flowing through the system
const MoneyParticle = ({ delay, startX, startY, endX, endY, color }) => {
    const duration = 3 + Math.random() * 2;
    const path = [
        { x: startX, y: startY },
        { x: startX + (endX - startX) * 0.3 + (Math.random() - 0.5) * 60, y: startY + (endY - startY) * 0.5 },
        { x: endX, y: endY },
    ];

    return (
        <motion.div
            className="absolute pointer-events-none"
            initial={{ opacity: 0, x: path[0].x, y: path[0].y, scale: 0.5 }}
            animate={{
                opacity: [0, 0.8, 0.8, 0],
                x: path.map(p => p.x),
                y: path.map(p => p.y),
                scale: [0.5, 1, 1, 0.3],
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: Math.random() * 2,
            }}
        >
            <div className={`w-2 h-2 rounded-full ${color}`} style={{
                boxShadow: `0 0 8px ${color === 'bg-ss-accent' ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'}`,
            }} />
        </motion.div>
    );
};

// The 3D shield that responds to cursor
const Shield3D = ({ isApproved, showStamp }) => {
    const ref = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

    const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 20 });
    const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 20 });

    const handleMouseMove = useCallback((e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    }, [mouseX, mouseY]);

    const handleMouseLeave = useCallback(() => {
        mouseX.set(0);
        mouseY.set(0);
    }, [mouseX, mouseY]);

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative cursor-pointer"
            style={{ perspective: '1000px' }}
        >
            <motion.div
                style={{
                    rotateX: springRotateX,
                    rotateY: springRotateY,
                    transformStyle: 'preserve-3d',
                }}
                className="relative"
            >
                {/* Glow behind shield */}
                <div className="absolute inset-0 bg-ss-accent/10 rounded-3xl blur-3xl scale-150" />

                {/* Shield card */}
                <div className="relative w-48 h-56 md:w-56 md:h-64 rounded-3xl bg-gradient-to-br from-ss-accent to-emerald-600 shadow-2xl flex flex-col items-center justify-center gap-4 overflow-hidden"
                    style={{ transform: 'translateZ(20px)' }}
                >
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }} />

                    <Shield className="w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-lg" style={{ transform: 'translateZ(40px)' }} strokeWidth={1.5} />

                    <div className="text-center" style={{ transform: 'translateZ(30px)' }}>
                        <p className="text-white/80 text-xs font-mono uppercase tracking-widest">Safe-Spend</p>
                        <p className="text-white font-heading font-bold text-lg md:text-xl mt-1">Policy Gate</p>
                    </div>

                    {/* Stamp effect */}
                    <AnimatePresence>
                        {showStamp && (
                            <motion.div
                                initial={{ opacity: 0, scale: 3, rotate: -15 }}
                                animate={{ opacity: 1, scale: 1, rotate: -12 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className={`absolute inset-0 flex items-center justify-center rounded-3xl ${
                                    isApproved ? 'bg-ss-accent/20' : 'bg-red-500/20'
                                }`}
                                style={{ transform: 'translateZ(50px)' }}
                            >
                                <div className={`px-4 py-2 rounded-xl border-4 ${
                                    isApproved ? 'border-white/80 text-white' : 'border-white/80 text-white'
                                } -rotate-12 font-heading font-bold text-2xl md:text-3xl shadow-2xl`}>
                                    {isApproved ? '✓ APPROVED' : '✗ DENIED'}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom line decoration */}
                    <div className="absolute bottom-4 left-6 right-6 flex items-center gap-2" style={{ transform: 'translateZ(25px)' }}>
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-6 h-1 bg-white/40 rounded-full" />
                            ))}
                        </div>
                        <div className="flex-1" />
                        <DollarSign className="w-4 h-4 text-white/40" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Animated flow line connecting agent to shield to result
const FlowLine = ({ delay = 0, direction = 'left' }) => {
    const width = direction === 'left' ? 'w-16 md:w-24' : 'w-16 md:w-24';
    return (
        <motion.div
            className={`${width} h-[2px] bg-gradient-to-r ${
                direction === 'left'
                    ? 'from-transparent via-ss-accent/50 to-ss-accent'
                    : 'from-ss-accent via-ss-accent/50 to-transparent'
            } relative overflow-hidden`}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay, ease: easeOutExpo }}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: delay + 1 }}
            />
        </motion.div>
    );
};

const HeroAnimation3D = () => {
    const [phase, setPhase] = useState('enter'); // enter, flow, stamp, reset
    const [txIndex, setTxIndex] = useState(0);
    const [isApproved, setIsApproved] = useState(true);
    const [showStamp, setShowStamp] = useState(false);

    const transactions = [
        { vendor: 'Anthropic', amount: '$49.99', approved: true },
        { vendor: 'Google Ads', amount: '$125.00', approved: true },
        { vendor: 'Unknown Co', amount: '$450.00', approved: false },
    ];

    useEffect(() => {
        const cycle = () => {
            setPhase('flow');
            setTimeout(() => {
                setPhase('stamp');
                setIsApproved(transactions[txIndex].approved);
                setShowStamp(true);
            }, 2500);
            setTimeout(() => {
                setShowStamp(false);
                setPhase('reset');
            }, 4500);
            setTimeout(() => {
                setTxIndex(prev => (prev + 1) % transactions.length);
                setPhase('enter');
            }, 5500);
        };

        if (phase === 'enter') {
            const timer = setTimeout(cycle, 1000);
            return () => clearTimeout(timer);
        }
    }, [phase, txIndex]);

    const tx = transactions[txIndex];

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="relative">
                {/* Background glow */}
                <div className="absolute inset-0 -m-8">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-ss-accent/5 rounded-full blur-3xl" />
                </div>

                {/* Main animation container */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: easeOutExpo }}
                    className="relative bg-white rounded-2xl border border-ss-border shadow-ss-lg p-6 md:p-8 overflow-hidden"
                >
                    {/* Noise texture */}
                    <div className="absolute inset-0 opacity-[0.012] pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                        backgroundSize: '128px 128px'
                    }} />

                    {/* Flow visualization */}
                    <div className="flex items-center justify-center gap-2 md:gap-4 py-4">
                        {/* Agent icon */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, ease: easeOutExpo }}
                            className="flex flex-col items-center gap-2 shrink-0"
                        >
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-ss-accent/10 border border-ss-accent/20 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 md:w-7 md:h-7 text-ss-accent" />
                            </div>
                            <span className="text-[10px] md:text-xs text-ss-text-tertiary font-mono">Agent</span>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={txIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-[9px] md:text-xs text-ss-accent font-mono font-medium"
                                >
                                    {tx.amount} → {tx.vendor}
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>

                        <FlowLine delay={0.3} direction="left" />

                        {/* 3D Shield */}
                        <div className="shrink-0">
                            <Shield3D isApproved={isApproved} showStamp={showStamp} />
                        </div>

                        <FlowLine delay={0.6} direction="right" />

                        {/* Result icon */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, ease: easeOutExpo, delay: 0.3 }}
                            className="flex flex-col items-center gap-2 shrink-0"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${txIndex}-${isApproved}`}
                                    initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    {isApproved ? (
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-ss-accent/10 border border-ss-accent/20 flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-ss-accent" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-red-50 border border-red-200/50 flex items-center justify-center">
                                            <XCircle className="w-6 h-6 md:w-7 md:h-7 text-ss-error" />
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                            <span className="text-[10px] md:text-xs text-ss-text-tertiary font-mono">Result</span>
                            <span className={`text-xs font-mono font-medium ${isApproved ? 'text-ss-accent' : 'text-ss-error'}`}>
                                {isApproved ? 'Approved' : 'Denied'}
                            </span>
                        </motion.div>
                    </div>

                    {/* Bottom description */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1 }}
                        className="text-center text-[10px] md:text-xs text-ss-text-tertiary font-mono mt-4 pt-4 border-t border-ss-border"
                    >
                        14-step validation cascade · policy-based spend control · immutable audit trail
                    </motion.p>

                    {/* Transaction progress dots */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        {transactions.map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    scale: i === txIndex ? 1.5 : 1,
                                    backgroundColor: i === txIndex ? '#10B981' : '#E5E7EB'
                                }}
                                transition={{ duration: 0.3 }}
                                className="w-1.5 h-1.5 rounded-full"
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default HeroAnimation3D;