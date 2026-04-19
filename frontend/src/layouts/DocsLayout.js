import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
    BookOpen, 
    Rocket, 
    Code, 
    Webhook, 
    Puzzle,
    ArrowLeft,
    ExternalLink,
    Scale,
    Package,
    Shield,
    Menu,
    X
} from 'lucide-react';

const navigation = [
    {
        title: 'Overview',
        items: [
            { name: 'What is Safe-Spend?', href: '/docs', icon: BookOpen },
            { name: 'Core Concepts', href: '/docs/concepts', icon: BookOpen },
        ]
    },
    {
        title: 'Concepts',
        items: [
            { name: 'Trust Law & Governance', href: '/docs/trust-law', icon: Scale },
        ]
    },
    {
        title: 'Quickstart',
        items: [
            { name: 'Create your first escrow', href: '/docs/quickstart', icon: Rocket },
        ]
    },
    {
        title: 'SDKs & Integrations',
        items: [
            { name: 'Python SDK', href: '/docs/sdks#python-sdk', icon: Package },
            { name: 'TypeScript SDK', href: '/docs/sdks#typescript-sdk', icon: Package },
            { name: 'LangChain', href: '/docs/sdks#langchain', icon: Puzzle },
            { name: 'MCP Server', href: '/docs/sdks#mcp-server', icon: Puzzle },
            { name: 'AAV Integration', href: '/docs/aav-integration', icon: Shield },
            { name: 'ARL Reputation', href: '/docs/aav-integration#arl-reputation', icon: Shield },
        ]
    },
    {
        title: 'API Reference',
        items: [
            { name: 'Auth & API Keys', href: '/docs/api#auth', icon: Code },
            { name: 'Escrow Accounts', href: '/docs/api#escrow', icon: Code },
            { name: 'Spending Policies', href: '/docs/api#policies', icon: Code },
            { name: 'Spend Requests', href: '/docs/api#spend', icon: Code },
            { name: 'Agents', href: '/docs/api#agents', icon: Code },
            { name: 'Agent Certificates', href: '/docs/api#certificates', icon: Code },
            { name: 'Approvals', href: '/docs/api#approvals', icon: Code },
            { name: 'Audit Log', href: '/docs/api#audit', icon: Code },
            { name: 'Webhooks API', href: '/docs/api#webhooks', icon: Code },
            { name: 'Control Plane', href: '/docs/api#control-plane', icon: Code },
        ]
    },
    {
        title: 'Webhooks',
        items: [
            { name: 'Events & Payloads', href: '/docs/webhooks', icon: Webhook },
        ]
    },
    {
        title: 'Integrations',
        items: [
            { name: 'cURL', href: '/docs/integrations#curl', icon: Puzzle },
            { name: 'Python', href: '/docs/integrations#python', icon: Puzzle },
            { name: 'TypeScript', href: '/docs/integrations#typescript', icon: Puzzle },
            { name: 'Agent Frameworks', href: '/docs/integrations#frameworks', icon: Puzzle },
        ]
    }
];

const SidebarContent = ({ onLinkClick }) => {
    const location = useLocation();
    const currentPath = location.pathname + location.hash;

    const isActive = (href) => {
        if (href.includes('#')) {
            return currentPath === href || (location.pathname === href.split('#')[0] && location.hash === '#' + href.split('#')[1]);
        }
        return location.pathname === href;
    };

    return (
        <div className="p-6">
            <Link to="/" className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors mb-6" data-testid="docs-back-link">
                <ArrowLeft size={16} />
                <span className="text-sm">Back to Home</span>
            </Link>
            
            <Link to="/docs" className="flex items-center gap-3 mb-8" data-testid="docs-logo" onClick={onLinkClick}>
                <div className="w-8 h-8 rounded-lg bg-ss-accent flex items-center justify-center">
                    <BookOpen size={18} className="text-ss-bg" />
                </div>
                <span className="font-heading font-semibold text-ss-text">Docs</span>
            </Link>

            <nav className="space-y-6">
                {navigation.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-xs font-semibold text-ss-text-tertiary uppercase tracking-wider mb-2">
                            {section.title}
                        </h3>
                        <ul className="space-y-1">
                            {section.items.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        to={item.href}
                                        onClick={onLinkClick}
                                        data-testid={`docs-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                            isActive(item.href)
                                                ? 'bg-ss-accent/10 text-ss-accent'
                                                : 'text-ss-text-secondary hover:text-ss-text hover:bg-[rgba(255,255,255,0.04)]'
                                        }`}
                                    >
                                        <item.icon size={16} />
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <Link
                    to="/dashboard"
                    onClick={onLinkClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ss-text-secondary hover:text-ss-text hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
                    data-testid="docs-dashboard-link"
                >
                    <ExternalLink size={16} />
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
};

const DocsLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-ss-bg flex">
            {/* Mobile header bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-ss-surface border-b border-[rgba(255,255,255,0.06)] px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-ss-text-secondary"
                    data-testid="docs-mobile-menu-btn"
                >
                    <Menu size={20} />
                </button>
                <Link to="/docs" className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-ss-accent flex items-center justify-center">
                        <BookOpen size={14} className="text-ss-bg" />
                    </div>
                    <span className="font-heading font-semibold text-ss-text text-sm">Docs</span>
                </Link>
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - desktop: static, mobile: slide-over drawer */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-72 lg:w-64 flex-shrink-0
                    border-r border-[rgba(255,255,255,0.06)]
                    bg-ss-surface overflow-y-auto
                    transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
                data-testid="docs-sidebar"
            >
                {/* Close button for mobile */}
                <div className="lg:hidden flex justify-end p-3">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-ss-text-secondary"
                        data-testid="docs-mobile-close-btn"
                    >
                        <X size={20} />
                    </button>
                </div>
                <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DocsLayout;
