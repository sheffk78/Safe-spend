#!/bin/sh
set -e

echo "=== Starting Safe-Spend Backend ==="

echo "Running prisma db push..."
npx prisma db push --accept-data-loss || {
  echo "ERROR: prisma db push failed with exit code $?"
  exit 1
}

echo "Regenerating Prisma client..."
npx prisma generate || {
  echo "WARNING: prisma generate failed"
}

echo "Starting Node.js server..."
exec node src/server.js