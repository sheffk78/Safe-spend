import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
    LayoutDashboard, 
    Wallet, 
    Shield, 
    ArrowRightLeft, 
    CheckCircle, 
    Key, 
    Webhook, 
    FileText, 
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Escrow Accounts', icon: Wallet, path: '/dashboard/accounts' },
    { label: 'Spending Rules', icon: Shield, path: '/dashboard/rules' },
    { label: 'Transactions', icon: ArrowRightLeft, path: '/dashboard/transactions' },
    { label: 'Approvals', icon: CheckCircle, path: '/dashboard/approvals' },
    { label: 'API Keys', icon: Key, path: '/dashboard/keys' },
    { label: 'Webhooks', icon: Webhook, path: '/dashboard/webhooks' },
    { label: 'Audit Log', icon: FileText, path: '/dashboard/audit' },
    { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-ss-bg flex">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-ss-code border-r border-[rgba(255,255,255,0.06)] flex flex-col transform transition-transform duration-200 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Logo */}
                <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
                    <Link to="/" className="flex items-center gap-2 text-ss-text font-heading font-bold text-lg">
                        <div className="w-8 h-8 rounded-lg bg-ss-accent flex items-center justify-center">
                            <svg className="w-5 h-5 text-ss-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        Safe-Spend
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ${
                                    active
                                        ? 'bg-[rgba(16,185,129,0.08)] text-ss-accent'
                                        : 'text-ss-text-secondary hover:bg-[rgba(255,255,255,0.04)] hover:text-ss-text'
                                }`}
                                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                                <Icon size={20} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="mb-3">
                        <p className="text-xs text-ss-text-tertiary truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ss-text-secondary hover:text-ss-text hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-all duration-150"
                        data-testid="logout-btn"
                    >
                        <LogOut size={18} />
                        Log out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
                {/* Mobile header */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-ss-text-secondary hover:text-ss-text"
                        data-testid="mobile-menu-btn"
                    >
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="flex items-center gap-2 text-ss-text font-heading font-bold">
                        <div className="w-7 h-7 rounded-lg bg-ss-accent flex items-center justify-center">
                            <svg className="w-4 h-4 text-ss-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        Safe-Spend
                    </Link>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>

                {/* Page content */}
                <div className="p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
