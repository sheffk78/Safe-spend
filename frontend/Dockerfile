# Safe-Spend Frontend Dockerfile
# React SPA with Vite build + nginx serving
# Build: 2026-04-25-v2 (nginx llms.txt fix)

# Build stage - use Node 18 LTS
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (legacy-peer-deps for react-day-picker date-fns compatibility)
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build argument for backend URL
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build the app
RUN npm run build

# Verify the build output has correct structure
RUN ls -la /app/build/assets/ && echo "Build verified" || (echo "Build failed - no assets directory" && exit 1)

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Copy built assets
COPY --from=build /app/build /usr/share/nginx/html

# Health check on port 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Start nginx
CMD ["/start.sh"]