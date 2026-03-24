import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
    Building2,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Shield,
    ChevronRight
} from 'lucide-react';

const navItems = [
    { label: 'Organizations', icon: Building2, path: '/admin/orgs' },
    { label: 'Platform Stats', icon: BarChart3, path: '/admin/stats' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const AdminLayout = () => {
    const { admin, logout, isAuthenticated, loading } = useAdminAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/admin" state={{ from: location }} replace />;
    }

    return (
        <div className="min-h-screen bg-ss-bg flex">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-ss-surface border-r border-[rgba(255,255,255,0.06)]
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col
            `}>
                {/* Logo/Brand */}
                <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                    <Link to="/admin/orgs" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <span className="font-heading font-bold text-ss-text">Safe-Spend</span>
                            <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">
                                ADMIN
                            </span>
                        </div>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden absolute top-4 right-4 text-ss-text-secondary"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || 
                            (item.path !== '/admin' && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'bg-red-500/10 text-red-400'
                                        : 'text-ss-text-secondary hover:text-ss-text hover:bg-[rgba(255,255,255,0.04)]'
                                }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin info & Logout */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="mb-3">
                        <p className="text-xs text-ss-text-tertiary truncate">{admin?.email}</p>
                        <p className="text-[10px] text-red-400 uppercase font-medium">{admin?.role}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-ss-text-secondary hover:text-ss-text hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-all duration-150"
                        data-testid="admin-logout-btn"
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
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-400" />
                        <span className="font-bold text-ss-text">Admin</span>
                    </div>
                    <div className="w-10" />
                </div>

                {/* Page content */}
                <div className="p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
