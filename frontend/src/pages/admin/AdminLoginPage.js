import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Shield, LogIn, AlertTriangle } from 'lucide-react';

const AdminLoginPage = () => {
    const { login, isAuthenticated, loading } = useAdminAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Redirect if already authenticated
    if (!loading && isAuthenticated) {
        return <Navigate to="/admin/orgs" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await login(email, password);
            navigate('/admin/orgs');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-ss-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ss-bg flex flex-col items-center justify-center p-4">
            {/* Warning Banner */}
            <div className="w-full max-w-md mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">Internal Admin Access Only</span>
                </div>
                <p className="text-xs text-red-400/70 mt-1">
                    This area is restricted to Agentic Trust operators. Unauthorized access is prohibited.
                </p>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Safe-Spend Admin</h1>
                    <p className="text-ss-text-secondary mt-2">Sign in to the control plane</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@agentictrust.app"
                            required
                            className="w-full px-4 py-3 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-red-400"
                            data-testid="admin-email-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-ss-text-secondary mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-3 bg-ss-elevated border border-[rgba(255,255,255,0.1)] rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-red-400"
                            data-testid="admin-password-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
                        data-testid="admin-login-btn"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Sign in to Admin
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)] text-center">
                    <a href="/" className="text-sm text-ss-text-tertiary hover:text-ss-accent">
                        ← Back to Safe-Spend
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
