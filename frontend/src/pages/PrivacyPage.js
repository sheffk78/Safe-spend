import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';

const PrivacyPage = () => {
    return (
        <div className="min-h-screen bg-ss-bg">
            <Navbar />
            
            <main className="pt-24 pb-20 px-6">
                <div className="max-w-[800px] mx-auto">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors mb-8"
                    >
                        <ArrowLeft size={18} />
                        Back to home
                    </Link>

                    <div className="bg-ss-surface p-8 md:p-12 rounded-xl border border-[rgba(255,255,255,0.06)]">
                        <h1 className="font-heading text-3xl font-bold text-ss-text mb-8">Privacy Policy</h1>
                        
                        <div className="prose prose-invert max-w-none">
                            <p className="text-ss-text-secondary mb-6">
                                Last updated: January 2026
                            </p>
                            
                            <p className="text-ss-text-secondary mb-6">
                                This Privacy Policy will be available when Safe-Spend launches publicly. 
                                For questions, please contact us at{' '}
                                <a href="mailto:support@agentictrust.app" className="text-ss-accent hover:text-ss-accent-hover">
                                    support@agentictrust.app
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PrivacyPage;
