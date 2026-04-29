import React from 'react';
import { DocsHeading, DocsText, Callout, InlineCode } from '@/components/docs/DocsComponents';
import { CodeBlock, TabbedCodeBlock } from '@/components/docs/DocsCodeBlock';

const DocsIntegrations = () => {
    const curlExamples = {
        createEscrow: `curl -X POST https://api.safe-spend.dev/v1/escrow-accounts \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Agent Budget",
    "description": "Budget for my AI agent"
  }'`,
        createPolicy: `curl -X POST https://api.safe-spend.dev/v1/policies \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "escrow_id": "esc_xxx",
    "name": "Default Policy",
    "per_transaction_limit_cents": 10000,
    "daily_limit_cents": 50000,
    "allowed_vendors": ["Anthropic", "OpenAI"],
    "auto_approve_under_cents": 5000
  }'`,
        makeSpend: `curl -X POST https://api.safe-spend.dev/v1/spend \\
  -H "Authorization: Bearer sk_agent_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "escrow_id": "esc_xxx",
    "amount_cents": 2500,
    "vendor": "Anthropic",
    "category": "ai_compute",
    "description": "Claude API call",
    "idempotency_key": "unique-key-001"
  }'`
    };

    const pythonClient = `"""
Safe-Spend Python Client
A minimal wrapper for the Safe-Spend API
"""
import requests
from typing import Optional, Dict, Any, List

class SafeSpendClient:
    def __init__(self, api_key: str, base_url: str = "https://api.safe-spend.dev"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        response = self.session.request(method, f"{self.base_url}{path}", **kwargs)
        response.raise_for_status()
        return response.json()
    
    # Escrow Accounts
    def create_escrow(self, name: str, description: str = "") -> Dict[str, Any]:
        return self._request("POST", "/v1/escrow-accounts", json={
            "name": name,
            "description": description
        })
    
    def get_escrow(self, escrow_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/v1/escrow-accounts/{escrow_id}")
    
    def fund_escrow(self, escrow_id: str, amount_cents: int) -> Dict[str, Any]:
        return self._request("POST", f"/v1/escrow-accounts/{escrow_id}/fund", json={
            "amount_cents": amount_cents
        })
    
    # Spend Requests
    def spend(
        self,
        escrow_id: str,
        amount_cents: int,
        vendor: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        payload = {
            "escrow_id": escrow_id,
            "amount_cents": amount_cents,
            "vendor": vendor
        }
        if category:
            payload["category"] = category
        if description:
            payload["description"] = description
        if idempotency_key:
            payload["idempotency_key"] = idempotency_key
        if metadata:
            payload["metadata"] = metadata
        
        return self._request("POST", "/v1/spend", json=payload)
    
    def get_spend(self, spend_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/v1/spend/{spend_id}")
    
    def list_spends(self, escrow_id: Optional[str] = None) -> Dict[str, Any]:
        params = {}
        if escrow_id:
            params["escrow_id"] = escrow_id
        return self._request("GET", "/v1/spend", params=params)


# Usage Example
if __name__ == "__main__":
    client = SafeSpendClient(api_key="sk_agent_...")
    
    result = client.spend(
        escrow_id="esc_9f3k2m",
        amount_cents=2500,
        vendor="Anthropic",
        category="ai_compute",
        description="Claude API call",
        idempotency_key="my-unique-key"
    )
    
    print(f"Spend status: {result['status']}")`;

    const typescriptClient = `/**
 * Safe-Spend TypeScript Client
 * A minimal wrapper for the Safe-Spend API
 */

interface SpendRequest {
  escrow_id: string;
  amount_cents: number;
  vendor: string;
  category?: string;
  description?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

interface SpendResponse {
  id: string;
  escrow_id: string;
  amount_cents: number;
  currency: string;
  vendor: string;
  category?: string;
  status: 'approved' | 'denied' | 'pending_approval' | 'expired' | 'cancelled';
  rules_evaluated: Array<{ rule: string; result: string }>;
  created_at: string;
}

interface EscrowAccount {
  id: string;
  name: string;
  description?: string;
  balance_cents: number;
  currency: string;
  status: 'active' | 'paused' | 'closed';
  created_at: string;
}

class SafeSpendClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.safe-spend.dev') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${path}\`, {
      method,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Escrow Accounts
  async createEscrow(name: string, description?: string): Promise<EscrowAccount> {
    return this.request('POST', '/v1/escrow-accounts', { name, description });
  }

  async getEscrow(escrowId: string): Promise<EscrowAccount> {
    return this.request('GET', \`/v1/escrow-accounts/\${escrowId}\`);
  }

  async fundEscrow(escrowId: string, amountCents: number): Promise<EscrowAccount> {
    return this.request('POST', \`/v1/escrow-accounts/\${escrowId}/fund\`, {
      amount_cents: amountCents,
    });
  }

  // Spend Requests
  async spend(request: SpendRequest): Promise<SpendResponse> {
    return this.request('POST', '/v1/spend', request);
  }

  async getSpend(spendId: string): Promise<SpendResponse> {
    return this.request('GET', \`/v1/spend/\${spendId}\`);
  }
}

// Usage Example
const client = new SafeSpendClient('sk_agent_...');

const result = await client.spend({
  escrow_id: 'esc_9f3k2m',
  amount_cents: 2500,
  vendor: 'Anthropic',
  category: 'ai_compute',
  description: 'Claude API call',
  idempotency_key: 'my-unique-key',
});

console.log(\`Spend status: \${result.status}\`);`;

    const langchainTool = `from langchain.tools import tool
from safespend import SafeSpendClient  # or use the client above

# Initialize the client (use agent key for spend operations)
client = SafeSpendClient(api_key="sk_agent_...")
ESCROW_ID = "esc_9f3k2m"  # Your escrow account

@tool("safe_spend")
def safe_spend_tool(
    amount_cents: int,
    vendor: str,
    description: str = "",
    category: str = "general"
) -> dict:
    """
    Request a spend from the Safe-Spend escrow account.
    
    Use this tool when you need to make a payment or purchase.
    The spend will be validated against the organization's policies.
    
    Args:
        amount_cents: Amount to spend in cents (e.g., 2500 = $25.00)
        vendor: Name of the vendor/merchant
        description: Description of what the spend is for
        category: Spending category (e.g., "ai_compute", "software", "services")
    
    Returns:
        Dictionary with spend status and details
    """
    result = client.spend(
        escrow_id=ESCROW_ID,
        amount_cents=amount_cents,
        vendor=vendor,
        category=category,
        description=description,
        idempotency_key=f"langchain-{vendor}-{amount_cents}"
    )
    
    if result["status"] == "approved":
        return {
            "success": True,
            "message": f"Spend of \${amount_cents/100:.2f} to {vendor} approved",
            "spend_id": result["id"]
        }
    elif result["status"] == "pending_approval":
        return {
            "success": False,
            "message": f"Spend requires human approval. Approval ID: {result.get('approval_id')}",
            "spend_id": result["id"]
        }
    else:
        return {
            "success": False,
            "message": f"Spend denied: {result.get('denial_reason', 'Unknown')}",
            "rules_evaluated": result.get("rules_evaluated", [])
        }


# Example usage with an agent
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4")
tools = [safe_spend_tool]

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# The agent can now use safe_spend_tool when it needs to make purchases
agent.run("Purchase $25 worth of Claude API credits from Anthropic")`;

    const crewaiTool = `from crewai import Agent, Task, Crew
from crewai_tools import tool
from safespend import SafeSpendClient

client = SafeSpendClient(api_key="sk_agent_...")
ESCROW_ID = "esc_9f3k2m"

@tool("Safe-Spend")
def spend_money(amount_cents: int, vendor: str, category: str, description: str = "") -> str:
    """
    Execute a spend request through Safe-Spend escrow.
    
    Args:
        amount_cents: Amount in cents (e.g., 5000 = $50.00)
        vendor: Vendor name (e.g., "Anthropic", "OpenAI")
        category: Spending category (e.g., "ai_compute", "software")
        description: What the spend is for
    
    Returns:
        Status message about the spend request
    """
    result = client.spend(
        escrow_id=ESCROW_ID,
        amount_cents=amount_cents,
        vendor=vendor,
        category=category,
        description=description
    )
    
    if result["status"] == "approved":
        return f"✅ Approved: \${amount_cents/100:.2f} to {vendor}"
    elif result["status"] == "pending_approval":
        return f"⏳ Pending human approval for \${amount_cents/100:.2f}"
    else:
        return f"❌ Denied: {result.get('denial_reason', 'Policy violation')}"


# Create an agent with spending capability
researcher = Agent(
    role="AI Research Assistant",
    goal="Research and purchase necessary AI tools and credits",
    backstory="You help manage AI infrastructure spending.",
    tools=[spend_money],
    verbose=True
)

task = Task(
    description="Purchase $50 of OpenAI API credits for our research project",
    expected_output="Confirmation of the purchase",
    agent=researcher
)

crew = Crew(agents=[researcher], tasks=[task])
result = crew.kickoff()`;

    const openaiAssistants = `# OpenAI Assistants / Function Calling schema

tools = [
    {
        "type": "function",
        "function": {
            "name": "safe_spend",
            "description": "Request a disbursement from the Safe-Spend escrow account. Use when you need to make a payment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount_cents": {
                        "type": "integer",
                        "description": "Amount to spend in cents (e.g., 2500 = $25.00)"
                    },
                    "vendor": {
                        "type": "string",
                        "description": "Name of the vendor/merchant"
                    },
                    "category": {
                        "type": "string",
                        "description": "Spending category",
                        "enum": ["ai_compute", "software", "services", "infrastructure", "other"]
                    },
                    "description": {
                        "type": "string",
                        "description": "Description of what the spend is for"
                    }
                },
                "required": ["amount_cents", "vendor"]
            }
        }
    }
]

# Handle function calls
def handle_safe_spend(arguments):
    """Called when the assistant invokes safe_spend"""
    from safespend import SafeSpendClient
    
    client = SafeSpendClient(api_key="sk_agent_...")
    
    result = client.spend(
        escrow_id="esc_9f3k2m",
        amount_cents=arguments["amount_cents"],
        vendor=arguments["vendor"],
        category=arguments.get("category", "other"),
        description=arguments.get("description", "")
    )
    
    return {
        "status": result["status"],
        "spend_id": result["id"],
        "amount": f"\${arguments['amount_cents']/100:.2f}"
    }`;

    const mcpConfig = `{
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
}`;

    return (
        <div data-testid="docs-integrations-page">
            <DocsHeading level={1}>Integrations</DocsHeading>
            
            <DocsText>
                Safe-Spend integrates with any stack via REST API. Below are copy-pastable examples for common 
                languages and agent frameworks.
            </DocsText>

            {/* cURL */}
            <DocsHeading level={2} id="curl">cURL</DocsHeading>

            <DocsText>
                The most direct way to interact with Safe-Spend. Great for testing and shell scripts.
            </DocsText>

            <DocsHeading level={3}>Create Escrow Account</DocsHeading>
            <CodeBlock language="bash" code={curlExamples.createEscrow} />

            <DocsHeading level={3}>Create Policy</DocsHeading>
            <CodeBlock language="bash" code={curlExamples.createPolicy} />

            <DocsHeading level={3}>Make Spend Request</DocsHeading>
            <CodeBlock language="bash" code={curlExamples.makeSpend} />

            {/* Python */}
            <DocsHeading level={2} id="python">Python</DocsHeading>

            <DocsText>
                A minimal Python client wrapping the Safe-Spend API. Copy this into your project or use as reference.
            </DocsText>

            <Callout type="info" title="Dependencies">
                Requires <InlineCode>requests</InlineCode>: <InlineCode>pip install requests</InlineCode>
            </Callout>

            <CodeBlock language="python" code={pythonClient} />

            {/* TypeScript */}
            <DocsHeading level={2} id="typescript">TypeScript / Node.js</DocsHeading>

            <DocsText>
                A typed TypeScript client using the native <InlineCode>fetch</InlineCode> API.
            </DocsText>

            <CodeBlock language="typescript" code={typescriptClient} />

            {/* Agent Frameworks */}
            <DocsHeading level={2} id="frameworks">Agent Frameworks</DocsHeading>

            <DocsText>
                Integrate Safe-Spend as a tool in popular agent frameworks. These examples show how to give 
                your agents controlled spending capability.
            </DocsText>

            <Callout type="warning" title="Use Agent Keys">
                Always use <InlineCode>sk_agent_...</InlineCode> keys for agent integrations. Agent keys have 
                restricted permissions and cannot modify policies or funding.
            </Callout>

            <DocsHeading level={3}>LangChain</DocsHeading>
            
            <DocsText>
                Create a LangChain tool that allows agents to request spends:
            </DocsText>

            <CodeBlock language="python" code={langchainTool} />

            <DocsHeading level={3}>CrewAI</DocsHeading>

            <DocsText>
                Use the CrewAI tool decorator to give crew members spending capability:
            </DocsText>

            <CodeBlock language="python" code={crewaiTool} />

            <DocsHeading level={3}>OpenAI Assistants / Function Calling</DocsHeading>

            <DocsText>
                Define a function schema for OpenAI Assistants:
            </DocsText>

            <CodeBlock language="python" code={openaiAssistants} />

            <DocsHeading level={3}>MCP (Model Context Protocol)</DocsHeading>

            <DocsText>
                Add Safe-Spend to Claude Desktop or other MCP-compatible clients:
            </DocsText>

            <CodeBlock language="json" title="claude_desktop_config.json" code={mcpConfig} />

            <Callout type="info" title="MCP Server Coming Soon">
                The official <InlineCode>@safespend/mcp-server</InlineCode> package is in development. 
                For now, you can build your own MCP server using the REST API.
            </Callout>

            {/* Best Practices */}
            <DocsHeading level={2} id="best-practices">Integration Best Practices</DocsHeading>

            <div className="space-y-4">
                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Always Use Idempotency Keys</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Generate unique idempotency keys for each spend request. This prevents duplicate charges 
                        if your agent retries a request.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Handle All Status Types</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Spend requests can return <InlineCode>approved</InlineCode>, <InlineCode>denied</InlineCode>, 
                        or <InlineCode>pending_approval</InlineCode>. Your integration should handle all three gracefully.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Use Webhooks for Async Flows</h4>
                    <p className="text-ss-text-secondary text-sm">
                        For spends that require human approval, don't poll. Set up webhooks to be notified when 
                        approvals are granted or denied.
                    </p>
                </div>

                <div className="bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <h4 className="font-semibold text-ss-text mb-1">Log Spend IDs</h4>
                    <p className="text-ss-text-secondary text-sm">
                        Always log the <InlineCode>spend_id</InlineCode> returned from requests. This makes it easy 
                        to trace agent actions back to specific transactions.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DocsIntegrations;
