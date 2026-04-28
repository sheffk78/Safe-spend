import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

const CodeBlock = ({ tabs, defaultTab = 0 }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        Prism.highlightAll();
    }, [activeTab]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl overflow-hidden border border-gray-200 shadow-ss-lg"
        >
            {/* Tab bar */}
            <div className="flex bg-ss-surface border-b border-gray-100">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.label}
                        onClick={() => setActiveTab(index)}
                        data-testid={`code-tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                            activeTab === index
                                ? 'text-ss-accent border-ss-accent bg-ss-accent/5'
                                : 'text-ss-text-tertiary border-transparent hover:text-ss-text-secondary hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {/* Code content */}
            <div className="bg-ss-code">
                <pre className={`language-${tabs[activeTab].language}`}>
                    <code className={`language-${tabs[activeTab].language}`}>
                        {tabs[activeTab].code}
                    </code>
                </pre>
            </div>
        </motion.div>
    );
};

export default CodeBlock;