# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 03 Complete - Rules Engine
**Last Updated:** January 2026

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

#### 13-Step Spend Validation Cascade
Every spend request passes through these checks in exact order:

1. **KEY_VALIDATION** - Validates API key or JWT token
2. **ESCROW_ACCOUNT_CHECK** - Verifies escrow exists and is active
3. **IDEMPOTENCY_CHECK** - Returns existing result for duplicate keys
4. **BALANCE_CHECK** - Ensures sufficient funds
5. **PER_TRANSACTION_LIMIT** - Enforces per-tx amount cap
6. **DAILY_CAP_CHECK** - Enforces daily spending limit
7. **WEEKLY_CAP_CHECK** - Enforces weekly spending limit
8. **MONTHLY_CAP_CHECK** - Enforces monthly spending limit
9. **VENDOR_CHECK** - Validates against allowlist/blocklist
10. **CATEGORY_CHECK** - Validates category against restrictions
11. **TIME_WINDOW_CHECK** - Enforces active days/hours
12. **APPROVAL_THRESHOLD_CHECK** - Determines if human approval needed
13. **EXECUTE** - Final step, spend is executed

#### Outcomes
- **approved** - All rules pass, within auto-approve threshold
- **denied** - A rule failed (with reason and policy ID)
- **pending** - Requires human approval (returns approval_id)
- **replay** - Idempotent request returning existing result

#### Policy Configuration
```javascript
{
  per_transaction_limit_cents: 10000,  // $100 max per tx
  daily_limit_cents: 25000,            // $250/day
  weekly_limit_cents: 100000,          // $1000/week
  monthly_limit_cents: 500000,         // $5000/month
  allowed_vendors: ["Google Ads", "Meta Ads", "Anthropic"],
  blocked_vendors: [],
  vendor_match_mode: "exact",          // exact | contains | regex
  allowed_categories: ["advertising", "ai_compute"],
  blocked_categories: ["transfers"],
  active_days: ["mon", "tue", "wed", "thu", "fri"],
  active_hours_start: "06:00",
  active_hours_end: "22:00",
  active_timezone: "America/Denver",
  auto_approve_under_cents: 5000,      // Auto-approve < $50
  require_human_above_cents: 7500      // Require human > $75
}
```

#### Frontend Updates
- [x] TransactionsPage - Lists all spend requests with status
- [x] TransactionDetailPage - Shows complete rule evaluation timeline
- [x] Pass/fail icons for each rule step
- [x] Denial reasons with policy references
- [x] Balance impact visualization

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. **Dashboard Functionality (Prompt 04)** - Wire remaining pages to API
2. **Stripe Integration** - Real funding and disbursement

### P1 - High Priority
3. **Webhook Delivery** - Send events to registered endpoints
4. **Documentation Page** - API reference, integration guides
5. **SDK Generation** - Python, TypeScript SDKs

### P2 - Medium Priority
6. **MCP Server** - Model Context Protocol integration
7. **Expiring Approvals** - Auto-expire pending approvals
8. **Rate Limiting** - API request limits

---

## Architecture Summary

### Rules Engine Files
- `/app/backend/src/services/rules-engine.js` - Main 13-step evaluation
- `/app/backend/src/services/rules-helpers.js` - Vendor matching, time checks
- `/app/backend/src/routes/spend.js` - POST /v1/spend endpoint

### Key Frontend Files
- `/app/frontend/src/pages/dashboard/TransactionsPage.js`
- `/app/frontend/src/pages/dashboard/TransactionDetailPage.js`

---

## Next Tasks (Prompt 04 Preview)
1. Escrow Accounts page - create, fund, pause/resume
2. Spending Rules page - create/edit policies
3. Approvals page - approve/deny pending requests
4. API Keys page - create/revoke keys
5. Dashboard Overview - real data from API
