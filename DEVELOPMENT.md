# Safe-Spend Development Guide

## Dual Schema Architecture

Safe-Spend runs **SQLite in development** and **PostgreSQL in production**. This is the root cause of the most dangerous class of bugs in the project: columns that exist in `schema.prisma` (SQLite) but are missing from `schema.postgresql.prisma` (PostgreSQL). When the backend code references a column that doesn't exist in the production database, Prisma throws a runtime error and the endpoint fails.

**The May 2025 incident:** 40+ columns were missing from PostgreSQL, causing `POST /v1/policies` to crash ("Failed to create policy"), `POST /v1/api-keys/:id/reactivate` to crash, and spend request flows to fail silently.

### How It Works

| File | Purpose | Database |
|---|---|---|
| `prisma/schema.prisma` | Development schema | SQLite (`file:./dev.db`) |
| `prisma/schema.postgresql.prisma` | Production schema | PostgreSQL (env: `DATABASE_URL`) |

The Dockerfile:
1. Installs deps with `schema.prisma` (SQLite) — needed for `prisma generate`
2. Copies source, then **replaces** `schema.prisma` with `schema.postgresql.prisma`
3. **Runs schema parity check** (`node scripts/check_schema_parity.js --ci`) to verify both schemas match
4. Re-generates Prisma client with the PostgreSQL schema
5. `start.sh` runs `prisma db push --accept-data-loss` to migrate the database

### The Rule

**When you add a column to `schema.prisma`, you MUST also add it to `schema.postgresql.prisma`.**

If you forget, the schema parity check will catch it during the Docker build. Currently it warns but does not block (too many legacy drifts exist). Once all drifts are resolved, it will block the build.

### Adding New Fields — Checklist

1. Add the field to `prisma/schema.prisma` (SQLite)
2. Add the **same field** to `prisma/schema.postgresql.prisma` (PostgreSQL)
3. **All new fields MUST have a default value** (`@default(...)`) — Prisma cannot backfill NULL columns on existing rows
4. For `@updatedAt` fields, also add `@default(now())` so Prisma can populate existing rows
5. Run `node scripts/check_schema_parity.js` locally to verify zero drift
6. Deploy — `prisma db push` in `start.sh` will auto-migrate the database

### Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| Missing column in PG schema | `POST /v1/policies` returns 500 "Failed to create policy" | Add column to `schema.postgresql.prisma` with `@default` |
| `@updatedAt` without `@default(now())` | `prisma db push` fails: "required column without default" | Add `@default(now()) @updatedAt` |
| Frontend sends `is_active: true` but backend expects `draft: false` | Quick Start creates draft policy instead of active | Change frontend to send `draft: false` |
| Dropdown menu clips inside table | UI ⋮ menu hidden behind table cells | Use `fixed` positioning + `z-50` instead of `absolute` |
| Generic "Failed to X" error with no detail | Backend catch block swallows the actual Prisma error | Log `error.message` and `error.stack`, include `detail` in non-prod responses |

### Running the Schema Parity Check

```bash
# Local check (reports drifts, exits 0 even if found)
cd railway/Safe-spend/backend && node scripts/check_schema_parity.js

# CI mode (reports drifts, exits 1 if found — use after all drifts are resolved)
node scripts/check_schema_parity.js --ci
```

### Running Smoke Tests

```bash
# Quick (health + frontend only)
cd railway/Safe-spend/backend && node scripts/smoke-test.js --quick

# Full (health + schema parity + API key + escrow + policy)
SAFE_SPEND_API_KEY=sk_agent_xxx node scripts/smoke-test.js
```

## Project Structure

```
railway/Safe-spend/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma              # SQLite dev schema
│   │   └── schema.postgresql.prisma    # PostgreSQL production schema
│   ├── scripts/
│   │   ├── check_schema_parity.js      # CI check: verifies both schemas match
│   │   └── smoke-test.js               # E2E smoke tests against production
│   ├── src/
│   │   ├── routes/                     # Express route handlers
│   │   ├── middleware/                  # Auth, rate limiting, etc.
│   │   └── server.js                    # App entry point
│   ├── Dockerfile                       # Build + schema swap + parity check
│   ├── start.sh                         # prisma db push → prisma generate → node server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/dashboard/            # Page components
│   │   ├── components/                  # Shared UI components
│   │   └── lib/api.js                  # API client
│   ├── build/                           # Production build (served by Railway)
│   └── package.json
└── scripts/
    └── check-schema-parity.sh           # Legacy shell wrapper (use .js instead)
```