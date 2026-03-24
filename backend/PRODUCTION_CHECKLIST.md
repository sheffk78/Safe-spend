# Safe-Spend Production Checklist

Use this checklist before every production deployment.

## Security

- [ ] Rate limiting on auth, spend, and key creation endpoints
- [ ] Input validation (Zod) on all request bodies
- [ ] Helmet security headers configured
- [ ] CORS restricted to allowed origins
- [ ] API key hash comparison is timing-safe
- [ ] Error responses never expose stack traces in production
- [ ] All DB queries scoped by org_id

## Multi-Tenancy

- [ ] Cross-org escrow access blocked (verified by test)
- [ ] Cross-org approval access blocked (verified by test)
- [ ] API keys cannot be used across organizations
- [ ] Audit logs only show org's own events

## Observability

- [ ] Request IDs on all responses and logs
- [ ] Structured JSON logging in production
- [ ] All critical events logged at appropriate level
- [ ] /health endpoint returns 503 on degraded state

## Stripe

- [ ] STRIPE_SECRET_KEY set in environment
- [ ] STRIPE_WEBHOOK_SECRET set in environment (production)
- [ ] Webhook signature verification active
- [ ] Test mode clearly labeled in all Stripe calls

## Deployment

- [ ] .env.example complete and up to date
- [ ] All required env vars validated at startup
- [ ] Migrations tracked and run on deploy
- [ ] Graceful shutdown implemented
- [ ] Build scripts for backend and frontend documented
- [ ] README deployment section complete

## Pre-Deploy Steps

1. Run all tests:
   ```bash
   cd /app/backend && npm test
   ```

2. Check lint:
   ```bash
   npm run lint
   ```

3. Verify environment variables:
   ```bash
   # Ensure all required vars are set
   node -e "require('./src/config/environment').validateEnvironment()"
   ```

4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

5. Build frontend:
   ```bash
   cd /app/frontend && npm run build
   ```

## Post-Deploy Verification

1. Check health endpoint:
   ```bash
   curl https://your-domain.com/api/health
   ```

2. Verify database connectivity (should return status: ok)

3. Test login flow manually

4. Test spend flow with test key

5. Verify Stripe webhook endpoint is receiving events

## Rollback Plan

1. Keep previous deployment artifacts
2. Revert database migrations if needed:
   ```bash
   npx prisma migrate resolve --rolled-back [migration_name]
   ```
3. Redeploy previous version

## Emergency Contacts

- Engineering Lead: [contact]
- On-call: [contact]
- Stripe Support: support@stripe.com
