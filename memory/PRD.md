# Safe-Spend PRD - Product Requirements Document

## Overview
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. Part of the Agentic Trust product suite (agentictrust.app).

## Project Status
**Current Phase:** Prompt 01 Complete - Frontend Landing Page + Dashboard Shell
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
- Backend: FastAPI (Python)
- Database: MongoDB
- Auth: JWT-based (currently mock localStorage)

---

## What's Been Implemented

### Prompt 01 - Landing Page + Dashboard Shell (Completed)

#### Landing Page
- [x] Navigation bar (sticky) with logo and links
- [x] Hero section with headline, subheadline, CTAs, code snippet
- [x] "The Problem" section with 3 incident cards
- [x] "How It Works" section with 3-step flow
- [x] "Fiduciary Policy Engine" section with Policy Card component
- [x] "Audit Trail" section with Transaction Table component
- [x] "Framework Integration" section with tabbed code snippets
- [x] Pricing section with 3 tiers (Sandbox, Builder, Scale)
- [x] Final CTA section
- [x] Footer with links

#### Authentication
- [x] Login page with email/password form
- [x] Signup page with name/email/password/confirm fields
- [x] Mock auth flow with localStorage
- [x] Protected routes redirect to login

#### Dashboard Shell
- [x] Left sidebar navigation (260px width)
- [x] Overview page with stats, quick actions, recent transactions
- [x] 8 placeholder pages (Accounts, Rules, Transactions, etc.)
- [x] Logout functionality
- [x] Mobile responsive with hamburger menu

#### Components Built
- [x] Navbar
- [x] Footer
- [x] CodeBlock (with Prism.js syntax highlighting)
- [x] PolicyCard
- [x] TransactionTable
- [x] StatusBadge
- [x] ProtectedRoute

---

## Prioritized Backlog

### P0 - Critical (Next Prompts)
1. **Backend API** - Database schema, auth endpoints, core API
2. **Rules Engine** - The 13-step spend validation cascade
3. **Dashboard Functionality** - Escrow accounts, policies, transactions

### P1 - High Priority
4. **Approvals System** - Human approval workflow + webhooks
5. **API Keys Management** - Create, revoke, permissions

### P2 - Medium Priority  
6. **Documentation Page** - API reference, integration guides
7. **Testing Prompt** - Verify all critical paths
8. **Stripe Integration** - Funding and disbursement

---

## Architecture Summary

### Frontend Routes
```
/                   - Landing page
/login              - Login page
/signup             - Signup page
/docs               - Documentation (placeholder)
/terms              - Terms of Service
/privacy            - Privacy Policy
/dashboard          - Dashboard Overview
/dashboard/accounts - Escrow Accounts
/dashboard/rules    - Spending Rules
/dashboard/transactions - Transactions
/dashboard/approvals - Approvals
/dashboard/keys     - API Keys
/dashboard/webhooks - Webhooks
/dashboard/audit    - Audit Log
/dashboard/settings - Settings
```

### Key Files
- `/app/frontend/src/App.js` - Main routing
- `/app/frontend/src/contexts/AuthContext.js` - Auth state management
- `/app/frontend/src/pages/LandingPage.js` - Marketing homepage
- `/app/frontend/src/layouts/DashboardLayout.js` - Dashboard shell
- `/app/frontend/tailwind.config.js` - Design system tokens

---

## Next Tasks (Prompt 02 Preview)
1. Backend database schema setup
2. Organization/user models
3. Auth endpoints (register, login, logout)
4. JWT token implementation
5. Replace mock auth with real API calls
