import React from 'react';
import { Link } from 'react-router-dom';
import { DocsHeading, DocsText, Callout, InlineCode } from '@/components/docs/DocsComponents';
import { CodeBlock, TabbedCodeBlock } from '@/components/docs/DocsCodeBlock';
import { ArrowRight, CheckCircle } from 'lucide-react';

const DocsQuickstart = () => {
    const createEscrowTabs = [
        {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST https://api.safespend.app/v1/escrow-accounts \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Marketing Agent Budget",
    "description": "Test budget for GPT-4 marketing agent"
  }'`
        },
        {
            label: 'Python',
            language: 'python',
            code: `import requests

API_KEY = "sk_test_..."
BASE_URL = "https://api.safespend.app"

response = requests.post(
    f"{BASE_URL}/v1/escrow-accounts",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "name": "Marketing Agent Budget",
        "description": "Test budget for GPT-4 marketing agent"
    }
)

escrow = response.json()
print(f"Created escrow: {escrow['id']}")`
        },
        {
            label: 'TypeScript',
            language: 'typescript',
            code: `const response = await fetch('https://api.safespend.app/v1/escrow-accounts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_test_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Marketing Agent Budget',
    description: 'Test budget for GPT-4 marketing agent'
  })
});

const escrow = await response.json();
console.log(\`Created escrow: \${escrow.id}\`);`
        }
    ];

    const fundEscrowTabs = [
        {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST https://api.safespend.app/v1/escrow-accounts/esc_xxx/fund \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount_cents": 100000
  }'`
        },
        {
            label: 'Python',
            language: 'python',
            code: `response = requests.post(
    f"{BASE_URL}/v1/escrow-accounts/{escrow['id']}/fund",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={"amount_cents": 100000}  # $1,000.00
)

print(f"New balance: \${response.json()['balance_cents'] / 100:.2f}")`
        }
    ];

    const createPolicyTabs = [
        {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST https://api.safespend.app/v1/policies \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "escrow_id": "esc_xxx",
    "name": "Agent Spending Policy",
    "per_transaction_limit_cents": 10000,
    "daily_limit_cents": 50000,
    "allowed_vendors": ["Anthropic", "OpenAI"],
    "allowed_categories": ["ai_compute"],
    "auto_approve_under_cents": 5000,
    "require_human_above_cents": 5000
  }'`
        },
        {
            label: 'Python',
            language: 'python',
            code: `response = requests.post(
    f"{BASE_URL}/v1/policies",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "escrow_id": escrow["id"],
        "name": "Agent Spending Policy",
        "per_transaction_limit_cents": 10000,   # $100 max per tx
        "daily_limit_cents": 50000,              # $500/day cap
        "allowed_vendors": ["Anthropic", "OpenAI"],
        "allowed_categories": ["ai_compute"],
        "auto_approve_under_cents": 5000,        # Auto-approve < $50
        "require_human_above_cents": 5000        # Human approval >= $50
    }
)

policy = response.json()
print(f"Created policy: {policy['id']}")`
        }
    ];

    const makeSpendTabs = [
        {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST https://api.safespend.app/v1/spend \\
  -H "Authorization: Bearer sk_agent_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "escrow_id": "esc_xxx",
    "amount_cents": 4999,
    "currency": "usd",
    "vendor": "Anthropic",
    "category": "ai_compute",
    "description": "Claude API credits top-up",
    "idempotency_key": "quickstart-001"
  }'`
        },
        {
            label: 'Python',
            language: 'python',
            code: `import requests

API_KEY = "sk_agent_..."  # Use agent key for spend requests
BASE_URL = "https://api.safespend.app"

response = requests.post(
    f"{BASE_URL}/v1/spend",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "escrow_id": "esc_xxx",
        "amount_cents": 4999,
        "currency": "usd",
        "vendor": "Anthropic",
        "category": "ai_compute",
        "description": "Claude API credits top-up",
        "idempotency_key": "quickstart-001"
    }
)

result = response.json()
print(f"Status: {result['status']}")
# Output: Status: approved`
        },
        {
            label: 'TypeScript',
            language: 'typescript',
            code: `const response = await fetch('https://api.safespend.app/v1/spend', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_agent_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    escrow_id: 'esc_xxx',
    amount_cents: 4999,
    currency: 'usd',
    vendor: 'Anthropic',
    category: 'ai_compute',
    description: 'Claude API credits top-up',
    idempotency_key: 'quickstart-001'
  })
});

const result = await response.json();
console.log(\`Status: \${result.status}\`);
// Output: Status: approved`
        }
    ];

    return (
        <div data-testid="docs-quickstart-page">
            <DocsHeading level={1}>Quickstart</DocsHeading>
            
            <DocsText>
                Get from zero to your first test spend in about 10-15 minutes. This guide walks you through 
                creating an escrow account, defining a policy, and making a spend request.
            </DocsText>

            <Callout type="info" title="Test Mode">
                All examples use test keys (<InlineCode>sk_test_...</InlineCode>). Test mode uses simulated funds 
                so you can experiment without real money.
            </Callout>

            {/* Step 1 */}
            <DocsHeading level={2} id="step-1">Step 1: Get API Keys</DocsHeading>

            <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-ss-accent text-ss-bg font-bold flex items-center justify-center flex-shrink-0">1</div>
                <div>
                    <DocsText>
                        Sign up at <Link to="/signup" className="text-ss-accent hover:underline">safespend.app/signup</Link> and 
                        create your organization.
                    </DocsText>
                </div>
            </div>

            <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-ss-accent text-ss-bg font-bold flex items-center justify-center flex-shrink-0">2</div>
                <div>
                    <DocsText>
                        Go to <strong className="text-ss-text">Dashboard → API Keys</strong> and create a new test key.
                    </DocsText>
                </div>
            </div>

            <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-ss-accent text-ss-bg font-bold flex items-center justify-center flex-shrink-0">3</div>
                <div>
                    <DocsText>
                        Copy the key (e.g., <InlineCode>sk_test_abc123...</InlineCode>). You'll only see it once!
                    </DocsText>
                </div>
            </div>

            <Callout type="warning" title="Save Your Key">
                API keys are only shown once when created. Store it securely — you cannot retrieve it later.
            </Callout>

            {/* Step 2 */}
            <DocsHeading level={2} id="step-2">Step 2: Create an Escrow Account</DocsHeading>

            <DocsText>
                An escrow account holds the funds your agent will spend against. Create one with a descriptive name:
            </DocsText>

            <TabbedCodeBlock tabs={createEscrowTabs} />

            <DocsText>Response:</DocsText>

            <CodeBlock 
                language="json"
                code={`{
  "id": "esc_9f3k2m",
  "name": "Marketing Agent Budget",
  "description": "Test budget for GPT-4 marketing agent",
  "balance_cents": 0,
  "currency": "usd",
  "status": "active",
  "created_at": "2026-03-24T12:00:00Z"
}`}
            />

            {/* Step 3 */}
            <DocsHeading level={2} id="step-3">Step 3: Fund the Escrow (Test Mode)</DocsHeading>

            <DocsText>
                In test mode, you can add simulated funds to your escrow account:
            </DocsText>

            <TabbedCodeBlock tabs={fundEscrowTabs} />

            <DocsText>Response:</DocsText>

            <CodeBlock 
                language="json"
                code={`{
  "id": "esc_9f3k2m",
  "balance_cents": 100000,
  "currency": "usd",
  "status": "active"
}`}
            />

            {/* Step 4 */}
            <DocsHeading level={2} id="step-4">Step 4: Create a Spending Policy</DocsHeading>

            <DocsText>
                Define the rules that govern how your agent can spend. This example creates a policy with:
            </DocsText>

            <ul className="list-none space-y-2 mb-6">
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span>$100 max per transaction</span>
                </li>
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span>$500 daily spending cap</span>
                </li>
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span>Only "Anthropic" and "OpenAI" as allowed vendors</span>
                </li>
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span>Auto-approve spends under $50; require human approval for $50+</span>
                </li>
            </ul>

            <TabbedCodeBlock tabs={createPolicyTabs} />

            {/* Step 5 */}
            <DocsHeading level={2} id="step-5">Step 5: Make a Test Spend</DocsHeading>

            <DocsText>
                Now your agent can request a spend! Use an <strong className="text-ss-text">agent key</strong> (<InlineCode>sk_agent_...</InlineCode>) 
                for spend requests. Agent keys have restricted permissions and cannot modify policies or funding.
            </DocsText>

            <Callout type="info" title="Create an Agent Key">
                Go to Dashboard → API Keys and create a key with type "agent" for your AI agent to use.
            </Callout>

            <TabbedCodeBlock tabs={makeSpendTabs} />

            <DocsText>Response for an auto-approved spend:</DocsText>

            <CodeBlock 
                language="json"
                code={`{
  "id": "spr_abc123",
  "escrow_id": "esc_9f3k2m",
  "amount_cents": 4999,
  "currency": "usd",
  "vendor": "Anthropic",
  "category": "ai_compute",
  "description": "Claude API credits top-up",
  "status": "approved",
  "rules_evaluated": [
    { "rule": "balance_check", "result": "pass" },
    { "rule": "per_transaction_limit", "result": "pass" },
    { "rule": "daily_cap_check", "result": "pass" },
    { "rule": "vendor_allowlist", "result": "pass" },
    { "rule": "category_check", "result": "pass" },
    { "rule": "auto_approve_threshold", "result": "auto_approved" }
  ],
  "created_at": "2026-03-24T12:05:00Z"
}`}
            />

            {/* Step 6 */}
            <DocsHeading level={2} id="step-6">Step 6: Check the Dashboard</DocsHeading>

            <DocsText>
                Head to your <Link to="/dashboard" className="text-ss-accent hover:underline">Dashboard</Link> to see:
            </DocsText>

            <ul className="list-none space-y-2 mb-6">
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span><strong className="text-ss-text">Transactions</strong> — Your spend request with full details</span>
                </li>
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span><strong className="text-ss-text">Escrow Accounts</strong> — Updated balance after the spend</span>
                </li>
                <li className="flex items-start gap-2 text-ss-text-secondary">
                    <CheckCircle size={18} className="text-ss-accent flex-shrink-0 mt-0.5" />
                    <span><strong className="text-ss-text">Audit Log</strong> — Complete event history</span>
                </li>
            </ul>

            {/* Alternative: Agent-Led 80/20 Setup */}
            <DocsHeading level={2} id="agent-led-setup">Alternative: 80/20 Agent-Led Setup</DocsHeading>

            <Callout type="success" title="Let Your Agent Do the Work">
                Instead of manually configuring policies, let your agent draft them—you just review and approve.
            </Callout>

            <DocsText>
                Safe-Spend supports a <strong className="text-ss-text">delegation-first pattern</strong> where your agent 
                proposes the spending configuration, and you (the human owner) review and lock it into place. 
                This "80/20" approach means the agent does 80% of the setup work, and you spend 20% of the time 
                reviewing the configuration.
            </DocsText>

            <DocsHeading level={3}>How It Works</DocsHeading>

            <ol className="list-decimal list-inside space-y-3 mb-6 text-ss-text-secondary">
                <li className="pl-2">
                    <strong className="text-ss-text">Agent Creates Draft Policy:</strong> Your agent uses an owner key to 
                    create a policy with <InlineCode>draft: true</InlineCode> and includes a human-readable summary in the metadata.
                </li>
                <li className="pl-2">
                    <strong className="text-ss-text">You Review:</strong> Log into the dashboard, see the draft banner, and 
                    review the proposed limits, vendors, and time windows.
                </li>
                <li className="pl-2">
                    <strong className="text-ss-text">Lock & Activate:</strong> Click "Approve & Lock" to activate the policy. 
                    Once locked, neither you nor the agent can modify it without explicitly unlocking first.
                </li>
                <li className="pl-2">
                    <strong className="text-ss-text">Agent Spends:</strong> With the policy active, your agent uses an 
                    <InlineCode>sk_agent_...</InlineCode> key to make spend requests—bounded by the rules you approved.
                </li>
            </ol>

            <DocsHeading level={3}>Example: Agent Creates Draft Policy</DocsHeading>

            <CodeBlock 
                language="json"
                code={`// POST /v1/policies (with owner key)
{
  "escrow_id": "esc_marketing_q1",
  "name": "Marketing Daily Budget",
  "draft": true,
  "per_transaction_limit_cents": 20000,
  "daily_limit_cents": 50000,
  "allowed_vendors": ["Google Ads", "Meta", "LinkedIn"],
  "active_days": ["mon", "tue", "wed", "thu", "fri"],
  "active_hours_start": "09:00",
  "active_hours_end": "17:00",
  "active_timezone": "America/New_York",
  "metadata": {
    "summary": "Marketing agent can spend up to $200 per transaction and $500 per day on Google Ads, Meta, and LinkedIn during business hours (9am-5pm ET, weekdays)."
  }
}`}
            />

            <DocsText>
                The agent provides a clear, human-readable summary in the <InlineCode>metadata.summary</InlineCode> field. 
                This summary appears prominently in the dashboard when you review the draft.
            </DocsText>

            <DocsHeading level={3}>Lock the Policy</DocsHeading>

            <CodeBlock 
                language="bash"
                code={`# Human owner locks the policy after review
curl -X POST https://api.safespend.app/v1/policies/pol_xxx/lock \\
  -H "Authorization: Bearer sk_live_owner_key..."`}
            />

            <DocsText>
                Response:
            </DocsText>

            <CodeBlock 
                language="json"
                code={`{
  "message": "Policy locked and activated",
  "policy": {
    "id": "pol_xxx",
    "name": "Marketing Daily Budget",
    "status": "active",
    "is_locked": true,
    "locked_at": "2026-03-24T10:30:00Z",
    "locked_by": "org_abc123"
  }
}`}
            />

            <Callout type="warning" title="Agent Key Permissions">
                <strong>Agent keys</strong> (<InlineCode>sk_agent_...</InlineCode>) can only:
                <ul className="list-disc list-inside mt-2">
                    <li>Make spend requests (<InlineCode>POST /v1/spend</InlineCode>)</li>
                    <li>Check balances (<InlineCode>GET /v1/escrow-accounts/:id</InlineCode>)</li>
                    <li>Read policies and escrows (read-only)</li>
                </ul>
                They <strong>cannot</strong> create, modify, or delete policies or escrow accounts. Use an owner key for governance operations.
            </Callout>

            {/* Next Steps */}
            <DocsHeading level={2} id="next-steps">Next Steps</DocsHeading>

            <div className="grid gap-4">
                <Link 
                    to="/docs/api" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                    data-testid="quickstart-next-api"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">API Reference</h4>
                            <p className="text-ss-text-secondary text-sm">Explore all available endpoints</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>

                <Link 
                    to="/docs/webhooks" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                    data-testid="quickstart-next-webhooks"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Webhooks</h4>
                            <p className="text-ss-text-secondary text-sm">Get real-time notifications</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>

                <Link 
                    to="/docs/integrations" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                    data-testid="quickstart-next-integrations"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Integrations</h4>
                            <p className="text-ss-text-secondary text-sm">LangChain, CrewAI, OpenAI Assistants & more</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default DocsQuickstart;
