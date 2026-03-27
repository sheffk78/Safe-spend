/**
 * Admin Dashboard Layout
 * Sidebar navigation for admin console
 * Uses ss_admin_... API key authentication
 */

import React, { useState } from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import {
    ChartBarIcon,
    HeartIcon,
    DocumentTextIcon,
    ChartPieIcon,
    ClipboardDocumentListIcon,
    KeyIcon,
    ArrowTopRightOnSquareIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    XMarkIcon
} from '@heroicons/react/24/outline';

const navItems = [
    { label: 'Overview', icon: ChartBarIcon, path: '/admin' },
    { label: 'System Health', icon: HeartIcon, path: '/admin/health' },
    { label: 'Blog Manager', icon: DocumentTextIcon, path: '/admin/blog' },
    { label: 'Metrics', icon: ChartPieIcon, path: '/admin/metrics' },
    { label: 'Audit Log', icon: ClipboardDocumentListIcon, path: '/admin/audit' },
    { label: 'Admin Keys', icon: KeyIcon, path: '/admin/keys' },
];

const AdminLayout = () => {
    const { keyInfo, logout, isAuthenticated, loading } = useAdmin();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return (
        <div className="min-h-screen bg-[#0A0A0B] flex">
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
                w-[260px] bg-[#0F0F11] border-r border-[rgba(255,255,255,0.06)]
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col
            `}>
                {/* Logo/Brand */}
                <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                    <Link to="/admin" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#10B981]" fill="currentColor">
                                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19 8l-7 3.5L5 8l7-3.2zM4 9.8l7 3.5v6.4L4 16.2V9.8zm9 9.9v-6.4l7-3.5v6.4l-7 3.5z"/>
                            </svg>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-[#F5F5F5]">Safe-Spend</span>
                            <span className="px-2 py-0.5 bg-[rgba(245,158,11,0.15)] text-[#F59E0B] text-[11px] font-semibold tracking-[0.05em] rounded">
                                ADMIN
                            </span>
                        </div>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden absolute top-4 right-4 text-[#9CA3AF]"
                    >
                        <XMarkIcon className="w-5 h-5" />
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
                                        ? 'bg-[rgba(16,185,129,0.08)] text-[#10B981]'
                                        : 'text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.04)]'
                                }`}
                                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
                    <p className="text-xs text-[#6B7280] mb-2">Safe-Spend Admin v1.0</p>
                    
                    <a 
                        href="/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#10B981] mb-3 transition-colors"
                    >
                        Back to Site
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                    
                    {keyInfo && (
                        <p className="text-xs text-[#6B7280] mb-3 truncate">
                            Key: {keyInfo.label || 'Admin'}
                        </p>
                    )}
                    
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#9CA3AF] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-all duration-150"
                        data-testid="admin-logout-btn"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
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
                        className="p-2 text-[#9CA3AF] hover:text-[#F5F5F5]"
                    >
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F5F5F5]">Admin</span>
                        <span className="px-2 py-0.5 bg-[rgba(245,158,11,0.15)] text-[#F59E0B] text-[10px] font-bold rounded">
                            ADMIN
                        </span>
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
