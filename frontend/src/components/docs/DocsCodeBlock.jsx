import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import { Copy, Check } from 'lucide-react';

// Single language code block
export const CodeBlock = ({ code, language = 'bash', title }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        Prism.highlightAll();
    }, [code]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] mb-6" data-testid="docs-code-block">
            {title && (
                <div className="flex items-center justify-between px-4 py-2 bg-ss-surface border-b border-[rgba(255,255,255,0.06)]">
                    <span className="text-sm text-ss-text-tertiary">{title}</span>
                    <button
                        onClick={handleCopy}
                        className="text-ss-text-tertiary hover:text-ss-text transition-colors p-1"
                        data-testid="copy-code-btn"
                    >
                        {copied ? <Check size={16} className="text-ss-accent" /> : <Copy size={16} />}
                    </button>
                </div>
            )}
            <div className="relative bg-ss-code">
                {!title && (
                    <button
                        onClick={handleCopy}
                        className="absolute top-3 right-3 text-ss-text-tertiary hover:text-ss-text transition-colors p-1"
                        data-testid="copy-code-btn"
                    >
                        {copied ? <Check size={16} className="text-ss-accent" /> : <Copy size={16} />}
                    </button>
                )}
                <pre className={`language-${language}`}>
                    <code className={`language-${language}`}>{code}</code>
                </pre>
            </div>
        </div>
    );
};

// Multi-tab code block
export const TabbedCodeBlock = ({ tabs, defaultTab = 0 }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        Prism.highlightAll();
    }, [activeTab]);

    const handleCopy = () => {
        navigator.clipboard.writeText(tabs[activeTab].code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] mb-6" data-testid="docs-tabbed-code-block">
            <div className="flex items-center justify-between bg-ss-surface border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.label}
                            onClick={() => setActiveTab(index)}
                            data-testid={`code-tab-${tab.label.toLowerCase()}`}
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
                <button
                    onClick={handleCopy}
                    className="text-ss-text-tertiary hover:text-ss-text transition-colors p-2 mr-2"
                    data-testid="copy-code-btn"
                >
                    {copied ? <Check size={16} className="text-ss-accent" /> : <Copy size={16} />}
                </button>
            </div>
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
