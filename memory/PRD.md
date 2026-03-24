# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 06 Complete - End-to-End Testing Suite
**Last Updated:** March 24, 2026

---

## User Personas

### Primary: Developer/Engineer
- Building AI agents that need to spend money
- Wants programmatic control over agent spending
- Needs clear API documentation and SDKs
- Values trust and security for financial operations

### Secondary: Business Owner/Manager  
- Oversees AI agent operations
- Needs visibility into agent spending
- Requires approval workflows for larger transactions
- Wants audit trails for compliance

---

## Core Requirements (Static)

### Brand & Design
- Product Name: Safe-Spend (by Agentic Trust)
- Primary Accent: Emerald #10B981
- Dark mode only
- Typography: Space Grotesk (headings), Inter (body), JetBrains Mono (code)
- Support Email: support@agentictrust.app

### Technical Stack
- Frontend: React with Tailwind CSS
- Backend: Node.js Express (via FastAPI proxy)
- Database: SQLite with Prisma ORM
- Auth: JWT for dashboard, API keys for programmatic access

---

## What's Been Implemented

### Prompt 01 - Landing Page + Dashboard Shell (Completed)
- Landing page with all sections
- Dashboard shell with sidebar navigation
- Official Safe-Spend logo integration

### Prompt 02 - Backend Core API (Completed)
- Database schema with 9+ tables
- Auth system (JWT + API keys)
- All CRUD endpoints for escrow accounts, policies, spend requests, etc.

### Prompt 03 - Rules Engine (Completed)
- 13-Step Spend Validation Cascade
- Outcomes: approved, denied, pending, replay

### Prompt 04 - Dashboard Pages (Completed)
- Dashboard Overview with real-time stats
- Escrow Accounts page with CRUD
- Spending Rules page with policy builder
- Transactions page and detail view
- Approvals page with approve/deny
- API Keys page with management
- Audit Log page with filters

### Prompt 05 - Approvals & Webhooks (Completed - March 2026)

#### Approvals Lifecycle
- **Auto-expiration system**: `POST /v1/approvals/expire-stale` maintenance endpoint
- **Time-based expiration**: Approvals expire after `approval_timeout_minutes` (default 60)
- **Balance deduction on approve**: Full transaction with escrow balance update
- **Human approval tracking**: `rules_evaluated` includes `human_approval` or `human_denial` steps
- **Audit trails**: Events logged for `approval.approved`, `approval.denied`, `approval.expired`

#### Webhook System
- **Webhook Registration**: `POST/GET/DELETE /v1/webhooks` with event subscriptions
- **HMAC-SHA256 Signatures**: `X-SafeSpend-Signature` header for payload verification
- **Timestamp Protection**: `X-SafeSpend-Timestamp` header prevents replay attacks
- **Delivery Queue**: `webhook_deliveries` table tracks attempts and status
- **Retry Logic**: Exponential backoff (2^attempts * 60s, max 1hr), max 10 retries
- **Maintenance Endpoint**: `POST /v1/webhooks/deliver-pending` triggers delivery
- **Secret Rotation**: `POST /v1/webhooks/:id/rotate-secret`
- **Test Endpoint**: `POST /v1/webhooks/:id/test`

#### Supported Webhook Events
- `spend.approved`, `spend.denied`, `spend.expired`
- `approval.requested`, `approval.approved`, `approval.denied`, `approval.expired`
- `escrow.funded`, `escrow.paused`, `escrow.resumed`, `escrow.closed`

#### Dashboard Updates
- **Webhooks Page** (`/dashboard/webhooks`)
  - List webhooks with URL, events, status
  - Create modal with event category checkboxes
  - Expand to see Test, Rotate Secret, Deactivate, Delete
  - Recent Deliveries section
  
- **Approval Detail Page** (`/dashboard/approvals/:id`)
  - Time remaining countdown (HH:MM:SS)
  - Large Approve/Deny buttons
  - Spend Request summary (amount, vendor, category)
  - Escrow Account info with projected balance
  - Rules Evaluation timeline
  - Decision info (for completed approvals)
  - Link to transaction detail

