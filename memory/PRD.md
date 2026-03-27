# Safe-Spend PRD

## Problem Statement
Safe-Spend is a fiat-first escrow and spending-control API for AI agents. The platform includes an Escrow engine, Fiduciary Policy Engine, AAV (Agent Authority Vault), ARL (Agent Reputation Ledger), Admin API/Dashboard, Public Blog, and interactive API Playground.

## Core Requirements
- Deterministic, auditable spending control (14-step rules engine)
- Agent ID (agt_ format) support for agent-scoped operations
- AAV authority verification (Step 0) before spend execution
- ARL outcome reporting and reputation-based policy controls
- Cross-tool event system for inter-service communication
- Organization linking with AAV
- Control Plane API for agentictrust.app dashboard

## Architecture
- Frontend: React + TailwindCSS + Shadcn/UI
- Backend: Node.js/Express + Prisma ORM (SQLite preview / PostgreSQL production)
- Proxy: Python FastAPI/Uvicorn (server.py)
- Auth: JWT + scoped API keys (ss_admin_ prefix)

## Implemented Features

### Phase 1-3 (Previous Sessions)
- [x] Core 14-step Escrow/Policy Rules Engine
- [x] Admin Dashboard (API key auth)
- [x] Blog System & API Playground
- [x] Smart Feedback System
- [x] AAV Integration V2 (escrow-level)

### Phase 4: Safe-Spend Integration (Current Session - 2026-03-27)
- [x] **Change 1: Agent ID Support** — `agent_id` (agt_ + 24 hex) on spend requests and escrow accounts. Agent-scoped GET endpoints (`/v1/agents/{agent_id}/escrow-accounts`, `/spend-history`).
- [x] **Change 2: AAV Authority Verification** — Step 0 in rules engine. Certificate mapping CRUD (`/v1/agent-certificates`). Fail-closed by default. Configurable via AAV_ENABLED env var.
- [x] **Change 3: ARL Outcome Reporting** — Async fire-and-forget reporting to ARL after spends. `min_reputation_score` and `reputation_spending_boost` policy fields. Reputation cache with 5-min TTL.
- [x] **Change 4: Cross-Tool Events** — Internal event receiver (`POST /v1/internal/events`) with HMAC-SHA256 auth. Event emitter for spend/escrow actions. Handles `aav.grant.revoked`, `aav.grant.created`, `arl.score.changed`.
- [x] **Change 5: Organization Linking** — `POST /v1/org/link` with link token validation. `GET /v1/org/link` status check.
- [x] **Control Plane API** — `GET /v1/control-plane/org/{org_id}/summary` and `GET /v1/control-plane/agents/{agent_id}/card-data` for agentictrust.app.
- [x] **Documentation Updates** — Updated AAV Integration docs (agent_id, certificates, authority verification, ARL reputation, cross-tool events, org linking, control plane, ID format reference). Updated API Reference (agents, certificates, control plane sections). Updated Webhooks docs (AAV and cross-tool event types).

## Backlog

### P2
- [ ] PDF Statement Generation for governance reviews
- [ ] Interactive "Try It" section in AAV documentation page

### P3
- [ ] Post-Beta UX Improvements (Quick Start templates, loading skeletons)
- [ ] `safespend init` CLI wizard for Python SDK
- [ ] Live Mode testing in the Playground
- [ ] CrewAI Integration
- [ ] Real-time WebSocket notifications
- [ ] Policy editor AAV settings UI (backend-only currently)

## Key API Endpoints (New)
- `GET /api/v1/agents/{agent_id}/escrow-accounts`
- `GET /api/v1/agents/{agent_id}/spend-history`
- `POST /api/v1/agent-certificates`
- `GET /api/v1/agent-certificates/{agent_id}`
- `DELETE /api/v1/agent-certificates/{agent_id}`
- `POST /api/v1/internal/events` (HMAC auth)
- `POST /api/v1/org/link`
- `GET /api/v1/org/link`
- `GET /api/v1/org/{org_id}/summary` (Control Plane)
- `GET /api/v1/agents/{agent_id}/card-data` (Control Plane)

## Database Models (New)
- `AgentCertificate` — Maps agent_id to certificate_id
- `CrossToolEvent` — Stores emitted/received cross-tool events
- `ReputationCache` — Cached ARL reputation scores (5-min TTL)

## Environment Variables (New)
- `AAV_API_URL`, `AAV_API_KEY`, `AAV_ENABLED`
- `ARL_API_URL`, `ARL_API_KEY`, `ARL_ENABLED`
- `INTERNAL_EVENTS_SECRET`
