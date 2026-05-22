import React from 'react';
import { Link } from 'react-router-dom';
import { DocsHeading, DocsText, DocsList, Callout, InlineCode } from '@/components/docs/DocsComponents';
import { ArrowRight, Shield, Landmark, Key, Workflow, Webhook } from 'lucide-react';

const DocsOverview = () => {
    return (
        <div data-testid="docs-overview-page">
            <DocsHeading level={1}>What is Safe-Spend?</DocsHeading>
            
            <DocsText>
                Safe-Spend is a <strong className="text-ss-text">fiat-first protected-account and spending-control API for AI agents</strong>. 
                A human funds a protected account, defines spending policies, and an AI agent spends against it via API. 
                Every dollar is governed by a trust-grade rules engine and logged in an immutable audit trail.
            </DocsText>

            <Callout type="info" title="Part of Agentic Trust">
                Safe-Spend is part of the Agentic Trust product suite at{' '}
                <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-accent hover:underline">
                    agentictrust.app
                </a>
            </Callout>

            <DocsHeading level={2} id="who-is-it-for">Who is it for?</DocsHeading>
            
            <div className="grid gap-4 mb-8">
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Agent Builders</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Give your AI agents the ability to spend real money safely, with programmatic controls that prevent runaway costs.
                    </p>
                </div>
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Ops & Security Teams</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Define spending policies, approval workflows, and get complete audit trails for compliance.
                    </p>
                </div>
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Enterprises</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Experiment with autonomous agents safely. Set boundaries, require human approval for large spends, and maintain full visibility.
                    </p>
                </div>
            </div>

            <DocsHeading level={2} id="key-concepts">Key Concepts</DocsHeading>

            <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-5 h-5 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Protected Account</h4>
                        <p className="text-ss-text-secondary text-sm">
                            A segregated account that holds funds for agent spending. Funds are purpose-restricted and fully auditable. 
                            Think of it as a trust account, not a wallet.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Spending Policy</h4>
                        <p className="text-ss-text-secondary text-sm">
                            A trust instrument that defines what, when, and how much an agent can spend. Includes per-transaction limits, 
                            daily/weekly/monthly caps, vendor allowlists, category restrictions, and approval thresholds.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                        <Key className="w-5 h-5 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Agent API Key</h4>
                        <p className="text-ss-text-secondary text-sm">
                            A scoped, restricted key (<InlineCode>sk_agent_...</InlineCode>) that allows agents to make spend requests 
                            but cannot modify policies, funding, or access sensitive settings.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                        <Workflow className="w-5 h-5 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Rules Engine</h4>
                        <p className="text-ss-text-secondary text-sm">
                            A 13-step validation cascade that evaluates every spend request against all active policies. 
                            Checks balance, limits, vendors, categories, time windows, and approval requirements.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                        <Webhook className="w-5 h-5 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Approvals & Webhooks</h4>
                        <p className="text-ss-text-secondary text-sm">
                            Human-in-the-loop approval flows for spends above thresholds. Real-time webhook notifications 
                            keep your systems informed of all events.
                        </p>
                    </div>
                </div>
            </div>

            <DocsHeading level={2} id="how-it-differs">How is this different from a wallet or cost monitor?</DocsHeading>

            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-4 text-ss-text-tertiary font-medium"></th>
                            <th className="text-left py-3 px-4 text-ss-text font-medium">Wallet</th>
                            <th className="text-left py-3 px-4 text-ss-text font-medium">Cost Monitor</th>
                            <th className="text-left py-3 px-4 text-ss-accent font-medium">Safe-Spend</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.03)]">
                            <td className="py-3 px-4 font-medium text-ss-text">Prevents overspend</td>
                            <td className="py-3 px-4">❌ No</td>
                            <td className="py-3 px-4">❌ After the fact</td>
                            <td className="py-3 px-4 text-ss-accent">✅ Before execution</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]">
                            <td className="py-3 px-4 font-medium text-ss-text">Vendor restrictions</td>
                            <td className="py-3 px-4">❌ No</td>
                            <td className="py-3 px-4">❌ No</td>
                            <td className="py-3 px-4 text-ss-accent">✅ Allowlist/blocklist</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]">
                            <td className="py-3 px-4 font-medium text-ss-text">Human approval</td>
                            <td className="py-3 px-4">❌ No</td>
                            <td className="py-3 px-4">❌ No</td>
                            <td className="py-3 px-4 text-ss-accent">✅ Configurable thresholds</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]">
                            <td className="py-3 px-4 font-medium text-ss-text">Audit trail</td>
                            <td className="py-3 px-4">⚠️ Basic</td>
                            <td className="py-3 px-4">⚠️ Logs only</td>
                            <td className="py-3 px-4 text-ss-accent">✅ Complete decision trail</td>
                        </tr>
                        <tr>
                            <td className="py-3 px-4 font-medium text-ss-text">Segregated funds</td>
                            <td className="py-3 px-4">❌ No</td>
                            <td className="py-3 px-4">❌ N/A</td>
                            <td className="py-3 px-4 text-ss-accent">✅ Protected accounts</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]">
                <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">Ready to get started?</h3>
                <p className="text-ss-text-secondary text-sm mb-4">
                    Create your first protected account and make a test spend in under 15 minutes.
                </p>
                <Link
                    to="/docs/quickstart"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-medium rounded-lg transition-all duration-200"
                    data-testid="docs-quickstart-cta"
                >
                    Quickstart Guide
                    <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
};

export default DocsOverview;
