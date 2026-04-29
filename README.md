# Safe-Spend

**Spending governance for AI agents.**

Safe-Spend is a policy-based spend control API for AI agents. Fund a spending pool, define guardrails, and let your agents spend within them. Every dollar, every decision, every receipt — logged.

## Features

- **Spending Pools**: Segregated fund pools for AI agents
- **Policy Engine**: Programmatic spending rules with per-transaction limits, daily/weekly/monthly caps, vendor/category restrictions
- **Agent Authorization**: Configurable agent identity verification (certificate-based crypto verification coming soon)
- **Real-time Approvals**: Webhook notifications for spend requests
- **Audit Trail**: Complete transaction history with compliance exports (PDF statements coming soon)
- **Python SDK & LangChain Integration**: Ready-to-use tools for AI agents

## Tech Stack

- **Frontend**: React 18, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Payments**: Stripe
- **Email**: Postmark

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account (for payments)

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd safe-spend

# Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL and secrets

# Run database migrations
npx prisma migrate dev

# Start backend
npm run dev

# In another terminal, install frontend dependencies
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your backend URL

# Start frontend
npm start
```

### Docker Compose

```bash
# Copy environment template
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# Access the app
open http://localhost
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guides for:

- **Railway** (Recommended - easiest)
- **Render**
- **Fly.io**
- **DigitalOcean App Platform**
- **AWS ECS + RDS**
- **Self-hosted with Docker Compose**

### Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `CORS_ORIGINS` | Yes | Allowed origins for CORS |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL |

See [.env.example](./.env.example) for the complete list.

## API Documentation

### Authentication

```bash
# Sign up
curl -X POST https://api.safe-spend.dev/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password", "name": "My Org"}'

# Login
curl -X POST https://api.safe-spend.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### Spend Request (Agent API)

```bash
curl -X POST https://api.safe-spend.dev/api/v1/spend \
  -H "X-API-Key: your-agent-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "escrow_id": "esc_xxx",
    "amount_cents": 4999,
    "vendor": "OpenAI",
    "category": "ai_compute",
    "description": "GPT-4 API credits"
  }'
```

## Python SDK

```python
from safespend import SafeSpendClient

client = SafeSpendClient(api_key="sk_live_...")

# Check balance
balance = client.get_escrow_balance("esc_xxx")
print(f"Available: ${balance['balance_cents'] / 100}")

# Request spend
result = client.create_spend(
    escrow_id="esc_xxx",
    amount_cents=4999,
    vendor="Anthropic",
    category="ai_compute"
)

if result["status"] == "approved":
    print("Spend approved!")
```

## LangChain Integration

```python
from safespend.integrations import create_safespend_toolkit

tools = create_safespend_toolkit(
    client=client,
    default_escrow_id="esc_xxx"
)

# Use with your LangChain agent
agent = create_agent(llm, tools)
```

## Project Structure

```
safe-spend/
├── backend/
│   ├── prisma/           # Database schema & migrations
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, rate limiting
│   │   └── server.js     # Express app
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   └── lib/          # API client, utilities
│   └── Dockerfile
├── sdks/
│   └── python/           # Python SDK
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## License

MIT

## Support

- Documentation: [docs.yourdomain.com](https://safe-spend.dev/docs)
- Issues: [GitHub Issues](https://github.com/agentictrust/safe-spend/issues)
- Email: support@agentictrust.app
