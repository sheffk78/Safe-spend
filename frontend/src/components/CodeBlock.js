import React, { useEffect, useState } from 'react';
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
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            {/* Tab bar */}
            <div className="flex bg-ss-surface border-b border-[rgba(255,255,255,0.06)]">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.label}
                        onClick={() => setActiveTab(index)}
                        data-testid={`code-tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                            activeTab === index
                                ? 'text-ss-accent border-ss-accent'
                                : 'text-ss-text-tertiary border-transparent hover:text-ss-text-secondary'
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
        </div>
    );
};

export default CodeBlock;
