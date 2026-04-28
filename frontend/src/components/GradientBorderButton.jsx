import React from 'react';
import { motion } from 'framer-motion';

const GradientBorderButton = ({ children, className = '', ...props }) => {
    return (
        <div className="relative inline-block group">
            {/* Animated gradient border */}
            <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-ss-accent via-emerald-300 to-teal-400 opacity-0 group-hover:opacity-100 blur-[2px] transition-opacity duration-500 animate-gradient-rotate" />
            
            {/* Actual button */}
            <div className={`relative rounded-xl ${className}`} {...props}>
                {children}
            </div>
        </div>
    );
};

export default GradientBorderButton;