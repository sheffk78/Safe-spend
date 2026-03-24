# Safe-Spend TypeScript SDK

A minimal, developer-friendly TypeScript client for the **Safe-Spend API** — fiat-first escrow and spending-control for AI agents, part of the [Agentic Trust](https://agentictrust.app) suite.

## Installation

```bash
npm install safespend
# or
yarn add safespend
# or
pnpm add safespend
```

## Quickstart

```typescript
import { SafeSpendClient } from 'safespend';

// Initialize the client with your API key
const client = new SafeSpendClient({ apiKey: 'sk_test_...' });

// List escrow accounts
const escrows = await client.listEscrowAccounts();
for (const escrow of escrows) {
  console.log(`${escrow.name}: $${(escrow.balance_cents / 100).toFixed(2)}`);
}

// Create a spend request
const spend = await client.createSpend({
  escrow_id: 'esc_9f3k2m',
  amount_cents: 4999,
  vendor: 'Anthropic',
  category: 'ai_compute',
  description: 'Claude API credits top-up',
});

// Check the result
if (spend.status === 'approved') {
  console.log(`Spend approved! Remaining: $${(spend.remaining_balance_cents || 0) / 100}`);
} else if (spend.status === 'pending') {
  console.log(`Awaiting human approval. Approval ID: ${spend.approval_id}`);
} else if (spend.status === 'denied') {
  console.log(`Spend denied: ${spend.denial_reason}`);
}
```

## Error Handling

The SDK throws typed exceptions for common error cases:

```typescript
import {
  SafeSpendClient,
  SafeSpendError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from 'safespend';

const client = new SafeSpendClient({ apiKey: 'sk_test_...' });

try {
  const spend = await client.createSpend({
    escrow_id: 'esc_invalid',
    amount_cents: 100,
    vendor: 'Test',
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.log('Escrow account not found');
  } else if (error instanceof ValidationError) {
    console.log(`Validation error: ${error.message}`);
    if (error.details) {
      console.log(`Details: ${JSON.stringify(error.details)}`);
    }
  } else if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded, try again later');
  } else if (error instanceof SafeSpendError) {
    console.log(`API error: ${error.message}`);
  }
}
```

## API Reference

### Escrow Accounts

```typescript
// List all escrow accounts
const escrows = await client.listEscrowAccounts();

// Get a specific escrow account
const escrow = await client.getEscrowAccount('esc_123');

// Create an escrow account
const escrow = await client.createEscrowAccount({
  name: 'Marketing Budget Q1',
  description: 'Budget for ad spend',
});

// Fund an escrow account (simulated, for testing)
const funded = await client.fundEscrowAccount('esc_123', { amount_cents: 100000 });

// Get balance only
const balance = await client.getEscrowBalance('esc_123');

// Pause/resume/close
await client.pauseEscrowAccount('esc_123');
await client.resumeEscrowAccount('esc_123');
await client.closeEscrowAccount('esc_123');
```

### Spending Policies

```typescript
// List policies
const policies = await client.listPolicies();
const policiesForEscrow = await client.listPolicies('esc_123');

// Create a policy
const policy = await client.createPolicy({
  escrow_id: 'esc_123',
  name: 'Marketing Policy',
  per_transaction_limit_cents: 10000,  // $100 max per transaction
  daily_limit_cents: 50000,            // $500 per day
  auto_approve_under_cents: 5000,      // Auto-approve under $50
  vendor_allowlist: ['Google Ads', 'Meta Ads'],
});

// Delete a policy
await client.deletePolicy('pol_123');
```

### Spend Requests

```typescript
// Create a spend request
const spend = await client.createSpend({
  escrow_id: 'esc_123',
  amount_cents: 2500,
  vendor: 'OpenAI',
  category: 'ai_compute',
  description: 'GPT-4 API usage',
  idempotency_key: 'order-12345',  // Optional, for safe retries
});

// List spend requests
const spends = await client.listSpendRequests();
const approvedSpends = await client.listSpendRequests({ 
  escrow_id: 'esc_123', 
  status: 'approved' 
});

// Get spend request details
const spendDetails = await client.getSpendRequest('sr_123');

// Cancel a pending spend request
const cancelled = await client.cancelSpendRequest('sr_123');
```

### Approvals

> **Note**: Approval endpoints require **organization tokens** (JWT), not API keys.
> Use `Authorization: Bearer <org_token>` from the dashboard login.
> This is intentional — approvals should be managed by humans, not agents.

```typescript
// For approval management, initialize with an org token instead of API key
const humanClient = new SafeSpendClient({
  apiKey: '<org_jwt_token>',  // JWT from /v1/auth/login
});

// List pending approvals
const approvals = await humanClient.listApprovals();  // Defaults to status="pending"
const allApprovals = await humanClient.listApprovals({ status: undefined });

// Get approval details
const approval = await humanClient.getApproval('apr_123');

// Approve a pending request
const result = await humanClient.approve('apr_123', { note: 'Approved by finance team' });

// Deny a pending request
const denied = await humanClient.deny('apr_123', { 
  note: 'Over budget', 
  reason: 'budget_exceeded' 
});
```

## Advanced Usage

### Custom Base URL

Point to staging or local development:

```typescript
const client = new SafeSpendClient({
  apiKey: 'sk_test_...',
  baseUrl: 'http://localhost:8001/api',
});
```

### Request Timeout

Customize the request timeout (default: 10000ms):

```typescript
const client = new SafeSpendClient({
  apiKey: 'sk_test_...',
  timeout: 30000,  // 30 seconds
});
```

### Idempotency

For safe retries, always provide an `idempotency_key`:

```typescript
const spend = await client.createSpend({
  escrow_id: 'esc_123',
  amount_cents: 5000,
  vendor: 'AWS',
  idempotency_key: `order-${orderId}`,
});
```

If you don't provide one, the SDK generates a unique key automatically.

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions:

```typescript
import type { 
  EscrowAccount, 
  SpendingPolicy, 
  SpendRequest, 
  Approval,
  SafeSpendConfig,
} from 'safespend';

const config: SafeSpendConfig = {
  apiKey: process.env.SAFESPEND_API_KEY!,
  baseUrl: process.env.SAFESPEND_BASE_URL,
};

const client = new SafeSpendClient(config);
```

## Compatibility

- Node.js 18+
- Modern browsers with `fetch` support
- Full TypeScript support with exported types
- ESM and CommonJS builds included

## Support

- **Documentation**: [agentictrust.app/docs](https://agentictrust.app/docs)
- **Issues**: [GitHub Issues](https://github.com/agentictrust/safespend-typescript/issues)
- **Email**: support@agentictrust.app

## License

Proprietary. See LICENSE file for details.
