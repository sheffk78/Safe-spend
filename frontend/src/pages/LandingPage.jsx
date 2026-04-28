import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CodeBlock from '@/components/CodeBlock';
import PolicyCard from '@/components/PolicyCard';
import HeroAnimation from '@/components/HeroAnimation';
import { RevealOnScroll, staggerContainer, staggerItem, useCountUp } from '@/components/ScrollReveal';
import { ArrowRight, Shield, Code, Clock, Landmark, Layers, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import SeoHelmet from '@/components/SeoHelmet';

const homepageStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Safe-Spend",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Web",
  "description": "Policy-based spending controls for AI agents. Fund a spending pool, define guardrails, your agent spends within them.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
};

const ParallaxSection = ({ children, className = '', speed = 0.1 }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], [0, speed * -100]);
    return (
        <motion.section ref={ref} style={{ y }} className={className}>
            {children}
        </motion.section>
    );
};

const AnimatedStat = ({ value, prefix = '', suffix = '', label, delay = 0 }) => {
    const [count, ref] = useCountUp(value, 2000);
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
            className="text-center"
        >
            <div className="font-heading text-4xl md:text-5xl font-bold text-ss-accent counter-glow mb-2">
                {prefix}{count.toLocaleString()}{suffix}
            </div>
            <div className="text-ss-text-secondary text-sm">{label}</div>
        </motion.div>
    );
};

