import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SeoHelmet from '@/components/SeoHelmet';
import { homepageStructuredData } from '@/lib/structuredData';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-ss-bg">
            <SeoHelmet
                title="Safe-Spend — Fiduciary Rails for AI Agents"
                description="Connect AI agents to card rails with fiduciary guardrails. Spending limits, policy enforcement, and audit trails — so agents spend like they have a trustee watching."
                structuredData={homepageStructuredData}
            />
            <Navbar />

            {/* Hero — Clean, direct, no decorations */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <p className="text-ss-accent font-semibold text-sm tracking-wide uppercase mb-4">
                        Fiduciary spending controls for AI
                    </p>
                    <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-ss-text leading-[1.1] mb-6">
                        Agents spend money.<br />
                        Someone should be watching.
                    </h1>
                    <p className="text-lg md:text-xl text-ss-text-secondary leading-relaxed mb-10 max-w-2xl">
                        Safe-Spend connects AI agents to card rails with fiduciary guardrails — spending limits, policy enforcement, and a full audit trail. So your agents can move fast without leaving you exposed.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            to="/signup"
                            className="px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-white font-semibold rounded-lg transition-colors text-center"
                        >
                            Start free
                        </Link>
                        <a
                            href="#how-it-works"
                            className="px-6 py-3 bg-white border border-ss-text-tertiary/30 hover:border-ss-text-secondary text-ss-text font-semibold rounded-lg transition-colors text-center"
                        >
                            See how it works
                        </a>
                    </div>
                </div>
            </section>

            {/* The Problem — Direct, no cards */}
            <section className="py-20 px-6 bg-ss-surface border-y border-ss-text-tertiary/15">
                <div className="max-w-3xl mx-auto">
                    <p className="text-ss-accent font-semibold text-sm tracking-wide uppercase mb-4">
                        The problem
                    </p>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-8">
                        AI agents can now spend your money. What could go wrong?
                    </h2>

                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-ss-error/10 flex items-center justify-center mt-1">
                                <span className="text-ss-error font-bold text-sm">1</span>
                            </div>
                            <div>
                                <h3 className="font-heading text-lg font-semibold text-ss-text mb-1">Uncontrolled spending</h3>
                                <p className="text-ss-text-secondary leading-relaxed">
                                    Agents with API access to payment systems can spend without limits. A misconfigured agent, a prompt injection, or a logic error can drain an account in minutes.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-ss-warning/10 flex items-center justify-center mt-1">
                                <span className="text-ss-warning font-bold text-sm">2</span>
                            </div>
                            <div>
                                <h3 className="font-heading text-lg font-semibold text-ss-text mb-1">No audit trail</h3>
                                <p className="text-ss-text-secondary leading-relaxed">
                                    When an agent spends, who approved it? What policy governed it? Without fiduciary documentation, you can't answer your accountant, your board, or your regulator.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-ss-accent/10 flex items-center justify-center mt-1">
                                <span className="text-ss-accent font-bold text-sm">3</span>
                            </div>
                            <div>
                                <h3 className="font-heading text-lg font-semibold text-ss-text mb-1">Card rails ≠ fiduciary rails</h3>
                                <p className="text-ss-text-secondary leading-relaxed">
                                    Virtual cards and spend limits are a start. But they don't enforce <em>policy</em>, they don't document <em>intent</em>, and they don't create the paper trail a trustee actually needs. That's the gap Safe-Spend fills.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works — Steps, no decorative lines */}
            <section id="how-it-works" className="py-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <p className="text-ss-accent font-semibold text-sm tracking-wide uppercase mb-4">
                        How it works
                    </p>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-12">
                        Three steps. Full control.
                    </h2>

                    <div className="space-y-12">
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-ss-accent text-white font-heading font-bold text-xl flex items-center justify-center">
                                1
                            </div>
                            <div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Set policy</h3>
                                <p className="text-ss-text-secondary leading-relaxed">
                                    Define spending limits, vendor allowlists, category rules, and approval thresholds. Your fiduciary policy — not a credit limit — governs every transaction.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-ss-accent text-white font-heading font-bold text-xl flex items-center justify-center">
                                2
                            </div>
                            <div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Agent requests spend</h3>
                                <p className="text-ss-text-secondary leading-relaxed">
                                    Your AI agent calls the Safe-Spend API before every purchase. The request is checked against your policy in real time — approved, flagged for human review, or denied.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-ss-accent text-white font-heading font-bold text-xl flex items-center justify-center">
                                3
                            </div>
                            <div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Full audit trail</h3>
                                <p className="text-ss-text-secondary leading-relaxed">
                                    Every transaction — approved, denied, or escalated — is logged with the policy that governed it, the agent that initiated it, and the timestamp. The paper trail a trustee needs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Code Example — Clean, no tab decoration */}
            <section className="py-20 px-6 bg-ss-surface border-y border-ss-text-tertiary/15">
                <div className="max-w-3xl mx-auto">
                    <p className="text-ss-accent font-semibold text-sm tracking-wide uppercase mb-4">
                        For developers
                    </p>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-6">
                        One API call. Full control.
                    </h2>
                    <p className="text-ss-text-secondary leading-relaxed mb-8">
                        Add fiduciary spending controls to any agent with a single function call. Works with LangChain, CrewAI, AutoGPT, and any framework that supports tool use.
                    </p>

                    <div className="bg-ss-code rounded-lg p-6 overflow-x-auto">
                        <pre className="text-sm leading-relaxed">
                            <code className="text-green-400">
{`from safespend import SafeSpendClient

client = SafeSpendClient(api_key="sk_live_...")

# Agent requests a spend
result = client.spend.create(
    escrow_id="esc_9f3k2m",
    amount=4999,  # $49.99 in cents
    currency="usd",
    vendor="Anthropic",
    category="ai_compute",
    description="Claude API credits top-up",
    idempotency_key="agent-run-20260321-001"
)

# result.status → "approved"
# result.remaining_balance → 45001`}
                            </code>
                        </pre>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-4">
                        <Link
                            to="/docs/quickstart"
                            className="px-5 py-2.5 bg-ss-accent hover:bg-ss-accent-hover text-white font-semibold rounded-lg transition-colors text-center text-sm"
                        >
                            Read the quickstart
                        </Link>
                        <a
                            href="/docs/api-reference"
                            className="px-5 py-2.5 border border-ss-text-tertiary/30 hover:border-ss-text-secondary text-ss-text font-semibold rounded-lg transition-colors text-center text-sm"
                        >
                            API reference
                        </a>
                    </div>
                </div>
            </section>

            {/* Features — Simple list, no card grid */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <p className="text-ss-accent font-semibold text-sm tracking-wide uppercase mb-4">
                        What you get
                    </p>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-12">
                        Fiduciary controls, not just spend limits.
                    </h2>

                    <div className="space-y-8">
                        {[
                            {
                                title: 'Spending policies',
                                desc: 'Per-agent limits, vendor allowlists, category restrictions, and approval thresholds. Your rules, enforced in real time.'
                            },
                            {
                                title: 'Escrow accounts',
                                desc: 'Pre-funded accounts with balance tracking. Agents can only spend what\'s allocated. No overdraft, no surprises.'
                            },
                            {
                                title: 'Approval workflows',
                                desc: 'Transactions above your threshold get held for human review. No auto-approval on large spends unless you want it.'
                            },
                            {
                                title: 'Full audit trail',
                                desc: 'Every transaction logged with policy, agent, intent, and timestamp. The documentation a trustee or auditor expects.'
                            },
                            {
                                title: 'Webhooks & integrations',
                                desc: 'Real-time notifications for approvals, denials, and escalations. Integrate with Slack, PagerDuty, or any system.'
                            },
                            {
                                title: 'SDK support',
                                desc: 'Python SDK today, TypeScript coming soon. Works with LangChain, CrewAI, AutoGPT, and any agent framework.'
                            },
                        ].map((feature, i) => (
                            <div key={i} className="pb-8 border-b border-ss-text-tertiary/15 last:border-0 last:pb-0">
                                <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">{feature.title}</h3>
                                <p className="text-ss-text-secondary leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Proof / Trust */}
            <section className="py-20 px-6 bg-ss-surface border-y border-ss-text-tertiary/15">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-ss-accent font-semibold text-sm tracking-wide uppercase mb-4">
                        Built for trust
                    </p>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-6">
                        Card rails are for spending.<br />Fiduciary rails are for trust.
                    </h2>
                    <p className="text-ss-text-secondary leading-relaxed max-w-2xl mx-auto mb-10">
                        Virtual cards and spend limits are necessary but not sufficient. When an agent spends money on your behalf, you need more than a transaction log — you need the documentation that proves the spend was authorized, policy-compliant, and properly overseen. That's what fiduciary rails provide.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <p className="font-heading text-3xl font-bold text-ss-text mb-1">&lt;100ms</p>
                            <p className="text-ss-text-tertiary text-sm">Policy check latency</p>
                        </div>
                        <div>
                            <p className="font-heading text-3xl font-bold text-ss-text mb-1">Every txn</p>
                            <p className="text-ss-text-tertiary text-sm">Logged & auditable</p>
                        </div>
                        <div>
                            <p className="font-heading text-3xl font-bold text-ss-text mb-1">7-year</p>
                            <p className="text-ss-text-tertiary text-sm">Audit retention</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA — Clean, no decorations */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-6">
                        Stop hoping your agents won't overspend.
                    </h2>
                    <p className="text-ss-text-secondary leading-relaxed max-w-2xl mx-auto mb-10">
                        Start for free. Add fiduciary guardrails to your agents in under 10 minutes. No credit card required.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup"
                            className="px-8 py-3.5 bg-ss-accent hover:bg-ss-accent-hover text-white font-semibold rounded-lg transition-colors text-center"
                        >
                            Start free
                        </Link>
                        <Link
                            to="/docs/quickstart"
                            className="px-8 py-3.5 bg-white border border-ss-text-tertiary/30 hover:border-ss-text-secondary text-ss-text font-semibold rounded-lg transition-colors text-center"
                        >
                            Read the docs
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LandingPage;