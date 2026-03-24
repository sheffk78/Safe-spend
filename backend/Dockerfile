# Safe-Spend Backend Dockerfile
# Node.js + Express + Prisma + PostgreSQL

FROM node:20-alpine AS base

# Install dependencies needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
RUN npm install --production=false

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy application source
COPY . .

# Production stage
FROM node:20-alpine AS production

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

# Start command - run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
