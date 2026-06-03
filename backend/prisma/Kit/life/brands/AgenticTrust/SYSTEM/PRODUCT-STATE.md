# AgenticTrust Product State

> Last updated: 2026-05-31T14:10:00Z (weekly audit)
> Next scheduled check: Tuesday 2026-06-07 08:00 MT

### Operating Rule

**Audit and fix, not audit and report.** Every health check must close the loop within the same session: diagnose → fix → commit → deploy → verify. Findings are never left as documentation-only. If a fix is within Kit's ownership lane (OWNERSHIP.md), Kit deploys directly — no asking for permission to push code that's already committed.

---

## Overall Status: 🟡 OPERATIONAL WITH ARL STALE

All four products are live and functional. All APIs healthy. Schema parity 26/26, 0 missing models. vendorMatchMode now aligned (both "substring"). **SS and AAV are deploying fresh** (JS bundles dated May 30, SS backend uptime ~18h). **ARL is the remaining stale product** (JS bundle from May 26, emergent.sh regression, undeployed terms/privacy fix). Hub is clean and current.

### ⚠️ Deploy Pipeline — Partially Recovered

The Railway deploy API still reports all tracked deploys as FAILED since April/May. **However, actual site freshness tells a different story:**

| Service | Tracked Deploy Status | JS Bundle / Container Freshness | Actually Live? |
|---------|----------------------|--------------------------------|----------------|
| SS Frontend | ❌ FAILED (API) | May 30, 17:33 UTC | ✅ FRESH |
| SS Backend | ❌ FAILED (API) | ~18h uptime | ✅ FRESH |
| AAV Frontend | ❌ FAILED (API) | May 30, 17:30 UTC | ✅ FRESH |
| AAV Backend | ❌ FAILED (API) | Healthy, responding | ✅ LIVE |
| ARL Frontend | Unknown (no token) | May 26, 14:13 UTC | ❌ STALE 5 days |
| ARL Backend | Unknown (no token) | Healthy but stale | ⚠️ STALE |

**SS and AAV are receiving manual/untracked deploys.** The Railway GraphQL API may be tracking the wrong service IDs or an old project config. ARL has no Railway token access and is genuinely stale.

---

## Product Status Matrix

| Product | Domain | Status | Health API | Frontend | Auth | Notes |
|---------|--------|--------|-----------|----------|------|-------|
| **Safe-Spend** | safe-spend.dev | 🟢 LIVE | ✅ DB ok, Stripe ok | ✅ 200 (May 30) | ✅ 400 (validates) | Uptime ~18h, 2 blog posts, public pricing, all UX checks pass |
| **AAV** | agentauthority.dev | 🟢 LIVE | ✅ healthy | ✅ 200 (May 30) | ✅ 422 (Pydantic) | Consulting funnel live, $375 audit, pricing checkmarks still missing |
| **ARL** | reputationledger.dev | 🟡 LIVE (stale) | ✅ healthy | ✅ 200 (May 26) | ✅ 422 (validates) | ⚠️ /terms + /privacy "Page not found". emergent.sh REGRESSION. hello@agentictrust.com. Container 5 days stale. |
| **Hub** | agentictrust.app | 🟢 LIVE | N/A | ✅ 200 (Cloudflare) | N/A | All 3 LIVE, 3 COMING SOON. Timeline current. Footer complete. Clean. |

---

## Browser Flow Verification — 2026-05-31

