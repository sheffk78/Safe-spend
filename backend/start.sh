#!/bin/sh
set -e

echo "=== Starting Safe-Spend Backend ==="

echo "Running prisma migrate deploy..."
npx prisma migrate deploy || {
  echo "ERROR: prisma migrate deploy failed with exit code $?"
  exit 1
}

echo "Starting Node.js server..."
exec node src/server.js