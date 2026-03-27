import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Info, AlertTriangle, CheckCircle, Play } from 'lucide-react';

// Typography Components
export const DocsHeading = ({ level = 1, id, children, className = '' }) => {
    const Tag = `h${level}`;
    const styles = {
        1: 'text-3xl md:text-4xl font-bold mb-6',
        2: 'text-2xl font-bold mb-4 mt-12 pt-6 border-t border-[rgba(255,255,255,0.06)]',
        3: 'text-xl font-semibold mb-3 mt-8',
        4: 'text-lg font-semibold mb-2 mt-6'
    };

    return (
        <Tag 
            id={id} 
            className={`font-heading text-ss-text scroll-mt-6 ${styles[level]} ${className}`}
            data-testid={id ? `docs-heading-${id}` : undefined}
        >
            {children}
        </Tag>
    );
};

export const DocsText = ({ children, className = '' }) => (
    <p className={`text-ss-text-secondary leading-relaxed mb-4 ${className}`}>
        {children}
    </p>
);

export const DocsList = ({ items, ordered = false, className = '' }) => {
    const Tag = ordered ? 'ol' : 'ul';
    return (
        <Tag className={`${ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-2 mb-6 text-ss-text-secondary ${className}`}>
            {items.map((item, index) => (
                <li key={index} className="leading-relaxed">{item}</li>
            ))}
        </Tag>
    );
};

export const DocsLink = ({ href, children, external = false }) => (
    <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="text-ss-accent hover:text-ss-accent-hover underline underline-offset-2 transition-colors"
    >
        {children}
    </a>
);

// Callout Component
const calloutStyles = {
    info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: Info,
        iconColor: 'text-blue-400'
    },
    warning: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        icon: AlertTriangle,
        iconColor: 'text-yellow-400'
    },
    error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: AlertCircle,
        iconColor: 'text-red-400'
    },
    success: {
        bg: 'bg-ss-accent/10',
        border: 'border-ss-accent/30',
        icon: CheckCircle,
        iconColor: 'text-ss-accent'
    }
};

export const Callout = ({ type = 'info', title, children }) => {
    const style = calloutStyles[type];
    const Icon = style.icon;

    return (
        <div className={`${style.bg} ${style.border} border rounded-lg p-4 mb-6`} data-testid={`callout-${type}`}>
            <div className="flex gap-3">
                <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={20} />
                <div>
                    {title && (
                        <h4 className="font-semibold text-ss-text mb-1">{title}</h4>
                    )}
                    <div className="text-ss-text-secondary text-sm">{children}</div>
                </div>
            </div>
        </div>
    );
};

// Enhanced Code Block for docs
export const InlineCode = ({ children }) => (
    <code className="px-1.5 py-0.5 bg-ss-code rounded text-ss-accent text-sm font-mono">
        {children}
    </code>
);

// API Endpoint Component
export const ApiEndpoint = ({ method, path, description, playgroundScenario }) => {
    const methodColors = {
        GET: 'bg-green-500/20 text-green-400',
        POST: 'bg-blue-500/20 text-blue-400',
        PATCH: 'bg-yellow-500/20 text-yellow-400',
        PUT: 'bg-orange-500/20 text-orange-400',
        DELETE: 'bg-red-500/20 text-red-400'
    };

    // Generate playground URL based on method and path
    const playgroundUrl = playgroundScenario 
        ? `/playground#scenario/${playgroundScenario}`
        : `/playground#${method}${path}`;

    return (
        <div className="flex items-start gap-3 mb-4 p-3 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)]" data-testid={`endpoint-${method.toLowerCase()}-${path.replace(/[/:]/g, '-')}`}>
            <span className={`${methodColors[method]} px-2 py-1 rounded text-xs font-mono font-semibold`}>
                {method}
            </span>
            <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                    <code className="text-ss-text font-mono text-sm">{path}</code>
                    <Link 
                        to={playgroundUrl}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-ss-accent/10 hover:bg-ss-accent/20 text-ss-accent text-xs font-medium rounded transition-all flex-shrink-0"
                        data-testid={`try-playground-${method.toLowerCase()}-${path.replace(/[/:]/g, '-')}`}
                    >
                        <Play size={12} />
                        Try in Playground
                    </Link>
                </div>
                {description && (
                    <p className="text-ss-text-secondary text-sm mt-1">{description}</p>
                )}
            </div>
        </div>
    );
};

// Parameter Table
export const ParamTable = ({ params }) => (
    <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="text-left py-2 px-3 text-ss-text-tertiary font-medium">Parameter</th>
                    <th className="text-left py-2 px-3 text-ss-text-tertiary font-medium">Type</th>
                    <th className="text-left py-2 px-3 text-ss-text-tertiary font-medium">Description</th>
                </tr>
            </thead>
            <tbody>
                {params.map((param, index) => (
                    <tr key={index} className="border-b border-[rgba(255,255,255,0.03)]">
                        <td className="py-2 px-3">
                            <code className="text-ss-accent font-mono">{param.name}</code>
                            {param.required && <span className="text-red-400 ml-1">*</span>}
                        </td>
                        <td className="py-2 px-3 text-ss-text-tertiary font-mono">{param.type}</td>
                        <td className="py-2 px-3 text-ss-text-secondary">{param.description}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// Section Divider
export const SectionDivider = () => (
    <hr className="my-12 border-[rgba(255,255,255,0.06)]" />
);
