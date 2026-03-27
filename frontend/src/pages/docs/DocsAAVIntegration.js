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

            {/* ================================================= */}
            {/* AGENT ID SECTION                                  */}
            {/* ================================================= */}
            <DocsHeading level={2} id="agent-id">Agent ID (agt_ format)</DocsHeading>
            
            <DocsText>
                Every AI agent interacting with Safe-Spend is identified by a unique <InlineCode>agent_id</InlineCode> in 
                the format <InlineCode>agt_</InlineCode> followed by 24 hexadecimal characters. 
                Agent IDs are used to link escrows, track spend history, and enable AAV/ARL integrations.
            </DocsText>

            <Callout type="info" title="Format Reference">
                <InlineCode>agt_1a2b3c4d5e6f7890abcdef12</InlineCode> &mdash; always lowercase hex after the <InlineCode>agt_</InlineCode> prefix.
            </Callout>

            <DocsHeading level={3} id="agent-id-usage">Using agent_id</DocsHeading>
            
            <DocsList items={[
                <><strong className="text-ss-text">Spend Requests</strong>: Pass <InlineCode>agent_id</InlineCode> in the body of POST /v1/spend. Required when AAV_ENABLED=true.</>,
                <><strong className="text-ss-text">Escrow Accounts</strong>: Pass <InlineCode>agent_id</InlineCode> when creating an escrow to link it to a specific agent. If set, only that agent can spend from it.</>,
                <><strong className="text-ss-text">Agent-scoped queries</strong>: Use GET /v1/agents/:agent_id/escrow-accounts and /spend-history to query by agent.</>
            ]} />

            <CodeBlock
                language="bash"
                title="Create agent-linked escrow"
                code={`curl -X POST https://api.safe-spend.dev/v1/escrow-accounts \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Agent Alpha Budget",
    "agent_id": "agt_1a2b3c4d5e6f7890abcdef12",
    "aav_enabled": true
  }'`}
            />

            <CodeBlock
                language="bash"
                title="Spend with agent_id"
                code={`curl -X POST https://api.safe-spend.dev/v1/spend \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "escrow_id": "esc_...",
    "amount_cents": 4999,
    "vendor": "cloud-provider",
    "agent_id": "agt_1a2b3c4d5e6f7890abcdef12"
  }'`}
            />

            {/* Agent-scoped endpoints */}
            <DocsHeading level={3} id="agent-endpoints">Agent-Scoped Endpoints</DocsHeading>

            <ApiEndpoint method="GET" path="/v1/agents/{agent_id}/escrow-accounts" />
            <DocsText>
                Returns all escrow accounts linked to the specified agent, either by direct <InlineCode>agent_id</InlineCode> or 
                through the <InlineCode>authorized_agent_ids</InlineCode> list.
            </DocsText>

            <ApiEndpoint method="GET" path="/v1/agents/{agent_id}/spend-history" />
            <DocsText>
                Paginated spend request history for a specific agent. Supports <InlineCode>?status=</InlineCode>, 
                <InlineCode>?limit=</InlineCode>, and <InlineCode>?offset=</InlineCode> query parameters.
            </DocsText>

            {/* ================================================= */}
            {/* CERTIFICATE MAPPING SECTION                        */}
            {/* ================================================= */}
            <DocsHeading level={2} id="certificate-mapping">Certificate Mapping</DocsHeading>
            
            <DocsText>
                Certificate mappings link an <InlineCode>agent_id</InlineCode> to an AAV <InlineCode>certificate_id</InlineCode>. 
                When a spend request includes an <InlineCode>agent_id</InlineCode>, Safe-Spend automatically looks up the 
                certificate and includes it in the AAV verification call.
            </DocsText>

            <ApiEndpoint method="POST" path="/v1/agent-certificates" />
            <CodeBlock
                language="json"
                title="Request body"
                code={`{
  "agent_id": "agt_1a2b3c4d5e6f7890abcdef12",
  "certificate_id": "cert_abc123def456"
}`}
            />

            <ApiEndpoint method="GET" path="/v1/agent-certificates/{agent_id}" />
            <DocsText>Returns the certificate mapping for an agent.</DocsText>

            <ApiEndpoint method="DELETE" path="/v1/agent-certificates/{agent_id}" />
            <DocsText>Removes the certificate mapping.</DocsText>

            {/* ================================================= */}
            {/* AUTHORITY VERIFICATION (STEP 0) SECTION            */}
            {/* ================================================= */}
            <DocsHeading level={2} id="authority-verification">Authority Verification (Step 0)</DocsHeading>
            
            <DocsText>
                When <InlineCode>AAV_ENABLED=true</InlineCode> and a spend request includes an <InlineCode>agent_id</InlineCode>, 
                Safe-Spend runs <strong className="text-ss-text">Step 0: Authority Verification</strong> before the 13-step 
                rules engine. This step calls AAV's <InlineCode>/api/v1/verify</InlineCode> endpoint.
            </DocsText>

            <Callout type="warning" title="Fail-Closed by Default">
                For financial operations, Safe-Spend defaults to <strong>fail-closed</strong>. If AAV is unreachable, 
                the spend is denied rather than allowed through.
            </Callout>

            <DocsHeading level={3} id="verification-flow">Verification Flow</DocsHeading>
            <DocsList items={[
                <><strong className="text-ss-text">authorized: true</strong> &rarr; Proceed to Step 1 (rules engine)</>,
                <><strong className="text-ss-text">denied</strong> &rarr; Deny with reason "Authority verification failed: &#123;reason&#125;"</>,
                <><strong className="text-ss-text">approval_required</strong> &rarr; Hold as pending_approval with note "Awaiting AAV authority approval"</>,
                <><strong className="text-ss-text">unreachable</strong> &rarr; Deny (fail-closed for financial operations)</>
            ]} />

            <DocsText>
                The authority verification result appears in <InlineCode>rules_evaluated</InlineCode> with:
            </DocsText>
            <CodeBlock
                language="json"
                title="Authority verification in rules_evaluated"
                code={`{
  "rule": "authority_verification",
  "passed": true,
  "source": "aav",
  "verification_id": "verif_..."
}`}
            />

            <DocsHeading level={3} id="rules-engine-14-steps">Updated Rules Engine (Steps 0-13)</DocsHeading>
            <DocsList ordered items={[
                <><strong className="text-ss-text">Step 0</strong>: Authority Verification (AAV) &mdash; skipped when AAV not configured</>,
                <><strong className="text-ss-text">Step 1</strong>: Key Validation</>,
                <><strong className="text-ss-text">Step 2</strong>: Escrow Account Check</>,
                <><strong className="text-ss-text">Step 2.5</strong>: AAV Agent Authorization (escrow-level)</>,
                <><strong className="text-ss-text">Step 3</strong>: Idempotency Check</>,
                <><strong className="text-ss-text">Step 3.5</strong>: Reputation Check (ARL) &mdash; skipped when min_reputation_score not set</>,
                <><strong className="text-ss-text">Step 4</strong>: Balance Check</>,
                <><strong className="text-ss-text">Step 5</strong>: Per-Transaction Limit</>,
                <><strong className="text-ss-text">Step 6</strong>: Daily Cap</>,
                <><strong className="text-ss-text">Step 7</strong>: Weekly Cap</>,
                <><strong className="text-ss-text">Step 8</strong>: Monthly Cap</>,
                <><strong className="text-ss-text">Step 9</strong>: Vendor Check</>,
                <><strong className="text-ss-text">Step 10</strong>: Category Check</>,
                <><strong className="text-ss-text">Step 11</strong>: Time Window Check</>,
                <><strong className="text-ss-text">Step 12</strong>: Approval Threshold (with reputation boost)</>,
                <><strong className="text-ss-text">Step 13</strong>: Execute</>
            ]} />

            {/* ================================================= */}
            {/* ARL REPUTATION SECTION                             */}
            {/* ================================================= */}
            <DocsHeading level={2} id="arl-reputation">ARL Reputation Integration</DocsHeading>
            
            <DocsText>
                The Agent Reputation Ledger (ARL) tracks agent trustworthiness based on their spending history. 
                Safe-Spend integrates with ARL in two ways:
            </DocsText>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <h4 className="font-semibold text-ss-text">Outcome Reporting</h4>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        After every spend (approved, denied, expired), Safe-Spend reports the outcome to ARL asynchronously. 
                        This builds the agent's reputation score over time.
                    </p>
                </div>
                <div className="bg-ss-surface p-5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-yellow-400" />
                        </div>
                        <h4 className="font-semibold text-ss-text">Reputation Gating</h4>
                    </div>
                    <p className="text-ss-text-secondary text-sm">
                        Spending policies can require a minimum reputation score and grant Platinum-tier agents 
                        2x auto-approve limits.
                    </p>
                </div>
            </div>

            <DocsHeading level={3} id="arl-env">Environment Variables</DocsHeading>
            <CodeBlock
                language="bash"
                title="ARL Configuration"
                code={`ARL_API_URL="https://repledger.agentictrust.app"
ARL_API_KEY="arl_your_key_here"
ARL_ENABLED="true"   # Set to "true" to enable`}
            />

            <DocsHeading level={3} id="reputation-policy">Reputation Policy Fields</DocsHeading>
            <DocsText>
                Add these fields to your spending policy to enable reputation-based controls:
            </DocsText>
            <CodeBlock
                language="json"
                title="Policy with reputation fields"
                code={`{
  "escrow_id": "esc_...",
  "name": "Reputation-gated policy",
  "min_reputation_score": 50,
  "reputation_spending_boost": true,
  "auto_approve_under_cents": 10000,
  ...
}`}
            />
            <DocsList items={[
                <><InlineCode>min_reputation_score</InlineCode> (0-100): Deny if agent score is below this threshold.</>,
                <><InlineCode>reputation_spending_boost</InlineCode> (bool): If true, Platinum agents (score &ge; 90) get 2x the <InlineCode>auto_approve_under_cents</InlineCode> limit.</>
            ]} />

            <DocsHeading level={3} id="arl-tiers">Reputation Tiers</DocsHeading>
            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Tier</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Score Range</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Boost</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Bronze</td><td className="py-2 px-4">0-49</td><td className="py-2 px-4">None</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Silver</td><td className="py-2 px-4">50-74</td><td className="py-2 px-4">None</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Gold</td><td className="py-2 px-4">75-89</td><td className="py-2 px-4">None</td></tr>
                        <tr><td className="py-2 px-4 text-yellow-400 font-semibold">Platinum</td><td className="py-2 px-4">90-100</td><td className="py-2 px-4">2x auto-approve limit</td></tr>
                    </tbody>
                </table>
            </div>

            {/* ================================================= */}
            {/* CROSS-TOOL EVENTS SECTION                          */}
            {/* ================================================= */}
            <DocsHeading level={2} id="cross-tool-events">Cross-Tool Events</DocsHeading>
            
            <DocsText>
                Safe-Spend emits and receives cross-tool events for integration with AAV and ARL. 
                Events use a standard envelope format for inter-service communication.
            </DocsText>

            <DocsHeading level={3} id="event-envelope">Event Envelope</DocsHeading>
            <CodeBlock
                language="json"
                title="Cross-tool event format"
                code={`{
  "id": "evt_at_a1b2c3d4e5f6",
  "source": "safe_spend",
  "event_type": "safe_spend.spend.approved",
  "org_id": "org_...",
  "uaid": "agt_...",
  "timestamp": "2026-03-27T12:00:00.000Z",
  "data": {
    "spend_request_id": "spr_...",
    "escrow_id": "esc_...",
    "amount_cents": 4999,
    "vendor": "cloud-provider",
    "rules_evaluated": [...]
  }
}`}
            />

            <DocsHeading level={3} id="emitted-events">Emitted Event Types</DocsHeading>
            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Event Type</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Trigger</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4"><InlineCode>safe_spend.spend.approved</InlineCode></td><td className="py-2 px-4">Spend approved</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4"><InlineCode>safe_spend.spend.denied</InlineCode></td><td className="py-2 px-4">Spend denied by rules engine</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4"><InlineCode>safe_spend.spend.expired</InlineCode></td><td className="py-2 px-4">Pending spend expired</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4"><InlineCode>safe_spend.escrow.paused</InlineCode></td><td className="py-2 px-4">Escrow paused</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4"><InlineCode>safe_spend.escrow.closed</InlineCode></td><td className="py-2 px-4">Escrow closed</td></tr>
                        <tr><td className="py-2 px-4"><InlineCode>safe_spend.escrow.funded</InlineCode></td><td className="py-2 px-4">Escrow funded</td></tr>
                    </tbody>
                </table>
            </div>

            <DocsHeading level={3} id="internal-events-endpoint">Receiving Internal Events</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/internal/events" />
            <DocsText>
                Receives events from AAV and ARL via HMAC-SHA256 authenticated requests. 
                The signature is sent in the <InlineCode>X-AgenticTrust-Signature</InlineCode> header.
            </DocsText>

            <DocsText>Accepted event types:</DocsText>
            <DocsList items={[
                <><InlineCode>aav.grant.revoked</InlineCode>: Pauses linked escrow accounts</>,
                <><InlineCode>aav.grant.created</InlineCode>: Logs event (auto-provision coming soon)</>,
                <><InlineCode>arl.score.changed</InlineCode>: Updates cached reputation scores</>
            ]} />

            {/* ================================================= */}
            {/* ORGANIZATION LINKING                                */}
            {/* ================================================= */}
            <DocsHeading level={2} id="org-linking">Organization Linking</DocsHeading>
            
            <DocsText>
                Link your Safe-Spend account to an AAV organization to enable cross-platform features.
            </DocsText>

            <ApiEndpoint method="POST" path="/v1/org/link" />
            <CodeBlock
                language="json"
                title="Link organization"
                code={`{
  "link_token": "lnk_..."
}

// Response:
{
  "linked": true,
  "organization_id": "org_..."
}`}
            />

            {/* ================================================= */}
            {/* CONTROL PLANE API                                  */}
            {/* ================================================= */}
            <DocsHeading level={2} id="control-plane">Control Plane API</DocsHeading>
            
            <DocsText>
                These read-only endpoints are consumed by the Agentic Trust control plane 
                (<InlineCode>agentictrust.app</InlineCode>) for Agent Card data and dashboard statistics.
            </DocsText>

            <ApiEndpoint method="GET" path="/v1/control-plane/org/{org_id}/summary" />
            <CodeBlock
                language="json"
                title="Org summary response"
                code={`{
  "tool": "safe_spend",
  "org_id": "org_...",
  "total_balance_cents": 500000,
  "active_escrows": 3,
  "spends_today": 15,
  "spends_this_week": 72,
  "denial_rate_7d": 0.05
}`}
            />

            <ApiEndpoint method="GET" path="/v1/control-plane/agents/{agent_id}/card-data" />
            <CodeBlock
                language="json"
                title="Agent card-data response"
                code={`{
  "tool": "safe_spend",
  "agent_id": "agt_...",
  "financial": {
    "has_funded_escrow": true,
    "escrow_status": "active",
    "escrow_count": 1,
    "remaining_balance_available": true
  }
}`}
            />

            {/* ================================================= */}
            {/* ID FORMAT REFERENCE                                 */}
            {/* ================================================= */}
            <DocsHeading level={2} id="id-formats">ID Format Reference</DocsHeading>
            <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Entity</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Prefix</th>
                            <th className="text-left py-3 px-4 text-ss-text font-semibold">Example</th>
                        </tr>
                    </thead>
                    <tbody className="text-ss-text-secondary">
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Agent</td><td className="py-2 px-4"><InlineCode>agt_</InlineCode></td><td className="py-2 px-4">agt_1a2b3c4d5e6f7890abcdef12</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Organization</td><td className="py-2 px-4"><InlineCode>org_</InlineCode></td><td className="py-2 px-4">org_7kawbu8xm1q6</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Escrow Account</td><td className="py-2 px-4"><InlineCode>esc_</InlineCode></td><td className="py-2 px-4">esc_94lfhqfhvvg2</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Spend Request</td><td className="py-2 px-4"><InlineCode>spr_</InlineCode></td><td className="py-2 px-4">spr_a1b2c3d4e5f6</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Policy</td><td className="py-2 px-4"><InlineCode>pol_</InlineCode></td><td className="py-2 px-4">pol_x9y8z7w6v5u4</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Certificate</td><td className="py-2 px-4"><InlineCode>cert_</InlineCode></td><td className="py-2 px-4">cert_abc123def456</td></tr>
                        <tr className="border-b border-[rgba(255,255,255,0.03)]"><td className="py-2 px-4">Cross-tool Event</td><td className="py-2 px-4"><InlineCode>evt_at_</InlineCode></td><td className="py-2 px-4">evt_at_a1b2c3d4e5f6</td></tr>
                        <tr><td className="py-2 px-4">Link Token</td><td className="py-2 px-4"><InlineCode>lnk_</InlineCode></td><td className="py-2 px-4">lnk_test123456789012</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DocsAAVIntegration;
