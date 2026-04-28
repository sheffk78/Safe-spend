import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }

            const result = await login(email, password);
            if (result.success) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Failed to log in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-ss-bg flex flex-col">
            {/* Header */}
            <div className="p-6">
                <Link 
                    to="/" 
                    className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
                    data-testid="back-to-home"
                >
                    <ArrowLeft size={18} />
                    Back to home
                </Link>
            </div>

            {/* Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-flex items-center mb-4">
                            <img 
                                src="/logo-safespend-compact-light.svg" 
                                alt="Safe-Spend" 
                                className="h-10"
                            />
                        </Link>
                        <h1 className="font-heading text-2xl font-bold text-ss-text">Welcome back</h1>
                        <p className="text-ss-text-secondary mt-2">Log in to your account</p>
                    </div>

                    <div className="bg-ss-surface p-8 rounded-xl border border-[rgba(255,255,255,0.06)]">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-ss-error/30 text-ss-error text-sm" data-testid="login-error">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-ss-text mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
                                    placeholder="you@example.com"
                                    data-testid="login-email-input"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-ss-text mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all pr-12"
                                        placeholder="••••••••"
                                        data-testid="login-password-input"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary hover:text-ss-text transition-colors"
                                        data-testid="toggle-password-visibility"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-ss-bg font-semibold rounded-lg transition-all duration-200"
                                data-testid="login-submit-btn"
                            >
                                {loading ? 'Logging in...' : 'Log in'}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-ss-text-secondary text-sm mt-6">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-ss-accent hover:text-ss-accent-hover transition-colors" data-testid="signup-link">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
