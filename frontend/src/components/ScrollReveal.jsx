import React from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

// Easing curve: snappy without bouncy
export const easeOutExpo = [0.22, 1, 0.36, 1];

// Scroll-reveal wrapper
export const RevealOnScroll = ({ children, delay = 0, className = '' }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: easeOutExpo, delay }}
        className={className}
    >
        {children}
    </motion.div>
);

// Stagger container
export const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

export const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOutExpo } }
};

// Number count-up hook
export const useCountUp = (end, duration = 1500) => {
    const [count, setCount] = React.useState(0);
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    
    React.useEffect(() => {
        if (!isInView) return;
        let start = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutExpo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setCount(Math.floor(eased * end));
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }, [isInView, end, duration]);
    
    return [count, ref];
};