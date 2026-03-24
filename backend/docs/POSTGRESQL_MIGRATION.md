# PostgreSQL Migration Guide for Safe-Spend

## Overview

This guide walks through migrating Safe-Spend from SQLite (development) to PostgreSQL (production).

## Prerequisites

1. **PostgreSQL Server** (v14+ recommended)
   - Local: `brew install postgresql` (macOS) or `apt install postgresql` (Ubuntu)
   - Cloud: AWS RDS, Google Cloud SQL, Heroku Postgres, Supabase, Neon, etc.

2. **Connection String Format**
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
   ```

## Quick Migration

### Step 1: Set Environment Variable

```bash
# In your .env file or export directly
export DATABASE_URL="postgresql://safespend:your_password@localhost:5432/safespend"
```

### Step 2: Run Migration Script

```bash
cd /app/backend
chmod +x prisma/migrate-to-postgres.sh
./prisma/migrate-to-postgres.sh
```

### Step 3: Restart Backend

```bash
# If using supervisor
sudo supervisorctl restart backend

# If running directly
npm run dev
```

## Manual Migration Steps

### 1. Create PostgreSQL Database

```sql
-- Connect to PostgreSQL as superuser
CREATE USER safespend WITH PASSWORD 'your_secure_password';
CREATE DATABASE safespend OWNER safespend;
GRANT ALL PRIVILEGES ON DATABASE safespend TO safespend;
```

### 2. Update Prisma Schema

```bash
# Backup SQLite schema
cp prisma/schema.prisma prisma/schema.sqlite.backup.prisma

# Switch to PostgreSQL schema
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Push Schema to Database

```bash
# For fresh database (drops existing data)
npx prisma db push --accept-data-loss

# For production with existing data
npx prisma migrate deploy
```

### 5. Seed Admin User

```bash
node src/scripts/seed-admin.js
```

## Data Migration (Optional)

If you have existing data in SQLite that needs to be preserved:

### Export from SQLite

```javascript
// prisma/scripts/export-sqlite.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportData() {
    const data = {
        organizations: await prisma.organization.findMany(),
        escrowAccounts: await prisma.escrowAccount.findMany(),
        spendingPolicies: await prisma.spendingPolicy.findMany(),
        spendRequests: await prisma.spendRequest.findMany(),
        approvals: await prisma.approval.findMany(),
        apiKeys: await prisma.apiKey.findMany(),
        auditEvents: await prisma.auditEvent.findMany(),
        webhooks: await prisma.webhook.findMany(),
        adminUsers: await prisma.adminUser.findMany(),
    };
    
    fs.writeFileSync('backup.json', JSON.stringify(data, null, 2));
    console.log('Data exported to backup.json');
}

exportData();
```

### Import to PostgreSQL

```javascript
// prisma/scripts/import-postgres.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const data = JSON.parse(fs.readFileSync('backup.json'));

async function importData() {
    // Import in order (respecting foreign keys)
    for (const org of data.organizations) {
        await prisma.organization.create({ data: org });
    }
    // ... continue for other tables
}

importData();
```

## Environment Configuration

### Development (.env.local)
```env
DATABASE_URL="file:./dev.db"
```

### Staging (.env.staging)
```env
DATABASE_URL="postgresql://safespend:password@staging-db.example.com:5432/safespend_staging"
```

### Production (.env.production)
```env
DATABASE_URL="postgresql://safespend:secure_password@prod-db.example.com:5432/safespend_prod?sslmode=require"
```

## Connection Pooling (Recommended for Production)

For high-traffic production deployments, use a connection pooler like PgBouncer:

```env
# Direct connection for migrations
DATABASE_URL="postgresql://user:pass@db:5432/safespend"

# Pooled connection for application
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/safespend?pgbouncer=true"
```

## PostgreSQL-Specific Optimizations

### Indexes

The schema includes indexes for common queries:
- `audit_events(org_id, created_at)` - For audit log queries
- `audit_events(event_type)` - For event type filtering

### Additional Recommended Indexes

```sql
-- For spend request queries
CREATE INDEX idx_spend_requests_org_status ON spend_requests(org_id, status);
CREATE INDEX idx_spend_requests_escrow_created ON spend_requests(escrow_id, created_at);

-- For approval queries
CREATE INDEX idx_approvals_status_expires ON approvals(status, expires_at);
```

## Rollback to SQLite

If you need to rollback:

```bash
# Restore SQLite schema
cp prisma/schema.sqlite.backup.prisma prisma/schema.prisma

# Regenerate client
npx prisma generate

# Remove DATABASE_URL from .env (or set to SQLite)
# DATABASE_URL="file:./dev.db"
```

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Ensure PostgreSQL is running: `pg_isready`
- Check connection string host/port

### Authentication Failed
```
Error: password authentication failed for user "safespend"
```
- Verify username/password in DATABASE_URL
- Check pg_hba.conf allows the connection method

### SSL Required
```
Error: SSL connection is required
```
- Add `?sslmode=require` to DATABASE_URL
- Or configure SSL certificates properly

### Migration Conflicts
```
Error: Drift detected
```
- Use `npx prisma db push --accept-data-loss` for fresh start
- Or resolve drift with `npx prisma migrate resolve`

## Cloud Provider Guides

### AWS RDS
```env
DATABASE_URL="postgresql://admin:password@mydb.123456789.us-east-1.rds.amazonaws.com:5432/safespend?sslmode=require"
```

### Supabase
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Neon
```env
DATABASE_URL="postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/safespend?sslmode=require"
```

### Heroku Postgres
```env
# Heroku sets DATABASE_URL automatically
# Just ensure schema uses postgresql provider
```

## Verification Checklist

After migration, verify:

- [ ] Backend starts without errors
- [ ] Admin login works at /admin
- [ ] Organization signup/login works
- [ ] Escrow account creation works
- [ ] Spend requests process correctly
- [ ] Approvals workflow works
- [ ] Webhooks fire events
- [ ] Analytics dashboard loads data

## Support

If you encounter issues during migration:
1. Check logs: `tail -f /var/log/supervisor/backend.err.log`
2. Verify DATABASE_URL is correctly set
3. Ensure PostgreSQL user has proper permissions
4. Check firewall/security group rules for cloud databases
