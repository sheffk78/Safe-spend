import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Docs', href: '/docs' }
    ];

    const handleNavClick = (href) => {
        setMobileMenuOpen(false);
        if (href.startsWith('#')) {
            const element = document.querySelector(href);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            navigate(href);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-ss-bg/80 backdrop-blur-lg border-b border-[rgba(255,255,255,0.06)]">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link 
                        to="/" 
                        className="flex items-center gap-2 text-ss-text font-heading font-bold text-xl"
                        data-testid="navbar-logo"
                    >
                        <div className="w-8 h-8 rounded-lg bg-ss-accent flex items-center justify-center">
                            <svg className="w-5 h-5 text-ss-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        Safe-Spend
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <button
                                key={link.label}
                                onClick={() => handleNavClick(link.href)}
                                className="text-ss-text-secondary hover:text-ss-text transition-colors duration-200 text-sm font-medium"
                                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                                {link.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-medium rounded-lg transition-all duration-200 text-sm"
                                data-testid="nav-dashboard-btn"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-ss-text-secondary hover:text-ss-text transition-colors duration-200 text-sm font-medium"
                                    data-testid="nav-login-btn"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/dashboard"
                                    className="px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-medium rounded-lg transition-all duration-200 text-sm"
                                    data-testid="nav-dashboard-cta"
                                >
                                    Dashboard
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2 text-ss-text-secondary hover:text-ss-text"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        data-testid="mobile-menu-toggle"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-ss-surface border-t border-[rgba(255,255,255,0.06)]">
                    <div className="px-6 py-4 space-y-3">
                        {navLinks.map((link) => (
                            <button
                                key={link.label}
                                onClick={() => handleNavClick(link.href)}
                                className="block w-full text-left text-ss-text-secondary hover:text-ss-text py-2 text-sm font-medium"
                            >
                                {link.label}
                            </button>
                        ))}
                        <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-2">
                            {!isAuthenticated && (
                                <Link
                                    to="/login"
                                    className="block w-full text-center py-2.5 text-ss-text-secondary hover:text-ss-text text-sm font-medium"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Log in
                                </Link>
                            )}
                            <Link
                                to="/dashboard"
                                className="block w-full text-center px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-medium rounded-lg transition-all duration-200 text-sm"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
