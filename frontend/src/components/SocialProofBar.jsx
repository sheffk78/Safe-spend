import React from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from './ScrollReveal';

const SocialProofBar = () => {
    return (
        <section className="py-12 px-6 bg-white border-y border-gray-50">
            <div className="max-w-[1000px] mx-auto text-center">
                <p className="text-ss-text-tertiary text-sm uppercase tracking-[0.2em] font-mono mb-8">Built for teams that run agents</p>
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                    <SocialStat value={14} suffix="-step" label="Validation Cascade" />
                    <div className="hidden md:block w-px h-10 bg-gray-200" />
                    <SocialStat value={5} prefix="<" suffix=" min" label="Average Setup" />
                    <div className="hidden md:block w-px h-10 bg-gray-200" />
                    <SocialStat value={100} suffix="%" label="Audit Coverage" />
                    <div className="hidden md:block w-px h-10 bg-gray-200" />
                    <SocialStat value={0} prefix="$" suffix="" label="Crypto Required" />
                </div>
            </div>
        </section>
    );
};

const SocialStat = ({ value, prefix = '', suffix = '', label }) => {
    const [count, ref] = useCountUp(value, 2000);
    const formatted = prefix + count.toLocaleString() + suffix;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
        >
            <span className="font-heading text-2xl md:text-3xl font-bold text-ss-accent counter-glow">
                {formatted}
            </span>
            <span className="block text-xs text-ss-text-tertiary mt-1 uppercase tracking-wider">
                {label}
            </span>
        </motion.div>
    );
};

export default SocialProofBar;