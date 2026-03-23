import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FileText, ArrowLeft } from 'lucide-react';

const DocsPage = () => {
    return (
        <div className="min-h-screen bg-ss-bg">
            <Navbar />
            
            <main className="pt-24 pb-20 px-6">
                <div className="max-w-[800px] mx-auto">
                    <Link 
                        to="/" 
                        className="inline-flex items-center gap-2 text-ss-text-secondary hover:text-ss-text transition-colors mb-8"
                        data-testid="back-to-home"
                    >
                        <ArrowLeft size={18} />
                        Back to home
                    </Link>

                    <div className="bg-ss-surface p-12 rounded-xl border border-[rgba(255,255,255,0.06)] text-center">
                        <div className="w-16 h-16 rounded-full bg-ss-accent/10 flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-8 h-8 text-ss-accent" />
                        </div>
                        <h1 className="font-heading text-2xl font-bold text-ss-text mb-4">Documentation</h1>
                        <p className="text-ss-text-secondary max-w-md mx-auto mb-8">
                            Complete API reference, integration guides, and SDK documentation coming soon.
                        </p>
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-semibold rounded-lg transition-all duration-200"
                            data-testid="docs-cta"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DocsPage;
