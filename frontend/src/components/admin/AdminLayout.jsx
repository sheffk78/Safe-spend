/**
 * Admin Layout Component
 * Provides sidebar navigation and layout for admin pages
 */

import React from 'react';
import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';
import {
    ChartBarIcon,
    HeartIcon,
    DocumentTextIcon,
    ChartPieIcon,
    ClipboardDocumentListIcon,
    KeyIcon,
    ArrowTopRightOnSquareIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

const navItems = [
    { path: '/admin', icon: ChartBarIcon, label: 'Overview', exact: true },
    { path: '/admin/health', icon: HeartIcon, label: 'System Health' },
    { path: '/admin/blog', icon: DocumentTextIcon, label: 'Blog Manager' },
    { path: '/admin/metrics', icon: ChartPieIcon, label: 'Metrics' },
    { path: '/admin/audit', icon: ClipboardDocumentListIcon, label: 'Audit Log' },
    { path: '/admin/keys', icon: KeyIcon, label: 'Admin Keys' },
];

const AdminLayout = () => {
    const { isAuthenticated, loading, keyInfo, logout } = useAdmin();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-ss-accent border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-ss-bg flex">
            {/* Sidebar */}
            <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col fixed h-screen">
                {/* Logo & Admin Badge */}
                <div className="p-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl mb-3">
                        <span className="text-ss-accent">◆</span>
                        Safe-Spend
                    </Link>
                    <span className="inline-block px-2 py-1 bg-amber-500/15 text-amber-500 text-[11px] font-semibold tracking-wider rounded">
                        ADMIN
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const active = isActive(item.path, item.exact);
                        
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    active
                                        ? 'bg-ss-accent/10 text-ss-accent'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 space-y-3">
                    <div className="text-xs text-zinc-500">
                        Key: <span className="text-zinc-400">{keyInfo?.label || 'Admin'}</span>
                    </div>
                    <a
                        href="https://safe-spend.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Back to Site
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                    </a>
                    <button
                        onClick={logout}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                        Sign Out
                    </button>
                    <div className="text-[10px] text-zinc-600 pt-2">
                        Safe-Spend Admin v1.0
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-[260px]">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
