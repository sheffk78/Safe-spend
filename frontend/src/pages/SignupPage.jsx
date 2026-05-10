import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const SignupPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }
            if (!name.trim()) {
                throw new Error('Please enter your name');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }

            const result = await signup(email, password, name);
            if (result.success) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Failed to create account');
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
                        <Link to="/" className="inline-block mb-4">
                            <img 
                                src="/logo-safespend-compact-light.svg" 
                                alt="Safe-Spend" 
                                className="h-10 mx-auto"
                            />
                        </Link>
                        <h1 className="font-heading text-2xl font-bold text-ss-text">Create your account</h1>
                        <p className="text-ss-text-secondary mt-2">Get started with Safe-Spend</p>
                    </div>

                    <div className="bg-ss-surface p-8 rounded-xl border border-gray-200 shadow-ss-md">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-ss-error/30 text-ss-error text-sm" data-testid="signup-error">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-ss-text mb-2">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
                                    placeholder="Your name"
                                    data-testid="signup-name-input"
                                    required
                                />
                            </div>

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
                                    data-testid="signup-email-input"
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
                                        data-testid="signup-password-input"
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
                                <p className="text-xs text-ss-text-tertiary mt-1">At least 8 characters</p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-ss-text mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
                                    placeholder="••••••••"
                                    data-testid="signup-confirm-password-input"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-ss-bg font-semibold rounded-lg transition-all duration-200"
                                data-testid="signup-submit-btn"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>
                    </div>

                    <p className="text-center text-ss-text-secondary text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-ss-accent hover:text-ss-accent-hover transition-colors" data-testid="login-link">
                            Log in
                        </Link>
                    </p>

                    <p className="text-center text-ss-text-tertiary text-xs mt-4">
                        By signing up, you agree to our{' '}
                        <Link to="/terms" className="text-ss-text-secondary hover:text-ss-text transition-colors">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-ss-text-secondary hover:text-ss-text transition-colors">
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
