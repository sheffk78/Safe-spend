import React from 'react';
import { Link } from 'react-router-dom';
import { DocsHeading, DocsText, Callout, InlineCode } from '@/components/docs/DocsComponents';
import { CodeBlock, TabbedCodeBlock } from '@/components/docs/DocsCodeBlock';
import { ArrowRight, Package, Terminal, Cpu, Bot, Code2 } from 'lucide-react';

const DocsSDKs = () => {
    const pythonInstallCode = `pip install safespend

# With LangChain support
pip install safespend[langchain]`;

    const pythonQuickstartCode = `from safespend import SafeSpendClient

# Initialize the client
client = SafeSpendClient(
    api_key="sk_agent_...",
    base_url="https://api.safespend.app"  # Optional
)

# Check balance
balance = client.get_escrow_balance("esc_123")
print(f"Balance: \${balance['balance_cents']/100:.2f}")

# Create a spend request
spend = client.create_spend(
    escrow_id="esc_123",
    amount_cents=4999,  # $49.99
    vendor="Anthropic",
    category="ai_compute",
    description="Claude API credits top-up"
)

# Handle the response
if spend["status"] == "approved":
    print(f"✅ Approved! Remaining: \${spend['remaining_balance_cents']/100:.2f}")
elif spend["status"] == "pending":
    print(f"⏳ Awaiting approval: {spend['approval_id']}")
elif spend["status"] == "denied":
    print(f"❌ Denied: {spend['denial_reason']}")`;

    const pythonErrorHandlingCode = `from safespend import (
    SafeSpendClient,
    SafeSpendError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
)

client = SafeSpendClient(api_key="sk_agent_...")

try:
    spend = client.create_spend(
        escrow_id="esc_invalid",
        amount_cents=100,
        vendor="Test",
    )
except AuthenticationError:
    print("Invalid API key")
except NotFoundError:
    print("Escrow account not found")
except ValidationError as e:
    print(f"Validation error: {e.message}")
except RateLimitError:
    print("Rate limit exceeded, retry later")
except SafeSpendError as e:
    print(f"API error: {e}")`;

    const langchainCode = `from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI
from safespend import SafeSpendClient
from safespend.integrations import create_safespend_toolkit

# Initialize clients
client = SafeSpendClient(api_key="sk_agent_...")
tools = create_safespend_toolkit(
    client=client,
    default_escrow_id="esc_123"
)

# Create LangChain agent
llm = ChatOpenAI(model="gpt-4")
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# Agent can now make governed purchases
result = agent.run(
    "Check my budget balance, then buy $25 of OpenAI credits if I have enough"
)`;

    const budgetAwareAgentCode = `# Full example: examples/budget_aware_agent.py
from safespend import SafeSpendClient
from safespend.integrations import create_safespend_toolkit
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain_openai import ChatOpenAI

# Initialize
client = SafeSpendClient(api_key=os.environ["SAFESPEND_API_KEY"])
tools = create_safespend_toolkit(client, default_escrow_id="esc_123")
llm = ChatOpenAI(model="gpt-4")

# System prompt for budget-aware behavior
system_prompt = """You are a Budget-Aware AI Assistant.
Before any purchase:
1. Check your balance
2. If sufficient, make the purchase  
3. Handle denials gracefully
"""

# Create and run agent
agent = create_structured_chat_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Interactive session
result = executor.invoke({
    "input": "Buy $50 of Anthropic credits for Claude API access"
})`;

    const mcpConfigCode = `// Claude Desktop config (~/.config/Claude/claude_desktop_config.json)
{
  "mcpServers": {
    "safespend": {
      "command": "npx",
      "args": ["@safespend/mcp-server"],
      "env": {
        "SAFESPEND_API_KEY": "sk_agent_your_key_here"
      }
    }
  }
}`;

    const tsInstallCode = `npm install @safespend/sdk
# or
yarn add @safespend/sdk`;

    const tsQuickstartCode = `import { SafeSpendClient } from '@safespend/sdk';

const client = new SafeSpendClient({
  apiKey: 'sk_agent_...',
  baseUrl: 'https://api.safespend.app'
});

// Check balance
const balance = await client.getEscrowBalance('esc_123');
console.log(\`Balance: $\${balance.balance_cents / 100}\`);

// Create spend request
const spend = await client.createSpend({
  escrowId: 'esc_123',
  amountCents: 2500,
  vendor: 'OpenAI',
  category: 'ai_compute',
  description: 'GPT-4 API credits'
});

if (spend.status === 'approved') {
  console.log('Spend approved!');
}`;

    return (
        <div className="prose prose-invert max-w-none" data-testid="docs-sdks-page">
            <DocsHeading level={1}>SDKs & Integrations</DocsHeading>
            
            <DocsText>
                Safe-Spend provides official SDKs and framework integrations to help you build 
                AI agents with governed spending capabilities in minutes.
            </DocsText>

            {/* SDK Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Package size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-ss-text">Python SDK</h3>
                            <p className="text-xs text-ss-text-tertiary">pip install safespend</p>
                        </div>
                    </div>
                    <p className="text-sm text-ss-text-secondary mb-3">
                        Full-featured client with typed responses, error handling, and LangChain integration.
                    </p>
                    <a href="#python-sdk" className="text-ss-accent text-sm hover:underline">
                        View documentation →
                    </a>
                </div>

                <div className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                            <Code2 size={20} className="text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-ss-text">TypeScript SDK</h3>
                            <p className="text-xs text-ss-text-tertiary">npm install @safespend/sdk</p>
                        </div>
                    </div>
                    <p className="text-sm text-ss-text-secondary mb-3">
                        Fully typed client for Node.js and browser environments.
                    </p>
                    <a href="#typescript-sdk" className="text-ss-accent text-sm hover:underline">
                        View documentation →
                    </a>
                </div>

                <div className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                            <Bot size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-ss-text">LangChain Integration</h3>
                            <p className="text-xs text-ss-text-tertiary">Built into Python SDK</p>
                        </div>
                    </div>
                    <p className="text-sm text-ss-text-secondary mb-3">
                        Native LangChain tools for building AI agents with spending controls.
                    </p>
                    <a href="#langchain" className="text-ss-accent text-sm hover:underline">
                        View documentation →
                    </a>
                </div>

                <div className="bg-ss-surface border border-[rgba(255,255,255,0.06)] rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <Cpu size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-ss-text">MCP Server</h3>
                            <p className="text-xs text-ss-text-tertiary">For Claude & Cursor</p>
                        </div>
                    </div>
                    <p className="text-sm text-ss-text-secondary mb-3">
                        Model Context Protocol server for agentic IDE integration.
                    </p>
                    <a href="#mcp-server" className="text-ss-accent text-sm hover:underline">
                        View documentation →
                    </a>
                </div>
            </div>

            {/* Python SDK Section */}
            <DocsHeading level={2} id="python-sdk">Python SDK</DocsHeading>

            <DocsText>
                The Python SDK is the recommended way to integrate Safe-Spend into your AI agents.
                It provides typed responses, clear error handling, and framework integrations.
            </DocsText>

            <DocsHeading level={3}>Installation</DocsHeading>

            <CodeBlock language="bash" code={pythonInstallCode} />

            <DocsHeading level={3}>Quick Start</DocsHeading>

            <CodeBlock language="python" code={pythonQuickstartCode} />

            <DocsHeading level={3}>Error Handling</DocsHeading>

            <DocsText>
                The SDK raises typed exceptions for common error cases, making it easy to handle 
                different failure modes appropriately.
            </DocsText>

            <CodeBlock language="python" code={pythonErrorHandlingCode} />

            <Callout type="info" title="Available Exception Types">
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li><InlineCode>AuthenticationError</InlineCode> — Invalid or expired API key</li>
                    <li><InlineCode>NotFoundError</InlineCode> — Resource not found (escrow, policy, etc.)</li>
                    <li><InlineCode>ValidationError</InlineCode> — Invalid request parameters</li>
                    <li><InlineCode>RateLimitError</InlineCode> — Too many requests</li>
                    <li><InlineCode>PermissionError</InlineCode> — Insufficient permissions for action</li>
                </ul>
            </Callout>

            {/* LangChain Section */}
            <DocsHeading level={2} id="langchain">LangChain Integration</DocsHeading>

            <DocsText>
                Safe-Spend provides native LangChain tools that allow your AI agents to make 
                governed spending decisions as part of their reasoning flow.
            </DocsText>

            <CodeBlock language="python" code={langchainCode} />

            <DocsHeading level={3}>Available Tools</DocsHeading>

            <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-4 text-ss-text-secondary font-medium">Tool</th>
                            <th className="text-left py-3 px-4 text-ss-text-secondary font-medium">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>safe_spend_request</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">Create a governed spend request</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>safe_spend_check_balance</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">Check escrow account balance</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>safe_spend_list_requests</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">List recent spend requests</td>
                        </tr>
                        <tr>
                            <td className="py-3 px-4"><InlineCode>safe_spend_get_request</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">Get details of a specific spend</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <DocsHeading level={3}>Budget-Aware Agent Example</DocsHeading>

            <DocsText>
                Build an agent that checks its budget before making purchases and handles denials gracefully.
                See the full example at <InlineCode>examples/budget_aware_agent.py</InlineCode>.
            </DocsText>

            <CodeBlock language="python" code={budgetAwareAgentCode} />

            <Callout type="info" title="Complete Examples Available">
                The <InlineCode>examples/</InlineCode> directory in the Python SDK includes:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li><strong>simple_agent.py</strong> — Minimal integration example</li>
                    <li><strong>budget_aware_agent.py</strong> — Full-featured agent with interactive mode</li>
                </ul>
            </Callout>

            {/* MCP Server Section */}
            <DocsHeading level={2} id="mcp-server">MCP Server</DocsHeading>

            <DocsText>
                The Safe-Spend MCP (Model Context Protocol) server allows AI assistants like Claude 
                and Cursor to interact with your escrow accounts and spending policies natively.
            </DocsText>

            <DocsHeading level={3}>Installation</DocsHeading>

            <CodeBlock 
                language="bash" 
                code="npm install -g @safespend/mcp-server" 
            />

            <DocsHeading level={3}>Configuration</DocsHeading>

            <DocsText>
                Add to your Claude Desktop or Cursor config:
            </DocsText>

            <CodeBlock language="json" code={mcpConfigCode} />

            <DocsHeading level={3}>Available MCP Tools</DocsHeading>

            <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.1)]">
                            <th className="text-left py-3 px-4 text-ss-text-secondary font-medium">Tool</th>
                            <th className="text-left py-3 px-4 text-ss-text-secondary font-medium">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>list_escrow_accounts</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">List all escrow accounts</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>get_escrow_balance</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">Check account balance</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>create_spend</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">Create spend request</td>
                        </tr>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                            <td className="py-3 px-4"><InlineCode>list_spend_requests</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">List recent spends</td>
                        </tr>
                        <tr>
                            <td className="py-3 px-4"><InlineCode>list_policies</InlineCode></td>
                            <td className="py-3 px-4 text-ss-text-secondary">List spending policies</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* TypeScript SDK Section */}
            <DocsHeading level={2} id="typescript-sdk">TypeScript SDK</DocsHeading>

            <DocsHeading level={3}>Installation</DocsHeading>

            <CodeBlock language="bash" code={tsInstallCode} />

            <DocsHeading level={3}>Quick Start</DocsHeading>

            <CodeBlock language="typescript" code={tsQuickstartCode} />

            {/* Next Steps */}
            <DocsHeading level={2}>Next Steps</DocsHeading>

            <div className="grid gap-4">
                <Link 
                    to="/docs/quickstart" 
                    className="block bg-ss-surface p-4 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-ss-accent/50 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-ss-text mb-1">Quick Start</h4>
                            <p className="text-ss-text-secondary text-sm">5-minute integration guide</p>
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
                            <p className="text-ss-text-secondary text-sm">Complete endpoint documentation</p>
                        </div>
                        <ArrowRight className="text-ss-accent" size={20} />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default DocsSDKs;
