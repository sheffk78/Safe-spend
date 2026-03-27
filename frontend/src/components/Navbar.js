import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';

// GitHub SVG Icon
const GitHubIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
);

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
                        className="flex items-center"
                        data-testid="navbar-logo"
                    >
                        <img 
                            src="/logo-safespend-compact.svg" 
                            alt="Safe-Spend" 
                            className="h-8"
                        />
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
                        <a
                            href="https://github.com/AgenticTrustHQ"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ss-text-secondary hover:text-ss-text transition-colors duration-200"
                            data-testid="nav-link-github"
                            aria-label="GitHub"
                        >
                            <GitHubIcon className="w-5 h-5" />
                        </a>
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
                        <a
                            href="https://github.com/AgenticTrustHQ"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-ss-text-secondary hover:text-ss-text py-2 text-sm font-medium"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <GitHubIcon className="w-4 h-4" />
                            GitHub
                        </a>
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
