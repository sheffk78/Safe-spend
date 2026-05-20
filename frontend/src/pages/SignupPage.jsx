     1|import React, { useState } from 'react';
     2|import { Link, useNavigate } from 'react-router-dom';
     3|import { useAuth } from '@/contexts/AuthContext';
     4|import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
     5|
     6|const SignupPage = () => {
     7|    const [name, setName] = useState('');
     8|    const [email, setEmail] = useState('');
     9|    const [password, setPassword] = useState('');
    10|    const [confirmPassword, setConfirmPassword] = useState('');
    11|    const [showPassword, setShowPassword] = useState(false);
    12|    const [error, setError] = useState('');
    13|    const [loading, setLoading] = useState(false);
    14|    const { signup } = useAuth();
    15|    const navigate = useNavigate();
    16|
    17|    const handleSubmit = async (e) => {
    18|        e.preventDefault();
    19|        setError('');
    20|        setLoading(true);
    21|
    22|        try {
    23|            if (!email || !password) {
    24|                throw new Error('Please fill in all fields');
    25|            }
    26|            if (!name.trim()) {
    27|                throw new Error('Please enter your name');
    28|            }
    29|
    30|            if (password !== confirmPassword) {
    31|                throw new Error('Passwords do not match');
    32|            }
    33|
    34|            if (password.length < 8) {
    35|                throw new Error('Password must be at least 8 characters');
    36|            }
    37|
    38|            const result = await signup(email, password, name);
    39|            if (result.success) {
    40|                navigate('/dashboard');
    41|            }
    42|        } catch (err) {
    43|            setError(err.message || 'Failed to create account');
    44|        } finally {
    45|            setLoading(false);
    46|        }
    47|    };
    48|
    49|    return (
    50|        <div className="min-h-screen bg-ss-bg flex flex-col">
    51|            {/* Header */}
    52|            <div className="p-6">
    53|                <Link 
    54|                    to="/" 
    55|                    className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors"
    56|                    data-testid="back-to-home"
    57|                >
    58|                    <ArrowLeft size={18} />
    59|                    Back to home
    60|                </Link>
    61|            </div>
    62|
    63|            {/* Form */}
    64|            <div className="flex-1 flex items-center justify-center px-6 py-12">
    65|                <div className="w-full max-w-md">
    66|                    <div className="text-center mb-8">
    68|                        <Link to="/" className="inline-block mb-4">
    72|                            <img 
    73|                                src="/logo-safespend-compact-light.svg" 
    74|                                alt="Safe-Spend" 
    75|                                className="h-10 mx-auto"
    76|                            />
    77|                        </Link>
    78|                        <h1 className="font-heading text-2xl font-bold text-ss-text">Create your account</h1>
    79|                        <p className="text-ss-text-secondary mt-2">Get started with Safe-Spend</p>
    80|                    </div>
    81|
    82|                    <div className="bg-ss-surface p-8 rounded-xl border border-gray-200 shadow-ss-md">
    83|                        <form onSubmit={handleSubmit} className="space-y-5">
    84|                            {error && (
    85|                                <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-ss-error/30 text-ss-error text-sm" data-testid="signup-error">
    86|                                    {error}
    87|                                </div>
    88|                            )}
    89|
    90|                            <div>
    91|                                <label htmlFor="name" className="block text-sm font-medium text-ss-text mb-2">
    92|                                    Name
    93|                                </label>
    94|                                <input
    95|                                    id="name"
    96|                                    type="text"
    97|                                    value={name}
    98|                                    onChange={(e) => setName(e.target.value)}
    99|                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
   100|                                    placeholder="Your name"
   101|                                    data-testid="signup-name-input"
   102|                                    required
   103|                                />
   104|                            </div>
   105|
   106|                            <div>
   107|                                <label htmlFor="email" className="block text-sm font-medium text-ss-text mb-2">
   108|                                    Email
   109|                                </label>
   110|                                <input
   111|                                    id="email"
   112|                                    type="email"
   113|                                    value={email}
   114|                                    onChange={(e) => setEmail(e.target.value)}
   115|                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
   116|                                    placeholder="you@example.com"
   117|                                    data-testid="signup-email-input"
   118|                                />
   119|                            </div>
   120|
   121|                            <div>
   122|                                <label htmlFor="password" className="block text-sm font-medium text-ss-text mb-2">
   123|                                    Password
   124|                                </label>
   125|                                <div className="relative">
   126|                                    <input
   127|                                        id="password"
   128|                                        type={showPassword ? 'text' : 'password'}
   129|                                        value={password}
   130|                                        onChange={(e) => setPassword(e.target.value)}
   131|                                        className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all pr-12"
   132|                                        placeholder="••••••••"
   133|                                        data-testid="signup-password-input"
   134|                                    />
   135|                                    <button
   136|                                        type="button"
   137|                                        onClick={() => setShowPassword(!showPassword)}
   138|                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ss-text-tertiary hover:text-ss-text transition-colors"
   139|                                        data-testid="toggle-password-visibility"
   140|                                    >
   141|                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
   142|                                    </button>
   143|                                </div>
   144|                                <p className="text-xs text-ss-text-tertiary mt-1">At least 8 characters</p>
   145|                            </div>
   146|
   147|                            <div>
   148|                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-ss-text mb-2">
   149|                                    Confirm Password
   150|                                </label>
   151|                                <input
   152|                                    id="confirmPassword"
   153|                                    type={showPassword ? 'text' : 'password'}
   154|                                    value={confirmPassword}
   155|                                    onChange={(e) => setConfirmPassword(e.target.value)}
   156|                                    className="w-full px-4 py-3 bg-ss-elevated border border-gray-200 rounded-lg text-ss-text placeholder-ss-text-tertiary focus:border-ss-accent focus:ring-2 focus:ring-ss-accent/20 transition-all"
   157|                                    placeholder="••••••••"
   158|                                    data-testid="signup-confirm-password-input"
   159|                                />
   160|                            </div>
   161|
   162|                            <button
   163|                                type="submit"
   164|                                disabled={loading}
   165|                                className="w-full px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-ss-bg font-semibold rounded-lg transition-all duration-200"
   166|                                data-testid="signup-submit-btn"
   167|                            >
   168|                                {loading ? 'Creating account...' : 'Create account'}
   169|                            </button>
   170|                        </form>
   171|                    </div>
   172|
   173|                    <p className="text-center text-ss-text-secondary text-sm mt-6">
   174|                        Already have an account?{' '}
   175|                        <Link to="/login" className="text-ss-accent hover:text-ss-accent-hover transition-colors" data-testid="login-link">
   176|                            Log in
   177|                        </Link>
   178|                    </p>
   179|
   180|                    <p className="text-center text-ss-text-tertiary text-xs mt-4">
   181|                        By signing up, you agree to our{' '}
   182|                        <Link to="/terms" className="text-ss-text-secondary hover:text-ss-text transition-colors">
   183|                            Terms of Service
   184|                        </Link>{' '}
   185|                        and{' '}
   186|                        <Link to="/privacy" className="text-ss-text-secondary hover:text-ss-text transition-colors">
   187|                            Privacy Policy
   188|                        </Link>
   189|                    </p>
   190|                </div>
   191|            </div>
   192|        </div>
   193|    );
   194|};
   195|
   196|export default SignupPage;
   197|