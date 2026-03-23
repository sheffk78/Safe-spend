import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-ss-code border-t border-[rgba(255,255,255,0.06)]">
            <div className="max-w-[1200px] mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="mb-4">
                            <img 
                                src="/logo-safespend-compact.svg" 
                                alt="Safe-Spend" 
                                className="h-7"
                            />
                        </div>
                        <p className="text-ss-text-secondary text-sm mb-4">
                            by Agentic Trust
                        </p>
                        <a 
                            href="mailto:support@agentictrust.app" 
                            className="text-ss-text-secondary hover:text-ss-accent text-sm transition-colors"
                            data-testid="footer-support-email"
                        >
                            support@agentictrust.app
                        </a>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-ss-text font-semibold text-sm mb-4">Resources</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/docs" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-api-reference">
                                    API Reference
                                </Link>
                            </li>
                            <li>
                                <Link to="/docs" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-integration-guides">
                                    Integration Guides
                                </Link>
                            </li>
                            <li>
                                <a href="https://status.agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-status">
                                    Status
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/agentictrust" target="_blank" rel="noopener noreferrer" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-github">
                                    GitHub
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="text-ss-text font-semibold text-sm mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li>
                                <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-agentic-trust">
                                    Agentic Trust
                                </a>
                            </li>
                            <li>
                                <a href="https://agentauthority.dev" target="_blank" rel="noopener noreferrer" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-aav">
                                    Agent Authority Vault
                                </a>
                            </li>
                            <li>
                                <a href="mailto:support@agentictrust.app" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-support">
                                    Support
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-ss-text font-semibold text-sm mb-4">Legal</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/terms" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-terms">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="text-ss-text-secondary hover:text-ss-text text-sm transition-colors" data-testid="footer-link-privacy">
                                    Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)]">
                    <p className="text-ss-text-tertiary text-xs text-center">
                        © {new Date().getFullYear()} Agentic Trust. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
