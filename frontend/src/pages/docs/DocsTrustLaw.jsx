import React from 'react';
import { Link } from 'react-router-dom';
import { DocsHeading, DocsText, Callout, InlineCode } from '@/components/docs/DocsComponents';
import { 
    Scale, 
    Shield, 
    Users, 
    DollarSign, 
    AlertTriangle, 
    FileText, 
    Building2,
    Beaker,
    Target,
    ArrowRight,
    Megaphone,
    ShoppingCart,
    FlaskConical,
    Bot
} from 'lucide-react';

// Table of Contents Component
const TableOfContents = () => {
    const sections = [
        { id: 'why-trust-law', label: '1. Why Trust Law for AI Agents?' },
        { id: 'concept-mapping', label: '2. Core Concept Mapping' },
        { id: 'pattern-marketing', label: '3. Pattern: Marketing Agent Budget' },
        { id: 'pattern-procurement', label: '4. Pattern: AI Procurement Agent' },
        { id: 'pattern-sandbox', label: '5. Pattern: R&D Experiments / Sandboxes' },
        { id: 'pattern-multi-agent', label: '6. Pattern: Multi-Agent, Single Escrow' },
        { id: 'stakeholder-talking-points', label: '7. How to Explain This to Stakeholders' },
    ];

    return (
        <nav className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] p-5 mb-10" data-testid="toc">
            <h3 className="text-sm font-semibold text-ss-text-tertiary uppercase tracking-wider mb-4">
                On This Page
            </h3>
            <ul className="space-y-2">
                {sections.map((section) => (
                    <li key={section.id}>
                        <a
                            href={`#${section.id}`}
                            className="text-ss-text-secondary hover:text-ss-accent text-sm transition-colors"
                        >
                            {section.label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

// Concept Mapping Table
const ConceptTable = () => {
    const concepts = [
        {
            safespend: 'Escrow Account',
            trustlaw: 'Trust Account',
            meaning: 'A segregated pool of funds with a defined purpose and beneficiary. The funds are held separately and can only be disbursed according to the governing policy.',
            icon: Building2
        },
        {
            safespend: 'Spending Policy',
            trustlaw: 'Trust Instrument',
            meaning: 'The document (policy) that defines what the agent is and is not allowed to do. Like a trust deed, it specifies purposes, limits, and conditions.',
            icon: FileText
        },
        {
            safespend: 'Human Owner',
            trustlaw: 'Settlor / Trustee',
            meaning: 'The person or entity that funds the account and sets/enforces the rules. They establish the trust and have oversight responsibility.',
            icon: Users
        },
        {
            safespend: 'AI Agent',
            trustlaw: 'Agent / Fiduciary',
            meaning: 'The automated process that must act within the defined scope. Like a fiduciary, it has obligations to act in the principal\'s interest, within limits.',
            icon: Bot
        },
        {
            safespend: 'Spend Request',
            trustlaw: 'Disbursement Request',
            meaning: 'A request to use trust funds for a specific purpose. Each request must be validated against the governing policy before execution.',
            icon: DollarSign
        },
        {
            safespend: 'Audit Trail',
            trustlaw: 'Trust Accounting Ledger',
            meaning: 'The record of every disbursement and decision. Provides the transparency and accountability required of any fiduciary relationship.',
            icon: FileText
        },
        {
            safespend: 'Rule Violation',
            trustlaw: 'Breach of Fiduciary Duty',
            meaning: 'An attempt to act outside the authorized scope. The rules engine blocks violations before they occur, preventing breaches.',
            icon: AlertTriangle
        }
    ];

    return (
        <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm" data-testid="concept-mapping-table">
                <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)]">
                        <th className="text-left py-3 px-4 text-ss-text font-semibold">Safe-Spend Concept</th>
                        <th className="text-left py-3 px-4 text-ss-text font-semibold">Trust Law Equivalent</th>
                        <th className="text-left py-3 px-4 text-ss-text font-semibold">What It Means</th>
                    </tr>
                </thead>
                <tbody>
                    {concepts.map((concept, index) => (
                        <tr key={index} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-ss-surface/50">
                            <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                    <concept.icon className="w-4 h-4 text-ss-accent" />
                                    <span className="text-ss-accent font-medium">{concept.safespend}</span>
                                </div>
                            </td>
                            <td className="py-4 px-4 text-ss-text">{concept.trustlaw}</td>
                            <td className="py-4 px-4 text-ss-text-secondary">{concept.meaning}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Policy Code Block Component
const PolicyCodeBlock = ({ title, code }) => (
    <div className="bg-ss-code rounded-lg overflow-hidden mb-6">
        {title && (
            <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.06)] text-ss-text-tertiary text-xs font-mono">
                {title}
            </div>
        )}
        <pre className="p-4 overflow-x-auto text-sm">
            <code className="text-ss-text-secondary font-mono">{code}</code>
        </pre>
    </div>
);

// Governance Pattern Card
const PatternCard = ({ icon: Icon, title, description, children }) => (
    <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] p-6 mb-8" data-testid={`pattern-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-ss-accent" />
            </div>
            <div>
                <h4 className="text-lg font-semibold text-ss-text">{title}</h4>
                <p className="text-ss-text-secondary text-sm mt-1">{description}</p>
            </div>
        </div>
        {children}
    </div>
);

const DocsTrustLaw = () => {
    const marketingPolicyExample = `{
  "name": "Marketing Agent - Ads & AI Compute",
  "escrow_account_id": "esc_marketing_2024",
  "rules": {
    "per_transaction_limit_cents": 10000,    // $100 max per spend
    "daily_limit_cents": 50000,              // $500/day cap
    "monthly_limit_cents": 500000,           // $5,000/month cap
    
    "allowed_vendors": [
      "Google Ads", "Meta Ads", "Anthropic", "OpenAI"
    ],
    "allowed_categories": ["advertising", "ai_compute"],
    "blocked_categories": ["transfers", "wire"],
    
    "auto_approve_under_cents": 5000,        // Auto-approve < $50
    "require_human_above_cents": 5000,       // Human review >= $50
    "approval_timeout_minutes": 240,         // 4-hour timeout
    
    "time_window": {
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start_hour": 6,
      "end_hour": 22,
      "timezone": "America/New_York"
    }
  }
}`;

    const procurementPolicyExample = `{
  "name": "Procurement Agent - SaaS & Tools",
  "escrow_account_id": "esc_procurement_experiments",
  "rules": {
    "per_transaction_limit_cents": 30000,    // $300 max per spend
    "daily_limit_cents": 100000,             // $1,000/day cap
    "monthly_limit_cents": 300000,           // $3,000/month cap
    
    "allowed_categories": [
      "saas_subscription", "developer_tools", "ai_compute"
    ],
    "allowed_vendors": [
      "AWS", "Google Cloud", "Vercel", "Supabase",
      "OpenAI", "Anthropic", "GitHub", "Notion"
    ],
    
    "auto_approve_under_cents": 15000,       // Auto-approve < $150
    "require_human_above_cents": 15000,      // Human review >= $150
    "approval_timeout_minutes": 480,         // 8-hour timeout
    
    "time_window": {
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "start_hour": 9,
      "end_hour": 18,
      "timezone": "UTC"
    }
  }
}`;

    const sandboxPolicyExample = `{
  "name": "R&D Sandbox - Exploration Budget",
  "escrow_account_id": "esc_rd_sandbox",
  "rules": {
    "per_transaction_limit_cents": 2000,     // $20 max per spend
    "daily_limit_cents": 10000,              // $100/day cap
    "monthly_limit_cents": 50000,            // $500/month cap (matches balance)
    
    // Broad categories - exploration focus
    "allowed_categories": [
      "ai_compute", "api_credits", "saas_subscription",
      "developer_tools", "research", "testing"
    ],
    
    "auto_approve_under_cents": 1000,        // Auto-approve < $10
    "require_human_above_cents": 1000,       // Human review >= $10
    "approval_timeout_minutes": 60           // Short 1-hour timeout
  }
}`;

    const multiAgentPolicies = `// Marketing Agent Policy
{
  "name": "Marketing Agent Policy",
  "escrow_account_id": "esc_shared_ops",
  "api_key_id": "key_marketing_agent",
  "rules": {
    "allowed_categories": ["advertising", "content", "analytics"],
    "monthly_limit_cents": 300000
  }
}

// DevOps Agent Policy
{
  "name": "DevOps Agent Policy",
  "escrow_account_id": "esc_shared_ops",
  "api_key_id": "key_devops_agent",
  "rules": {
    "allowed_categories": ["infrastructure", "cloud_compute", "monitoring"],
    "monthly_limit_cents": 500000
  }
}`;

    return (
        <div data-testid="docs-trust-law-page">
            <DocsHeading level={1}>Trust Law & Governance Patterns</DocsHeading>
            
            <DocsText className="text-lg">
                Safe-Spend is explicitly grounded in <strong className="text-ss-text">trust law concepts</strong>: 
                escrow accounts as trust accounts, policies as instruments, AI agents as fiduciaries, and rule 
                violations as breaches of duty. This page explains the mapping and provides governance patterns you can adopt.
            </DocsText>

            <TableOfContents />

            {/* Section 1: Why Trust Law */}
            <DocsHeading level={2} id="why-trust-law">Why Trust Law for AI Agents?</DocsHeading>

            <DocsText>
                Traditional trust law solves a fundamental problem: <strong className="text-ss-text">How do you let someone 
                manage assets for a specific purpose without giving them unlimited power?</strong> Trusts create segregated 
                pools of assets, governed by explicit rules, with clear fiduciary duties and accountability mechanisms.
            </DocsText>

            <DocsText>
                Safe-Spend brings these battle-tested principles into the <strong className="text-ss-text">agent economy</strong>. 
                When you create an escrow account with spending policies, you're essentially creating a trust:
            </DocsText>

            <ul className="list-disc list-inside space-y-2 mb-6 text-ss-text-secondary">
                <li><strong className="text-ss-text">Escrow</strong> = Trust account (segregated, purpose-restricted funds)</li>
                <li><strong className="text-ss-text">Policy</strong> = Trust instrument (the rules governing disbursements)</li>
                <li><strong className="text-ss-text">Agent</strong> = Fiduciary (must act within defined scope)</li>
                <li><strong className="text-ss-text">Rules Engine</strong> = Trustee's enforcement duties (validates every request)</li>
            </ul>

            <Callout type="warning" title="Why This Matters for AI Agents">
                <p className="mb-2">
                    AI agents create unique risks that traditional authorization models don't address:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>API keys are financial attack surfaces</strong> — a leaked key can drain accounts instantly</li>
                    <li><strong>Agents make fast, high-volume decisions</strong> — without human judgment or hesitation</li>
                    <li><strong>Autonomous loops can amplify errors</strong> — a misguided agent can burn through budgets in minutes</li>
                </ul>
                <p className="mt-2">
                    You need more than a "budget" — you need <strong>governance</strong>.
                </p>
            </Callout>

            <Callout type="error" title="Real-World Horror Story: The $82,000 Gemini Bill">
                <p>
                    A developer gave an AI agent access to Google Cloud credentials for a "quick experiment." 
                    The agent entered a retry loop calling Gemini's API, running for 36 hours before anyone noticed.
                    <strong className="text-ss-text"> Total bill: $82,437.</strong>
                </p>
                <p className="mt-2 text-ss-text-tertiary">
                    With Safe-Spend's fiduciary controls — per-transaction limits, daily caps, vendor restrictions — this 
                    would have been stopped after $100 or $500, not $82K. The rules engine would have denied the requests 
                    once limits were hit.
                </p>
            </Callout>

            {/* Section 2: Concept Mapping */}
            <DocsHeading level={2} id="concept-mapping">Core Concept Mapping</DocsHeading>

            <DocsText>
                The table below maps Safe-Spend's API constructs to their trust law equivalents. Understanding 
                this mapping helps you design policies that provide real governance, not just spending limits.
            </DocsText>

            <ConceptTable />

            <DocsText>
                Every policy you create is a <strong className="text-ss-text">governance document</strong>. 
                Think of yourself as drafting a trust instrument: what purposes are allowed? What limits apply? 
                Who has authority to approve exceptions? What records must be kept?
            </DocsText>

            {/* Section 3: Marketing Agent Pattern */}
            <DocsHeading level={2} id="pattern-marketing">Governance Pattern 1: Marketing Agent Budget</DocsHeading>

            <PatternCard 
                icon={Megaphone}
                title="Marketing Agent"
                description="Controls ad spend and AI compute for a marketing automation agent"
            >
                <DocsText>
                    <strong className="text-ss-text">Scenario:</strong> You have a marketing agent that can buy ads 
                    and AI compute (Claude credits), but you never want it touching bank transfers or making large 
                    one-off purchases without human review.
                </DocsText>

                <h5 className="text-ss-text font-semibold mb-2">Policy Configuration</h5>
                <PolicyCodeBlock title="spending_policy.json" code={marketingPolicyExample} />

                <h5 className="text-ss-text font-semibold mb-2">Trust Law Mapping</h5>
                <ul className="list-disc list-inside space-y-2 mb-4 text-ss-text-secondary">
                    <li><strong className="text-ss-text">Purpose Restriction:</strong> Funds can only be used for advertising and AI compute — like a trust restricted to "education expenses only"</li>
                    <li><strong className="text-ss-text">Segregation:</strong> Marketing escrow is separate from other operational funds — commingling is prevented</li>
                    <li><strong className="text-ss-text">Delegated Authority with Caps:</strong> Agent can act autonomously up to $50, then human trustee must approve — preserving oversight</li>
                    <li><strong className="text-ss-text">Time Boundaries:</strong> Spending only during business hours — limits exposure during off-hours</li>
                </ul>
            </PatternCard>

            {/* Section 4: Procurement Agent Pattern */}
            <DocsHeading level={2} id="pattern-procurement">Governance Pattern 2: AI Procurement Agent</DocsHeading>

            <PatternCard 
                icon={ShoppingCart}
                title="Procurement Agent"
                description="Enables autonomous SaaS subscriptions and tool purchases with approval thresholds"
            >
                <DocsText>
                    <strong className="text-ss-text">Scenario:</strong> An AI procurement agent can sign up for 
                    SaaS tools, buy API credits, and run trials — but only within a controlled budget and with 
                    approvals for larger commitments.
                </DocsText>

                <h5 className="text-ss-text font-semibold mb-2">Policy Configuration</h5>
                <PolicyCodeBlock title="spending_policy.json" code={procurementPolicyExample} />

                <h5 className="text-ss-text font-semibold mb-2">Trust Law Mapping</h5>
                <ul className="list-disc list-inside space-y-2 mb-4 text-ss-text-secondary">
                    <li><strong className="text-ss-text">Vendor Whitelist:</strong> Only known, vetted vendors can receive funds — like a trust that only permits investments in approved securities</li>
                    <li><strong className="text-ss-text">Approval Thresholds:</strong> Larger commitments (&gt;$150) require human trustee sign-off — fiduciary duty for material decisions</li>
                    <li><strong className="text-ss-text">Business Hours:</strong> Procurement happens during working hours when humans are available for escalations</li>
                    <li><strong className="text-ss-text">Monthly Caps:</strong> Total exposure is bounded — the trust can't be depleted beyond the limit</li>
                </ul>
            </PatternCard>

            {/* Section 5: R&D Sandbox Pattern */}
            <DocsHeading level={2} id="pattern-sandbox">Governance Pattern 3: R&D Experiments / Sandboxes</DocsHeading>

            <PatternCard 
                icon={FlaskConical}
                title="R&D Sandbox"
                description="Bounded exploration budgets for research and experimentation"
            >
                <DocsText>
                    <strong className="text-ss-text">Scenario:</strong> A research team wants to let agents explore 
                    ideas with small real-money budgets, but wants to hard-limit downside risk. The goal is 
                    experimentation with bounded loss.
                </DocsText>

                <h5 className="text-ss-text font-semibold mb-2">Policy Configuration</h5>
                <PolicyCodeBlock title="spending_policy.json" code={sandboxPolicyExample} />

                <h5 className="text-ss-text font-semibold mb-2">Trust Law Mapping</h5>
                <ul className="list-disc list-inside space-y-2 mb-4 text-ss-text-secondary">
                    <li><strong className="text-ss-text">Small Corpus:</strong> Escrow funded with only $500 — the maximum possible loss is the balance</li>
                    <li><strong className="text-ss-text">Tight Transaction Limits:</strong> $20/transaction means even runaway loops cause minimal damage per iteration</li>
                    <li><strong className="text-ss-text">Broad Purpose:</strong> More permissive categories because the small balance provides the safety net</li>
                    <li><strong className="text-ss-text">Short Timeouts:</strong> 1-hour approval expiry prevents stale requests from executing later</li>
                </ul>

                <Callout type="info" title="Sandbox Best Practice">
                    This pattern creates a "sandbox" with <strong>bounded loss</strong>. It's the responsible way 
                    to introduce agents into production environments: give them real capabilities, but with 
                    structural limits that prevent catastrophic outcomes. Start small, prove value, then expand.
                </Callout>
            </PatternCard>

            {/* Section 6: Multi-Agent Pattern */}
            <DocsHeading level={2} id="pattern-multi-agent">Governance Pattern 4: Multi-Agent, Single Escrow</DocsHeading>

            <PatternCard 
                icon={Bot}
                title="Multi-Agent Shared Escrow"
                description="Multiple agents with different scopes sharing one pool of funds"
            >
                <DocsText>
                    <strong className="text-ss-text">Scenario:</strong> Multiple agents (e.g., marketing and DevOps) 
                    share one escrow account but with different policies. Each agent operates within its defined 
                    scope, but they draw from the same pool.
                </DocsText>

                <h5 className="text-ss-text font-semibold mb-2">Policy Configuration</h5>
                <PolicyCodeBlock title="multi_agent_policies.json" code={multiAgentPolicies} />

                <h5 className="text-ss-text font-semibold mb-2">How It Works</h5>
                <ul className="list-disc list-inside space-y-2 mb-4 text-ss-text-secondary">
                    <li><strong className="text-ss-text">Single Escrow, Multiple Policies:</strong> One <InlineCode>esc_shared_ops</InlineCode> account holds funds for both agents</li>
                    <li><strong className="text-ss-text">Policy + Key Context:</strong> The rules engine uses both the policy rules AND the API key to determine scope</li>
                    <li><strong className="text-ss-text">Distinct Scopes:</strong> Marketing agent can only spend on advertising/content; DevOps can only spend on infrastructure</li>
                    <li><strong className="text-ss-text">Shared Balance:</strong> Both draw from the same pool, but each is limited by their own monthly cap</li>
                </ul>

                <DocsText>
                    This mirrors a trust where <strong className="text-ss-text">different trustees have defined powers</strong> over 
                    the same corpus. The marketing trustee can authorize advertising expenses; the DevOps trustee 
                    can authorize infrastructure expenses. Neither can exceed their authority.
                </DocsText>
            </PatternCard>

            {/* Section 7: Stakeholder Talking Points */}
            <DocsHeading level={2} id="stakeholder-talking-points">How to Explain This to Stakeholders</DocsHeading>

            <DocsText>
                When you need to explain Safe-Spend to non-technical stakeholders, use these talking points 
                tailored to each audience:
            </DocsText>

            <div className="space-y-6 mb-8">
                {/* Legal/Compliance */}
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <Scale className="w-5 h-5 text-ss-accent" />
                        <h4 className="font-semibold text-ss-text">For Legal / Compliance</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-2 text-ss-text-secondary text-sm">
                        <li>Safe-Spend gives us <strong className="text-ss-text">trust-like controls</strong> over AI-controlled funds</li>
                        <li>Funds are held in <strong className="text-ss-text">segregated escrow accounts</strong> with purpose-specific policies</li>
                        <li>Every spend attempt is validated against a <strong className="text-ss-text">13-point rules engine</strong> before execution</li>
                        <li>We maintain an <strong className="text-ss-text">immutable audit log</strong> of every disbursement and decision</li>
                        <li>Human approval workflows provide <strong className="text-ss-text">oversight for material transactions</strong></li>
                    </ul>
                </div>

                {/* Finance */}
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <DollarSign className="w-5 h-5 text-ss-accent" />
                        <h4 className="font-semibold text-ss-text">For Finance</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-2 text-ss-text-secondary text-sm">
                        <li>We cap downside risk <strong className="text-ss-text">per agent, per day, and per month</strong></li>
                        <li>Every disbursement is tracked with vendor, category, and timestamp — <strong className="text-ss-text">full spend visibility</strong></li>
                        <li>Budgets are enforced automatically; agents <strong className="text-ss-text">cannot overspend</strong> their limits</li>
                        <li>We can explain <strong className="text-ss-text">every decision</strong>: why a spend was approved, denied, or escalated</li>
                        <li>Real-time webhooks enable <strong className="text-ss-text">integration with existing financial systems</strong></li>
                    </ul>
                </div>

                {/* Security/IT */}
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <Shield className="w-5 h-5 text-ss-accent" />
                        <h4 className="font-semibold text-ss-text">For Security / IT</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-2 text-ss-text-secondary text-sm">
                        <li>Agents never hold <strong className="text-ss-text">primary payment credentials</strong></li>
                        <li>They get <strong className="text-ss-text">scoped API keys</strong> that can only create spend requests against escrow</li>
                        <li>The rules engine enforces <strong className="text-ss-text">least privilege</strong> — agents can only do what policies permit</li>
                        <li>Keys can be <strong className="text-ss-text">instantly revoked</strong> without affecting other systems</li>
                        <li>All API requests are <strong className="text-ss-text">rate-limited and logged</strong> for anomaly detection</li>
                    </ul>
                </div>
            </div>

            {/* Next Steps */}
            <DocsHeading level={2} id="next-steps">Apply These Patterns</DocsHeading>

            <div className="grid gap-4">
                <Link 
                    to="/docs/quickstart" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                    data-testid="link-quickstart"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Quickstart Guide</h4>
                            <p className="text-ss-text-secondary text-sm">Create your first escrow and policy in 5 minutes</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>

                <Link 
                    to="/docs/api#policies" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                    data-testid="link-api-policies"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Policy API Reference</h4>
                            <p className="text-ss-text-secondary text-sm">Full specification for all policy rule types</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>

                <Link 
                    to="/dashboard/rules" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                    data-testid="link-dashboard-rules"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Open Spending Rules Dashboard</h4>
                            <p className="text-ss-text-secondary text-sm">Configure policies for your escrow accounts</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default DocsTrustLaw;
