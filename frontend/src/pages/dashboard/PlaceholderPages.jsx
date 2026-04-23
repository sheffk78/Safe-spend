import React from 'react';
import { Construction } from 'lucide-react';

const PlaceholderPage = ({ title, description }) => {
    return (
        <div className="space-y-6" data-testid={`page-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {/* Header */}
            <div>
                <h1 className="font-heading text-2xl font-bold text-ss-text">{title}</h1>
                <p className="text-ss-text-secondary mt-1">{description}</p>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center">
                <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                    <Construction className="w-8 h-8 text-ss-accent" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-ss-text mb-2">Coming in next update</h2>
                <p className="text-ss-text-secondary max-w-md mx-auto">
                    This feature is currently under development. Check back soon for the full functionality.
                </p>
            </div>
        </div>
    );
};

// Remaining placeholder pages
export const WebhooksPage = () => (
    <PlaceholderPage 
        title="Webhooks" 
        description="Configure webhook endpoints for real-time event notifications" 
    />
);

export const SettingsPage = () => (
    <PlaceholderPage 
        title="Settings" 
        description="Manage your organization settings and preferences" 
    />
);

export default PlaceholderPage;
