#!/bin/bash
# Safe-Spend Database Migration: SQLite → PostgreSQL
# 
# Prerequisites:
# 1. PostgreSQL server running and accessible
# 2. DATABASE_URL environment variable set
# 3. Node.js and npm installed
#
# Example DATABASE_URL:
# postgresql://user:password@localhost:5432/safespend?schema=public

set -e

echo "=================================="
echo "Safe-Spend SQLite → PostgreSQL Migration"
echo "=================================="

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    echo ""
    echo "Please set DATABASE_URL to your PostgreSQL connection string:"
    echo "  export DATABASE_URL=\"postgresql://user:password@host:5432/safespend\""
    exit 1
fi

echo "✓ DATABASE_URL is set"

# Backup current schema
echo ""
echo "Step 1: Backing up current SQLite schema..."
cp prisma/schema.prisma prisma/schema.sqlite.backup.prisma
echo "✓ Backed up to prisma/schema.sqlite.backup.prisma"

# Switch to PostgreSQL schema
echo ""
echo "Step 2: Switching to PostgreSQL schema..."
cp prisma/schema.postgresql.prisma prisma/schema.prisma
echo "✓ Schema updated to PostgreSQL"

# Generate Prisma client
echo ""
echo "Step 3: Generating Prisma client..."
npx prisma generate
echo "✓ Prisma client generated"

# Push schema to PostgreSQL (creates tables)
echo ""
echo "Step 4: Pushing schema to PostgreSQL..."
npx prisma db push --accept-data-loss
echo "✓ Schema pushed to PostgreSQL"

# Optional: Export data from SQLite and import to PostgreSQL
echo ""
echo "Step 5: Data migration (optional)"
echo "If you need to migrate existing data from SQLite:"
echo "  1. Use prisma/scripts/export-sqlite.js to export data"
echo "  2. Use prisma/scripts/import-postgres.js to import data"
echo ""

# Seed admin user
echo ""
echo "Step 6: Seeding admin user..."
node src/scripts/seed-admin.js
echo "✓ Admin user seeded"

echo ""
echo "=================================="
echo "✓ Migration complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Update your .env file with DATABASE_URL"
echo "2. Restart the backend server"
echo "3. Verify all endpoints work correctly"
echo ""
echo "To rollback to SQLite:"
echo "  cp prisma/schema.sqlite.backup.prisma prisma/schema.prisma"
echo "  npx prisma generate"
