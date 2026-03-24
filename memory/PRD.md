# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 16 Complete - Python SDK
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

### P0 - Critical (Completed)
1. ~~Dashboard Pages (Prompt 04)~~ ✅ COMPLETE
2. ~~Approvals & Webhooks (Prompt 05)~~ ✅ COMPLETE
3. ~~End-to-End Testing (Prompt 06)~~ ✅ COMPLETE
4. ~~Docs Site (Prompt 07)~~ ✅ COMPLETE
5. ~~Stripe Integration (Prompt 08)~~ ✅ COMPLETE
6. ~~Production Hardening (Prompt 09)~~ ✅ COMPLETE
7. ~~Terms of Service (Prompt 10)~~ ✅ COMPLETE
8. ~~Privacy Policy (Prompt 11)~~ ✅ COMPLETE
9. ~~Trust Law Explainer (Prompt 12)~~ ✅ COMPLETE
10. ~~API Playground (Prompt 13)~~ ✅ COMPLETE
11. ~~Quick Start Templates~~ ✅ COMPLETE
12. ~~Policy Builder Wizard~~ ✅ COMPLETE
13. ~~Guided Tour (Onboarding)~~ ✅ COMPLETE
14. ~~Admin Control Plane (Prompt 14)~~ ✅ COMPLETE
15. ~~Admin API v1 (Prompt 15)~~ ✅ COMPLETE
16. ~~Python SDK (Prompt 16)~~ ✅ COMPLETE

### P1 - High Priority (Future)
1. **TypeScript SDK** - TypeScript/JavaScript SDK for Node.js
2. **MCP Server Package** - `@safespend/mcp-server`

### P2 - Medium Priority
3. **Email Notifications** - Alert on pending approvals
4. **Production Deployment** - CI/CD, monitoring

---

## Next Tasks
1. TypeScript SDK generation
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

---

### Prompt 10 & 11 - Terms of Service & Privacy Policy (Completed - March 24, 2026)

- `/terms` - Full Terms of Service page with 16 sections
- `/privacy` - Full Privacy Policy page with 12 sections
- Both use matching dark theme, table of contents, and professional legal formatting
- Section IDs for deep linking
- Links from landing page footer

---

### Prompt 12 - Trust Law Explainer & Governance Patterns (Completed - March 24, 2026)

#### New Documentation Page
- **Route**: `/docs/trust-law`
- **Navigation**: Added "Concepts" section in docs sidebar with "Trust Law & Governance" item

#### Content Sections
1. **Why Trust Law for AI Agents?** - Explains trust law fundamentals and AI agent risks ($82K horror story)
2. **Core Concept Mapping Table** - 7-row table mapping Safe-Spend concepts to trust law equivalents
3. **Governance Pattern 1: Marketing Agent Budget** - Example policy with JSON config
4. **Governance Pattern 2: AI Procurement Agent** - SaaS/tools spending controls
5. **Governance Pattern 3: R&D Experiments / Sandboxes** - Bounded-loss exploration budgets
6. **Governance Pattern 4: Multi-Agent, Single Escrow** - Shared funds with distinct policies
7. **How to Explain This to Stakeholders** - Talking points for Legal, Finance, and Security teams

#### UI Components
- In-page Table of Contents navigation
- PatternCard component for governance patterns
- PolicyCodeBlock for JSON examples with syntax highlighting
- ConceptTable for trust law mapping

#### Contextual Links Added
- **SpendingRulesPage**: "New to fiduciary policies? Read the Trust Law Explainer → /docs/trust-law"
- **AuditLogPage**: "Learn how audit logs map to trust accounting → /docs/trust-law#concept-mapping"

#### Files Created/Modified
- `/app/frontend/src/pages/docs/DocsTrustLaw.js` (NEW)
- `/app/frontend/src/layouts/DocsLayout.js` (Updated navigation)
- `/app/frontend/src/App.js` (Added route)
- `/app/frontend/src/pages/dashboard/SpendingRulesPage.js` (Added link)
- `/app/frontend/src/pages/dashboard/AuditLogPage.js` (Added link)


---

### Policy Builder Wizard (Completed - March 24, 2026)

#### Overview
An interactive step-by-step wizard that guides users through creating spending policies using trust law concepts as guardrails. Provides pre-built governance patterns with sensible defaults.

#### Steps
1. **Pattern Selection** - Choose from 4 governance patterns:
   - Marketing Agent (Purpose-restricted trust for ads and AI compute)
   - Procurement Agent (Vendor-restricted trust with approval thresholds)
   - R&D Sandbox (Small-corpus trust with bounded-loss exploration)
   - Custom Policy (Build from scratch)

2. **Basics** - Name the policy, link to escrow account (trust account), set activation

