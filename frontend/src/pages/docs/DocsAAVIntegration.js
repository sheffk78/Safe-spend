import React from 'react';
import { Link } from 'react-router-dom';
import { DocsHeading, DocsText, DocsList, Callout, InlineCode, ApiEndpoint } from '@/components/docs/DocsComponents';
import { CodeBlock } from '@/components/docs/DocsCodeBlock';
import { Shield, Key, Users, AlertTriangle, CheckCircle, Workflow, Lock, Zap } from 'lucide-react';

const DocsAAVIntegration = () => {
    return (
        <div data-testid="docs-aav-integration-page">
            <DocsHeading level={1}>AAV Integration</DocsHeading>
            
            <DocsText>
                Agent Authority Vault (AAV) provides a second layer of authorization for AI agent spending. 
                When enabled, Safe-Spend calls AAV's <InlineCode>/verify</InlineCode> endpoint to check if an agent 
                has the authority to perform a spend action before checking your spending policies.
            </DocsText>

            <Callout type="info" title="Part of Agentic Trust">
                AAV is part of the Agentic Trust product suite. Get your AAV API key at{' '}
                <a href="https://agentictrust.app" target="_blank" rel="noopener noreferrer" className="text-ss-accent hover:underline">
                    agentictrust.app
                </a>
            </Callout>

            {/* Overview Section */}
            <DocsHeading level={2} id="overview">Overview</DocsHeading>
            
            <DocsText>
                Safe-Spend's AAV integration creates a <strong className="text-ss-text">two-layer security model</strong>:
            </DocsText>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-purple-400" />
                        </div>
                        <h4 className="font-semibold text-ss-text">Layer 1: AAV</h4>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        <strong className="text-purple-400">Who</strong> can spend — Is this agent authorized? Does their grant allow this action?
                    </p>
                </div>
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-ss-accent/20 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-ss-accent" />
                        </div>
                        <h4 className="font-semibold text-ss-text">Layer 2: Safe-Spend</h4>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        <strong className="text-ss-accent">What</strong> can be spent — Does this transaction comply with the spending policy?
                    </p>
                </div>
            </div>

            <DocsText>
                When both layers are enabled, <strong className="text-ss-text">both must pass</strong> for a spend to be approved. 
                This ensures the agent has organizational authority (AAV) AND the transaction meets your fiduciary rules (Safe-Spend).
            </DocsText>

            {/* How It Works */}
            <DocsHeading level={2} id="how-it-works">How It Works</DocsHeading>

            <div className="bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] p-6 mb-8">
                <h4 className="font-semibold text-ss-text mb-4 flex items-center gap-2">
                    <Workflow className="w-5 h-5 text-ss-accent" />
                    Spend Request Flow
                </h4>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                        <div>
                            <p className="text-ss-text font-medium">Agent sends spend request</p>
                            <p className="text-ss-text-secondary text-sm">Includes <InlineCode>aav_agent_id</InlineCode>, <InlineCode>aav_certificate_id</InlineCode>, or both</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                        <div>
                            <p className="text-ss-text font-medium">Safe-Spend calls AAV /verify</p>
                            <p className="text-ss-text-secondary text-sm">Server-to-server call with 3-second timeout</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                        <div>
                            <p className="text-ss-text font-medium">AAV returns verification result</p>
                            <p className="text-ss-text-secondary text-sm"><InlineCode>authorized</InlineCode>, <InlineCode>denied</InlineCode>, or <InlineCode>approval_pending</InlineCode></p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-ss-accent/20 text-ss-accent flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                        <div>
                            <p className="text-ss-text font-medium">Safe-Spend evaluates spending policy</p>
                            <p className="text-ss-text-secondary text-sm">Only if AAV passes (in <InlineCode>verify</InlineCode> mode)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-ss-accent/20 text-ss-accent flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
                        <div>
                            <p className="text-ss-text font-medium">Spend approved or denied</p>
                            <p className="text-ss-text-secondary text-sm"><InlineCode>denial_source</InlineCode> tells you which layer blocked it</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Configuration */}
            <DocsHeading level={2} id="configuration">Configuration</DocsHeading>

            <DocsHeading level={3} id="escrow-aav-config">Escrow Account AAV Settings</DocsHeading>

            <DocsText>
                AAV is configured at the escrow account level. When creating or updating an escrow, include these fields:
            </DocsText>

            <CodeBlock
                language="json"
                title="POST /v1/escrow-accounts"
                code={`{
  "name": "AI Agent Budget",
  "aav_enabled": true,
  "aav_enforcement_mode": "verify",
  "aav_api_key": "aav_live_sk_...",
  "aav_require_certificate": false,
  "authorized_agent_ids": ["agent_abc123", "agent_def456"],
  "aav_grant_ids": []
}`}
            />

            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Field</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Type</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Description</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_enabled</InlineCode></td>
                            <td className="py-3 px-4">boolean</td>
                            <td className="py-3 px-4">Enable AAV integration for this escrow</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_enforcement_mode</InlineCode></td>
                            <td className="py-3 px-4">string</td>
                            <td className="py-3 px-4"><InlineCode>verify</InlineCode> (fail-closed) or <InlineCode>log_only</InlineCode> (fail-open)</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_api_key</InlineCode></td>
                            <td className="py-3 px-4">string</td>
                            <td className="py-3 px-4">Your AAV API key (<InlineCode>aav_live_sk_...</InlineCode>) for server-to-server calls</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_require_certificate</InlineCode></td>
                            <td className="py-3 px-4">boolean</td>
                            <td className="py-3 px-4">Require agents to present a certificate with each spend</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>authorized_agent_ids</InlineCode></td>
                            <td className="py-3 px-4">string[]</td>
                            <td className="py-3 px-4">List of AAV agent IDs allowed to use this escrow</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_grant_ids</InlineCode></td>
                            <td className="py-3 px-4">string[]</td>
                            <td className="py-3 px-4">List of specific AAV grants to accept</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Enforcement Modes */}
            <DocsHeading level={3} id="enforcement-modes">Enforcement Modes</DocsHeading>

            <div className="space-y-4 mb-8">
                <div className="bg-ss-surface p-4 rounded-lg border border-red-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-mono rounded">verify</div>
                        <span className="text-ss-text font-medium">Fail-Closed (Recommended for Production)</span>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        Spend is denied if AAV verification fails for any reason (denied, timeout, unreachable). 
                        This is the secure default that prevents unauthorized spending.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-mono rounded">log_only</div>
                        <span className="text-ss-text font-medium">Fail-Open (For Testing/Rollout)</span>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        Spend is allowed even if AAV verification fails, but the result is logged. 
                        Use this when first integrating AAV to monitor without blocking production traffic.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-mono rounded">none</div>
                        <span className="text-ss-text font-medium">Disabled</span>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        AAV is not checked. Only Safe-Spend policies are evaluated.
                    </p>
                </div>
            </div>

            {/* Making Spend Requests */}
            <DocsHeading level={2} id="spend-requests">Making Spend Requests</DocsHeading>

            <DocsText>
                When AAV is enabled, include the agent's identity in your spend request:
            </DocsText>

            <CodeBlock
                language="json"
                title="POST /v1/spend"
                code={`{
  "escrow_id": "esc_abc123",
  "amount_cents": 5000,
  "vendor": "OpenAI",
  "description": "GPT-4 API usage",
  "aav_agent_id": "agent_bot1",
  "aav_certificate_id": "cert_xyz789"
}`}
            />

            <DocsText>
                Alternatively, pass the AAV identity via headers:
            </DocsText>

            <CodeBlock
                language="bash"
                title="Using Headers"
                code={`curl -X POST https://api.safespend.dev/v1/spend \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "X-AAV-Agent-Id: agent_bot1" \\
  -H "X-AAV-Certificate-Id: cert_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{"escrow_id": "esc_abc123", "amount_cents": 5000, ...}'`}
            />

            {/* Response Fields */}
            <DocsHeading level={2} id="response-fields">Response Fields</DocsHeading>

            <DocsText>
                Spend responses include AAV verification details:
            </DocsText>

            <CodeBlock
                language="json"
                title="Spend Response"
                code={`{
  "id": "spend_abc123",
  "status": "approved",
  "amount_cents": 5000,
  "vendor": "OpenAI",
  "aav_verification_status": "verified",
  "aav_verification_id": "verif_def456",
  "aav_agent_id": "agent_bot1",
  "aav_autonomy_level": 4,
  "denial_source": null
}`}
            />

            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Field</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Description</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_verification_status</InlineCode></td>
                            <td className="py-3 px-4"><InlineCode>verified</InlineCode>, <InlineCode>denied</InlineCode>, <InlineCode>unverified</InlineCode>, <InlineCode>bypassed</InlineCode>, or <InlineCode>error</InlineCode></td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_verification_id</InlineCode></td>
                            <td className="py-3 px-4">Unique ID from AAV for audit purposes (<InlineCode>verif_...</InlineCode>)</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_autonomy_level</InlineCode></td>
                            <td className="py-3 px-4">Agent's autonomy level from AAV (1-4)</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>denial_source</InlineCode></td>
                            <td className="py-3 px-4">Which layer denied: <InlineCode>aav</InlineCode>, <InlineCode>policy</InlineCode>, <InlineCode>balance</InlineCode>, or <InlineCode>account</InlineCode></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Dual-Limit Enforcement */}
            <DocsHeading level={2} id="dual-limits">Dual-Limit Enforcement</DocsHeading>

            <DocsText>
                When <InlineCode>aav_map_limits: true</InlineCode> is set on a spending policy, Safe-Spend enforces 
                the <strong className="text-ss-text">stricter of the two limits</strong> — Safe-Spend policy limits or AAV grant constraints.
            </DocsText>

            <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)] mb-8">
                <h4 className="font-semibold text-ss-text mb-3">Example: Stricter-Wins Logic</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-ss-text-secondary mb-1">Safe-Spend Policy</p>
                        <p className="text-ss-text">Per-tx: <InlineCode>$500</InlineCode></p>
                        <p className="text-ss-text">Daily: <InlineCode>$2,000</InlineCode></p>
                    </div>
                    <div>
                        <p className="text-ss-text-secondary mb-1">AAV Grant</p>
                        <p className="text-purple-400">Per-tx: <InlineCode>$200</InlineCode></p>
                        <p className="text-purple-400">Daily: <InlineCode>$5,000</InlineCode></p>
                    </div>
                    <div>
                        <p className="text-ss-text-secondary mb-1">Effective Limit</p>
                        <p className="text-ss-accent">Per-tx: <InlineCode>$200</InlineCode> (AAV)</p>
                        <p className="text-ss-accent">Daily: <InlineCode>$2,000</InlineCode> (Policy)</p>
                    </div>
                </div>
            </div>

            {/* Webhooks */}
            <DocsHeading level={2} id="webhooks">AAV Webhook Events</DocsHeading>

            <DocsText>
                Safe-Spend fires webhook events for AAV verification results:
            </DocsText>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-3 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <CheckCircle className="w-5 h-5 text-ss-accent flex-shrink-0" />
                    <div>
                        <InlineCode>aav.verification_passed</InlineCode>
                        <p className="text-ss-text-secondary text-sm mt-1">AAV authorized the agent to perform this spend</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <InlineCode>aav.verification_denied</InlineCode>
                        <p className="text-ss-text-secondary text-sm mt-1">AAV denied the agent (denied, approval_pending, etc.)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                        <InlineCode>aav.verification_failed</InlineCode>
                        <p className="text-ss-text-secondary text-sm mt-1">AAV API call failed (timeout, unreachable, error)</p>
                    </div>
                </div>
            </div>

            <Callout type="info" title="Webhook Payload">
                AAV webhook payloads include full verification details: <InlineCode>agent_id</InlineCode>, <InlineCode>grant_id</InlineCode>, 
                <InlineCode>certificate_id</InlineCode>, <InlineCode>verification_id</InlineCode>, <InlineCode>autonomy_level</InlineCode>, 
                <InlineCode>result</InlineCode>, and <InlineCode>response_time_ms</InlineCode>.
            </Callout>

            {/* Policy-Level AAV */}
            <DocsHeading level={2} id="policy-aav">Policy-Level AAV Settings</DocsHeading>

            <DocsText>
                Spending policies can override escrow-level AAV settings and add additional constraints:
            </DocsText>

            <CodeBlock
                language="json"
                title="POST /v1/policies"
                code={`{
  "escrow_id": "esc_abc123",
  "name": "High-Value Purchases",
  "per_transaction_limit_cents": 100000,
  "aav_required_autonomy_level": 3,
  "aav_map_vendors": true,
  "aav_map_limits": true,
  "aav_required_actions": ["purchase_service"]
}`}
            />

            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Field</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Description</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_required_autonomy_level</InlineCode></td>
                            <td className="py-3 px-4">Minimum AAV autonomy level required (1-4)</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_map_vendors</InlineCode></td>
                            <td className="py-3 px-4">Sync approved vendors from AAV grant</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_map_limits</InlineCode></td>
                            <td className="py-3 px-4">Use AAV limits as additional ceiling (stricter-wins)</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>aav_required_actions</InlineCode></td>
                            <td className="py-3 px-4">Required AAV action permissions (e.g., <InlineCode>purchase_service</InlineCode>)</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Best Practices */}
            <DocsHeading level={2} id="best-practices">Best Practices</DocsHeading>

            <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-ss-accent/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Start with log_only mode</h4>
                        <p className="text-ss-text-secondary text-sm">
                            When first integrating AAV, use <InlineCode>log_only</InlineCode> to monitor verification results 
                            without blocking production traffic. Switch to <InlineCode>verify</InlineCode> once you've confirmed everything works.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-ss-accent/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Use authorized_agent_ids for isolation</h4>
                        <p className="text-ss-text-secondary text-sm">
                            Restrict each escrow to specific agents by their AAV agent IDs. This prevents one agent from 
                            accessing another agent's budget.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-ss-accent/20 flex items-center justify-center flex-shrink-0">
                        <Key className="w-4 h-4 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Keep AAV API keys secure</h4>
                        <p className="text-ss-text-secondary text-sm">
                            Your <InlineCode>aav_api_key</InlineCode> is stored encrypted. Never expose it in client-side code. 
                            The API returns <InlineCode>aav_api_key_configured: true/false</InlineCode> instead of the actual key.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-ss-accent/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-ss-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-ss-text mb-1">Enable certificates for high-security</h4>
                        <p className="text-ss-text-secondary text-sm">
                            Set <InlineCode>aav_require_certificate: true</InlineCode> for escrows with high-value transactions. 
                            Certificates provide cryptographic proof of agent identity.
                        </p>
                    </div>
                </div>
            </div>

            {/* Related Docs */}
            <DocsHeading level={2} id="related">Related Documentation</DocsHeading>

            <div className="grid md:grid-cols-2 gap-4">
                <Link 
                    to="/docs/concepts" 
                    className="block p-4 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                >
                    <h4 className="font-semibold text-ss-text mb-1">Concepts</h4>
                    <p className="text-ss-text-secondary text-sm">Learn about escrow accounts, spending policies, and the rules engine</p>
                </Link>
                <Link 
                    to="/docs/webhooks" 
                    className="block p-4 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                >
                    <h4 className="font-semibold text-ss-text mb-1">Webhooks</h4>
                    <p className="text-ss-text-secondary text-sm">Set up webhooks to receive AAV verification events</p>
                </Link>
                <Link 
                    to="/docs/api" 
                    className="block p-4 bg-ss-surface rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                >
                    <h4 className="font-semibold text-ss-text mb-1">API Reference</h4>
                    <p className="text-ss-text-secondary text-sm">Full API documentation for escrow accounts and spend requests</p>
                </Link>
                <a 
                    href="https://agentictrust.app" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-ss-surface rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition-colors"
                >
                    <h4 className="font-semibold text-purple-400 mb-1">Agentic Trust ↗</h4>
                    <p className="text-ss-text-secondary text-sm">Get your AAV API key and manage agent grants</p>
                </a>
            </div>
        </div>
    );
};

export default DocsAAVIntegration;
