# Safe-Spend MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI agents like Claude to interact with Safe-Spend's escrow and spending control APIs.

## What is MCP?

The Model Context Protocol allows AI assistants to securely connect to external data sources and tools. This server exposes Safe-Spend's functionality as MCP tools, enabling AI agents to:

- Manage escrow accounts (create, fund, pause, resume)
- Check balances and spending limits
- Create spend requests with automatic policy enforcement
- Review pending approvals

## Installation

```bash
npm install -g @safespend/mcp-server
```

Or run directly with npx:
```bash
npx @safespend/mcp-server
```

## Configuration

The server requires environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SAFESPEND_API_KEY` | Yes | - | Your Safe-Spend API key (starts with `sk_`) |
| `SAFESPEND_BASE_URL` | No | `https://api.safespend.app` | API base URL |

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "safespend": {
      "command": "npx",
      "args": ["@safespend/mcp-server"],
      "env": {
        "SAFESPEND_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

Or if installed globally:
```json
{
  "mcpServers": {
    "safespend": {
      "command": "safespend-mcp",
      "env": {
        "SAFESPEND_API_KEY": "sk_live_your_key_here"
      }
    }
  }
}
```

## Available Tools

### Escrow Account Management

| Tool | Description |
|------|-------------|
| `list_escrow_accounts` | List all escrow accounts with balances |
| `get_escrow_balance` | Get current balance of an escrow account |
| `create_escrow_account` | Create a new escrow account |
| `fund_escrow_account` | Add funds to an escrow account |
| `pause_escrow_account` | Temporarily pause spending |
| `resume_escrow_account` | Resume spending on a paused account |

### Spending Policies

| Tool | Description |
|------|-------------|
| `list_policies` | List spending policies/rules |

### Spend Requests

| Tool | Description |
|------|-------------|
| `create_spend` | Create a spend request (runs through rules engine) |
| `list_spend_requests` | List recent spend requests |

## Available Resources

| Resource | URI | Description |
|----------|-----|-------------|
| `escrow-accounts` | `safespend://escrow-accounts` | JSON list of all escrow accounts |
| `policies` | `safespend://policies` | JSON list of all spending policies |

## Available Prompts

| Prompt | Description |
|--------|-------------|
| `setup_agent_budget` | Guided workflow to set up a budget for an AI agent |
| `check_spending_status` | Get a summary of current spending status |

## Example Usage with Claude

Once configured, you can ask Claude to:

```
"Check my Safe-Spend balance"
→ Claude uses list_escrow_accounts tool

"Create a $500 marketing budget for my AI agent"
→ Claude uses create_escrow_account and fund_escrow_account tools

"Spend $25 on OpenAI API credits from escrow esc_abc123"
→ Claude uses create_spend tool

"Set up a budget for my research agent with $200 total, max $20 per transaction"
→ Claude uses the setup_agent_budget prompt
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
SAFESPEND_API_KEY=sk_live_... npm start

# Test with MCP Inspector
npm run inspect
```

## Testing with MCP Inspector

```bash
SAFESPEND_API_KEY=sk_live_... npx @modelcontextprotocol/inspector dist/index.js
```

This opens a web UI where you can test all tools and resources.

## Security Notes

- **API Key Protection**: Never commit your API key. Use environment variables.
- **Approval Workflow**: Large spends may require human approval (depends on your policies).
- **Audit Trail**: All operations are logged in Safe-Spend's audit system.

## Troubleshooting

### "SAFESPEND_API_KEY environment variable is required"

Ensure you've set the environment variable in your MCP config:
```json
"env": {
  "SAFESPEND_API_KEY": "sk_live_..."
}
```

### "unauthorized" errors

Your API key may be invalid or expired. Generate a new one in the Safe-Spend dashboard.

### Tools not appearing in Claude

1. Restart Claude Desktop after config changes
2. Check the config file path is correct for your OS
3. Verify JSON syntax in config file

## Support

- **Documentation**: [agentictrust.app/docs](https://agentictrust.app/docs)
- **Issues**: [GitHub Issues](https://github.com/agentictrust/safespend-mcp-server/issues)
- **Email**: support@agentictrust.app

## License

Proprietary. See LICENSE file for details.
