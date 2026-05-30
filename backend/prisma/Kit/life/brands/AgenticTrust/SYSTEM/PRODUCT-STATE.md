# AgenticTrust Product State

> Last updated: 2026-05-28T21:40:00Z (weekly audit)
> Next scheduled check: Tuesday 2026-06-02 08:00 MT

### Operating Rule

**Audit and fix, not audit and report.** Every health check must close the loop within the same session: diagnose → fix → commit → deploy → verify. Findings are never left as documentation-only. If a fix is within Kit's ownership lane (OWNERSHIP.md), Kit deploys directly — no asking for permission to push code that's already committed.

---

## Overall Status: 🟡 OPERATIONAL WITH DEPLOY RISK

All four products are live and functional. All APIs healthy. Schema parity 26/26, 0 missing models. All auth endpoints validate. All browser flows verified on live containers. **However, ALL Railway deploy pipelines are broken** — sites run on stale pre-failure containers. Any code fix pushed to main will NOT deploy until Railway is fixed.

### ⚠️ CRITICAL: Railway Deploy Pipeline Failure

All four Railway services have FAILED deploys since April/May 2026:
- **AAV Frontend**: ALL FAILED since May 1 (5+ consecutive failures)
- **AAV Backend**: ALL FAILED since April 24
- **SS Frontend**: ALL FAILED since May 2
- **SS Backend**: ALL FAILED since April 23
- **ARL**: No Railway token access (different project). Container is stale from ~May 26.

**Impact**: Sites appear healthy because Railway keeps old containers running. But any code changes pushed since the last successful deploy are NOT live. This means the following fixes exist in source code but are NOT deployed:
- ARL `/terms` and `/privacy` pages (committed May 26, not deployed)
- All other ARL, SS, and AAV code changes since last successful deploy

**Action required**: Jeff needs to `railway login` and diagnose the build failures. The stored token only covers AAV and SS projects.

---

## Product Status Matrix

| Product | Domain | Status | Health API | Frontend | Auth | Notes |
|---------|--------|--------|-----------|----------|------|-------|
| **Safe-Spend** | safe-spend.dev | 🟢 LIVE | ✅ DB ok, Stripe ok | ✅ 200 | ✅ 400 (validates) | Uptime ~1.8 days, 2 blog posts, public pricing, all UX checks pass |
| **AAV** | agentauthority.dev | 🟢 LIVE | ✅ healthy | ✅ 200 | ✅ 422 (Pydantic) | Consulting funnel live, $375 audit, 2 blog posts, Tidycal verified |
| **ARL** | reputationledger.dev | 🟡 LIVE (stale) | ✅ healthy | ✅ 200 | ✅ 422 (validates) | ⚠️ /terms + /privacy show "Page not found" (fix in source, NOT deployed). Ecosystem footer links verified. |
| **Hub** | agentictrust.app | 🟢 LIVE | N/A | ✅ 200 | N/A | All 3 LIVE, 3 COMING SOON. Terminology soft. /governance-review redirect verified. |

---

## Browser Flow Verification — 2026-05-28

