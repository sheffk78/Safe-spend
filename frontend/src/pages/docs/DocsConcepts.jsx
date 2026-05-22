import React from 'react';
import { Link } from 'react-router-dom';
import { DocsHeading, DocsText, InlineCode } from '@/components/docs/DocsComponents';
import { Shield, Landmark, Key, Workflow, Webhook, FileText, ArrowRight } from 'lucide-react';

const DocsConcepts = () => {
    return (
        <div data-testid="docs-concepts-page">
            <DocsHeading level={1}>Core Concepts</DocsHeading>
            
            <DocsText>
                Safe-Spend is built on trust-grade financial governance principles. Understanding these core 
                concepts will help you design effective spending controls for your AI agents.
            </DocsText>

            {/* Escrow Accounts */}
            <DocsHeading level={2} id="escrow-accounts">Escrow Accounts</DocsHeading>

            <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-6 h-6 text-ss-accent" />
                </div>
                <div>
                    <DocsText>
                        An <strong className="text-ss-text">Escrow Account</strong> is a segregated holding account for funds 
                        designated for agent spending. Unlike a wallet, escrow accounts are purpose-restricted and governed 
                        by policies.
                    </DocsText>
                </div>
            </div>

            <DocsText>Key characteristics:</DocsText>
            <ul className="list-disc list-inside space-y-2 mb-6 text-ss-text-secondary">
                <li><strong className="text-ss-text">Segregated funds</strong> — Each account holds its own balance, never commingled</li>
                <li><strong className="text-ss-text">Purpose-restricted</strong> — Funds can only be spent according to attached policies</li>
                <li><strong className="text-ss-text">Lifecycle states</strong> — Active, Paused (temporary halt), or Closed (permanent)</li>
                <li><strong className="text-ss-text">Full audit trail</strong> — Every funding, spend, and state change is logged</li>
            </ul>

            <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] mb-8">
                <h4 className="font-semibold text-ss-text mb-2">Example Use Cases</h4>
                <ul className="text-ss-text-secondary text-sm space-y-1">
                    <li>• <strong>Marketing Agent Budget</strong> — $500/month for ad spend and content tools</li>
                    <li>• <strong>Research Agent</strong> — $1,000 for API credits across multiple LLM providers</li>
                    <li>• <strong>Customer Support Agent</strong> — $200/day for automated refunds and credits</li>
                </ul>
            </div>

            {/* Spending Policies */}
            <DocsHeading level={2} id="spending-policies">Spending Policies</DocsHeading>

            <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-ss-accent" />
                </div>
                <div>
                    <DocsText>
                        A <strong className="text-ss-text">Spending Policy</strong> is a trust instrument that defines the rules 
                        governing how funds can be spent from an escrow account. Think of it as a spending policy document 
                        encoded as configuration.
                    </DocsText>
                </div>
            </div>

            <DocsText>Policy controls include:</DocsText>

            <div className="grid gap-4 mb-8">
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Spending Limits</h4>
                    <ul className="text-ss-text-secondary text-sm space-y-1">
                        <li>• <InlineCode>per_transaction_limit_cents</InlineCode> — Max amount per single spend</li>
                        <li>• <InlineCode>daily_limit_cents</InlineCode> — Rolling 24-hour cap</li>
                        <li>• <InlineCode>weekly_limit_cents</InlineCode> — Rolling 7-day cap</li>
                        <li>• <InlineCode>monthly_limit_cents</InlineCode> — Rolling 30-day cap</li>
                    </ul>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Vendor Controls</h4>
                    <ul className="text-ss-text-secondary text-sm space-y-1">
                        <li>• <InlineCode>allowed_vendors</InlineCode> — Whitelist of permitted vendors</li>
                        <li>• <InlineCode>blocked_vendors</InlineCode> — Blacklist of prohibited vendors</li>
                        <li>• <InlineCode>vendor_match_mode</InlineCode> — Exact or contains matching</li>
                    </ul>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Category Controls</h4>
                    <ul className="text-ss-text-secondary text-sm space-y-1">
                        <li>• <InlineCode>allowed_categories</InlineCode> — Permitted spending categories</li>
                        <li>• <InlineCode>blocked_categories</InlineCode> — Prohibited categories</li>
                    </ul>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Approval Thresholds</h4>
                    <ul className="text-ss-text-secondary text-sm space-y-1">
                        <li>• <InlineCode>auto_approve_under_cents</InlineCode> — Auto-approve small spends</li>
                        <li>• <InlineCode>require_human_above_cents</InlineCode> — Require human approval for large spends</li>
                        <li>• <InlineCode>approval_timeout_minutes</InlineCode> — How long approvals are valid</li>
                    </ul>
                </div>
            </div>

            {/* Rules Engine */}
            <DocsHeading level={2} id="rules-engine">Rules Engine</DocsHeading>

            <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                    <Workflow className="w-6 h-6 text-ss-accent" />
                </div>
                <div>
                    <DocsText>
                        The <strong className="text-ss-text">Rules Engine</strong> evaluates every spend request through a 
                        13-step validation cascade. Each step either passes, fails, or triggers a special outcome.
                    </DocsText>
                </div>
            </div>

            <DocsText>The validation cascade:</DocsText>

            <div className="bg-ss-code rounded-lg p-4 mb-6 overflow-x-auto">
                <ol className="text-sm font-mono space-y-1">
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">01.</span> Check escrow account exists and is active</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">02.</span> Check sufficient balance</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">03.</span> Load all active policies for the escrow</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">04.</span> Per-transaction limit check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">05.</span> Daily spending cap check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">06.</span> Weekly spending cap check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">07.</span> Monthly spending cap check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">08.</span> Vendor allowlist check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">09.</span> Vendor blocklist check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">10.</span> Category allowlist check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">11.</span> Category blocklist check</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">12.</span> Time window check (if configured)</li>
                    <li className="text-ss-text-secondary"><span className="text-ss-accent">13.</span> Approval threshold check</li>
                </ol>
            </div>

            <DocsText>
                Every spend request returns a <InlineCode>rules_evaluated</InlineCode> array showing exactly which 
                rules were checked and their results. This provides complete transparency into why a spend was 
                approved, denied, or sent for approval.
            </DocsText>

            {/* API Keys */}
            <DocsHeading level={2} id="api-keys">API Keys</DocsHeading>

            <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                    <Key className="w-6 h-6 text-ss-accent" />
                </div>
                <div>
                    <DocsText>
                        Safe-Spend uses <strong className="text-ss-text">scoped API keys</strong> to control what different 
                        actors can do. Keys are prefixed to indicate their type and permissions.
                    </DocsText>
                </div>
            </div>

            <div className="grid gap-4 mb-8">
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <code className="text-ss-accent font-mono">sk_live_...</code>
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Live</span>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        Full production access. Can create escrows, policies, fund accounts, and make spends.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <code className="text-ss-accent font-mono">sk_test_...</code>
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">Test</span>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        Test mode with simulated funds. Same permissions as live, but no real money moves.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <code className="text-ss-accent font-mono">sk_agent_...</code>
                        <span className="px-2 py-0.5 bg-ss-accent/20 text-ss-accent text-xs rounded">Agent</span>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        <strong>Restricted key for AI agents.</strong> Can only make spend requests and view transactions. 
                        Cannot create escrows, modify policies, or fund accounts.
                    </p>
                </div>
            </div>

            {/* Approvals */}
            <DocsHeading level={2} id="approvals">Approvals</DocsHeading>

            <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-ss-accent" />
                </div>
                <div>
                    <DocsText>
                        When a spend exceeds the <InlineCode>auto_approve_under_cents</InlineCode> threshold, it creates 
                        an <strong className="text-ss-text">Approval</strong> that must be approved or denied by a human.
                    </DocsText>
                </div>
            </div>

            <DocsText>Approval lifecycle:</DocsText>

            <ol className="list-decimal list-inside space-y-2 mb-6 text-ss-text-secondary">
                <li>Agent makes a spend request exceeding auto-approve threshold</li>
                <li>Spend is created with status <InlineCode>pending_approval</InlineCode></li>
                <li>Approval is created with an expiration time</li>
                <li>Human approves or denies via dashboard or API</li>
                <li>If approved, balance is deducted and spend status becomes <InlineCode>approved</InlineCode></li>
                <li>If denied or expired, spend status becomes <InlineCode>cancelled</InlineCode> or <InlineCode>expired</InlineCode></li>
            </ol>

            {/* Webhooks */}
            <DocsHeading level={2} id="webhooks">Webhooks</DocsHeading>

            <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-ss-accent/10 flex items-center justify-center flex-shrink-0">
                    <Webhook className="w-6 h-6 text-ss-accent" />
                </div>
                <div>
                    <DocsText>
                        <strong className="text-ss-text">Webhooks</strong> provide real-time notifications when events 
                        occur in your organization. Essential for reacting to approvals, tracking spending, and integrating 
                        with external systems.
                    </DocsText>
                </div>
            </div>

            <DocsText>
                All webhook deliveries include HMAC-SHA256 signatures for security verification. See the{' '}
                <Link to="/docs/webhooks" className="text-ss-accent hover:underline">Webhooks documentation</Link> for 
                payload formats and verification code.
            </DocsText>

            {/* Next Steps */}
            <DocsHeading level={2} id="next-steps">Ready to Build?</DocsHeading>

            <div className="grid gap-4">
                <Link 
                    to="/docs/quickstart" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Quickstart Guide</h4>
                            <p className="text-ss-text-secondary text-sm">Create your first escrow and make a test spend</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>

                <Link 
                    to="/docs/api" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">API Reference</h4>
                            <p className="text-ss-text-secondary text-sm">Explore all available endpoints</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default DocsConcepts;
