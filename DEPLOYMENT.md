# Safe-Spend Deployment Guide

This guide covers deploying Safe-Spend to various PostgreSQL-compatible platforms.

## Quick Start (Docker Compose)

The fastest way to deploy Safe-Spend is using Docker Compose:

```bash
# Clone the repository
git clone <your-repo-url>
cd safe-spend

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

Access the app at `http://localhost` (frontend) and `http://localhost:8001` (API).

---

## Platform-Specific Guides

### Railway

Railway is the easiest platform for deploying full-stack apps with PostgreSQL.

#### 1. Create Project
1. Go to [railway.app](https://railway.app) and create a new project
2. Click "Deploy from GitHub repo" and connect your repository

#### 2. Add PostgreSQL
1. Click "New" → "Database" → "PostgreSQL"
2. Railway will auto-provision a PostgreSQL instance

#### 3. Deploy Backend
1. Click "New" → "GitHub Repo" → Select your repo
2. Set root directory to `backend`
3. Add environment variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-secret-here
   CORS_ORIGINS=https://your-frontend.railway.app
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. Railway will auto-detect the Dockerfile and build

#### 4. Deploy Frontend
1. Click "New" → "GitHub Repo" → Select your repo
2. Set root directory to `frontend`
3. Add build argument:
   ```
   REACT_APP_BACKEND_URL=https://your-backend.railway.app
   ```

#### 5. Configure Domains
1. Go to each service's settings
2. Click "Generate Domain" or add custom domain

---

### Render

#### 1. Create PostgreSQL Database
1. Go to [render.com](https://render.com) → "New" → "PostgreSQL"
2. Name: `safespend-db`
3. Copy the "Internal Database URL" for later

#### 2. Deploy Backend as Web Service
1. "New" → "Web Service" → Connect your repo
2. Settings:
   - Name: `safespend-api`
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npx prisma migrate deploy && node src/server.js`
3. Environment Variables:
   ```
   DATABASE_URL=<internal-database-url>
   JWT_SECRET=your-secret
   NODE_ENV=production
   PORT=8001
   CORS_ORIGINS=https://safespend-web.onrender.com
   ```

#### 3. Deploy Frontend as Static Site
1. "New" → "Static Site" → Connect your repo
2. Settings:
   - Name: `safespend-web`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
3. Environment Variables:
   ```
   REACT_APP_BACKEND_URL=https://safespend-api.onrender.com
   ```

---

### Fly.io

#### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

#### 2. Create PostgreSQL Database
```bash
fly postgres create --name safespend-db
```

#### 3. Deploy Backend
```bash
cd backend

# Create fly.toml
fly launch --name safespend-api --no-deploy

# Set secrets
fly secrets set \
  JWT_SECRET="your-secret" \
  STRIPE_SECRET_KEY="sk_live_..." \
  CORS_ORIGINS="https://safespend-web.fly.dev"

# Attach database
fly postgres attach safespend-db

# Deploy
fly deploy
```

#### 4. Deploy Frontend
```bash
cd frontend

fly launch --name safespend-web --no-deploy

# Set build arg
fly secrets set REACT_APP_BACKEND_URL="https://safespend-api.fly.dev"

fly deploy
```

---

### DigitalOcean App Platform

#### 1. Create App
1. Go to DigitalOcean → Apps → Create App
2. Connect your GitHub repository

#### 2. Configure Components

**Database:**
- Add a PostgreSQL database component
- Note the `${db.DATABASE_URL}` reference

**Backend:**
- Source: `/backend`
- Build Command: `npm install && npx prisma generate`
- Run Command: `npx prisma migrate deploy && node src/server.js`
- HTTP Port: 8001
- Environment Variables:
  ```
  DATABASE_URL=${db.DATABASE_URL}
  JWT_SECRET=your-secret
  CORS_ORIGINS=${APP_URL}
  ```

**Frontend:**
- Source: `/frontend`
- Type: Static Site
- Build Command: `npm install && npm run build`
- Output Directory: `build`
- Environment Variables:
  ```
  REACT_APP_BACKEND_URL=${safespend-api.PUBLIC_URL}
  ```

---

### AWS (ECS + RDS)

For production deployments at scale, use AWS ECS with RDS PostgreSQL.

#### 1. Create RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier safespend-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username safespend \
  --master-user-password <password> \
  --allocated-storage 20
```

#### 2. Create ECR Repositories
```bash
aws ecr create-repository --repository-name safespend-api
aws ecr create-repository --repository-name safespend-web
```

#### 3. Build and Push Images
```bash
# Login to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

# Build and push backend
cd backend
docker build -t safespend-api .
docker tag safespend-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/safespend-api:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/safespend-api:latest

# Build and push frontend
cd ../frontend
docker build --build-arg REACT_APP_BACKEND_URL=https://api.yourdomain.com -t safespend-web .
docker tag safespend-web:latest <account-id>.dkr.ecr.<region>.amazonaws.com/safespend-web:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/safespend-web:latest
```

#### 4. Create ECS Service
Use the AWS Console or Terraform to create:
- ECS Cluster
- Task Definitions for backend and frontend
- ECS Services with Application Load Balancer
- Security groups and IAM roles

---

## Database Migrations

After deploying, run database migrations:

```bash
# For Docker Compose (already runs on startup)
docker-compose exec backend npx prisma migrate deploy

# For other platforms, SSH or use console
npx prisma migrate deploy
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `CORS_ORIGINS` | Yes | Allowed origins (comma-separated or *) |
| `STRIPE_SECRET_KEY` | For payments | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `POSTMARK_API_KEY` | For emails | Postmark API key |
| `SENDER_EMAIL` | For emails | From address for emails |
| `REACT_APP_BACKEND_URL` | Yes (frontend) | Backend API URL |

## Health Checks

- Backend: `GET /api/health`
- Frontend: `GET /health` (nginx)

## SSL/HTTPS

All platforms above provide automatic SSL. For self-hosted:
- Use Let's Encrypt with Certbot
- Or use Cloudflare as a reverse proxy

## Monitoring

Recommended monitoring setup:
- **Logs**: Use platform-provided logging or ship to Datadog/Papertrail
- **APM**: New Relic, Datadog APM, or Sentry
- **Uptime**: UptimeRobot, Pingdom, or Better Uptime

## Support

For deployment issues:
1. Check the platform's documentation
2. Review logs: `docker-compose logs` or platform console
3. Verify environment variables are set correctly
4. Ensure database is accessible from the backend service
