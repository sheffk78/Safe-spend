# Safe-Spend Testing Guide

## Overview

The Safe-Spend backend includes a comprehensive Jest test suite covering all major features. Tests run against the actual Express application using Supertest for HTTP integration testing.

## Quick Start

```bash
cd /app/backend

# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run with verbose output
npm run test:verbose
```

## Test Suites

### 1. `auth.test.js` - Authentication & Onboarding
- Signup + Login Happy Path
- Duplicate Email Fails
- Wrong Password Fails Login

### 2. `escrow.test.js` - Escrow Account Lifecycle
- Create + Fund accounts
- Pause / Resume operations
- Close (prevent further spends)

### 3. `policies.test.js` - Spending Policy Rules
- Per-Transaction Limit enforcement
- Daily Cap enforcement
- Vendor Allowlist (whitelist)
- Category Blocklist (blacklist)
- Combined rule evaluation

### 4. `spend-approval.test.js` - Spend + Approval Lifecycle
- Small auto-approved spend
- Large spend → human approval → approved
- Large spend → human approval → denied
- Expired approval handling
- Idempotency key support

### 5. `api-keys.test.js` - API Key Scope
- Create / List / Revoke keys
- Agent key for agent-scoped endpoints
- Revoked/Deactivated key rejection

### 6. `webhooks.test.js` - Webhook Delivery
- Register webhook endpoint
- Receive events after spend
- HMAC-SHA256 signature verification

## Test Utilities

Located in `tests/utils.js`:

```javascript
// Reset database between tests
await resetDatabase();

// Create test organization
const { token, org, email, password } = await createTestOrg();

// Login with existing credentials
const { token, org } = await loginTestOrg(email, password);

// Create API key
const key = await createApiKey(token, 'agent', { label: 'My Agent' });

// Create escrow account
const escrow = await createEscrowAccount(token, { name: 'My Escrow' });

// Fund escrow
const funded = await fundEscrowAccount(token, escrowId, 100000); // $1,000

// Create spending policy
const policy = await createPolicy(token, escrowId, {
    per_transaction_limit_cents: 50000,
    daily_limit_cents: 100000
});

// Create spend request
const { response, status } = await createSpendRequest(token, {
    escrow_id: escrowId,
    amount_cents: 30000,
    vendor: 'Test Vendor',
    category: 'test'
});

// Create webhook
const webhook = await createWebhook(token, 'https://example.com/hook', ['spend.approved']);

// Approval operations
const approval = await getApproval(token, approvalId);
const { response } = await approveApproval(token, approvalId, 'Approved by test');
const { response } = await denyApproval(token, approvalId, 'human_denied', 'Denied by test');
```

## Database Handling

Tests use the same SQLite database but with isolation:
- `resetDatabase()` is called in `beforeEach()` to ensure clean state
- Each test suite manages its own test data
- Tests run sequentially (`--runInBand`) to avoid race conditions

## Coverage Report

Generate coverage report:

```bash
npm test -- --coverage
```

Coverage reports are saved to `coverage/` directory.

## Writing New Tests

1. Create a new file in `tests/` ending with `.test.js`
2. Import utilities from `./utils.js`
3. Use `beforeAll`/`beforeEach` for setup
4. Call `resetDatabase()` in `beforeEach` for isolation
5. Use descriptive test names

Example:

```javascript
const { getApp, resetDatabase, createTestOrg } = require('./utils');

describe('My Feature', () => {
    let app;
    let testOrg;

    beforeAll(async () => {
        app = getApp();
    });

    beforeEach(async () => {
        await resetDatabase();
        testOrg = await createTestOrg();
    });

    it('should do something', async () => {
        const res = await request(app)
            .get('/api/v1/something')
            .set('Authorization', `Bearer ${testOrg.token}`)
            .expect(200);
        
        expect(res.body).toHaveProperty('expected_field');
    });
});
```

## CI/CD Integration

For CI environments, use:

```bash
npm test -- --ci --forceExit --detectOpenHandles
```

This ensures:
- Clean exit after tests complete
- Detects and warns about open handles
- CI-friendly output format

## Troubleshooting

### Tests hanging
- Ensure `--forceExit` flag is used
- Check for unclosed database connections
- Verify `afterAll` cleanup runs

### Database conflicts
- Ensure `resetDatabase()` is called in `beforeEach`
- Use `--runInBand` to run tests sequentially

### Port conflicts
- Tests use the app directly, not a separate server
- The actual server should not be running during tests
