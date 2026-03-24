# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 09 Complete - Production Hardening & Deployment
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

### Prompt 07 - Docs Site (Completed - March 24, 2026)

#### Docs Infrastructure
- **Layout**: `/docs` route with left sidebar navigation + content area
- **Components**: DocsLayout, DocsSidebar, DocsHeading, DocsText, Callout, CodeBlock, ApiEndpoint
- **Styling**: Dark theme with emerald accent, consistent with app

#### Docs Pages
| Route | Page | Description |
|-------|------|-------------|
| `/docs` | Overview | What is Safe-Spend, who it's for, key concepts |
| `/docs/concepts` | Core Concepts | Escrow accounts, policies, rules engine, API keys, webhooks |
| `/docs/quickstart` | Quickstart | 10-15 min guide from signup to first spend |
| `/docs/api` | API Reference | All endpoints with examples (Auth, Escrow, Policies, Spend, Approvals, Audit, Webhooks) |
| `/docs/webhooks` | Webhooks | Events, payloads, HMAC signature verification |
| `/docs/integrations` | Integrations | cURL, Python, TypeScript, LangChain, CrewAI, OpenAI Assistants, MCP |

#### Dashboard Integration
- Added "Read the docs" links from API Keys, Spending Rules, and Webhooks pages to relevant docs sections

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

### Frontend Docs (NEW - Prompt 07)
- `/app/frontend/src/layouts/DocsLayout.js` - Docs layout with sidebar
- `/app/frontend/src/components/docs/DocsComponents.js` - Typography, Callout, ApiEndpoint helpers
- `/app/frontend/src/components/docs/DocsCodeBlock.js` - Code block with syntax highlighting
- `/app/frontend/src/pages/docs/DocsOverview.js` - What is Safe-Spend?
- `/app/frontend/src/pages/docs/DocsConcepts.js` - Core concepts
- `/app/frontend/src/pages/docs/DocsQuickstart.js` - Quickstart guide
- `/app/frontend/src/pages/docs/DocsApiReference.js` - Full API reference
- `/app/frontend/src/pages/docs/DocsWebhooks.js` - Webhooks & signatures
- `/app/frontend/src/pages/docs/DocsIntegrations.js` - cURL, Python, TypeScript, LangChain, CrewAI, MCP

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

### Prompt 08 - Stripe Integration (Completed - March 24, 2026)

#### Infrastructure
- **Stripe SDK**: `stripe@14.25.0`
- **Client**: `/app/backend/src/lib/stripe.js`
- **Service**: `/app/backend/src/services/stripe-service.js`
- **Webhook Handler**: `/app/backend/src/routes/stripe-webhook.js`

#### Database Schema Updates
```prisma
model FundingEvent {
  id                    String   @id @default(uuid())
  orgId                 String   @map("org_id")
  escrowId              String   @map("escrow_id")
  stripePaymentIntentId String?  @map("stripe_payment_intent_id")
  stripeSessionId       String?  @map("stripe_session_id")
  stripeRefundId        String?  @map("stripe_refund_id")
  amountCents           Int      @map("amount_cents")
  currency              String   @default("usd")
  status                String   @default("pending") // pending | succeeded | failed | refunded
  type                  String   @default("funding") // funding | refund
  ...
}
```

#### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/escrow-accounts/:id/fund` | POST | Legacy simulated funding (for tests) |
| `/v1/escrow-accounts/:id/fund-session` | POST | Create Stripe Checkout Session |
| `/v1/escrow-accounts/:id/confirm-funding` | POST | Manual funding confirmation (dev mode) |
| `/v1/escrow-accounts/:id/funding-history` | GET | Get funding event history |
| `/v1/escrow-accounts/:id/close` | POST | Close with Stripe refund |
| `/api/stripe/webhook` | POST | Stripe webhook handler |

#### Frontend Updates
- **Fund Modal**: Updated with Stripe vs Simulated payment selection
- **Funding History Modal**: New modal to view funding events
- **Success/Cancel callbacks**: Handle Stripe redirect responses

#### Key Features
1. **Stripe Customer per Org**: Auto-created on first fund
2. **Checkout Session**: Stripe-hosted payment page
3. **Webhook Processing**: Automatic balance updates on payment success
4. **Refund on Close**: Remaining balance refunded when closing escrow
5. **Funding History**: Track all funding events with Stripe IDs

#### Environment Variables
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (optional, for signature verification)
```

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. ~~Dashboard Pages (Prompt 04)~~ ✅ COMPLETE
2. ~~Approvals & Webhooks (Prompt 05)~~ ✅ COMPLETE
3. ~~End-to-End Testing (Prompt 06)~~ ✅ COMPLETE
4. ~~Docs Site (Prompt 07)~~ ✅ COMPLETE
5. ~~Stripe Integration (Prompt 08)~~ ✅ COMPLETE
6. ~~Production Hardening (Prompt 09)~~ ✅ COMPLETE

### P1 - High Priority
7. **SDK Generation** - Python, TypeScript SDKs
8. **MCP Server Package** - `@safespend/mcp-server`

### P2 - Medium Priority
9. **Email Notifications** - Alert on pending approvals
10. **Production Deployment** - CI/CD, monitoring

---

## Next Tasks
1. SDK generation (Python, TypeScript)
2. MCP Server implementation
3. Email notifications for pending approvals

---

### Prompt 09 - Production Hardening (Completed - March 24, 2026)

#### Security Infrastructure
- **Rate Limiting**: `express-rate-limit` on auth (10/15min), global (200/min)
- **Input Validation**: Zod schemas for all request bodies
- **Security Headers**: Helmet middleware
- **Timing-Safe Comparison**: API key validation

#### New Files Created
```
src/config/environment.js      # Env validation & config
src/lib/logger.js              # Pino structured logging
src/lib/org-scoped.js          # Multi-tenant helpers
src/middleware/request-id.js   # Request ID generation
src/middleware/rate-limit.js   # Rate limiting middleware
src/middleware/validation.js   # Zod validation schemas
src/middleware/error-handler.js # Global error handling
```

#### Enhanced Health Check
```json
{
  "status": "ok | degraded",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": "ok | error",
    "stripe": "ok | not_configured"
  },
  "uptime_seconds": 3600
}
```

#### Multi-Tenant Isolation Tests
- `tests/isolation.test.js` - 13 tests verifying cross-org access is blocked
- Tests cover: escrow, policies, approvals, API keys, spend requests, audit logs

#### Documentation
- `README.md` - Deployment guide
- `PRODUCTION_CHECKLIST.md` - Pre-deploy verification
- `.env.example` - Environment variable template

#### Test Suite: 75 tests passing
