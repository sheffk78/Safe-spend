# AgenticTrust Product State

**Last updated:** 2026-05-10 08:01 MT (Automated health check)
**Next scheduled check:** 2026-05-17 08:00 MT

---

## Site Status

| Product | Frontend | API Health | Database | Overall |
|---------|----------|-----------|----------|---------|
| Safe-Spend | ✅ 200 | ✅ ok | ✅ ok (PG+Stripe) | 🟢 Healthy |
| AAV | ✅ 200 | ✅ healthy | ✅ healthy | 🟢 Healthy |
| ARL | ✅ 200 | ✅ healthy | ✅ healthy | 🟢 Healthy |
| Hub (agentictrust.app) | ⚠️ 403 Cloudflare | N/A | N/A | 🟡 Indeterminate |

### Safe-Spend Health Detail
- **Status:** ok
- **Version:** 1.0.0
- **Environment:** production
- **Database:** ok
- **Stripe:** ok
- **Uptime:** ~49,336 seconds (~13.7 hours)

### Known Domain Pitfalls
- `agentreputationledger.com` → NXDOMAIN (dead, use `reputationledger.dev`)
- `safe-spend.app` → NXDOMAIN (use `safe-spend.dev`)
- `agentauthority.app` → NXDOMAIN (use `agentauthority.dev`)
- `agentictrust.app` → Cloudflare Error 1034 blocks curl/automation (normal, site works in browsers)

---

## Schema Parity Status

**Status:** ⚠️ 11 missing models, ~50 field-level drifts

### Missing PostgreSQL Models (11)
1. AAVConfiguration
2. AgentCertificate
3. CrossToolEvent
4. ErrorLog
5. FeatureRequest
6. FeedbackItem
7. NotificationSettings
8. OrgMember
9. ReputationCache
10. UserPulseTracking
11. WebhookDelivery

### Field-Level Drifts (Critical Models)

| Model | Drifts | Critical? |
|-------|--------|-----------|
| Organization | -10 fields (members, monthlyEscrowVolumeCents, planPeriodEnd, stripeSubscriptionId, aavConfiguration, agentCertificates, notificationSettings) | Low (org routes not yet referencing these) |
| SpendingPolicy | -14 fields (aavEnabled, activeDays, activeHoursEnd/Start, allowedCategories/Vendors, blockedCategories/Vendors, lockedAt/By) | ⚠️ Medium (vendor/category fields ARE used by active routes) |
| EscrowAccount | -3 fields (aavEnabled + 2 more) | Low |
| SpendRequest | -8 fields (approvals→approval rename, denialRule, resolvedBy, rulesEvaluated, stripePaymentId, stripeTransferId) | ⚠️ Medium (rulesEvaluated used in Playground) |
| ApiKey | isActive → isRevoked rename, -updatedAt | ✅ Fixed (isActive was added) |

### Previously Fixed (2026-05-09)
- ✅ ApiKey.isActive column added to PG schema
- ✅ SpendingPolicy.status column added to PG schema
- ✅ SpendingPolicy.purpose column added to PG schema
- ✅ SpendRequest compound unique fix (findFirst instead of findUnique)

---

## Flow Test Results

### Safe-Spend
- ✅ Auth: Login with demo account returns valid JWT
- ✅ Health endpoint: All checks passing
- ✅ Protected endpoints enforce auth (401 without token)
- ⚠️ Quick Start: Not tested this run (requires browser interaction)
- ⚠️ Playground: Not tested this run (requires browser interaction)

### AAV
- ✅ Health endpoint: Healthy
- ✅ Frontend: Serves 200
- ⚠️ Registration: Not tested this run (requires browser interaction)
- ⚠️ Verification: Not tested this run (requires browser interaction)

### ARL
- ✅ Health endpoint: Healthy
- ✅ Frontend: Serves 200
- ⚠️ Registration: Not tested this run (requires browser interaction)
- ⚠️ Scoring: Not tested this run (requires browser interaction)

---

## Priority Actions

1. **Schema sync** — Remaining 11 missing models and field drifts should be resolved before any features that reference them ship. The vendor/category fields on SpendingPolicy and rulesEvaluated on SpendRequest are the highest risk for runtime 500s.

2. **Hub Cloudflare** — Consider adding agent IP/user-agent to Cloudflare allowlist for monitoring, or accept 403 as indeterminate status.

3. **Schema parity script** — `check_schema_parity.js` is missing from `scripts/`. Needs to be recreated or the CI check will silently pass.

---

## Change Log

| Date | Change |
|------|--------|
| 2026-05-10 | Automated health check: all 3 products healthy, 11 PG models missing, ~50 field drifts documented |
| 2026-05-09 | Fixed: ApiKey.isActive, SpendingPolicy.status/purpose, SpendRequest compound unique, vendor substring matching, terminology softening, 12 UX bugs across all 3 products |