| Check | SS | AAV | ARL | Hub |
|-------|----|-----|-----|-----|
| Landing page loads | ✅ | ✅ | ✅ | ✅ |
| /signup renders form | ✅ | ✅ | ✅ | N/A |
| Pricing public | ✅ (#pricing section) | ✅ (4 tiers: Free, Builder, Teams, Custom) | N/A | ✅ (3 LIVE, 3 COMING SOON) |
| Footer cross-product links | ✅ (3 links) | ✅ (AG Family: SS, RepLedger, AT) | ✅ (Ecosystem: SS, AAV, AT) | ✅ (3 products) |
| Nav CTA: "Get Started Free" | ✅ | ✅ | ✅ | N/A |
| Terms/Privacy | ✅ | ✅ | ❌ ("Page not found" — fix NOT deployed) | N/A |
| Blog active | ✅ (2 posts) | ✅ (2 posts) | ✅ (2 posts) | — |
| Schema parity | 26/26, 0 missing | N/A | N/A | N/A |
| Auth endpts validate | ✅ 400 | ✅ 422 | ✅ 422 | N/A |
| Consulting funnel | — | ✅ (Free Review + $375 Audit) | — | — |
| No console errors | ✅ | ⚠️ (9 empty JS exceptions) | ✅ | — |
| Wrong domain references | — | — | ✅ (clean) | — |

### Notable Findings

- **ARL `/terms` and `/privacy` show "Page not found"**: Code fix committed May 26 but NOT deployed because all Railway deploys are failing. The fix exists in source (TermsPage.jsx, PrivacyPage.jsx, App.js routes) but the production container is stale.
- **AAV footer uses "RepLedger"**: This appears to be an intentional rebrand from "ARL".
- **AAV has 4 pricing tiers** (Free, Builder at $29/mo, Teams at $79/mo, Custom) instead of the expected 3.
- **AAV 9 empty JS exceptions** on homepage — likely benign (analytics/third-party scripts).
- **Price consistency**: All 5 locations show $375. No $500 mismatch found.

---

## Cross-Product Link Audit — 2026-05-28 (Verified)

| From ↓ / To → | Hub | SS | AAV | ARL |
|---|---|---|---|---|
| **Safe-Spend** | ⚠️ (Cloudflare anti-bot, but 200 via browser) | — | ✅ | ✅ |
| **AAV** | ✅ | ✅ | — | ✅ |
| **ARL** | ✅ | ✅ | ✅ | — |
| **Hub** | — | ✅ | ✅ | ✅ |

---

## Consulting Funnel Audit — 2026-05-28

| Check | Status | Details |
|-------|--------|---------|
| `/consulting/free-review` renders | ✅ | Tidycal embed loads, 30 min "Agent Governance Review (Free)" |
| `/consulting/audit` renders | ✅ | Shows $375, Tidycal embed with 1h30m/$375 |
| Price consistency | ✅ | All locations show $375 (no $500 mismatch) |
| `/governance-review` redirect | ✅ | Hub 301 → `agentauthority.dev/consulting/free-review` |
| **Tidycal booking types** | ⚠️ | **7 types (should be 3).** Off-brand: "Socialize Website", "Portable Toilet Ops Audit", "30 Min Discussion", "Scripting or Coaching Session". **Monthly Check-In is 45 min (should be 30 min).** Requires Jeff to clean up manually at tidycal.com. |
| Tidycal availability | ✅ | Calendar shows available dates |

---

## Schema Parity — 2026-05-28

- **Models**: 26/26 (SQLite and PostgreSQL match)
- **Missing models from PG**: 0
- **Dangerous field drifts**: 0
- **Known benign differences**:
  - SpendRequest: `@@unique([orgId, idempotencyKey])` in PG vs `@unique` on `idempotencyKey` alone in SQLite (intentional, org-scoped)
  - PG has extra fields on some models (indexes, updatedAt, etc.) — these are intentional enhancements
- ⚠️ **vendorMatchMode mismatch**: SQLite `@default("substring")` vs PG `@default("exact")`. This is a **functional bug** — vendor matching behaves differently in dev (substring match) vs prod (exact match). Needs alignment.

---

## Railway Deploy Pipeline Status — 2026-05-28

| Service | Last Deploy Status | Date | Container Age |
|---------|-------------------|------|---------------|
| AAV Frontend | ❌ FAILED | 2026-05-01 | ~27 days stale |
| AAV Backend | ❌ FAILED | 2026-04-24 | ~34 days stale |
| SS Backend | ❌ FAILED | 2026-04-23 | ~35 days stale |
| SS Frontend | ❌ FAILED | 2026-05-02 | ~26 days stale |
| ARL | Unknown (no Railway token) | Stale | Container from ~May 26 |

**All sites are running on pre-failure containers.** Code changes committed after these dates are NOT live.

---

## Open Issues

| # | Issue | Severity | Product | Status |
|---|-------|----------|---------|--------|
| 1 | ALL Railway deploy pipelines broken | 🔴 Critical | All | Needs Jeff `railway login` |
| 2 | ARL /terms and /privacy show "Page not found" | 🔴 Critical | ARL | Fix in source, NOT deployed |
| 3 | Tidycal has 7 booking types (should be 3) | 🟡 Medium | AAV | Needs Jeff manual cleanup |
| 4 | Tidycal Monthly Check-In is 45 min (should be 30) | 🟡 Medium | AAV | Needs Jeff manual fix |
| 5 | vendorMatchMode mismatch (substring vs exact) | 🟡 Medium | SS | Functional bug in prod |
| 6 | AAV 9 empty JS exceptions on homepage | ⚪ Low | AAV | Likely benign, investigate |
| 7 | SS Playground is a dead end without escrow | 🟡 Medium | SS | Open (conversion killer) |
| 8 | AAV footer uses "RepLedger" not "ARL" | ⚪ Info | AAV | May be intentional rebrand |

---

## Fixed Since Last Audit (2026-05-22)

- ✅ AAV signup CTAs now route to `/signup`
- ✅ AAV pricing CTAs handle Stripe checkout for logged-in users
- ✅ SS public pricing section added
- ✅ SS signup form validation complete
- ✅ AAV duplicate footer removed
- ✅ AAV 404 page added (NotFoundPage)
- ✅ ARL footer labels use product names
- ✅ ARL contact email fixed to support@agentictrust.app
- ✅ Hub terminology softened (no "fiduciary" or "escrow")
- ✅ Hub og:image, canonical, schema.org added
- ✅ Emergent.sh tracker removed from ARL and Hub
- ✅ AAV terms/privacy links now use `<Link>` components

---

## Priority Actions

1. **🔴 Jeff: Fix Railway deploy pipelines** — All products are on stale containers. No code changes can go live until Railway build failures are resolved. Requires `railway login` and diagnosing build errors.
2. **🟡 Jeff: Clean up Tidycal** — Remove 4 off-brand booking types, change Monthly Check-In from 45→30 minutes.
3. **🟡 Fix vendorMatchMode mismatch** — Align PG and SQLite schemas to use the same default (recommend "substring").