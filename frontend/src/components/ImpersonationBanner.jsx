import React from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AlertTriangle, X, UserCog } from 'lucide-react';

const ImpersonationBanner = () => {
    const { impersonation, endImpersonation } = useAdminAuth();

    if (!impersonation) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white py-2 px-4" data-testid="impersonation-banner">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserCog size={18} />
                    <span className="font-medium">
                        Impersonating: {impersonation.org?.name || 'Unknown Org'}
                    </span>
                    <span className="text-red-200 text-sm">
                        ({impersonation.org?.email})
                    </span>
                </div>
                <button
                    onClick={endImpersonation}
                    className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
                    data-testid="exit-impersonation-btn"
                >
                    <X size={14} />
                    Exit Impersonation
                </button>
            </div>
        </div>
    );
};

export default ImpersonationBanner;
