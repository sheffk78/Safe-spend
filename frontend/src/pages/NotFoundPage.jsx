import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFoundPage = () => {
    return (
        <div className="min-h-screen bg-ss-bg flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* 404 Number */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] font-bold text-ss-elevated leading-none select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Search className="w-16 h-16 text-ss-accent opacity-50" />
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-semibold text-ss-text mb-3">
                    Page Not Found
                </h2>
                <p className="text-ss-text-secondary mb-8">
                    The page you're looking for doesn't exist or has been moved.
                    Let's get you back on track.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ss-accent text-black font-medium rounded-lg hover:bg-ss-accent-hover transition-colors"
                        data-testid="404-home-btn"
                    >
                        <Home size={18} />
                        Go Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ss-surface border border-ss-border text-ss-text font-medium rounded-lg hover:bg-ss-elevated transition-colors"
                        data-testid="404-back-btn"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                </div>

                {/* Help Links */}
                <div className="mt-12 pt-8 border-t border-ss-border">
                    <p className="text-ss-text-tertiary text-sm mb-4">
                        Looking for something specific?
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm">
                        <Link to="/docs" className="text-ss-accent hover:underline">
                            Documentation
                        </Link>
                        <Link to="/dashboard" className="text-ss-accent hover:underline">
                            Dashboard
                        </Link>
                        <Link to="/login" className="text-ss-accent hover:underline">
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
