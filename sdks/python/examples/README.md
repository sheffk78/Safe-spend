# Safe-Spend Python SDK Examples

This directory contains example scripts demonstrating how to use the Safe-Spend Python SDK.

## Examples

### 1. Simple Agent (`simple_agent.py`)

A minimal example showing the basic flow:
- Initialize Safe-Spend client
- Create LangChain toolkit
- Agent checks balance and makes purchases

```bash
pip install safespend[langchain] langchain langchain-openai
export SAFESPEND_API_KEY="sk_agent_..."
export OPENAI_API_KEY="sk-..."
export SAFESPEND_ESCROW_ID="esc_your_escrow_id"

python simple_agent.py
```

### 2. Budget-Aware Agent (`budget_aware_agent.py`)

A comprehensive example with:
- Interactive chat session
- Demo scenario mode
- Proper error handling
- Budget-aware system prompts

```bash
pip install safespend[langchain] langchain langchain-openai
export SAFESPEND_API_KEY="sk_agent_..."
export OPENAI_API_KEY="sk-..."
export SAFESPEND_ESCROW_ID="esc_your_escrow_id"

python budget_aware_agent.py
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SAFESPEND_API_KEY` | Yes | Your Safe-Spend API key (get from dashboard) |
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `SAFESPEND_ESCROW_ID` | No | Default escrow account ID |
| `SAFESPEND_BASE_URL` | No | API base URL (default: https://api.safespend.app) |

## Getting Started

1. **Create a Safe-Spend account** at [agentictrust.app](https://agentictrust.app)

2. **Create an escrow account** in the dashboard and fund it

3. **Generate an API key** (type: `agent` or `test`)

4. **Set up a spending policy** with your desired rules

5. **Run the examples!**

## Common Patterns

### Check Balance Before Spending

```python
from safespend import SafeSpendClient
from safespend.integrations import SafeSpendCheckBalanceTool, SafeSpendTool

client = SafeSpendClient(api_key="sk_agent_...")

# Check balance first
balance_tool = SafeSpendCheckBalanceTool(client=client, default_escrow_id="esc_123")
balance = balance_tool._run()

if balance.get("balance_cents", 0) >= 5000:  # $50
    # Proceed with purchase
    spend_tool = SafeSpendTool(client=client, escrow_id="esc_123")
    result = spend_tool._run(
        amount_cents=5000,
        vendor="OpenAI",
        category="ai_compute",
        description="API credits"
    )
```

### Handle Pending Approvals

```python
result = spend_tool._run(amount_cents=50000, vendor="AWS", category="cloud")

if result["status"] == "pending":
    print(f"Waiting for approval: {result['approval_id']}")
    # You can poll or wait for webhook notification
elif result["status"] == "approved":
    print(f"Purchase complete! Remaining: {result['remaining_balance_dollars']}")
elif result["status"] == "denied":
    print(f"Denied: {result['denial_reason']}")
```

### Use with CrewAI (Coming Soon)

```python
# CrewAI integration will be available in a future release
from safespend.integrations.crewai import SafeSpendCrewTool
```

## Need Help?

- **Documentation**: [agentictrust.app/docs/sdks](https://agentictrust.app/docs/sdks)
- **Dashboard**: [agentictrust.app/dashboard](https://agentictrust.app/dashboard)
- **Support**: support@agentictrust.app