const LandingPage = () => {
    const heroCodeTabs = [
        {
            label: 'Python',
            language: 'python',
            code: `from safespend import SafeSpend

client = SafeSpend(api_key="sk_live_...")

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

# result.status -> "approved"
# result.remaining_balance -> 45001`
        },
        {
            label: 'TypeScript',
            language: 'typescript',
            code: `// Coming soon
import { SafeSpend } from '@safespend/sdk';

const client = new SafeSpend({ apiKey: 'sk_live_...' });`
        },
        {
            label: 'cURL',
            language: 'bash',
            code: `# Coming soon
curl -X POST https://api.safe-spend.io/v1/spend \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json"`
        }
    ];

    const integrationTabs = [
        {
            label: 'LangChain',
            language: 'python',
            code: `from langchain.tools import tool
from safespend import SafeSpend

client = SafeSpend(api_key="sk_agent_...")

@tool
def safe_spend(amount: int, vendor: str, description: str) -> dict:
    """Spend money from the escrow account with policy enforcement."""
    return client.spend.create(
        escrow_id="esc_9f3k2m",
        amount=amount,
        vendor=vendor,
        description=description
    )`
        },
        {
            label: 'MCP',
            language: 'json',
            code: `{
  "mcpServers": {
    "safe-spend": {
      "command": "npx",
      "args": ["-y", "@safespend/mcp-server"],
      "env": {
        "SAFESPEND_API_KEY": "sk_agent_...",
        "SAFESPEND_ESCROW_ID": "esc_9f3k2m"
      }
    }
  }
}`
        }
    ];

    const problems = [
        {
            amount: 82000, prefix: '$', suffix: '', displayAmount: '$82,000',
            title: 'in 48 hours',
            description: 'A stolen API key racked up $82K in Gemini charges in two days. API keys are financial attack surfaces. Your agent shouldn\'t hold your credentials.',
            source: 'The Register, March 2026', severity: 'high'
        },
        {
            amount: 3000, prefix: '$', suffix: '', displayAmount: '$3,000',
            title: 'without asking',
            description: 'An autonomous agent bought a premium domain and enrolled in a $3K program on its own. No spending limits. No approval flow. No one told it not to.',
            source: 'X/Twitter, Feb 2026', severity: 'medium'
        },
        {
            amount: 187, prefix: '$', suffix: '', displayAmount: '$187',
            title: 'in 10 minutes',
            description: 'A GPT-4o loop retried a failed analysis over and over. Monitoring tools track costs after execution. They don\'t prevent overspend.',
            source: 'AgentBudget creator, Feb 2026', severity: 'low'
        }
    ];

    const features = [
        { icon: Landmark, title: 'Fiat-First', description: 'Real USD on real payment rails. ACH deposits, Stripe-powered spending. No crypto required.' },
        { icon: Code, title: 'Headless API', description: 'Pure REST API with webhooks. Your agent never touches payment credentials.' },
        { icon: Shield, title: 'Governance-Grade', description: 'Segregated pools, policy engine, 14-step validation cascade, immutable audit trail.' },
        { icon: Layers, title: 'Part of Agentic Trust', description: 'Configurable agent authorization with certificate-based verification coming soon.' }
    ];

    return (
        <div className="min-h-screen bg-ss-bg page-enter">
            <SeoHelmet
                title="Safe-Spend — Fiduciary Rails for AI Agents"
                description="Connect AI agents to card rails with fiduciary guardrails. Spending limits, policy enforcement, and audit trails — so agents spend like they have a trustee watching."
                structuredData={homepageStructuredData}
            />
            <Navbar />

            {/* ═══ HERO ═══ */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden" data-testid="hero-section">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-ss-accent/8 via-ss-accent/4 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none"
                />
                <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-ss-accent/6 via-ss-accent/3 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none"
                />

                <div className="max-w-[1200px] mx-auto relative">
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-ss-accent/10 border border-ss-accent/20 rounded-full mb-8"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-ss-accent" />
                            <span className="text-ss-accent text-sm font-medium">Now in public beta</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="font-heading text-4xl md:text-5xl lg:text-[60px] font-bold text-ss-text leading-tight mb-6"
                        >
                            Your agent needs spending governance,<br className="hidden md:block" /> not a wallet.
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                            className="text-lg md:text-xl text-ss-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed"
                        >
                            Policy-based spend control for AI agents. Fund a spending pool. Define guardrails. Your agent spends within them. Every dollar, every decision, every receipt — logged.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <Link to="/signup" className="px-8 py-4 bg-ss-accent hover:bg-ss-accent-hover text-white font-semibold rounded-xl magnetic-btn shadow-ss-accent-lg flex items-center gap-2 text-lg" data-testid="hero-cta-primary">
                                Get API Keys <ArrowRight size={20} />
                            </Link>
                            <Link to="/playground" className="px-8 py-4 bg-white/80 backdrop-blur border border-gray-200 hover:border-ss-accent/30 hover:bg-ss-accent/5 text-ss-text font-semibold rounded-xl transition-all duration-300 shadow-ss" data-testid="hero-cta-playground">
                                Try the API Playground →
                            </Link>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                        className="mb-16"
                    >
                        <HeroAnimation />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.2 }}
                        className="flex items-center justify-center gap-8 text-ss-text-tertiary text-sm"
                    >
                        <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-ss-accent/60" /> SOC 2 Compliant</span>
                        <span className="flex items-center gap-2"><Code className="w-4 h-4 text-ss-accent/60" /> Open API</span>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-ss-accent/60" /> &lt;5min Setup</span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}
                        className="max-w-3xl mx-auto mt-16"
                    >
                        <CodeBlock tabs={heroCodeTabs} />
                    </motion.div>
                </div>
            </section>

            {/* ═══ STATS BAR ═══ */}
            <section className="py-16 px-6 bg-white border-y border-gray-100">
                <div className="max-w-[1000px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                    <AnimatedStat value={14} suffix="-step" label="Validation Cascade" />
                    <AnimatedStat value={5} prefix="<" suffix=" min" label="Setup Time" />
                    <AnimatedStat value={100} suffix="%" label="Audit Trail Coverage" />
                    <AnimatedStat value={0} prefix="$" suffix="" label="Crypto Required" />
                </div>
            </section>

            {/* ═══ THE PROBLEM ═══ */}
            <ParallaxSection speed={0.05} className="py-24 px-6 bg-ss-elevated" data-testid="problem-section">
                <div className="max-w-[1200px] mx-auto">
                    <RevealOnScroll>
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text text-center mb-4">
                            Agents are spending money. Badly.
                        </h2>
                        <p className="text-ss-text-secondary text-center mb-16 max-w-2xl mx-auto">
                            Real incidents. Real money lost. Every one preventable with the right controls.
                        </p>
                    </RevealOnScroll>

                    <div className="max-w-4xl mx-auto space-y-5">
                        {problems.map((problem, index) => (
                            <ProblemRow key={index} problem={problem} index={index} />
                        ))}
                    </div>
                </div>
            </ParallaxSection>

            {/* ═══ HOW IT WORKS ═══ */}
            <section id="how-it-works" className="py-24 px-6" data-testid="how-it-works-section">
                <div className="max-w-[1200px] mx-auto">
                    <RevealOnScroll>
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text text-center mb-4">
                            Three steps. Real guardrails.
                        </h2>
                        <p className="text-ss-text-secondary text-center mb-16 max-w-2xl mx-auto">
                            From funding to disbursement, every step is governed by policy-based controls.
                        </p>
                    </RevealOnScroll>

                    <div className="relative mb-20">

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            <motion.div variants={staggerItem} className="relative text-center" data-testid="how-it-works-step-1">
                                <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ss-accent to-ss-accent-hover text-white font-heading font-bold text-xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-ss-accent-lg">1</motion.div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-3">Fund a Spending Pool</h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">A human deposits USD via ACH or card. Funds are held in a segregated spending pool — not commingled, fully auditable.</p>
                            </motion.div>

                            <motion.div variants={staggerItem} className="relative text-center" data-testid="how-it-works-step-2">
                                <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ss-accent to-ss-accent-hover text-white font-heading font-bold text-xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-ss-accent-lg">2</motion.div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-3">Define Spending Policies</h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">Set per-transaction limits, daily/weekly/monthly caps, vendor allowlists, category restrictions, and approval cascades. Your agent drafts policies — you review and approve.</p>
                                <div className="mt-4 p-3 bg-ss-accent/5 rounded-xl border border-ss-accent/15">
                                    <p className="text-xs text-ss-accent-hover font-medium"><strong>80/20 Setup:</strong> Let your agent draft policies — you just review and approve.</p>
                                </div>
                            </motion.div>

                            <motion.div variants={staggerItem} className="relative text-center" data-testid="how-it-works-step-3">
                                <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }} className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ss-accent to-ss-accent-hover text-white font-heading font-bold text-xl flex items-center justify-center mx-auto mb-6 relative z-10 shadow-ss-accent-lg">3</motion.div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-3">Agent Requests Disbursement</h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">Your agent calls the API. Safe-Spend evaluates every policy in a 14-step validation cascade, executes if approved, and logs the complete decision trail.</p>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Policy Preview */}
                    <RevealOnScroll>
                        <div className="text-center mb-8">
                            <p className="text-ss-text-tertiary text-sm uppercase tracking-widest font-mono mb-2">Live Policy Preview</p>
                            <h3 className="font-heading text-2xl font-bold text-ss-text">This is what governance looks like.</h3>
                        </div>
                    </RevealOnScroll>

                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.98 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="max-w-xl mx-auto"
                    >
                        <div className="relative">
                            <div className="absolute -inset-2 bg-gradient-to-r from-ss-accent/15 via-ss-accent/8 to-ss-accent/15 rounded-2xl blur-md opacity-50" />
                            <PolicyCard />
                        </div>
                    </motion.div>

                    {/* Feature grid */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
                    >
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                variants={staggerItem}
                                whileHover={{ y: -4, scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white p-6 rounded-xl border border-gray-100 card-hover shadow-ss glass-card"
                            >
                                <motion.div whileHover={{ scale: 1.15, rotate: 5 }} transition={{ duration: 0.2 }} className="w-10 h-10 bg-ss-accent/10 rounded-lg flex items-center justify-center mb-3">
                                    <feature.icon className="w-5 h-5 text-ss-accent" />
                                </motion.div>
                                <h4 className="font-heading text-base font-semibold text-ss-text mb-2">{feature.title}</h4>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══ INTEGRATIONS ═══ */}
            <ParallaxSection speed={0.03} className="py-24 px-6 bg-ss-elevated" data-testid="integration-section">
                <div className="max-w-[1200px] mx-auto">
                    <RevealOnScroll>
                        <div className="text-center mb-16">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">Five minutes to integrate.</h2>
                            <p className="text-ss-text-secondary max-w-2xl mx-auto">Drop in a decorator or add an MCP server. Works with every major agent framework.</p>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll>
                        <div className="max-w-3xl mx-auto mb-10">
                            <CodeBlock tabs={integrationTabs} />
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll delay={0.1}>
                        <div className="text-center">
                            <p className="text-ss-text-tertiary text-sm">
                                Also works with <span className="text-ss-text-secondary font-medium">CrewAI</span>, <span className="text-ss-text-secondary font-medium">OpenAI SDK</span>, and <span className="text-ss-text-secondary font-medium">REST API</span> —{' '}
                                <Link to="/docs/integrations" className="text-ss-accent hover:text-ss-accent-hover transition-colors">see all integrations →</Link>
                            </p>
                        </div>
                    </RevealOnScroll>
                </div>
            </ParallaxSection>

            {/* ═══ PRICING ═══ */}
            <section id="pricing" className="py-24 px-6" data-testid="pricing-section">
                <div className="max-w-[1200px] mx-auto">
                    <RevealOnScroll>
                        <div className="text-center mb-16">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">Simple pricing. No surprises.</h2>
                            <p className="text-ss-text-secondary max-w-xl mx-auto">All plans include agent-ready setup — let your AI draft policies while you review and approve.</p>
                        </div>
                    </RevealOnScroll>

                    <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {/* Sandbox */}
                        <motion.div variants={staggerItem} whileHover={{ y: -6 }} transition={{ duration: 0.25 }} className="bg-white p-8 rounded-2xl border border-gray-100 card-hover shadow-ss" data-testid="pricing-card-sandbox">
                            <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Sandbox</h3>
                            <div className="mb-6"><span className="text-3xl font-bold text-ss-text">Free</span></div>
                            <ul className="space-y-3 mb-8">
                                {['Test mode with fake money', 'Full API access + all framework SDKs', 'Unlimited test transactions', 'Community support'].map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                        <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="block w-full text-center px-6 py-3 bg-white border border-gray-200 hover:border-ss-accent/30 hover:bg-ss-accent/5 text-ss-text font-medium rounded-xl transition-all duration-300" data-testid="pricing-cta-sandbox">Start Building</Link>
                        </motion.div>

                        {/* Builder — highlighted */}
                        <motion.div variants={staggerItem} whileHover={{ y: -6 }} transition={{ duration: 0.25 }} className="bg-white p-8 rounded-2xl border-2 border-ss-accent relative shadow-ss-accent-lg" data-testid="pricing-card-builder">
                            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-ss-accent to-ss-accent-hover text-white text-xs font-semibold rounded-full shadow-ss-accent">Most Popular</motion.div>
                            <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Builder</h3>
                            <div className="mb-6"><span className="text-3xl font-bold text-ss-text">$29</span><span className="text-ss-text-secondary">/mo + 0.5%</span></div>
                            <ul className="space-y-3 mb-8">
                                {['Live spending pools', 'Up to $5,000/mo in spend volume', 'Real-time webhooks', 'Email support'].map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                        <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="block w-full text-center px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-white font-medium rounded-xl magnetic-btn shadow-ss-accent transition-all duration-300" data-testid="pricing-cta-builder">Get Started</Link>
                        </motion.div>

                        {/* Scale */}
                        <motion.div variants={staggerItem} whileHover={{ y: -6 }} transition={{ duration: 0.25 }} className="bg-white p-8 rounded-2xl border border-gray-100 card-hover shadow-ss" data-testid="pricing-card-scale">
                            <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Scale</h3>
                            <div className="mb-6"><span className="text-3xl font-bold text-ss-text">$149</span><span className="text-ss-text-secondary">/mo + 0.3%</span></div>
                            <ul className="space-y-3 mb-8">
                                {['Unlimited spend volume', 'Multiple spending pools per org', 'Priority support + SLA guarantee', 'Custom approval workflows', 'SSO + audit export'].map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                        <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="block w-full text-center px-6 py-3 bg-white border border-gray-200 hover:border-ss-accent/30 hover:bg-ss-accent/5 text-ss-text font-medium rounded-xl transition-all duration-300" data-testid="pricing-cta-scale">Contact Sales</Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══ FINAL CTA ═══ */}
            <section className="py-24 px-6 relative overflow-hidden" data-testid="final-cta-section">
                <motion.div
                    animate={{
                        background: [
                            'radial-gradient(ellipse at 30% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)',
                            'radial-gradient(ellipse at 70% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
                            'radial-gradient(ellipse at 30% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)',
                        ]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 pointer-events-none"
                />

                <div className="max-w-[1200px] mx-auto relative">
                    <RevealOnScroll>
                        <div className="text-center max-w-3xl mx-auto bg-white/80 backdrop-blur-xl p-12 rounded-2xl border border-gray-100 shadow-ss-lg glass-card">
                            <motion.div
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                                className="w-16 h-16 bg-ss-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6"
                            >
                                <Shield className="w-8 h-8 text-ss-accent" />
                            </motion.div>
                            <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-6">
                                Start governing your agent's spending today.
                            </h2>
                            <p className="text-ss-text-secondary text-lg mb-10 leading-relaxed">
                                Free sandbox. Full API. No credit card required. Your first policy is running in under five minutes.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link to="/signup" className="px-8 py-4 bg-ss-accent hover:bg-ss-accent-hover text-white font-semibold rounded-xl magnetic-btn shadow-ss-accent-lg flex items-center gap-2 text-lg" data-testid="final-cta-primary">
                                    Get API Keys <ArrowRight size={20} />
                                </Link>
                                <Link to="/playground" className="px-8 py-4 bg-white/80 backdrop-blur border border-gray-200 hover:border-ss-accent/30 hover:bg-ss-accent/5 text-ss-text font-semibold rounded-xl transition-all duration-300" data-testid="final-cta-playground">
                                    Try the API Playground →
                                </Link>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            <Footer />
        </div>
    );
};

/* ─── ProblemRow ─── */
const ProblemRow = ({ problem, index }) => {
    const [count, ref] = useCountUp(problem.amount, 2000);
    const formattedCount = problem.prefix + count.toLocaleString() + problem.suffix;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.15 }}
            whileHover={{ x: 4, scale: 1.01 }}
            className={`${getSeverityBg(problem.severity)} rounded-xl border-l-4 ${getSeverityBorder(problem.severity)} p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 card-hover shadow-ss`}
            data-testid={`problem-row-${index + 1}`}
        >
            <div className="md:min-w-[200px] flex-shrink-0">
                <span className={`font-heading text-4xl md:text-5xl lg:text-6xl font-bold ${getSeverityColor(problem.severity)} counter-glow`}>
                    {formattedCount}
                </span>
                <span className="font-heading text-xl md:text-2xl font-semibold text-ss-text-secondary ml-2">
                    {problem.title}
                </span>
            </div>
            <div className="flex-1">
                <p className="text-ss-text-secondary text-sm md:text-base leading-relaxed">{problem.description}</p>
                <p className="text-ss-text-tertiary text-xs mt-3 italic">Source: {problem.source}</p>
            </div>
        </motion.div>
    );
};

const getSeverityColor = (severity) => {
    switch (severity) {
        case 'high': return 'text-ss-error';
        case 'medium': return 'text-ss-warning';
        default: return 'text-ss-text-secondary';
    }
};

const getSeverityBg = (severity) => {
    switch (severity) {
        case 'high': return 'bg-[rgba(220,38,38,0.04)]';
        case 'medium': return 'bg-[rgba(217,119,6,0.04)]';
        default: return 'bg-white';
    }
};

const getSeverityBorder = (severity) => {
    switch (severity) {
        case 'high': return 'border-l-ss-error';
        case 'medium': return 'border-l-ss-warning';
        default: return 'border-l-gray-300';
    }
};

export default LandingPage;