# Safe-Spend Backend Dockerfile
# Node.js + Express + Prisma + PostgreSQL

FROM node:18-alpine AS base

# Install dependencies needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first (for layer caching)
COPY package.json yarn.lock* package-lock.json* ./

# Copy prisma schemas BEFORE npm install (so postinstall hook works)
COPY prisma ./prisma

# Install dependencies (postinstall: npx prisma generate will find the schema)
RUN npm install --production=false

# Generate Prisma client with the default schema first
RUN npx prisma generate

# Copy application source (overwrites prisma/schema.prisma with original)
COPY . .

# Switch to PostgreSQL schema for production AFTER full copy
RUN if [ -f prisma/schema.postgresql.prisma ]; then \
      cp prisma/schema.postgresql.prisma prisma/schema.prisma; \
    fi

# Re-generate Prisma client with PostgreSQL schema
RUN npx prisma generate

# Production stage
FROM node:18-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

# Copy from build stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/src ./src
COPY --from=base /app/package.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=8001

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8001/api/health || exit 1

# Start command - push schema then start server with error logging
CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>&1 && echo 'Starting server...' && node src/server.js 2>&1 || (echo 'Server crashed with exit code:' $? && sleep 5 && exit 1)"]