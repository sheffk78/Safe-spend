# Safe-Spend Backend API

Fiat-first escrow and spending-control API for AI agents.

## Overview

Safe-Spend provides a trust-grade control surface for AI agents to spend real money. A human funds an escrow account, defines fiduciary policies, and an AI agent spends against it via API. Every dollar is governed by a 13-step rules engine and logged in an immutable audit trail.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or SQLite for development)
- Stripe account (for payment processing)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
# Required: JWT_SECRET, DATABASE_URL
# Optional: STRIPE_SECRET_KEY (for payment processing)

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Run with coverage
npm test -- --coverage
```

## API Documentation

See the [API Reference](../docs/api-reference.md) or visit `/docs/api` in the frontend.

### Authentication

- **JWT Token**: For dashboard/admin operations
- **API Key**: For programmatic access
  - `sk_live_...` - Production access
  - `sk_test_...` - Test mode (simulated funds)
  - `sk_agent_...` - Agent-scoped (spend only)

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/signup` | Create organization |
| `POST /api/v1/auth/login` | Get JWT token |
| `POST /api/v1/escrow-accounts` | Create escrow |
| `POST /api/v1/escrow-accounts/:id/fund-session` | Stripe checkout |
| `POST /api/v1/policies` | Create spending policy |
| `POST /api/v1/spend` | Request a spend |
| `GET /api/v1/approvals` | List pending approvals |
| `GET /api/health` | Health check |

## Production Deployment

### Environment Variables

Required:
- `JWT_SECRET` - Secret for JWT signing (min 32 chars)
- `DATABASE_URL` - PostgreSQL connection string

Production:
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret
- `CORS_ORIGINS` - Comma-separated allowed origins

Optional:
- `LOG_LEVEL` - debug, info, warn, error (default: info)
- `PORT` - Server port (default: 8001)

### Deployment Steps

1. **Set environment variables**
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=your-secret-here
   export DATABASE_URL=postgresql://...
   export STRIPE_SECRET_KEY=sk_live_...
   export STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Run migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Build and start**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 8001
CMD ["node", "src/server.js"]
```

### Health Check

```bash
curl https://your-domain.com/api/health
```

Returns:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": "ok",
    "stripe": "ok"
  },
  "uptime_seconds": 3600
}
```

### Stripe Webhook

Configure your Stripe webhook to point to:
```
https://your-domain.com/api/stripe/webhook
```

Subscribe to events:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `charge.refunded`

## Architecture

```
src/
├── config/         # Environment validation
├── lib/            # Shared utilities (logger, stripe, org-scoped)
├── middleware/     # Auth, rate limit, validation, error handling
├── routes/         # API endpoint handlers
├── services/       # Business logic (rules engine, webhooks, stripe)
└── utils/          # ID generation, helpers
```

## Security Features

- Rate limiting on all endpoints
- Input validation with Zod schemas
- Timing-safe API key comparison
- Helmet security headers
- Request ID tracing
- Org-scoped database queries
- Structured logging with redaction

## License

MIT