3. **Limits** - Configure per-transaction, daily, weekly, and monthly caps

4. **Controls** - Set vendor allowlists/blocklists, category controls, and time windows

5. **Approval** - Define auto-approve thresholds and human oversight requirements

6. **Review** - Summary of all settings before creation

#### Trust Law Integration
- Each step includes Trust Law Callouts explaining the fiduciary concepts
- Pattern selection shows trust law equivalent descriptions
- Contextual links to `/docs/trust-law` throughout the wizard
- Pre-fills sensible defaults based on selected governance pattern

#### UI Components
- `PolicyBuilderWizard.js` - Main wizard component
- `TrustLawCallout` - Styled callout for trust law guidance
- `StepIndicator` - Visual progress through 6 steps
- `PatternSelectionStep`, `BasicsStep`, `LimitsStep`, `ControlsStep`, `ApprovalStep`, `ReviewStep`

#### Files Created/Modified
- `/app/frontend/src/components/PolicyBuilderWizard.js` (NEW - ~900 lines)
- `/app/frontend/src/pages/dashboard/SpendingRulesPage.js` (Added wizard button and modal)

#### Access
- Dashboard → Spending Rules → "Policy Wizard" button


---

### Prompt 13 - API Playground (Completed - March 24, 2026)

#### Overview
An interactive API testing environment for developers to simulate spend requests and explore the rules engine without writing code.

#### Features
1. **Request Builder** with form fields for all spend request parameters
2. **Quick Scenarios** - Pre-built test cases:
   - Happy Path (Should pass all policies)
   - Vendor Not Allowed (Tests vendor allowlist)
   - Over Daily Cap (Tests spending limits)
   - Requires Human Approval (Tests approval thresholds)
3. **Response Panel** - Shows API response with status badges and key fields
4. **Rules Timeline** - Visual step-by-step view of rules evaluation
5. **Code Snippets** - Auto-generated code in cURL, Python, and TypeScript
6. **Test/Live Mode Indicator** - Shows which mode API key is in

#### UI Components
- `PlaygroundPage.js` - Main playground page
- `ModeIndicator` - Test/Live mode badge
- `CodeSnippet` - Copyable code blocks with syntax highlighting
- `RulesTimeline` - Visual rules evaluation display
- `SCENARIO_PRESETS` - Pre-defined test scenarios

#### Files Created/Modified
- `/app/frontend/src/pages/dashboard/PlaygroundPage.js` (NEW)
- `/app/frontend/src/layouts/DashboardLayout.js` (Added Playground nav)
- `/app/frontend/src/App.js` (Added route)

#### Access
- Dashboard → Playground (sidebar navigation)

---

### Quick Start Templates (Completed - March 24, 2026)

#### Overview
One-click creation of pre-configured escrow accounts with matching spending policies. Creates both resources in a single flow.

#### Templates Available
1. **Marketing Budget** ($5K budget, $100/tx, auto-approve under $50)
   - For marketing agents doing ad spend and AI compute
2. **Procurement Tools** ($3K budget, $300/tx, auto-approve under $150)
   - For SaaS subscriptions and developer tools
3. **R&D Sandbox** ($500 budget, $20/tx, auto-approve under $10)
   - Bounded-loss experimentation for research agents
4. **DevOps Infrastructure** ($10K budget, $500/tx, auto-approve under $250)
   - Cloud infrastructure and monitoring tools

#### Flow
1. Select template
2. Review configuration summary
3. Create escrow + policy in one click
4. Success screen with links to Playground and Escrow page

#### Files Created/Modified
- `/app/frontend/src/components/QuickStartModal.js` (NEW)
- `/app/frontend/src/pages/dashboard/DashboardOverview.js` (Added Quick Start button)

#### Access
- Dashboard → Quick Start button (top right header)


---

### Guided Tour (Completed - March 24, 2026)

#### Overview
An interactive onboarding tour that walks first-time users through the key features of Safe-Spend. Automatically shows for new users, can be restarted from the sidebar.

#### Tour Steps (7 total)
1. **Welcome** - Introduction and tour overview
2. **Quick Start** - Highlights the Quick Start button with spotlight effect
3. **Escrow Accounts** - Explains segregated fund pools
4. **Spending Rules** - Explains fiduciary policies
5. **Playground** - Highlights the API testing environment
6. **API Keys** - Explains agent authentication
7. **Completion** - Summary with "Get Started" CTA

#### Features
- **Spotlight overlay** with animated border on highlighted elements
- **Arrow pointers** pointing to specific UI elements
- **Action tips** suggesting next steps
- **Progress dots** showing tour position
- **Keyboard navigation** (Arrow keys, Enter, Escape)
- **Skip/Close** functionality
- **Restart capability** via sidebar "Tour" button
- **Persistence** - tour completion saved to localStorage

