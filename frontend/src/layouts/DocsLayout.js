import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
    BookOpen, 
    Rocket, 
    Code, 
    Webhook, 
    Puzzle,
    ChevronRight,
    ArrowLeft,
    ExternalLink
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
        title: 'Quickstart',
        items: [
            { name: 'Create your first escrow', href: '/docs/quickstart', icon: Rocket },
        ]
    },
    {
        title: 'API Reference',
        items: [
            { name: 'Auth & API Keys', href: '/docs/api#auth', icon: Code },
            { name: 'Escrow Accounts', href: '/docs/api#escrow', icon: Code },
            { name: 'Spending Policies', href: '/docs/api#policies', icon: Code },
            { name: 'Spend Requests', href: '/docs/api#spend', icon: Code },
            { name: 'Approvals', href: '/docs/api#approvals', icon: Code },
            { name: 'Audit Log', href: '/docs/api#audit', icon: Code },
            { name: 'Webhooks API', href: '/docs/api#webhooks', icon: Code },
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

const DocsSidebar = () => {
    const location = useLocation();
    const currentPath = location.pathname + location.hash;

    const isActive = (href) => {
        if (href.includes('#')) {
            return currentPath === href || (location.pathname === href.split('#')[0] && location.hash === '#' + href.split('#')[1]);
        }
        return location.pathname === href;
    };

    return (
        <aside className="w-64 flex-shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-ss-surface/50 overflow-y-auto" data-testid="docs-sidebar">
            <div className="p-6">
                <Link to="/" className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors mb-6" data-testid="docs-back-link">
                    <ArrowLeft size={16} />
                    <span className="text-sm">Back to Home</span>
                </Link>
                
                <Link to="/docs" className="flex items-center gap-3 mb-8" data-testid="docs-logo">
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
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ss-text-secondary hover:text-ss-text hover:bg-[rgba(255,255,255,0.04)] transition-all duration-200"
                        data-testid="docs-dashboard-link"
                    >
                        <ExternalLink size={16} />
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </aside>
    );
};

const DocsLayout = () => {
    return (
        <div className="min-h-screen bg-ss-bg flex">
            <DocsSidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-8 py-12">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DocsLayout;
