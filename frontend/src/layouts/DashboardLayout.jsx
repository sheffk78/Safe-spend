import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import GuidedTour, { useShouldShowTour, TourHelpButton } from '@/components/GuidedTour';
import { 
    LayoutDashboard, 
    Wallet, 
    Scale, 
    ArrowRightLeft, 
    CheckCircle, 
    Key, 
    Webhook, 
    FileText, 
    Settings,
    LogOut,
    Menu,
    X,
    Play,
    CreditCard,
    Users,
    Crown,
    ShieldCheck,
    Code2,
    Eye,
    FileDown,
    MessageSquare
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyRole } from '@/lib/api';

// Role configuration
const ROLE_CONFIG = {
    owner: { label: 'Owner', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
    finance_admin: { label: 'Finance Admin', icon: ShieldCheck, color: 'text-ss-accent', bg: 'bg-ss-accent/10' },
    developer: { label: 'Developer', icon: Code2, color: 'text-ss-accent', bg: 'bg-ss-accent/10' },
    read_only: { label: 'Read Only', icon: Eye, color: 'text-ss-text-tertiary', bg: 'bg-gray-100' }
};

const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Escrow Accounts', icon: Wallet, path: '/dashboard/accounts' },
    { label: 'Fiduciary Policies', icon: Scale, path: '/dashboard/rules' },
    { label: 'Transactions', icon: ArrowRightLeft, path: '/dashboard/transactions' },
    { label: 'Approvals', icon: CheckCircle, path: '/dashboard/approvals' },
    { label: 'Playground', icon: Play, path: '/dashboard/playground' },
    { label: 'API Keys', icon: Key, path: '/dashboard/keys' },
    { label: 'Webhooks', icon: Webhook, path: '/dashboard/webhooks' },
    { label: 'Audit Log', icon: FileText, path: '/dashboard/audit' },
    { label: 'Exports', icon: FileDown, path: '/dashboard/exports' },
    { label: 'Team', icon: Users, path: '/dashboard/team' },
    { label: 'Give Feedback', icon: MessageSquare, path: '/feedback' },
    { label: 'Pricing & Plans', icon: CreditCard, path: '/dashboard/pricing' },
    { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
];

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const shouldShowTour = useShouldShowTour();
    const [tourDismissed, setTourDismissed] = useState(false);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const roleData = await getMyRole();
                setUserRole(roleData.role);
            } catch (err) {
                console.error('Failed to fetch user role:', err);
            }
        };
        fetchRole();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleTourComplete = () => {
        setTourDismissed(true);
    };

    const tourActive = shouldShowTour && !tourDismissed;

    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-ss-bg flex page-enter">
            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-ss-lg lg:shadow-none`}>
                {/* Logo */}
                <div className="p-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center group">
                        <img 
                            src="/logo-safespend-compact-light.svg" 
                            alt="Safe-Spend" 
                            className="h-7 transition-transform duration-200 group-hover:scale-105"
                        />
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
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    active
                                        ? 'bg-ss-accent/8 text-ss-accent shadow-sm'
                                        : 'text-ss-text-secondary hover:bg-gray-50 hover:text-ss-text'
                                }`}
                                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                                <Icon size={20} className={active ? 'text-ss-accent' : ''} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-gray-100">
                    <div className="mb-3">
                        <p className="text-xs text-ss-text-tertiary truncate">{user?.email}</p>
                        {userRole && (
                            <div className="mt-1.5">
                                {(() => {
                                    const config = ROLE_CONFIG[userRole] || ROLE_CONFIG.read_only;
                                    const RoleIcon = config.icon;
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                                            <RoleIcon size={12} />
                                            {config.label}
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <TourHelpButton className="flex-1 justify-center" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 flex-1 justify-center px-3 py-2 text-sm text-ss-text-secondary hover:text-ss-error hover:bg-red-50 rounded-lg transition-all duration-200"
                            data-testid="logout-btn"
                        >
                            <LogOut size={16} />
                            Log out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
                {/* Mobile header */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-ss-text-secondary hover:text-ss-accent transition-colors"
                        data-testid="mobile-menu-btn"
                    >
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="flex items-center">
                        <img 
                            src="/logo-safespend-compact-light.svg" 
                            alt="Safe-Spend" 
                            className="h-7"
                        />
                    </Link>
                    <div className="w-10" />
                </div>

                {/* Page content */}
                <div className="p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Guided Tour */}
            {tourActive && <GuidedTour onComplete={handleTourComplete} />}
        </div>
    );
};

export default DashboardLayout;