#### Components
- `GuidedTour.js` - Main tour orchestrator
- `TourTooltip` - Step content display
- `Spotlight` - Element highlighting with cutout
- `TourHelpButton` - Sidebar button to restart tour
- `useShouldShowTour()` - Hook to check tour state

#### Files Created/Modified
- `/app/frontend/src/components/GuidedTour.js` (NEW)
- `/app/frontend/src/layouts/DashboardLayout.js` (Integrated tour + help button)

#### Access
- Automatically starts on first dashboard visit
- Restart via sidebar → "Tour" button


---

### Prompt 14 - Admin Control Plane (Completed - March 24, 2026)

#### Overview
Internal admin dashboard for Agentic Trust operators to view, manage, and troubleshoot client organizations. Completely separate authentication system from org/user auth.

#### Database Changes
- New `AdminUser` model with fields: id, email, passwordHash, role, name, isActive, lastLoginAt, createdAt, updatedAt
- Admin roles: `superadmin`, `support`, `read_only`

#### Backend Routes
- **POST /api/admin/auth/login** - Admin login (issues admin JWT with 8h expiry)
- **GET /api/admin/auth/me** - Get current admin profile
- **GET /api/admin/orgs** - List all organizations with metrics
- **GET /api/admin/orgs/:orgId** - Organization detail (escrows, policies, transactions, audit)
- **POST /api/admin/orgs/:orgId/impersonate** - Generate impersonation JWT (2h expiry)
- **GET /api/admin/stats/overview** - Platform-wide statistics

#### Admin Middleware
- `requireAdmin` - Validates admin JWT, rejects org tokens and API keys
- `requireAdminRole(['superadmin', 'support'])` - Role-based access control

#### Frontend Pages
1. **Admin Login** (`/admin`) - Separate login with red branding, warning banner
2. **Organizations List** (`/admin/orgs`) - Searchable/sortable table with metrics
3. **Organization Detail** (`/admin/orgs/:orgId`) - Full org view with escrows, policies, transactions, audit
4. **Platform Stats** (`/admin/stats`) - Placeholder for analytics
5. **Admin Settings** (`/admin/settings`) - Placeholder for admin config

#### Key Features
- **Organization Directory**: Search, sort, view all client orgs
- **Metrics**: Total balance, 30-day volume, escrow count, policy count per org
- **Impersonation**: Admin can impersonate org to view their dashboard (audit logged)
- **Impersonation Banner**: Red banner appears when viewing dashboard as another org
- **Separate Auth**: Admin tokens are distinct from org tokens (different JWT structure)

#### Security
- Admin JWTs have `type: 'admin'` claim - rejected by org routes
- Org JWTs and API keys are rejected by admin routes
- Impersonation is audit-logged with admin ID and timestamp
- Rate limiting applied to admin auth routes

#### Default Admin Account
- Email: admin@agentictrust.app
- Password: AdminPassword123!
- Role: superadmin
- Seeded via: `node src/scripts/seed-admin.js`

#### Files Created
- `/app/backend/prisma/schema.prisma` (Added AdminUser model)
- `/app/backend/src/routes/admin-auth.js` (Admin auth routes)
- `/app/backend/src/routes/admin-orgs.js` (Admin org management)
- `/app/backend/src/middleware/admin-auth.js` (Admin auth middleware)
- `/app/backend/src/scripts/seed-admin.js` (Admin seeding script)
- `/app/frontend/src/contexts/AdminAuthContext.js` (Admin auth state)
- `/app/frontend/src/layouts/AdminLayout.js` (Admin sidebar layout)
- `/app/frontend/src/pages/admin/AdminLoginPage.js`
- `/app/frontend/src/pages/admin/AdminOrgsPage.js`
- `/app/frontend/src/pages/admin/AdminOrgDetailPage.js`
- `/app/frontend/src/components/ImpersonationBanner.js`
- `/app/frontend/src/App.js` (Updated with admin routes)

#### Access
- URL: `/admin`
- Credentials: admin@agentictrust.app / AdminPassword123!


---

### Prompt 15 - Admin API v1 (Completed - March 24, 2026)

#### Overview
Internal-only REST API for Kit and internal automation to programmatically create and bootstrap Safe-Spend organizations. NOT for public documentation - this is a service-to-service API.

#### Endpoints

1. **POST /api/admin/v1/orgs** - Create a new organization
   - Request: `{ name, email, plan, auto_bootstrap?, password? }`
   - Response: org details, bootstrap results (if auto_bootstrap), initial_org_token, initial_password
   - Plans: `sandbox`, `builder`, `scale`
   - Auto-bootstrap creates all 3 governance patterns

