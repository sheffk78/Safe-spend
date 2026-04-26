# Safe-Spend Frontend Dockerfile
# React SPA with Vite build + nginx serving

# Build stage
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
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Copy built assets
COPY --from=build /app/build /usr/share/nginx/html

# Default PORT, Railway will override it
ENV PORT=80
CMD /start.sh