# Safe-Spend Backend Dockerfile (repo root version for Railway deploy)
# Node.js + Express + Prisma + PostgreSQL
# Sibling to backend/Dockerfile but works from repo root

FROM node:18-alpine AS base

# Install dependencies needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first (for layer caching)
COPY backend/package.json backend/yarn.lock* backend/package-lock.json* ./

# Copy prisma schemas BEFORE npm install (so postinstall hook works)
COPY backend/prisma ./prisma

# Install dependencies (postinstall: npx prisma generate will find the schema)
RUN npm install --production=false

# Generate Prisma client with the default schema first
RUN npx prisma generate

# Copy application source (overwrites prisma/schema.prisma with original)
COPY backend/src ./src
COPY backend/start.sh ./start.sh

# Re-swap: ensure PostgreSQL schema is active after copy
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
COPY --from=base /app/start.sh ./start.sh
RUN chmod +x start.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=8001

# Expose port
EXPOSE 8001

# Start command
CMD ["sh", "start.sh"]