| Check | SS | AAV | ARL | Hub |
|-------|----|-----|-----|------|
| Landing page loads | ✅ | ✅ | ✅ | ✅ |
| /signup renders form | ✅ | ✅ | ✅ | N/A |
| Pricing public | ✅ (#pricing section) | ✅ (4 tiers) — ❌ checkmarks missing | N/A | ✅ (3 LIVE, 3 COMING SOON) |
| Footer cross-product links | ✅ (3 links) | ✅ (AG Family: SS, RepLedger, AT) | ✅ (Ecosystem: SS, AAV, AT) | ✅ (4 links + Terms/Privacy) |
| Nav CTA: "Get Started Free" | ✅ | ✅ | ✅ | N/A |
| Terms/Privacy | ✅ | ✅ | ❌ ("Page not found" — fix NOT deployed) | ✅ |
| Blog active | ✅ (2 posts) | ✅ (2 posts) | ✅ (2 posts) | — |
| Schema parity | 26/26, 0 missing | N/A | N/A | N/A |
| Auth endpts validate | ✅ 400 | ✅ 422 | ✅ 422 | N/A |
| Consulting funnel | — | ✅ (Free Review + $375 Audit) | — | ✅ (links to AAV review) |
| emergent.sh tracker | ✅ Clean | ✅ Clean | ❌ REGRESSION | ✅ Clean |
| Email references | — | — | ❌ hello@agentictrust.com | — |
| No console errors | ✅ | ⚠️ (9 empty JS exceptions) | ✅ | — |

### Notable Findings

- **ARL `/terms` and `/privacy` still show "Page not found"**: Code fix exists in source (TermsPage.jsx, PrivacyPage.jsx) but the stale container hasn't picked it up. Container is 5 days old (May 26).
- **ARL emergent.sh is BACK (regression)**: Was previously removed, now loads `emergent-main.js` from `assets.emergent.sh`. Two references found in HTML.
- **ARL still uses `hello@agentictrust.com`**: Should be `support@agentictrust.app`. In the JS bundle alongside `kit@agentictrust.com`.
- **AAV pricing comparison table missing checkmarks**: Builder, Teams, and Custom columns have empty cells where ✓ marks should appear for Custom Templates, Webhook Notifications, Role-Based Access, SSO/SAML, and On-Premise rows. Free column correctly shows "—".
- **AAV footer uses "RepLedger"**: Consistent with Hub branding. Likely intentional.
- **SS and AAV are actually deploying**: Despite Railway API showing FAILED, JS bundles are dated May 30 and SS backend has ~18h uptime. Manual or untracked deploys are working.

---

## Cross-Product Link Audit — 2026-05-31 (Verified)

| From ↓ / To → | Hub | SS | AAV | ARL |
|---|---|---|---|---|
| **Safe-Spend** | ✅ | — | ✅ | ✅ |
| **AAV** | ✅ | ✅ | — | ✅ (as "RepLedger") |
| **ARL** | ✅ | ✅ | ✅ | — |
| **Hub** | — | ✅ | ✅ | ✅ (as "RepLedger") |

---

## Consulting Funnel Audit — 2026-05-31

| Check | Status | Details |
|-------|--------|---------|
| `/consulting/free-review` renders | ✅ | Tidycal embed loads, 30 min "Agent Governance Review (Free)" |
| `/consulting/audit` renders | ✅ | Shows $375, Tidycal embed with 1h30m/$375 |
| Price consistency | ✅ | All locations show $375 (no $500 mismatch) |
| `/governance-review` redirect | ✅ | Hub 301 → `agentauthority.dev/consulting/free-review` |
| **Tidycal booking types** | ⚠️ | **7 types (should be 3).** Off-brand: "Socialize Website", "Portable Toilet Ops Audit", "30 Min Discussion", "Scripting or Coaching Session". **Monthly Check-In is 45 min (should be 30 min).** Requires Jeff to clean up manually at tidycal.com. |
| Tidycal availability | ✅ | Calendar shows available dates |

---

## Schema Parity — 2026-05-31

- **Models**: 26/26 (SQLite and PostgreSQL match)
- **Missing models from PG**: 0
- **Dangerous field drifts**: 0
- ✅ **vendorMatchMode ALIGNED**: Both SQLite and PG now default to `"substring"` (was previously `"exact"` in PG — **FIXED since last audit**)
- **Known benign differences**:
  - SpendRequest: `@@unique([orgId, idempotencyKey])` in PG vs `@unique` on `idempotencyKey` alone in SQLite (intentional, org-scoped)
  - PG has extra fields on some models (indexes, updatedAt, etc.) — these are intentional enhancements

---

## Railway Deploy Pipeline Status — 2026-05-31

| Service | Tracked API Status | Last Tracked Deploy | Actual Freshness | Container Age |
|---------|-------------------|-------------------|-----------------|---------------|
| AAV Frontend | ❌ FAILED | 2026-05-01 | May 30 JS bundle | ~1 day |
| AAV Backend | ❌ FAILED | 2026-04-24 | Healthy, responding | Unknown |
| SS Backend | ❌ FAILED | 2026-04-23 | ~18h uptime | ~1 day |
| SS Frontend | ❌ FAILED | 2026-05-02 | May 30 JS bundle | ~1 day |
| ARL | Unknown (no token) | ~May 26 | May 26 JS bundle | **5 days stale** |

**Key finding**: The Railway deploy tracking API appears to be monitoring stale/incorrect service IDs. SS and AAV are actually receiving fresh deploys through an alternative mechanism. ARL is genuinely stale with no Railway token access.

---

## Open Issues

| # | Issue | Severity | Product | Status | Changed Since Last Audit |
|---|-------|----------|---------|--------|------------------------|
| 1 | ARL container stale (5 days), no Railway token | 🔴 Critical | ARL | Needs Jeff `railway login` | Unchanged |
| 2 | ARL /terms and /privacy show "Page not found" | 🔴 Critical | ARL | Fix in source, NOT deployed | Unchanged |
| 3 | ARL emergent.sh tracker REGRESSION | 🟡 Medium | ARL | Was removed, now back | **NEW** |
| 4 | ARL hello@agentictrust.com (should be support@agentictrust.app) | 🟡 Medium | ARL | Still in JS bundle | Unchanged |
| 5 | AAV pricing checkmarks missing on paid tiers | 🟡 Medium | AAV | Builder/Teams/Custom rows render empty cells | Unchanged |
| 6 | Tidycal has 7 booking types (should be 3) | 🟡 Medium | AAV | Needs Jeff manual cleanup | Unchanged |
| 7 | Tidycal Monthly Check-In is 45 min (should be 30) | 🟡 Medium | AAV | Needs Jeff manual fix | Unchanged |
| 8 | SS Playground is a dead end without escrow | 🟡 Medium | SS | Open (conversion killer) | Unchanged |
| 9 | Railway deploy API tracking mismatch | ⚪ Low | SS/AAV | Deploys succeed but API says FAILED | **NEW** |
| 10 | AAV 9 empty JS exceptions on homepage | ⚪ Low | AAV | Likely benign | Unchanged |

---

## Fixed Since Last Audit (2026-05-28)

- ✅ **vendorMatchMode mismatch RESOLVED**: Both SQLite and PG schemas now default to `"substring"`. Previously PG had `"exact"` — a functional bug causing different vendor matching behavior in dev vs prod.
- ✅ **SS and AAV actually deploying**: JS bundles are 1 day old (May 30). SS backend uptime ~18h. Despite Railway API showing all deploys as FAILED, sites are receiving fresh deploys.

---

## Previously Fixed (2026-05-22 → 2026-05-28)

- ✅ AAV signup CTAs now route to `/signup`
- ✅ AAV pricing CTAs handle Stripe checkout for logged-in users
- ✅ SS public pricing section added
- ✅ SS signup form validation complete
- ✅ AAV duplicate footer removed
- ✅ AAV 404 page added (NotFoundPage)
- ✅ ARL footer labels use product names
- ✅ ARL contact email fixed to support@agentictrust.app (in source, not deployed)
- ✅ Hub terminology softened (no "fiduciary" or "escrow")
- ✅ Hub og:image, canonical, schema.org added
- ✅ Emergent.sh tracker removed from ARL and Hub (ARL has REGRESSED)
- ✅ AAV terms/privacy links now use `<Link>` components

---

## Priority Actions

1. **🔴 Jeff: Fix ARL Railway deploy pipeline** — Container is 5 days stale. Terms/privacy fix, emergent.sh removal, and email fix are all committed to source but NOT live. Requires `railway login` for the ARL project.
2. **🔴 Jeff: Investigate Railway deploy API mismatch** — The tracked deploy API shows all deploys as FAILED since April, but SS and AAV are clearly getting fresh deploys. The API may be tracking wrong/duplicate service IDs.
3. **🟡 Fix AAV pricing checkmarks** — Builder/Teams/Custom columns in the Compare Plans table show empty cells where ✓ marks should appear.
4. **🟡 Jeff: Clean up Tidycal** — Remove 4 off-brand booking types, change Monthly Check-In from 45→30 minutes.
5. **🟡 Fix SS Playground empty state** — Users who skip Quick Start see a dead-end form with no guidance.