---

## Architecture Summary

### Backend Services
- `/app/backend/src/services/rules-engine.js` - 13-step evaluation
- `/app/backend/src/services/webhook-service.js` - HMAC signing, delivery queue

### Backend Routes
- `/app/backend/src/routes/webhooks.js` - Webhook CRUD + delivery
- `/app/backend/src/routes/approvals.js` - Approval lifecycle
- `/app/backend/src/routes/escrow-accounts.js` - Escrow management
- `/app/backend/src/routes/spend.js` - Spend requests

### Frontend Dashboard
- `/app/frontend/src/lib/api.js` - API client layer
- `/app/frontend/src/pages/dashboard/WebhooksPage.js`
- `/app/frontend/src/pages/dashboard/ApprovalDetailPage.js`
- `/app/frontend/src/pages/dashboard/ApprovalsPage.js`

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. ~~Dashboard Pages (Prompt 04)~~ ✅ COMPLETE
2. ~~Approvals & Webhooks (Prompt 05)~~ ✅ COMPLETE
3. **Stripe Integration** - Real funding and disbursement

### P1 - High Priority
4. **Documentation Page** - API reference, integration guides
5. **SDK Generation** - Python, TypeScript SDKs

### P2 - Medium Priority
6. **MCP Server** - Model Context Protocol integration
7. **Email Notifications** - Alert on pending approvals
8. **Rate Limiting** - API request limits

---

## Testing

### Prompt 06 - End-to-End Testing Suite (Completed - March 24, 2026)

#### Test Infrastructure
- **Framework**: Jest + Supertest
- **Configuration**: `/app/backend/jest.config.js`
- **Setup**: `/app/backend/tests/setup.js` - DB connection/disconnection
- **Utilities**: `/app/backend/tests/utils.js` - Test helpers (createTestOrg, createApiKey, etc.)
- **Documentation**: `/app/backend/TESTING.md`

#### Test Suites (61 Tests Total - 100% Passing)

| Suite | File | Tests | Coverage |
|-------|------|-------|----------|
| Auth | `auth.test.js` | 6 | Signup, login, /me endpoint, duplicate email, wrong password |
| Escrow | `escrow.test.js` | 11 | Create, fund, list, pause/resume, close lifecycle |
| Policies | `policies.test.js` | 11 | Per-tx limit, daily cap, vendor allow/block, category block, combined rules |
| Spend + Approval | `spend-approval.test.js` | 11 | Auto-approve, pending, approve/deny, expiration, idempotency |
| API Keys | `api-keys.test.js` | 9 | Create, list, revoke, activate/deactivate, agent key access, last_used_at |
| Webhooks | `webhooks.test.js` | 13 | Register, list, delete, delivery queue, HMAC signatures, replay protection |

#### Key Bug Fixes During Testing
1. **API Key Header Support**: Updated auth middleware to accept both `X-API-Key` and `Authorization: Bearer` headers
2. **Key Prefix Matching**: Fixed test assertion to match actual stored key prefix format (`sk_xxx...`)

#### Running Tests
```bash
cd /app/backend && npm test
```

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. ~~Dashboard Pages (Prompt 04)~~ ✅ COMPLETE
2. ~~Approvals & Webhooks (Prompt 05)~~ ✅ COMPLETE
3. ~~End-to-End Testing (Prompt 06)~~ ✅ COMPLETE
4. **Stripe Integration** - Real funding and disbursement

### P1 - High Priority
5. **Documentation Page** - API reference, integration guides
6. **SDK Generation** - Python, TypeScript SDKs

### P2 - Medium Priority
7. **MCP Server** - Model Context Protocol integration
8. **Email Notifications** - Alert on pending approvals
9. **Rate Limiting** - API request limits
10. **Production Deployment** - Environment configuration

---

## Next Tasks
1. Stripe integration for real fiat funding (Prompt 07 if provided)
2. API documentation page
3. SDK generation (Python, TypeScript)
