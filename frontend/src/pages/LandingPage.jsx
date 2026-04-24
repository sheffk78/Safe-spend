import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CodeBlock from '@/components/CodeBlock';
import PolicyCard from '@/components/PolicyCard';
import TransactionTable from '@/components/TransactionTable';
import { RevealOnScroll, staggerContainer, staggerItem, useCountUp } from '@/components/ScrollReveal';
import { ArrowRight, DollarSign, Bot, Clock, Shield, Code, Landmark, Layers } from 'lucide-react';

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

# result.status → "approved"
# result.remaining_balance → 45001`
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

    const frameworkTabs = [
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
            label: 'CrewAI',
            language: 'python',
            code: `from crewai import Agent, Task
from crewai_tools import tool
from safespend import SafeSpend

client = SafeSpend(api_key="sk_agent_...")

@tool("Safe-Spend")
def spend_money(amount: int, vendor: str, category: str) -> str:
    """Execute a spend request through Safe-Spend escrow."""
    result = client.spend.create(
        escrow_id="esc_9f3k2m",
        amount=amount,
        vendor=vendor,
        category=category
    )
    return f"Spend {result['status']}: \${amount/100:.2f} to {vendor}"`
        },
        {
            label: 'OpenAI SDK',
            language: 'python',
            code: `from openai import OpenAI
from openai.types.beta import FunctionTool
from safespend import SafeSpend

ss_client = SafeSpend(api_key="sk_agent_...")

@function_tool
def spend(amount: int, vendor: str, description: str) -> dict:
    """Request a disbursement from the escrow account."""
    return ss_client.spend.create(
        escrow_id="esc_9f3k2m",
        amount=amount,
        vendor=vendor,
        description=description
    )`
        },
        {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST https://api.safe-spend.io/v1/spend \\
  -H "Authorization: Bearer sk_agent_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: agent-run-001" \\
  -d '{
    "escrow_id": "esc_9f3k2m",
    "amount": 4999,
    "currency": "usd",
    "vendor": "Anthropic",
    "category": "ai_compute",
    "description": "Claude API credits"
  }'`
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

    // Problem card data with severity-based visual weight
    const problemCards = [
        {
            icon: DollarSign,
            title: '"$82,000 in 48 hours"',
            description: 'A stolen API key racked up $82K in Gemini charges in two days. API keys are financial attack surfaces. Your agent shouldn\'t hold your credentials.',
            source: 'Source: The Register, March 2026',
            severity: 'high'
        },
        {
            icon: Bot,
            title: '"$3,000 without asking"',
            description: 'An autonomous agent bought a premium domain and enrolled in a $3K program on its own. No spending limits. No approval flow. No one told it not to.',
            source: 'Source: X/Twitter, Feb 2026',
            severity: 'medium'
        },
        {
            icon: Clock,
            title: '"$187 in 10 minutes"',
            description: 'A GPT-4o loop retried a failed analysis over and over. Monitoring tools track costs after execution. They don\'t prevent overspend.',
            source: 'Source: AgentBudget creator, Feb 2026',
            severity: 'low'
        }
    ];

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'high': return 'border-[rgba(239,68,68,0.15)] hover:border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.03)]';
            case 'medium': return 'border-[rgba(245,158,11,0.15)] hover:border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.02)]';
            default: return 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] bg-ss-surface';
        }
    };

    const getSeverityIconColor = (severity) => {
        switch (severity) {
            case 'high': return 'text-ss-error';
            case 'medium': return 'text-ss-warning';
            default: return 'text-ss-accent';
        }
    };

    return (
        <div className="min-h-screen bg-ss-bg">
            <Navbar />
            
            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6" data-testid="hero-section">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="font-heading text-4xl md:text-5xl lg:text-[56px] font-bold text-ss-text leading-tight mb-6">
                            Your agent needs spending governance,<br className="hidden md:block" /> not a wallet.
                        </h1>
                        <p className="text-lg md:text-xl text-ss-text-secondary max-w-3xl mx-auto mb-8 leading-relaxed">
                            Policy-based spend control for AI agents. Fund a spending pool. Define guardrails. Your agent spends within them. Every dollar, every decision, every receipt — logged.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/signup"
                                className="px-8 py-3.5 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
                                data-testid="hero-cta-primary"
                            >
                                Get API Keys
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                to="/playground"
                                className="px-8 py-3.5 bg-transparent border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] text-ss-text font-semibold rounded-lg transition-all duration-200"
                                data-testid="hero-cta-playground"
                            >
                                Try the API Playground →
                            </Link>
                        </div>
                    </div>
                    <div className="max-w-3xl mx-auto">
                        <CodeBlock tabs={heroCodeTabs} />
                    </div>
                </div>
            </section>

            {/* The Problem Section */}
            <section className="py-24 px-6 bg-ss-code" data-testid="problem-section">
                <div className="max-w-[1200px] mx-auto">
                    <RevealOnScroll>
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text text-center mb-16">
                            Agents are spending money. Badly.
                        </h2>
                    </RevealOnScroll>
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {problemCards.map((card, index) => (
                            <motion.div
                                key={index}
                                variants={staggerItem}
                                className={`${getSeverityStyles(card.severity)} p-8 rounded-xl transition-all duration-200 hover:-translate-y-0.5`}
                                data-testid={`problem-card-${index + 1}`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-ss-surface flex items-center justify-center mb-4">
                                    <card.icon className={`w-5 h-5 ${getSeverityIconColor(card.severity)}`} />
                                </div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">
                                    {card.title}
                                </h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">
                                    {card.description}
                                </p>
                                <p className="text-ss-text-tertiary text-xs mt-4">
                                    {card.source}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-24 px-6" data-testid="how-it-works-section">
                <div className="max-w-[1200px] mx-auto">
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text text-center mb-4">
                        Three steps. Real guardrails.
                    </h2>
                    <p className="text-ss-text-secondary text-center mb-16 max-w-2xl mx-auto">
                        From funding to disbursement, every step is governed by policy-based controls.
                    </p>
                    
                    <div className="relative">
                        {/* Connecting line */}
                        <div className="hidden lg:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-ss-accent via-ss-accent to-ss-accent opacity-30" />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Step 1 */}
                            <div className="relative text-center" data-testid="how-it-works-step-1">
                                <div className="w-12 h-12 rounded-full bg-ss-accent text-ss-bg font-heading font-bold text-xl flex items-center justify-center mx-auto mb-6 relative z-10">
                                    1
                                </div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-3">
                                    Fund a Spending Pool
                                </h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">
                                    A human deposits USD via ACH or card. Funds are held in a segregated spending pool — not commingled, fully auditable.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative text-center" data-testid="how-it-works-step-2">
                                <div className="w-12 h-12 rounded-full bg-ss-accent text-ss-bg font-heading font-bold text-xl flex items-center justify-center mx-auto mb-6 relative z-10">
                                    2
                                </div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-3">
                                    Define Spending Policies
                                </h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">
                                    Set per-transaction limits, daily/weekly/monthly caps, vendor allowlists, category restrictions, and approval cascades. Your agent drafts policies — you review and approve.
                                </p>
                                <div className="mt-4 p-3 bg-ss-accent/10 rounded-lg border border-ss-accent/20">
                                    <p className="text-xs text-ss-accent">
                                        <strong>80/20 Setup:</strong> Let your agent draft policies—you just review and approve.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative text-center" data-testid="how-it-works-step-3">
                                <div className="w-12 h-12 rounded-full bg-ss-accent text-ss-bg font-heading font-bold text-xl flex items-center justify-center mx-auto mb-6 relative z-10">
                                    3
                                </div>
                                <h3 className="font-heading text-xl font-semibold text-ss-text mb-3">
                                    Agent Requests Disbursement
                                </h3>
                                <p className="text-ss-text-secondary text-sm leading-relaxed">
                                    Your agent calls the API. Safe-Spend evaluates every policy in a 14-step validation cascade, executes if approved, and logs the complete decision trail.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Policy Engine */}
            <section id="features" className="py-24 px-6 bg-ss-code" data-testid="features-section">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">
                            Governance-grade controls
                        </h2>
                        <p className="text-ss-text-secondary max-w-3xl mx-auto">
                            Every policy maps to a real spending constraint. This isn't a wallet with limits — it's a funded account with programmatic guardrails.
                        </p>
                    </div>
                    
                    <div className="max-w-xl mx-auto">
                        <PolicyCard />
                    </div>
                </div>
            </section>

            {/* Audit Trail Section */}
            <section className="py-24 px-6" data-testid="audit-section">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">
                            Every dollar. Every decision. Every receipt.
                        </h2>
                        <p className="text-ss-text-secondary max-w-2xl mx-auto">
                            Complete audit trail for every spend request — whether approved, denied, or pending human review.
                        </p>
                    </div>
                    
                    <div className="max-w-5xl mx-auto">
                        <TransactionTable />
                    </div>
                </div>
            </section>

            {/* Framework Integration Section */}
            <section className="py-24 px-6 bg-ss-code" data-testid="integration-section">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">
                            Five minutes to integrate. Any framework.
                        </h2>
                        <p className="text-ss-text-secondary max-w-2xl mx-auto">
                            Drop in a decorator, add a tool, or call the REST API directly. Works with every major agent framework.
                        </p>
                    </div>
                    
                    <div className="max-w-4xl mx-auto mb-16">
                        <CodeBlock tabs={frameworkTabs} />
                    </div>

                    {/* Feature cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="feature-card-fiat">
                            <Landmark className="w-8 h-8 text-ss-accent mb-4" />
                            <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">Fiat-First</h3>
                            <p className="text-ss-text-secondary text-sm">
                                Real USD on real payment rails. ACH deposits, Stripe-powered spending. No crypto required.
                            </p>
                        </div>

                        <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="feature-card-api">
                            <Code className="w-8 h-8 text-ss-accent mb-4" />
                            <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">Headless API</h3>
                            <p className="text-ss-text-secondary text-sm">
                                Pure REST API with webhooks. Your agent never touches payment credentials.
                            </p>
                        </div>

                        <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="feature-card-governance">
                            <Shield className="w-8 h-8 text-ss-accent mb-4" />
                            <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">Governance-Grade Controls</h3>
                            <p className="text-ss-text-secondary text-sm">
                                Segregated spending pools, policy engine, 14-step validation cascade, immutable audit trail.
                            </p>
                        </div>

                        <div className="bg-ss-surface p-6 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="feature-card-suite">
                            <Layers className="w-8 h-8 text-ss-accent mb-4" />
                            <h3 className="font-heading text-lg font-semibold text-ss-text mb-2">Part of Agentic Trust</h3>
                            <p className="text-ss-text-secondary text-sm">
                                Configurable agent authorization with certificate-based verification coming soon.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6" data-testid="pricing-section">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">
                            Simple pricing. No surprises.
                        </h2>
                        <p className="text-ss-text-secondary max-w-xl mx-auto">
                            All plans include agent-ready setup—let your AI draft policies while you review and approve.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {/* Sandbox */}
                        <div className="bg-ss-surface p-8 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="pricing-card-sandbox">
                            <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Sandbox</h3>
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-ss-text">Free</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Test mode with fake money
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Full API access + all framework SDKs
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Unlimited test transactions
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Community support
                                </li>
                            </ul>
                            <Link
                                to="/signup"
                                className="block w-full text-center px-6 py-3 bg-transparent border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] text-ss-text font-medium rounded-lg transition-all duration-200"
                                data-testid="pricing-cta-sandbox"
                            >
                                Start Building
                            </Link>
                        </div>

                        {/* Builder */}
                        {/* Builder — visually distinct */}
                        <div className="bg-ss-surface p-8 rounded-xl border-2 border-ss-accent relative bg-[rgba(20,184,166,0.02)]" data-testid="pricing-card-builder">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-ss-accent text-ss-bg text-xs font-semibold rounded-full">
                                Most Popular
                            </div>
                            <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Builder</h3>
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-ss-text">$29</span>
                                <span className="text-ss-text-secondary">/mo + 0.5%</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Live spending pools
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Up to $5,000/mo in spend volume
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Real-time webhooks
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Email support
                                </li>
                            </ul>
                            <Link
                                to="/signup"
                                className="block w-full text-center px-6 py-3 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-medium rounded-lg transition-all duration-200"
                                data-testid="pricing-cta-builder"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Scale */}
                        <div className="bg-ss-surface p-8 rounded-xl border border-[rgba(255,255,255,0.06)]" data-testid="pricing-card-scale">
                            <h3 className="font-heading text-xl font-semibold text-ss-text mb-2">Scale</h3>
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-ss-text">$149</span>
                                <span className="text-ss-text-secondary">/mo + 0.3%</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Unlimited spend volume
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Multiple spending pools per org
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Priority support + SLA guarantee
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Custom approval workflows
                                </li>
                                <li className="flex items-start gap-2 text-sm text-ss-text-secondary">
                                    <svg className="w-5 h-5 text-ss-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Multi-tenant / white-label options
                                </li>
                            </ul>
                            <Link
                                to="/contact"
                                className="block w-full text-center px-6 py-3 bg-transparent border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] text-ss-text font-medium rounded-lg transition-all duration-200"
                                data-testid="pricing-cta-scale"
                            >
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 bg-ss-code" data-testid="cta-section">
                <div className="max-w-[1200px] mx-auto text-center">
                    <h2 className="font-heading text-3xl md:text-4xl font-bold text-ss-text mb-4">
                        Wallets hold money. Governance controls it.
                    </h2>
                    <p className="text-ss-text-secondary text-lg mb-8 max-w-2xl mx-auto">
                        Give your agent policy-based spending authority in five minutes.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-ss-accent hover:bg-ss-accent-hover text-ss-bg font-semibold rounded-lg transition-all duration-200"
                        data-testid="final-cta"
                    >
                        Get Your API Keys
                        <ArrowRight size={18} />
                    </Link>
                    <p className="text-ss-text-tertiary text-sm mt-8">
                        Part of the{' '}
                        <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-accent hover:text-ss-accent-hover transition-colors">
                            Agentic Trust
                        </a>{' '}
                        suite ·{' '}
                        <a href="https://agentauthority.dev" target="_blank" rel="noopener noreferrer" className="text-ss-text-secondary hover:text-ss-text transition-colors">
                            Agent Authority Vault
                        </a>
                    </p>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LandingPage;

// Build: 1777010581
