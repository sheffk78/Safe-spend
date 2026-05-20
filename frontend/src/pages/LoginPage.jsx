     1|import React, { useState } from 'react';
     2|import { Link, useNavigate } from 'react-router-dom';
     3|import { useAuth } from '@/contexts/AuthContext';
     4|import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
     5|
     6|const LoginPage = () => {
     7|    const [email, setEmail] = useState('');
     8|    const [password, setPassword] = useState('');
     9|    const [showPassword, setShowPassword] = useState(false);
    10|    const [error, setError] = useState('');
    11|    const [loading, setLoading] = useState(false);
    12|    const { login } = useAuth();
    13|    const navigate = useNavigate();
    14|
    15|    const handleSubmit = async (e) => {
    16|        e.preventDefault();
    17|        setError('');
    18|        setLoading(true);
    19|
    20|        try {
    21|            if (!email || !password) {
    22|                throw new Error('Please fill in all fields');
    23|            }
    24|
    25|            const result = await login(email, password);
    26|            if (result.success) {
    27|                navigate('/dashboard');
    28|            }
    29|        } catch (err) {
    30|            setError(err.message || 'Failed to log in');
    31|        } finally {
    32|            setLoading(false);
    33|        }
    34|    };
    35|
    36|    return (
    37|        <div className="min-h-screen bg-ss-bg flex flex-col">
    38|            {/* Header */}
    39|            <div className="p-6">
    40|                <Link 
    41|                    to="/" 
    42|                    className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
    43|                    data-testid="back-to-home"
    44|                >
    45|                    <ArrowLeft size={18} />
    46|                    Back to home
    47|                </Link>
    48|            </div>
    49|
    50|            {/* Form */}
    51|            <div className="flex-1 flex items-center justify-center px-6 py-12">
    52|                <div className="w-full max-w-md">
    53|                    <div className="text-center mb-8">
    55|                        <Link to="/" className="inline-block mb-4">
    59|                            <img 
    60|                                src="/logo-safespend-compact-light.svg" 
    61|                                alt="Safe-Spend" 
    62|                                className="h-10 mx-auto"
    63|                            />
    64|                        </Link>
    65|                        <h1 className="font-heading text-2xl font-bold text-ss-text">Welcome back</h1>
    66|                        <p className="text-ss-text-secondary mt-2">Log in to your account</p>
    67|                    </div>
    68|
    69|                    <div className="bg-ss-surface p-8 rounded-xl border border-[rgba(255,255,255,0.06)]">
    70|                        <form onSubmit={handleSubmit} className="space-y-6">
    71|                            {error && (
    72|                                <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-ss-error/30 text-ss-error text-sm" data-testid="login-error">
    73|                                    {error}
    74|                                </div>
    75|                            )}
    76|
    77|                            <div>
    78|                                <label htmlFor="email" className="block text-sm font-medium text-ss-text mb-2">
    79|                                    Email
    80|                                </label>
    81|                                <input
    82|                                    id="email"
    83|                                    type="email"
    84|                                    value={email}
    85|                                    onChange={(e) => setEmail(e.target.value)}
    86|                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
    87|                                    placeholder="you@example.com"
    88|                                    data-testid="login-email-input"
    89|                                />
    90|                            </div>
    91|
    92|                            <div>
    93|                                <label htmlFor="password" className="block text-sm font-medium text-ss-text mb-2">
    94|                                    Password
    95|                                </label>
    96|                                <div className="relative">
    97|                                    <input
    98|                                        id="password"
    99|                                        type={showPassword ? 'text' : 'password'}
   100|                                        value={password}
   101|                                        onChange={(e) => setPassword(e.target.value)}
   102|                                        className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all pr-12"
   103|                                        placeholder="••••••••"
   104|                                        data-testid="login-password-input"
   105|                                    />
   106|                                    <button
   107|                                        type="button"
   108|                                        onClick={() => setShowPassword(!showPassword)}
   109|                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary hover:text-ss-text transition-colors"
   110|                                        data-testid="toggle-password-visibility"
   111|                                    >
   112|                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
   113|                                    </button>
   114|                                </div>
   115|                            </div>
   116|
   117|                            <button
   118|                                type="submit"
   119|                                disabled={loading}
   120|                                className="w-full px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-ss-bg font-semibold rounded-lg transition-all duration-200"
   121|                                data-testid="login-submit-btn"
   122|                            >
   123|                                {loading ? 'Logging in...' : 'Log in'}
   124|                            </button>
   125|                        </form>
   126|                    </div>
   127|
   128|                    <p className="text-center text-ss-text-secondary text-sm mt-6">
   129|                        Don't have an account?{' '}
   130|                        <Link to="/signup" className="text-ss-accent hover:text-ss-accent-hover transition-colors" data-testid="signup-link">
   131|                            Sign up
   132|                        </Link>
   133|                    </p>
   134|                </div>
   135|            </div>
   136|        </div>
   137|    );
   138|};
   139|
   140|export default LoginPage;
   141|