# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 04 Complete - Dashboard Pages
**Last Updated:** March 2026

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

### Prompt 04 - Dashboard Pages (Completed - March 2026)

#### Implemented Features:
1. **Dashboard Overview** - Real-time stats from API
   - Total Escrowed, Total Spent, Active Rules, Pending Approvals
   - Quick Actions section
   - Recent Transactions feed

2. **Escrow Accounts Page** (`/dashboard/accounts`)
   - List view with summary cards
   - Create account modal with initial funding option
   - Fund account modal with balance preview
   - Action menu: Pause, Resume, Close

3. **Spending Rules Page** (`/dashboard/rules`)
   - Policy cards with expandable details
   - Create/Edit modal with 6 tabs:
     - Basic Info (name, escrow, active toggle)
     - Amount Limits (per-tx, daily, weekly, monthly)
     - Vendor Controls (allowed/blocked, match mode)
     - Categories (allowed/blocked)
     - Time Window (days, hours, timezone)
     - Approval Rules (auto-approve, require-human thresholds)
   - Toggle active status, delete policy

4. **Transactions Page** (`/dashboard/transactions`)
   - List view with status badges
   - Filter by status (pending, approved, denied)
   - Links to transaction detail page

5. **Transaction Detail Page** (`/dashboard/transactions/:id`)
   - Transaction summary (amount, vendor, category)
   - Balance impact visualization
   - 12-step rules evaluation timeline with pass/fail indicators

6. **Approvals Page** (`/dashboard/approvals`)
   - Tabs: Pending, Approved, Denied, Expired
   - Approval cards with request details
   - Approve button
   - Deny button with reason dropdown and note field

7. **API Keys Page** (`/dashboard/keys`)
   - Grouped by type: Live, Test, Agent
   - Create key modal with type selection and permissions
   - Copy key warning (shown once)
   - Toggle active/inactive, Revoke

8. **Audit Log Page** (`/dashboard/audit`)
   - Filterable table with event types
   - Filter panel: Event Type, Actor Type, Escrow Account
   - Event detail panel with full JSON

#### API Client Layer
- `/app/frontend/src/lib/api.js` - Centralized API calls with auth handling

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. ~~Dashboard Pages (Prompt 04)~~ ✅ COMPLETE
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

### Backend Files
- `/app/backend/src/services/rules-engine.js` - 13-step evaluation
- `/app/backend/src/services/rules-helpers.js` - Vendor matching, time checks
- `/app/backend/src/routes/` - All API endpoints

### Frontend Dashboard Files
- `/app/frontend/src/lib/api.js` - API client layer
- `/app/frontend/src/pages/dashboard/DashboardOverview.js`
- `/app/frontend/src/pages/dashboard/EscrowAccountsPage.js`
- `/app/frontend/src/pages/dashboard/SpendingRulesPage.js`
- `/app/frontend/src/pages/dashboard/TransactionsPage.js`
- `/app/frontend/src/pages/dashboard/TransactionDetailPage.js`
- `/app/frontend/src/pages/dashboard/ApprovalsPage.js`
- `/app/frontend/src/pages/dashboard/ApiKeysPage.js`
- `/app/frontend/src/pages/dashboard/AuditLogPage.js`

---

## Testing

### Iteration 4 Results (March 2026)
- Backend: 100% (31/31 tests passed)
- Frontend: 100% (all pages functional)
- Test credentials: demo@test.com / Test123!

---

## Next Tasks
1. Stripe integration for real fiat funding
2. Webhook delivery system
3. API documentation page
