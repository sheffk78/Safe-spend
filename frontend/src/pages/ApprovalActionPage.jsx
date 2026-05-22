import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
    CheckCircle, 
    XCircle, 
    AlertCircle, 
    Loader2,
    ArrowRight,
    DollarSign,
    Building2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ApprovalActionPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [actionDetails, setActionDetails] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    
    // Verify token and get details on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError('No action token provided');
                setLoading(false);
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/api/v1/approvals/action?token=${token}`);
                const data = await response.json();
                
                if (!response.ok) {
                    setError(data.error || data.message || 'Invalid or expired link');
                } else {
                    setActionDetails(data);
                }
            } catch (err) {
                setError('Failed to verify action link');
            } finally {
                setLoading(false);
            }
        };
        
        verifyToken();
    }, [token]);
    
    const handleConfirmAction = async () => {
        setVerifying(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_URL}/api/v1/approvals/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                setError(data.error || data.message || 'Failed to process action');
            } else {
                setResult({
                    success: true,
                    action: actionDetails?.action,
                    ...data
                });
            }
        } catch (err) {
            setError('Failed to process action');
        } finally {
            setVerifying(false);
        }
    };
    
    const formatCents = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };
    
    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-ss-accent animate-spin mx-auto mb-4" />
                    <p className="text-ss-text-secondary">Verifying action link...</p>
                </div>
            </div>
        );
    }
    
    // Error state (no details to show)
    if (error && !actionDetails) {
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-ss-text mb-2">Link Invalid</h1>
                    <p className="text-ss-text-secondary mb-6">{error}</p>
                    <p className="text-sm text-ss-text-tertiary mb-6">
                        This link may have expired or already been used. Please use the dashboard to manage approvals.
                    </p>
                    <Link
                        to="/dashboard/approvals"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors"
                    >
                        Go to Dashboard
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }
    
    // Success result
    if (result?.success) {
        const isApproved = result.action === 'approve';
        
        return (
            <div className="min-h-screen bg-ss-bg flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
                    <div className={`w-16 h-16 ${isApproved ? 'bg-teal-400/10' : 'bg-red-400/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {isApproved ? (
                            <CheckCircle className="w-8 h-8 text-teal-400" />
                        ) : (
                            <XCircle className="w-8 h-8 text-red-400" />
                        )}
                    </div>
                    <h1 className="text-xl font-semibold text-ss-text mb-2">
                        {isApproved ? 'Spend Approved!' : 'Spend Denied'}
                    </h1>
                    <p className="text-ss-text-secondary mb-4">
                        {result.message}
                    </p>
                    
                    {result.new_balance_cents !== undefined && (
                        <div className="bg-ss-bg rounded-lg p-4 mb-6">
                            <p className="text-xs text-ss-text-tertiary mb-1">New Protected Account Balance</p>
                            <p className="text-2xl font-semibold text-ss-text">
                                {formatCents(result.new_balance_cents)}
                            </p>
                        </div>
                    )}
                    
                    <Link
                        to="/dashboard/approvals"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-white rounded-lg font-medium transition-colors"
                    >
                        View All Approvals
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }
    
    // Confirmation screen
    const isApproveAction = actionDetails?.action === 'approve';
    
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
                
                {/* Action Card */}
                <div className="bg-ss-card border border-[rgba(255,255,255,0.06)] rounded-xl p-8">
                    <div className="text-center mb-6">
                        <div className={`w-16 h-16 ${isApproveAction ? 'bg-teal-400/10' : 'bg-red-400/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                            {isApproveAction ? (
                                <CheckCircle className="w-8 h-8 text-teal-400" />
                            ) : (
                                <XCircle className="w-8 h-8 text-red-400" />
                            )}
                        </div>
                        <h1 className="text-xl font-semibold text-ss-text mb-2">
                            {isApproveAction ? 'Confirm Approval' : 'Confirm Denial'}
                        </h1>
                        <p className="text-ss-text-secondary">
                            {isApproveAction 
                                ? 'You are about to approve this spend request'
                                : 'You are about to deny this spend request'}
                        </p>
                    </div>
                    
                    {/* Spend Details */}
                    <div className="bg-ss-bg rounded-lg p-4 mb-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-ss-text-secondary">Amount</span>
                            <span className="text-lg font-semibold text-ss-text flex items-center gap-1">
                                <DollarSign size={16} className="text-ss-accent" />
                                {actionDetails?.amount_cents 
                                    ? (actionDetails.amount_cents / 100).toFixed(2)
                                    : '0.00'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-ss-text-secondary">Vendor</span>
                            <span className="text-ss-text font-medium">
                                {actionDetails?.vendor}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-ss-text-secondary">Organization</span>
                            <span className="text-ss-text flex items-center gap-1.5">
                                <Building2 size={14} className="text-ss-text-tertiary" />
                                {actionDetails?.organization}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-ss-text-secondary">Protected Account</span>
                            <span className="text-ss-text">
                                {actionDetails?.escrow_name}
                            </span>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg mb-4">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <button
                            onClick={handleConfirmAction}
                            disabled={verifying}
                            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                isApproveAction 
                                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                                    : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                            data-testid="confirm-action-btn"
                        >
                            {verifying ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {isApproveAction ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    {isApproveAction ? 'Confirm Approval' : 'Confirm Denial'}
                                </>
                            )}
                        </button>
                        
                        <Link
                            to={actionDetails?.dashboard_url || '/dashboard/approvals'}
                            className="block w-full px-4 py-3 text-center text-ss-text-secondary hover:text-ss-text bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
                        >
                            View Full Details in Dashboard
                        </Link>
                    </div>
                </div>
                
                {/* Footer */}
                <p className="text-center text-xs text-ss-text-tertiary mt-6">
                    This action is being performed via email one-click approval.
                </p>
            </div>
        </div>
    );
};

export default ApprovalActionPage;
