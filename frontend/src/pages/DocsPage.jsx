import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
    BookOpen, 
    Rocket, 
    Code, 
    Shield, 
    Webhook, 
    Puzzle, 
    ScrollText, 
    Terminal,
    ArrowRight
} from 'lucide-react';

const docSections = [
    {
        icon: Rocket,
        title: 'Quickstart',
        description: 'Create your first escrow, set a policy, and make a spend request in 5 minutes.',
        link: '/docs/quickstart',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
    },
    {
        icon: BookOpen,
        title: 'Concepts',
        description: 'Escrow accounts, spending policies, approval workflows, and the rules engine explained.',
        link: '/docs/concepts',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    {
        icon: Terminal,
        title: 'API Reference',
        description: 'Full REST API documentation for every endpoint — escrow, policies, spend, approvals, webhooks.',
        link: '/docs/api-reference',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
    },
    {
        icon: Puzzle,
        title: 'Integrations',
        description: 'Connect Safe-Spend to LangChain, CrewAI, AutoGPT, and other agent frameworks.',
        link: '/docs/integrations',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
    },
    {
        icon: Webhook,
        title: 'Webhooks',
        description: 'Real-time notifications for approvals, denials, escalations, and AAV events.',
        link: '/docs/webhooks',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
    },
    {
        icon: Code,
        title: 'SDKs',
        description: 'Python SDK and LangChain toolkit for adding spending controls to any agent.',
        link: '/docs/sdks',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/10',
    },
    {
        icon: Shield,
        title: 'AAV Integration',
        description: 'Two-layer security: Agent Authority Vault for who can spend, Safe-Spend for what can be spent.',
        link: '/docs/aav-integration',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
    },
    {
        icon: ScrollText,
        title: 'Trust Law & Fiduciary Duty',
        description: 'Why card rails aren\'t enough — the legal and compliance case for spending controls.',
        link: '/docs/trust-law',
        color: 'text-teal-400',
        bgColor: 'bg-teal-500/10',
    },
];

const DocsPage = () => {
    return (
        <div className="min-h-screen bg-ss-bg">
            <Navbar />
            
            <main className="pt-24 pb-20 px-6">
                <div className="max-w-[900px] mx-auto">
                    <div className="mb-12">
                        <h1 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">
                            Documentation
                        </h1>
                        <p className="text-ss-text-secondary text-lg leading-relaxed max-w-2xl">
                            Everything you need to integrate Safe-Spend into your agent infrastructure. 
                            Start with the quickstart, then explore specific topics.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {docSections.map((section) => (
                            <Link
                                key={section.link}
                                to={section.link}
                                className="group bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/30 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${section.bgColor} flex items-center justify-center`}>
                                        <section.icon className={`w-5 h-5 ${section.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-heading text-lg font-semibold text-ss-text mb-1 group-hover:text-ss-accent transition-colors">
                                            {section.title}
                                        </h3>
                                        <p className="text-ss-text-secondary text-sm leading-relaxed">
                                            {section.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-ss-text-tertiary group-hover:text-ss-accent transition-colors flex-shrink-0 mt-1" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-12 p-6 bg-ss-surface rounded-xl border border-[rgba(255,255,255,0.06)]">
                        <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">
                            Just getting started?
                        </h3>
                        <p className="text-ss-text-secondary text-sm mb-4">
                            The quickstart walks you through creating an escrow, setting a policy, and making your first spend request — in under 5 minutes.
                        </p>
                        <Link
                            to="/docs/quickstart"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                            Start the quickstart
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DocsPage;