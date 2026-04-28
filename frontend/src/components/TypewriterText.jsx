import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TypewriterText = ({ text, className = '', delay = 0, speed = 40, tag: Tag = 'span' }) => {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    function useInView(ref, options = {}) {
        const [isIntersecting, setIsIntersecting] = useState(false);
        useEffect(() => {
            const el = ref.current;
            if (!el) return;
            const obs = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    obs.disconnect();
                }
            }, options);
            obs.observe(el);
            return () => obs.disconnect();
        }, [ref, options.margin]);
        return isIntersecting;
    }

    useEffect(() => {
        if (!isInView) return;
        const timeout = setTimeout(() => {
            setHasStarted(true);
            let i = 0;
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(interval);
                    setIsComplete(true);
                }
            }, speed);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [isInView, text, speed, delay]);

    return (
        <Tag ref={ref} className={className}>
            <span>{displayText}</span>
            <AnimatePresence>
                {!isComplete && hasStarted && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-[3px] h-[1em] bg-ss-accent ml-0.5 align-text-bottom"
                    />
                )}
            </AnimatePresence>
        </Tag>
    );
};

export default TypewriterText;