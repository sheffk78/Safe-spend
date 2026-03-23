# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 02 Complete - Backend Core API
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
- Landing page with all sections (hero, problem, how-it-works, policy card, pricing, etc.)
- Dashboard shell with sidebar navigation
- Mock auth flow (replaced by real auth in Prompt 02)
- Official Safe-Spend logo integration

### Prompt 02 - Backend Core API (Completed)

#### Database Schema (9+ tables)
- [x] Organizations - users/companies with prefixed IDs (org_)
- [x] API Keys - with sk_live_, sk_test_, sk_agent_ prefixes
- [x] Escrow Accounts - with esc_ prefix and balance tracking
- [x] Spending Policies - fiduciary rules (placeholder for rules engine)
- [x] Spend Requests - with spr_ prefix and full audit trail
- [x] Approvals - human approval workflow
- [x] Audit Events - immutable event log with evt_ prefix
- [x] Webhooks - with whk_ prefix
- [x] Spend Tracking - daily/weekly/monthly aggregations

#### Authentication System
- [x] POST /api/v1/auth/signup - create organization
- [x] POST /api/v1/auth/login - JWT authentication
- [x] GET /api/v1/auth/me - get profile

#### API Key System
- [x] POST /api/v1/api-keys - create key (sk_live_, sk_test_, sk_agent_)
- [x] GET /api/v1/api-keys - list keys
- [x] DELETE /api/v1/api-keys/:id - revoke key
- [x] Proper key hashing (SHA-256)

#### Escrow Accounts
- [x] POST /api/v1/escrow-accounts - create
- [x] GET /api/v1/escrow-accounts - list
- [x] GET /api/v1/escrow-accounts/:id - get details
- [x] GET /api/v1/escrow-accounts/:id/balance - get balance
- [x] POST /api/v1/escrow-accounts/:id/fund - fund (placeholder)
- [x] POST /api/v1/escrow-accounts/:id/pause - pause spending
- [x] POST /api/v1/escrow-accounts/:id/resume - resume spending
- [x] POST /api/v1/escrow-accounts/:id/close - close account

#### Spending Policies
- [x] CRUD endpoints for policies
- [x] Policy structure ready for rules engine

#### Spend Requests
- [x] POST /api/v1/spend - create spend request
- [x] GET /api/v1/spend - list requests
- [x] Idempotency key support
- [x] Balance deduction on approval
- [x] Denial tracking

#### Other Endpoints
- [x] Approvals CRUD + approve/deny actions
- [x] Audit log read endpoints
- [x] Webhooks CRUD + secret rotation

#### Frontend Integration
- [x] AuthContext updated to use real backend API
- [x] Login/signup flows work with backend
- [x] Protected routes properly redirect

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. **Rules Engine (Prompt 03)** - The 13-step spend validation cascade
2. **Dashboard Functionality (Prompt 04)** - Wire up dashboard pages to API

### P1 - High Priority
3. **Stripe Integration** - Real funding and disbursement
4. **Webhook Delivery** - Send events to registered endpoints
5. **Documentation Page** - API reference, integration guides

### P2 - Medium Priority
6. **Testing Suite** - Comprehensive API tests
7. **SDK Generation** - Python, TypeScript SDKs
8. **MCP Server** - Model Context Protocol integration

---

## Architecture Summary

### API Routes
```
/api/v1/auth/signup          POST   Create organization
/api/v1/auth/login           POST   Authenticate
/api/v1/auth/me              GET    Get profile

/api/v1/escrow-accounts      GET    List accounts
/api/v1/escrow-accounts      POST   Create account
/api/v1/escrow-accounts/:id  GET    Get account
/api/v1/escrow-accounts/:id/balance    GET    Get balance
/api/v1/escrow-accounts/:id/fund       POST   Fund account
/api/v1/escrow-accounts/:id/pause      POST   Pause account
/api/v1/escrow-accounts/:id/resume     POST   Resume account
/api/v1/escrow-accounts/:id/close      POST   Close account

/api/v1/policies             GET    List policies
/api/v1/policies             POST   Create policy
/api/v1/policies/:id         GET    Get policy
/api/v1/policies/:id         PATCH  Update policy
/api/v1/policies/:id         DELETE Delete policy

/api/v1/spend                GET    List spend requests
/api/v1/spend                POST   Create spend request
/api/v1/spend/:id            GET    Get spend request
/api/v1/spend/:id/cancel     POST   Cancel pending request

/api/v1/approvals            GET    List approvals
/api/v1/approvals/:id        GET    Get approval
/api/v1/approvals/:id/approve POST  Approve request
/api/v1/approvals/:id/deny   POST   Deny request

/api/v1/api-keys             GET    List API keys
/api/v1/api-keys             POST   Create API key
/api/v1/api-keys/:id         GET    Get API key
/api/v1/api-keys/:id         DELETE Revoke API key

/api/v1/webhooks             GET    List webhooks
/api/v1/webhooks             POST   Create webhook
/api/v1/webhooks/:id         DELETE Delete webhook
/api/v1/webhooks/:id/rotate-secret POST Rotate secret

/api/v1/audit                GET    List audit events
/api/v1/audit/:id            GET    Get audit event
```

### ID Prefixes
- org_ - Organizations
- key_ - API Keys (internal ID)
- sk_live_, sk_test_, sk_agent_ - API Key values
- esc_ - Escrow Accounts
- pol_ - Spending Policies
- spr_ - Spend Requests
- apr_ - Approvals
- evt_ - Audit Events
- whk_ - Webhooks

### Key Files
- `/app/backend/server.py` - FastAPI proxy to Node.js
- `/app/backend/src/server.js` - Node.js Express server
- `/app/backend/src/routes/*.js` - API route handlers
- `/app/backend/prisma/schema.prisma` - Database schema
- `/app/frontend/src/contexts/AuthContext.js` - Auth state

---

## Next Tasks (Prompt 03 Preview)
1. Implement 13-step spending rules cascade
2. Policy evaluation engine
3. Daily/weekly/monthly limit enforcement
4. Vendor allowlist/blocklist checking
5. Category restrictions
6. Time window enforcement
7. Auto-approve threshold logic
8. Human approval queue integration
