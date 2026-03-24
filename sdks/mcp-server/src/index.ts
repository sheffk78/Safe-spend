#!/usr/bin/env node
/**
 * Safe-Spend MCP Server
 * 
 * Enables AI agents (like Claude) to interact with Safe-Spend's
 * escrow and spending control APIs through the Model Context Protocol.
 * 
 * Usage:
 *   SAFESPEND_API_KEY=sk_live_... SAFESPEND_BASE_URL=https://api.safespend.app safespend-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SafeSpendClient } from "./client.js";

// Get configuration from environment
const API_KEY = process.env.SAFESPEND_API_KEY;
const BASE_URL = process.env.SAFESPEND_BASE_URL || "https://api.safespend.app";

if (!API_KEY) {
  console.error("Error: SAFESPEND_API_KEY environment variable is required");
  process.exit(1);
}

const client = new SafeSpendClient({ apiKey: API_KEY, baseUrl: BASE_URL });

// Create MCP server
const server = new McpServer({
  name: "safespend",
  version: "0.1.0",
});

// =============================================================================
// TOOLS - Escrow Account Management
// =============================================================================

server.tool(
  "list_escrow_accounts",
  "List all escrow accounts for your organization",
  {},
  async () => {
    try {
      const escrows = await client.listEscrowAccounts();
      
      if (escrows.length === 0) {
        return {
          content: [{ type: "text", text: "No escrow accounts found. Create one with create_escrow_account." }]
        };
      }
      
      const formatted = escrows.map(e => 
        `• ${e.name} (${e.id})\n  Balance: $${(e.balance_cents / 100).toFixed(2)} ${e.currency.toUpperCase()}\n  Status: ${e.status}`
      ).join('\n\n');
      
      return {
        content: [{ type: "text", text: `Found ${escrows.length} escrow account(s):\n\n${formatted}` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "get_escrow_balance",
  "Get the current balance of an escrow account",
  {
    escrow_id: z.string().describe("The escrow account ID (e.g., 'esc_abc123')"),
  },
  async ({ escrow_id }) => {
    try {
      const balance = await client.getEscrowBalance(escrow_id);
      return {
        content: [{ 
          type: "text", 
          text: `Escrow ${escrow_id}:\n• Balance: $${(balance.balance_cents / 100).toFixed(2)} ${balance.currency.toUpperCase()}\n• Status: ${balance.status}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "create_escrow_account",
  "Create a new escrow account (trust account) for holding funds",
  {
    name: z.string().describe("Display name for the escrow account"),
    description: z.string().optional().describe("Optional description of the account's purpose"),
  },
  async ({ name, description }) => {
    try {
      const escrow = await client.createEscrowAccount(name, description);
      return {
        content: [{ 
          type: "text", 
          text: `Created escrow account:\n• ID: ${escrow.id}\n• Name: ${escrow.name}\n• Balance: $${(escrow.balance_cents / 100).toFixed(2)}\n• Status: ${escrow.status}\n\nNext: Fund this account with fund_escrow_account.`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "fund_escrow_account",
  "Add funds to an escrow account (simulated funding for testing)",
  {
    escrow_id: z.string().describe("The escrow account ID to fund"),
    amount_dollars: z.number().positive().describe("Amount to fund in dollars (e.g., 100 for $100)"),
  },
  async ({ escrow_id, amount_dollars }) => {
    try {
      const amountCents = Math.round(amount_dollars * 100);
      const escrow = await client.fundEscrowAccount(escrow_id, amountCents);
      return {
        content: [{ 
          type: "text", 
          text: `Funded $${amount_dollars.toFixed(2)} to escrow ${escrow_id}.\n• New balance: $${(escrow.balance_cents / 100).toFixed(2)}\n• Status: ${escrow.status}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "pause_escrow_account",
  "Pause spending on an escrow account (temporarily disable all transactions)",
  {
    escrow_id: z.string().describe("The escrow account ID to pause"),
  },
  async ({ escrow_id }) => {
    try {
      const escrow = await client.pauseEscrowAccount(escrow_id);
      return {
        content: [{ 
          type: "text", 
          text: `Paused escrow ${escrow_id}.\n• Status: ${escrow.status}\n• Balance: $${(escrow.balance_cents / 100).toFixed(2)} (frozen)\n\nTo resume: use resume_escrow_account.`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "resume_escrow_account",
  "Resume spending on a paused escrow account",
  {
    escrow_id: z.string().describe("The escrow account ID to resume"),
  },
  async ({ escrow_id }) => {
    try {
      const escrow = await client.resumeEscrowAccount(escrow_id);
      return {
        content: [{ 
          type: "text", 
          text: `Resumed escrow ${escrow_id}.\n• Status: ${escrow.status}\n• Balance: $${(escrow.balance_cents / 100).toFixed(2)} (available)`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOLS - Spending Policies
// =============================================================================

server.tool(
  "list_policies",
  "List spending policies (fiduciary rules) for your organization",
  {
    escrow_id: z.string().optional().describe("Optional: filter by escrow account ID"),
  },
  async ({ escrow_id }) => {
    try {
      const policies = await client.listPolicies(escrow_id);
      
      if (policies.length === 0) {
        return {
          content: [{ type: "text", text: "No spending policies found." }]
        };
      }
      
      const formatted = policies.map(p => {
        const limits = [];
        if (p.per_transaction_limit_cents) limits.push(`Per-tx: $${(p.per_transaction_limit_cents / 100).toFixed(2)}`);
        if (p.daily_limit_cents) limits.push(`Daily: $${(p.daily_limit_cents / 100).toFixed(2)}`);
        if (p.auto_approve_under_cents) limits.push(`Auto-approve under: $${(p.auto_approve_under_cents / 100).toFixed(2)}`);
        
        return `• ${p.name} (${p.id})\n  Escrow: ${p.escrow_id}\n  Active: ${p.is_active}\n  ${limits.join(' | ') || 'No limits set'}`;
      }).join('\n\n');
      
      return {
        content: [{ type: "text", text: `Found ${policies.length} policy(ies):\n\n${formatted}` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// =============================================================================
// TOOLS - Spend Requests
// =============================================================================

server.tool(
  "create_spend",
  "Create a spend request - runs through the rules engine and may be auto-approved, denied, or require human approval",
  {
    escrow_id: z.string().describe("The escrow account to spend from"),
    amount_dollars: z.number().positive().describe("Amount to spend in dollars (e.g., 25.00)"),
    vendor: z.string().describe("Vendor/merchant name (e.g., 'OpenAI', 'AWS')"),
    category: z.string().optional().describe("Spending category (e.g., 'ai_compute', 'cloud_services')"),
    description: z.string().optional().describe("Description for audit trail"),
  },
  async ({ escrow_id, amount_dollars, vendor, category, description }) => {
    try {
      const amountCents = Math.round(amount_dollars * 100);
      const spend = await client.createSpend({
        escrowId: escrow_id,
        amountCents,
        vendor,
        category,
        description,
      });
      
      let statusMessage: string;
      if (spend.status === 'approved') {
        statusMessage = `✅ APPROVED - Spend executed.\n• Remaining balance: $${((spend.remaining_balance_cents || 0) / 100).toFixed(2)}`;
      } else if (spend.status === 'denied') {
        statusMessage = `❌ DENIED - ${spend.denial_reason || 'Policy violation'}`;
      } else if (spend.status === 'pending') {
        statusMessage = `⏳ PENDING APPROVAL\n• Approval ID: ${spend.approval_id}\n• Expires: ${spend.approval_expires_at}\n\nA human must approve this spend before it executes.`;
      } else {
        statusMessage = `Status: ${spend.status}`;
      }
      
      return {
        content: [{ 
          type: "text", 
          text: `Spend Request ${spend.id}:\n• Amount: $${amount_dollars.toFixed(2)}\n• Vendor: ${vendor}\n• Category: ${category || 'N/A'}\n\n${statusMessage}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "list_spend_requests",
  "List recent spend requests",
  {
    escrow_id: z.string().optional().describe("Optional: filter by escrow account ID"),
    status: z.enum(['approved', 'denied', 'pending', 'expired', 'cancelled']).optional().describe("Optional: filter by status"),
  },
  async ({ escrow_id, status }) => {
    try {
      const spends = await client.listSpendRequests(escrow_id, status);
      
      if (spends.length === 0) {
        return {
          content: [{ type: "text", text: "No spend requests found matching criteria." }]
        };
      }
      
      const formatted = spends.slice(0, 10).map(s => {
        const statusIcon = s.status === 'approved' ? '✅' : s.status === 'denied' ? '❌' : s.status === 'pending' ? '⏳' : '•';
        return `${statusIcon} ${s.id}\n   $${(s.amount_cents / 100).toFixed(2)} to ${s.vendor} | ${s.status}`;
      }).join('\n');
      
      return {
        content: [{ 
          type: "text", 
          text: `Recent spend requests (showing ${Math.min(spends.length, 10)} of ${spends.length}):\n\n${formatted}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// =============================================================================
// RESOURCES - Contextual Information
// =============================================================================

server.resource(
  "escrow-accounts",
  "safespend://escrow-accounts",
  async () => {
    try {
      const escrows = await client.listEscrowAccounts();
      return {
        contents: [{
          uri: "safespend://escrow-accounts",
          mimeType: "application/json",
          text: JSON.stringify(escrows, null, 2),
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: "safespend://escrow-accounts",
          mimeType: "text/plain",
          text: `Error: ${(error as Error).message}`,
        }]
      };
    }
  }
);

server.resource(
  "policies",
  "safespend://policies",
  async () => {
    try {
      const policies = await client.listPolicies();
      return {
        contents: [{
          uri: "safespend://policies",
          mimeType: "application/json",
          text: JSON.stringify(policies, null, 2),
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: "safespend://policies",
          mimeType: "text/plain",
          text: `Error: ${(error as Error).message}`,
        }]
      };
    }
  }
);

// =============================================================================
// PROMPTS - Guided Workflows
// =============================================================================

server.prompt(
  "setup_agent_budget",
  "Guide through setting up a new budget for an AI agent",
  {
    agent_name: z.string().describe("Name of the AI agent"),
    budget_dollars: z.number().describe("Total budget in dollars"),
    max_per_transaction: z.number().describe("Maximum spend per transaction in dollars"),
  },
  async ({ agent_name, budget_dollars, max_per_transaction }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Help me set up a Safe-Spend budget for my AI agent "${agent_name}".

Requirements:
- Total budget: $${budget_dollars}
- Max per transaction: $${max_per_transaction}
- Auto-approve spends under $${Math.min(50, max_per_transaction / 2)}

Please:
1. Create an escrow account named "${agent_name} Budget"
2. Fund it with $${budget_dollars}
3. Create a spending policy with the limits above

Use the Safe-Spend tools to complete this setup.`
      }
    }]
  })
);

server.prompt(
  "check_spending_status",
  "Get a summary of current spending status",
  {},
  async () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please give me a summary of my Safe-Spend account status:

1. List all escrow accounts with balances
2. Show any pending approvals
3. List recent spend requests

Use the Safe-Spend tools to gather this information.`
      }
    }]
  })
);

// =============================================================================
// Start Server
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Safe-Spend MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