2. **POST /api/admin/v1/orgs/:orgId/bootstrap** - Bootstrap resources for existing org
   - Request: `{ presets: { marketing_agent_budget?, procurement_agent?, sandbox_experiments? }, webhook_url? }`
   - Response: created escrows, policies, api_keys, webhooks

3. **GET /api/admin/v1/orgs/:orgId/checklist** - Get org readiness checklist
   - Response: checks for escrows, policies, agent keys, webhooks, recent spend
   - Includes `ready_for_production` flag and recommendations

4. **GET /api/admin/v1/patterns** - List available governance patterns
   - Returns pattern definitions with limits and defaults

#### Governance Patterns
Pre-defined patterns from Trust Law Explainer (Prompt 12):
- **marketing_agent_budget**: $5K budget, $100/tx, $500/day, auto-approve <$50
- **procurement_agent**: $3K budget, $300/tx, $1K/day, auto-approve <$150
- **sandbox_experiments**: $500 budget, $20/tx, $100/day, auto-approve <$10

#### Security
- All endpoints require admin JWT authentication
- Org JWTs and API keys are rejected (403 Forbidden)
- All actions are audit-logged with admin ID
- Auto-generated passwords returned only when not provided

#### Files Created
- `/app/backend/src/routes/admin-api-v1.js` (NEW - ~640 lines)
- `/app/backend/prisma/schema.prisma` (Added `plan` field to Organization)
- `/app/backend/src/server.js` (Registered new routes)

#### Usage Examples

**Create org with full bootstrap:**
```bash
curl -X POST /api/admin/v1/orgs \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"name":"Acme Corp","email":"admin@acme.ai","plan":"builder","auto_bootstrap":true}'
```

**Bootstrap existing org with selective patterns:**
```bash
curl -X POST /api/admin/v1/orgs/{org_id}/bootstrap \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"presets":{"sandbox_experiments":true},"webhook_url":"https://example.com/webhook"}'
```

**Check org readiness:**
```bash
curl /api/admin/v1/orgs/{org_id}/checklist \
  -H "Authorization: Bearer {admin_token}"
```


---

### Prompt 16 - Python SDK (Completed - March 24, 2026)

#### Overview
A minimal, developer-friendly Python SDK for the Safe-Spend API. Enables agent builders, backend engineers, and ops teams to integrate Safe-Spend with minimal boilerplate.

#### Package Structure
```
/app/sdks/python/
├── README.md           # Installation & usage guide
├── pyproject.toml      # Python package configuration
└── safespend/
    ├── __init__.py     # Public API exports
    ├── _version.py     # Version: 0.1.0
    ├── client.py       # SafeSpendClient class
    ├── errors.py       # Custom exceptions
    └── types.py        # TypedDict definitions
```

#### SafeSpendClient Methods

| Category | Methods |
|----------|---------|
| Escrow | `list_escrow_accounts()`, `get_escrow_account()`, `create_escrow_account()`, `fund_escrow_account()`, `get_escrow_balance()`, `pause_escrow_account()`, `resume_escrow_account()`, `close_escrow_account()` |
| Policies | `list_policies()`, `get_policy()`, `create_policy()`, `delete_policy()` |
| Spend | `create_spend()`, `list_spend_requests()`, `get_spend_request()`, `cancel_spend_request()` |
| Approvals | `list_approvals()`, `get_approval()`, `approve()`, `deny()` |

#### Error Handling
- `SafeSpendError` - Base exception
- `AuthenticationError` - 401 responses
- `PermissionError` - 403 responses
- `NotFoundError` - 404 responses
- `RateLimitError` - 429 responses
- `ValidationError` - 400 responses (with details)
- `APIError` - 5xx and other errors

#### Usage Example
```python
from safespend import SafeSpendClient

client = SafeSpendClient(
    api_key="sk_live_...",
    base_url="https://api.safespend.app",
)

# Create and fund an escrow
escrow = client.create_escrow_account(name="Marketing Budget")
client.fund_escrow_account(escrow["id"], amount_cents=100000)

# Create a policy
client.create_policy(
    escrow_id=escrow["id"],
    name="Marketing Policy",
    per_transaction_limit_cents=10000,
    auto_approve_under_cents=5000,
)

# Make a spend request
spend = client.create_spend(
    escrow_id=escrow["id"],
    amount_cents=2500,
    vendor="Anthropic",
    category="ai_compute",
)
print(f"Status: {spend['status']}")
```

#### Key Features
- Type hints throughout (Python 3.9+)
- Automatic idempotency key generation
- Clean error mapping from HTTP status codes
- Minimal dependencies (`requests` only)
- Good docstrings and examples

#### Installation
```bash
pip install safespend
# Or from source:
cd /app/sdks/python && pip install -e .
```

#### Notes
- Approval endpoints require org tokens (JWT), not API keys
- Designed for human review flows, not agent automation

