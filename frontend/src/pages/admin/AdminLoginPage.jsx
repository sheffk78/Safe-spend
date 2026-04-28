/**
 * Admin Login Page
 * Simple API key authentication for admin dashboard
 * Uses ss_admin_... key format, validates against /api/admin/status
 */

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { Shield, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';

const AdminLoginPage = () => {
    const { login, isAuthenticated, loading } = useAdmin();
    const navigate = useNavigate();
    const [adminKey, setAdminKey] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Redirect if already authenticated
    if (!loading && isAuthenticated) {
        return <Navigate to="/admin" replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        // Validate key format
        if (!adminKey.startsWith('ss_admin_')) {
            setError('Invalid key format. Admin keys start with ss_admin_');
            return;
        }

        setSubmitting(true);

        try {
            const result = await login(adminKey);
            if (result.success) {
                navigate('/admin');
            } else {
                setError(result.error || 'Invalid admin key');
            }
        } catch (err) {
            setError(err.message || 'Authentication failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ss-bg flex flex-col items-center justify-center p-4">
            {/* Warning Banner */}
            <div className="w-full max-w-md mb-6 p-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-lg">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">Internal Admin Access Only</span>
                </div>
                <p className="text-xs text-[#F59E0B]/70 mt-1">
                    This area is restricted to Agentic Trust operators. Unauthorized access is prohibited.
                </p>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-white border border-gray-100 rounded-xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center">
                        <Shield className="w-8 h-8 text-[#F59E0B]" />
                    </div>
                    <h1 className="font-heading text-2xl font-bold text-ss-text">Safe-Spend</h1>
                    <p className="text-[#6B7280] mt-2 text-sm">Admin Console</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[#EF4444] text-sm">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ss-text-tertiary mb-2">
                            Admin Key
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
                            <input
                                type="password"
                                value={adminKey}
                                onChange={(e) => setAdminKey(e.target.value)}
                                placeholder="ss_admin_..."
                                required
                                className="w-full pl-10 pr-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:outline-none focus:border-[#F59E0B] font-mono text-sm"
                                data-testid="admin-key-input"
                            />
                        </div>
                        <p className="text-xs text-[#6B7280] mt-2">
                            Enter your admin API key to access the console
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !adminKey}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-ss-text font-medium transition-all"
                        data-testid="admin-login-btn"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Authenticating...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                    <a href="/" className="text-sm text-[#6B7280] hover:text-[#14B8A6] transition-colors">
                        ← Back to Safe-Spend
                    </a>
                </div>
            </div>

            {/* Version */}
            <p className="mt-6 text-xs text-[#6B7280]">Safe-Spend Admin v1.0</p>
        </div>
    );
};

export default AdminLoginPage;
