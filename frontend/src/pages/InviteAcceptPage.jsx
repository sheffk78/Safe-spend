import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Shield, 
    Check, 
    AlertCircle, 
    Building2,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { getInviteDetails, acceptInvite } from '@/lib/api';

const ROLE_CONFIG = {
    owner: { label: 'Owner', color: 'text-amber-400' },
    finance_admin: { label: 'Finance Admin', color: 'text-emerald-400' },
    developer: { label: 'Developer', color: 'text-blue-400' },
    read_only: { label: 'Read Only', color: 'text-gray-400' }
};

const InviteAcceptPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [inviteDetails, setInviteDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const details = await getInviteDetails(token);
                setInviteDetails(details);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchInvite();
    }, [token]);
    
    const handleAccept = async () => {
        setAccepting(true);
        setError(null);
        
        try {
            await acceptInvite(token);
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setAccepting(false);
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-ss-accent animate-spin" />
            </div>
        );
    }
    
    if (error && !inviteDetails) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-ss-text mb-2">Invalid Invitation</h1>
                    <p className="text-ss-text-secondary mb-6">{error}</p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors"
                    >
                        Go to Login
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }
    
    if (success) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-ss-text mb-2">Welcome to the Team!</h1>
                    <p className="text-ss-text-secondary mb-6">
                        You've successfully joined <span className="text-ss-text font-medium">{inviteDetails?.organization?.name}</span>.
                    </p>
                    <p className="text-sm text-ss-text-tertiary mb-6">
                        Please sign in to access the dashboard.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors"
                    >
                        Sign In to Dashboard
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }
    
    const roleConfig = ROLE_CONFIG[inviteDetails?.role] || ROLE_CONFIG.developer;
    
    return (
        <div className="min-h-screen bg-ss-bg flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/">
                        <img 
                            src="/logo-safespend-compact.svg" 
                            alt="Safe-Spend" 
                            className="h-8 mx-auto"
                        />
                    </Link>
                </div>
                
                {/* Invite Card */}
                <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-ss-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-ss-accent" />
                        </div>
                        <h1 className="text-xl font-semibold text-ss-text mb-2">
                            You've been invited!
                        </h1>
                        <p className="text-ss-text-secondary">
                            Join the organization below
                        </p>
                    </div>
                    
                    {/* Organization Info */}
                    <div className="bg-ss-bg rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-ss-accent/10 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-ss-accent" />
                            </div>
                            <div>
                                <p className="text-ss-text font-medium">
                                    {inviteDetails?.organization?.name}
                                </p>
                                <p className="text-xs text-ss-text-tertiary">Organization</p>
                            </div>
                        </div>
                        
                        <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 mt-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ss-text-secondary">Your email</span>
                                <span className="text-ss-text">{inviteDetails?.email}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ss-text-secondary">Your role</span>
                                <span className={`font-medium ${roleConfig.color}`}>
                                    {roleConfig.label}
                                </span>
                            </div>
                            {inviteDetails?.expires_at && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-ss-text-secondary">Expires</span>
                                    <span className="text-ss-text-tertiary">
                                        {new Date(inviteDetails.expires_at).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg mb-4">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full px-4 py-3 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        data-testid="accept-invite-btn"
                    >
                        {accepting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Accepting...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Accept Invitation
                            </>
                        )}
                    </button>
                    
                    <p className="text-xs text-ss-text-tertiary text-center mt-4">
                        By accepting, you agree to the organization's access policies.
                    </p>
                </div>
                
                {/* Footer */}
                <p className="text-center text-xs text-ss-text-tertiary mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-ss-accent hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default InviteAcceptPage;
