import React from 'react';
import { DocsHeading, DocsText, Callout, ApiEndpoint, ParamTable, InlineCode } from '@/components/docs/DocsComponents';
import { CodeBlock } from '@/components/docs/DocsCodeBlock';

const DocsApiReference = () => {
    return (
        <div data-testid="docs-api-page">
            <DocsHeading level={1}>API Reference</DocsHeading>
            
            <DocsText>
                The Safe-Spend API is organized around REST. All requests should be made to:
            </DocsText>

            <CodeBlock 
                language="bash"
                code="https://api.safe-spend.dev/v1/"
            />

            <DocsHeading level={2} id="authentication">Authentication</DocsHeading>

            <DocsText>
                Safe-Spend supports two authentication methods:
            </DocsText>

            <div className="space-y-4 mb-6">
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-2">JWT Token (Dashboard/Org Auth)</h4>
                    <p className="text-ss-text-secondary text-sm mb-2">
                        Used for dashboard operations and full API access. Obtained via login.
                    </p>
                    <code className="text-sm text-ss-accent">Authorization: Bearer eyJhbG...</code>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-2">API Key</h4>
                    <p className="text-ss-text-secondary text-sm mb-2">
                        Used for programmatic access. Three types available:
                    </p>
                    <ul className="text-sm text-ss-text-secondary space-y-1 mb-2">
                        <li>• <InlineCode>sk_live_...</InlineCode> — Production access</li>
                        <li>• <InlineCode>sk_test_...</InlineCode> — Test mode (simulated funds)</li>
                        <li>• <InlineCode>sk_agent_...</InlineCode> — Agent-scoped (spend endpoints only)</li>
                    </ul>
                    <code className="text-sm text-ss-accent">Authorization: Bearer sk_live_...</code>
                    <p className="text-ss-text-tertiary text-xs mt-2">or</p>
                    <code className="text-sm text-ss-accent">X-API-Key: sk_live_...</code>
                </div>
            </div>

            <Callout type="warning" title="Agent Keys Are Restricted">
                Agent keys (<InlineCode>sk_agent_...</InlineCode>) can only access spend-related endpoints. 
                They cannot create/modify policies, fund accounts, or access organization settings.
            </Callout>

            {/* Auth Endpoints */}
            <DocsHeading level={2} id="auth">Auth & API Keys</DocsHeading>

            <DocsHeading level={3}>Sign Up</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/auth/signup" description="Create a new organization" />
            
            <ParamTable params={[
                { name: 'email', type: 'string', required: true, description: 'Organization email' },
                { name: 'password', type: 'string', required: true, description: 'Account password (min 8 chars)' },
                { name: 'name', type: 'string', required: true, description: 'Organization name' }
            ]} />

            <CodeBlock 
                language="json"
                title="Response"
                code={`{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "organization": {
    "id": "org_abc123",
    "name": "Acme Corp",
    "email": "team@acme.com"
  }
}`}
            />

            <DocsHeading level={3}>Login</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/auth/login" description="Authenticate and get JWT token" />

            <DocsHeading level={3}>Get Current User</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/auth/me" description="Get current organization details" />

            <DocsHeading level={3}>Create API Key</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/api-keys" description="Create a new API key" />
            
            <ParamTable params={[
                { name: 'key_type', type: 'string', required: false, description: '"live", "test", or "agent" (default: "live")' },
                { name: 'label', type: 'string', required: false, description: 'Human-readable label' },
                { name: 'permissions', type: 'array', required: false, description: 'Permissions array (for agent keys)' }
            ]} />

            <Callout type="warning" title="Key Shown Once">
                The full API key is only returned in the creation response. Store it securely.
            </Callout>

            <DocsHeading level={3}>List API Keys</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/api-keys" description="List all API keys for the organization" />

            <DocsHeading level={3}>Revoke API Key</DocsHeading>
            <ApiEndpoint method="DELETE" path="/v1/api-keys/:id" description="Permanently revoke an API key" />

            {/* Escrow Accounts */}
            <DocsHeading level={2} id="escrow">Escrow Accounts</DocsHeading>

            <DocsText>
                Escrow accounts hold funds that agents can spend against. Each account has its own balance and can have multiple policies attached.
            </DocsText>

            <DocsHeading level={3}>Create Escrow Account</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/escrow-accounts" description="Create a new escrow account" playgroundScenario="create-escrow" />
            
            <ParamTable params={[
                { name: 'name', type: 'string', required: true, description: 'Account name' },
                { name: 'description', type: 'string', required: false, description: 'Account description' },
                { name: 'agent_id', type: 'string', required: false, description: 'Agent ID (agt_ format). Links escrow to a specific agent.' }
            ]} />

            <CodeBlock 
                language="json"
                title="Response"
                code={`{
  "id": "esc_9f3k2m",
  "agent_id": "agt_1a2b3c4d5e6f7890abcdef12",
  "name": "Marketing Agent Budget",
  "description": "Budget for marketing automation agent",
  "balance_cents": 0,
  "currency": "usd",
  "status": "active",
  "created_at": "2026-03-24T12:00:00Z"
}`}
            />

            <DocsHeading level={3}>List Escrow Accounts</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/escrow-accounts" description="List all escrow accounts" />

            <DocsHeading level={3}>Get Escrow Account</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/escrow-accounts/:id" description="Get a specific escrow account" playgroundScenario="check-balance" />

            <DocsHeading level={3}>Fund Escrow Account</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/escrow-accounts/:id/fund" description="Add funds to an escrow account" />
            
            <ParamTable params={[
                { name: 'amount_cents', type: 'integer', required: true, description: 'Amount to add in cents' }
            ]} />

            <DocsHeading level={3}>Pause Escrow Account</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/escrow-accounts/:id/pause" description="Temporarily pause all spending from this account" />

            <DocsHeading level={3}>Resume Escrow Account</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/escrow-accounts/:id/resume" description="Resume spending on a paused account" />

            <DocsHeading level={3}>Close Escrow Account</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/escrow-accounts/:id/close" description="Permanently close an escrow account" />

            {/* Spending Policies */}
            <DocsHeading level={2} id="policies">Spending Policies</DocsHeading>

            <DocsText>
                Policies define the rules that govern spending from an escrow account. Each policy is evaluated in a 14-step validation cascade (steps 0-13). New fields include <InlineCode>min_reputation_score</InlineCode> and <InlineCode>reputation_spending_boost</InlineCode> for RepLedger reputation integration.
            </DocsText>

            <DocsHeading level={3}>Create Policy</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/policies" description="Create a new spending policy" playgroundScenario="set-policy" />
            
            <ParamTable params={[
                { name: 'escrow_id', type: 'string', required: true, description: 'Escrow account to attach policy to' },
                { name: 'name', type: 'string', required: true, description: 'Policy name' },
                { name: 'is_active', type: 'boolean', required: false, description: 'Whether policy is active (default: true)' },
                { name: 'per_transaction_limit_cents', type: 'integer', required: false, description: 'Max per transaction' },
                { name: 'daily_limit_cents', type: 'integer', required: false, description: 'Daily spending cap' },
                { name: 'weekly_limit_cents', type: 'integer', required: false, description: 'Weekly spending cap' },
                { name: 'monthly_limit_cents', type: 'integer', required: false, description: 'Monthly spending cap' },
                { name: 'allowed_vendors', type: 'array', required: false, description: 'Vendor allowlist' },
                { name: 'blocked_vendors', type: 'array', required: false, description: 'Vendor blocklist' },
                { name: 'allowed_categories', type: 'array', required: false, description: 'Category allowlist' },
                { name: 'blocked_categories', type: 'array', required: false, description: 'Category blocklist' },
                { name: 'auto_approve_under_cents', type: 'integer', required: false, description: 'Auto-approve threshold' },
                { name: 'require_human_above_cents', type: 'integer', required: false, description: 'Human approval threshold' },
                { name: 'approval_timeout_minutes', type: 'integer', required: false, description: 'Approval expiration (default: 60)' }
            ]} />

            <DocsHeading level={3}>List Policies</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/policies" description="List all policies" />

            <DocsHeading level={3}>Get Policy</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/policies/:id" description="Get a specific policy" />

            <DocsHeading level={3}>Update Policy</DocsHeading>
            <ApiEndpoint method="PATCH" path="/v1/policies/:id" description="Update a policy" />

            <DocsHeading level={3}>Delete Policy</DocsHeading>
            <ApiEndpoint method="DELETE" path="/v1/policies/:id" description="Delete a policy" />

            {/* Spend Requests */}
            <DocsHeading level={2} id="spend">Spend Requests</DocsHeading>

            <DocsText>
                Spend requests are the core of Safe-Spend. Each request is evaluated against all active policies 
                and either approved, denied, or sent for human approval.
            </DocsText>

            <DocsHeading level={3}>Create Spend Request</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/spend" description="Request a disbursement from an escrow account" playgroundScenario="submit-spend" />
            
            <ParamTable params={[
                { name: 'escrow_id', type: 'string', required: true, description: 'Escrow account ID' },
                { name: 'amount_cents', type: 'integer', required: true, description: 'Amount in cents' },
                { name: 'currency', type: 'string', required: false, description: 'Currency code (default: "usd")' },
                { name: 'vendor', type: 'string', required: true, description: 'Vendor/merchant name' },
                { name: 'category', type: 'string', required: false, description: 'Spending category' },
                { name: 'description', type: 'string', required: false, description: 'Description of the spend' },
                { name: 'agent_id', type: 'string', required: false, description: 'Agent ID (agt_ format). Required when AAV_ENABLED=true.' },
                { name: 'idempotency_key', type: 'string', required: false, description: 'Unique key to prevent duplicates' },
                { name: 'metadata', type: 'object', required: false, description: 'Additional metadata' }
            ]} />

            <DocsText>
                <strong className="text-ss-text">Possible Statuses:</strong>
            </DocsText>
            <ul className="list-disc list-inside space-y-1 mb-6 text-ss-text-secondary">
                <li><InlineCode>approved</InlineCode> — Spend was approved and balance deducted</li>
                <li><InlineCode>denied</InlineCode> — Spend violated a policy rule</li>
                <li><InlineCode>pending_approval</InlineCode> — Waiting for human approval</li>
                <li><InlineCode>expired</InlineCode> — Approval request timed out</li>
                <li><InlineCode>cancelled</InlineCode> — Approval was denied by a human</li>
            </ul>

            <CodeBlock 
                language="json"
                title="Response"
                code={`{
  "id": "spr_abc123",
  "escrow_id": "esc_9f3k2m",
  "amount_cents": 4999,
  "currency": "usd",
  "vendor": "Anthropic",
  "category": "ai_compute",
  "status": "approved",
  "rules_evaluated": [
    { "rule": "balance_check", "result": "pass" },
    { "rule": "per_transaction_limit", "result": "pass" },
    { "rule": "daily_cap_check", "result": "pass" },
    { "rule": "vendor_allowlist", "result": "pass" },
    { "rule": "auto_approve_threshold", "result": "auto_approved" }
  ],
  "created_at": "2026-03-24T12:00:00Z"
}`}
            />

            <Callout type="info" title="Idempotency">
                Use <InlineCode>idempotency_key</InlineCode> to safely retry requests. If a request with the same 
                key was already processed, Safe-Spend returns the original result instead of creating a duplicate.
            </Callout>

            <DocsHeading level={3}>Get Spend Request</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/spend/:id" description="Get a specific spend request" />

            <DocsHeading level={3}>List Spend Requests</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/spend" description="List all spend requests" />

            {/* Agent Endpoints */}
            <DocsHeading level={2} id="agents">Agent Endpoints</DocsHeading>

            <DocsText>
                Query escrow accounts and spend history scoped to a specific agent.
            </DocsText>

            <DocsHeading level={3}>List Agent Escrow Accounts</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/agents/{agent_id}/escrow-accounts" description="List escrow accounts linked to this agent" />

            <DocsHeading level={3}>Agent Spend History</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/agents/{agent_id}/spend-history" description="Paginated spend history for this agent" />

            <ParamTable params={[
                { name: 'limit', type: 'integer', required: false, description: 'Results per page (default: 50)' },
                { name: 'offset', type: 'integer', required: false, description: 'Offset for pagination' },
                { name: 'status', type: 'string', required: false, description: 'Filter by status (approved, denied, pending)' }
            ]} />

            {/* Certificate Mapping */}
            <DocsHeading level={2} id="certificates">Agent Certificates</DocsHeading>

            <DocsText>
                Map agent IDs to AAV certificate IDs for authority verification.
            </DocsText>

            <DocsHeading level={3}>Create Certificate Mapping</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/agent-certificates" description="Create or update a certificate mapping" />
            <ParamTable params={[
                { name: 'agent_id', type: 'string', required: true, description: 'Agent ID (agt_ format)' },
                { name: 'certificate_id', type: 'string', required: true, description: 'AAV certificate ID (cert_ format)' }
            ]} />

            <DocsHeading level={3}>Get Certificate Mapping</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/agent-certificates/{agent_id}" description="Get certificate mapping for an agent" />

            <DocsHeading level={3}>Delete Certificate Mapping</DocsHeading>
            <ApiEndpoint method="DELETE" path="/v1/agent-certificates/{agent_id}" description="Remove certificate mapping" />

            {/* Approvals */}
            <DocsHeading level={2} id="approvals">Approvals</DocsHeading>

            <DocsText>
                When a spend exceeds the auto-approve threshold, it creates an approval request that must be 
                approved or denied by a human via the dashboard or API.
            </DocsText>

            <DocsHeading level={3}>List Approvals</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/approvals" description="List all approval requests" playgroundScenario="list-approvals" />

            <DocsHeading level={3}>Get Approval</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/approvals/:id" description="Get a specific approval" />

            <DocsHeading level={3}>Approve Request</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/approvals/:id/approve" description="Approve a pending request" />
            
            <ParamTable params={[
                { name: 'note', type: 'string', required: false, description: 'Optional approval note' }
            ]} />

            <Callout type="info" title="JWT Required">
                Approval/denial requires JWT authentication. Agent keys cannot approve or deny requests.
            </Callout>

            <DocsHeading level={3}>Deny Request</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/approvals/:id/deny" description="Deny a pending request" />
            
            <ParamTable params={[
                { name: 'reason', type: 'string', required: false, description: 'Denial reason' },
                { name: 'note', type: 'string', required: false, description: 'Optional denial note' }
            ]} />

            {/* Audit Log */}
            <DocsHeading level={2} id="audit">Audit Log</DocsHeading>

            <DocsText>
                Every action in Safe-Spend is logged to an immutable audit trail. Query the audit log to 
                understand what happened, when, and by whom.
            </DocsText>

            <DocsHeading level={3}>List Audit Events</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/audit" description="List audit events with optional filters" playgroundScenario="view-audit" />
            
            <ParamTable params={[
                { name: 'event_type', type: 'string', required: false, description: 'Filter by event type' },
                { name: 'escrow_id', type: 'string', required: false, description: 'Filter by escrow account' },
                { name: 'start_date', type: 'string', required: false, description: 'Filter from date (ISO 8601)' },
                { name: 'end_date', type: 'string', required: false, description: 'Filter to date (ISO 8601)' },
                { name: 'limit', type: 'integer', required: false, description: 'Max results (default: 50)' }
            ]} />

            <CodeBlock 
                language="json"
                title="Response"
                code={`{
  "data": [
    {
      "id": "evt_xyz789",
      "event_type": "spend.approved",
      "actor_type": "agent",
      "actor_id": "key_abc123",
      "details": {
        "spend_id": "spr_abc123",
        "amount_cents": 4999,
        "vendor": "Anthropic"
      },
      "created_at": "2026-03-24T12:00:00Z"
    }
  ],
  "total": 1
}`}
            />

            {/* Webhooks */}
            <DocsHeading level={2} id="webhooks">Webhooks API</DocsHeading>

            <DocsText>
                Register webhook endpoints to receive real-time notifications about events in your organization.
                See the <a href="/docs/webhooks" className="text-ss-accent hover:underline">Webhooks documentation</a> for 
                payload formats and signature verification.
            </DocsText>

            <DocsHeading level={3}>Create Webhook</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/webhooks" description="Register a webhook endpoint" />
            
            <ParamTable params={[
                { name: 'url', type: 'string', required: true, description: 'HTTPS endpoint URL' },
                { name: 'events', type: 'array', required: true, description: 'Event types to subscribe to' }
            ]} />

            <DocsHeading level={3}>List Webhooks</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/webhooks" description="List all webhooks" />

            <DocsHeading level={3}>Delete Webhook</DocsHeading>
            <ApiEndpoint method="DELETE" path="/v1/webhooks/:id" description="Delete a webhook" />

            <DocsHeading level={3}>Rotate Secret</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/webhooks/:id/rotate-secret" description="Generate a new webhook secret" />

            <DocsHeading level={3}>Test Webhook</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/webhooks/:id/test" description="Send a test event to the webhook" />

            {/* Control Plane */}
            <DocsHeading level={2} id="control-plane">Control Plane API</DocsHeading>

            <DocsText>
                Read-only endpoints consumed by the Agentic Trust control plane for Agent Card data and org dashboards.
            </DocsText>

            <DocsHeading level={3}>Organization Summary</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/org/{org_id}/summary" description="Aggregated org statistics" />

            <DocsHeading level={3}>Agent Card Data</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/agents/{agent_id}/card-data" description="Agent financial card for control plane" />

            {/* Organization Linking */}
            <DocsHeading level={2} id="org-linking">Organization Linking</DocsHeading>

            <DocsText>
                Link your Safe-Spend account to an AAV organization for cross-platform features.
            </DocsText>

            <DocsHeading level={3}>Link Organization</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/org/link" description="Link to an AAV organization using a link token" />
            <ParamTable params={[
                { name: 'link_token', type: 'string', required: true, description: 'Link token (lnk_ format) from AAV' }
            ]} />

            <DocsHeading level={3}>Get Link Status</DocsHeading>
            <ApiEndpoint method="GET" path="/v1/org/link" description="Check if organization is linked" />

            {/* Internal Events */}
            <DocsHeading level={2} id="internal-events">Internal Events</DocsHeading>

            <DocsText>
                Receives cross-tool events from AAV and RepLedger via HMAC-SHA256 authenticated requests.
            </DocsText>

            <DocsHeading level={3}>Receive Internal Event</DocsHeading>
            <ApiEndpoint method="POST" path="/v1/internal/events" description="Receive cross-tool events (HMAC auth)" />
        </div>
    );
};

export default DocsApiReference;
