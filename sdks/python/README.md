# Safe-Spend Python SDK

A minimal, developer-friendly Python client for the **Safe-Spend API** — fiat-first escrow and spending-control for AI agents, part of the [Agentic Trust](https://agentictrust.app) suite.

## Installation

```bash
pip install safespend
```

Or install with optional dependencies:

```bash
# With LangChain support
pip install safespend[langchain]

# With async client support
pip install safespend[async]

# With everything
pip install safespend[all]
```

Or install from source:

```bash
git clone https://github.com/agentictrust/safespend-python.git
cd safespend-python
pip install -e .
```

## Quickstart

```python
from safespend import SafeSpendClient

# Initialize the client with your API key
client = SafeSpendClient(api_key="sk_test_...")

# List escrow accounts
escrows = client.list_escrow_accounts()
for escrow in escrows:
    print(f"{escrow['name']}: ${escrow['balance_cents']/100:.2f}")

# Create a spend request
spend = client.create_spend(
    escrow_id="esc_9f3k2m",
    amount_cents=4999,
    vendor="Anthropic",
    category="ai_compute",
    description="Claude API credits top-up",
)

# Check the result
if spend["status"] == "approved":
    print(f"Spend approved! Remaining: ${spend.get('remaining_balance_cents', 0)/100:.2f}")
elif spend["status"] == "pending":
    print(f"Awaiting human approval. Approval ID: {spend.get('approval_id')}")
elif spend["status"] == "denied":
    print(f"Spend denied: {spend.get('denial_reason')}")
```

## Error Handling

The SDK raises typed exceptions for common error cases:

```python
from safespend import (
    SafeSpendClient,
    SafeSpendError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
)

client = SafeSpendClient(api_key="sk_test_...")

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
    if e.details:
        print(f"Details: {e.details}")
except RateLimitError:
    print("Rate limit exceeded, try again later")
except SafeSpendError as e:
    print(f"API error: {e}")
```

## Async Client

For high-performance applications, use the async client:

```bash
pip install safespend[async]
```

```python
import asyncio
from safespend import AsyncSafeSpendClient

async def main():
    async with AsyncSafeSpendClient(api_key="sk_test_...") as client:
        # All methods are now async
        escrows = await client.list_escrow_accounts()
        
        spend = await client.create_spend(
            escrow_id="esc_123",
            amount_cents=2500,
            vendor="OpenAI",
        )
        
        print(f"Status: {spend['status']}")

asyncio.run(main())
```

### Retry Configuration

Both sync and async clients support automatic retries for transient failures:

```python
client = SafeSpendClient(
    api_key="sk_test_...",
    max_retries=3,      # Retry up to 3 times (default)
    retry_delay=1.0,    # Initial delay of 1 second (exponential backoff)
)
```

Retries are triggered for:
- HTTP 429 (Rate Limit)
- HTTP 5xx (Server Errors)
- Connection timeouts

## API Reference

### Escrow Accounts

```python
# List all escrow accounts
escrows = client.list_escrow_accounts()

# Get a specific escrow account
escrow = client.get_escrow_account("esc_123")

# Create an escrow account
escrow = client.create_escrow_account(
    name="Marketing Budget Q1",
    description="Budget for ad spend",
)

# Fund an escrow account (simulated, for testing)
escrow = client.fund_escrow_account("esc_123", amount_cents=100000)

# Get balance only
balance = client.get_escrow_balance("esc_123")

# Pause/resume/close
client.pause_escrow_account("esc_123")
client.resume_escrow_account("esc_123")
client.close_escrow_account("esc_123")
```

### Spending Policies

```python
# List policies
policies = client.list_policies()
policies = client.list_policies(escrow_id="esc_123")

# Create a policy
policy = client.create_policy(
    escrow_id="esc_123",
    name="Marketing Policy",
    per_transaction_limit_cents=10000,  # $100 max per transaction
    daily_limit_cents=50000,            # $500 per day
    auto_approve_under_cents=5000,      # Auto-approve under $50
    vendor_allowlist=["Google Ads", "Meta Ads"],
)

# Delete a policy
client.delete_policy("pol_123")
```

### Spend Requests

```python
# Create a spend request
spend = client.create_spend(
    escrow_id="esc_123",
    amount_cents=2500,
    vendor="OpenAI",
    category="ai_compute",
    description="GPT-4 API usage",
    idempotency_key="order-12345",  # Optional, for safe retries
)

# List spend requests
spends = client.list_spend_requests()
spends = client.list_spend_requests(escrow_id="esc_123", status="approved")

# Get spend request details
spend = client.get_spend_request("sr_123")

# Cancel a pending spend request
spend = client.cancel_spend_request("sr_123")
```

### Approvals

> **Note**: Approval endpoints require **organization tokens** (JWT), not API keys.
> Use `Authorization: Bearer <org_token>` from the dashboard login.
> This is intentional — approvals should be managed by humans, not agents.

```python
# For approval management, initialize with an org token instead of API key
human_client = SafeSpendClient(
    api_key="<org_jwt_token>",  # JWT from /v1/auth/login
    base_url="https://api.safe-spend.dev",
)

# List pending approvals
approvals = human_client.list_approvals()  # Defaults to status="pending"
approvals = human_client.list_approvals(status="approved")

# Get approval details
approval = human_client.get_approval("apr_123")

# Approve a pending request
result = human_client.approve("apr_123", note="Approved by finance team")

# Deny a pending request
result = human_client.deny("apr_123", note="Over budget", reason="budget_exceeded")
```

## Advanced Usage

### Custom Base URL

Point to staging or local development:

```python
client = SafeSpendClient(
    api_key="sk_test_...",
    base_url="http://localhost:8001/api",
)
```

### Request Timeout

Customize the request timeout (default: 10 seconds):

```python
client = SafeSpendClient(
    api_key="sk_test_...",
    timeout=30.0,
)
```

### Idempotency

For safe retries, always provide an `idempotency_key`:

```python
spend = client.create_spend(
    escrow_id="esc_123",
    amount_cents=5000,
    vendor="AWS",
    idempotency_key=f"order-{order_id}",
)
```

If you don't provide one, the SDK generates a unique key automatically.

### Direct API Access

For endpoints not covered by high-level methods:

```python
# Use _request for direct API calls
result = client._request(
    "PATCH",
    f"/v1/policies/{policy_id}",
    json={"daily_limit_cents": 100000},
)
```

## Compatibility

- Python 3.9+
- Fully typed with type hints
- Uses `requests` library for HTTP

## Support

- **Documentation**: [agentictrust.app/docs](https://agentictrust.app/docs)
- **Issues**: [GitHub Issues](https://github.com/agentictrust/safespend-python/issues)
- **Email**: support@agentictrust.app

## Framework Integrations

### LangChain Integration

Safe-Spend provides native LangChain tools for building AI agents with governed spending capabilities.

#### Installation

```bash
pip install safespend[langchain]
```

#### Quick Start

```python
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI
from safespend import SafeSpendClient
from safespend.integrations import create_safespend_toolkit

# Initialize clients
client = SafeSpendClient(
    api_key="sk_agent_...",
    base_url="https://api.safe-spend.dev"
)

# Create toolkit with default escrow
tools = create_safespend_toolkit(
    client=client,
    default_escrow_id="esc_123"
)

# Initialize LangChain agent
llm = ChatOpenAI(model="gpt-4")
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# Agent can now make governed purchases
result = agent.run("Buy $25 worth of OpenAI API credits for AI compute")
```

#### Available Tools

| Tool | Description |
|------|-------------|
| `safe_spend_request` | Create a governed spend request from an escrow account |
| `safe_spend_check_balance` | Check the current balance of an escrow account |
| `safe_spend_list_requests` | List recent spend requests with optional status filter |
| `safe_spend_get_request` | Get details of a specific spend request |

#### Individual Tool Usage

```python
from safespend import SafeSpendClient
from safespend.integrations import SafeSpendTool, SafeSpendCheckBalanceTool

client = SafeSpendClient(api_key="sk_agent_...")

# Create spend tool for a specific escrow
spend_tool = SafeSpendTool(client=client, escrow_id="esc_123")

# Use directly
result = spend_tool._run(
    amount_cents=2500,
    vendor="OpenAI",
    category="ai_compute",
    description="GPT-4 API credits"
)
print(result)
# {'status': 'approved', 'spend_id': 'spr_xyz', 'amount_dollars': '$25.00', ...}

# Check balance
balance_tool = SafeSpendCheckBalanceTool(client=client, default_escrow_id="esc_123")
balance = balance_tool._run()
print(balance)
# {'balance_dollars': '$475.00', 'status': 'active', ...}
```

#### Agent Workflow Example

```python
# Agent checks budget before making a purchase
agent_prompt = """
You are an AI assistant with a budget for purchasing AI services.
Before making any purchase:
1. Check your available balance
2. If sufficient, make the purchase
3. Report the result

Task: Purchase $50 of Anthropic API credits for AI inference.
"""

result = agent.run(agent_prompt)
```

## Examples

The `examples/` directory contains complete working examples:

### Simple Agent
A minimal example showing basic Safe-Spend + LangChain integration:
```bash
cd examples
python simple_agent.py
```

### Budget-Aware Agent
A comprehensive example with interactive mode and demo scenarios:
```bash
cd examples
python budget_aware_agent.py
```

See [examples/README.md](examples/README.md) for full documentation.

## License

Proprietary. See LICENSE file for details.
