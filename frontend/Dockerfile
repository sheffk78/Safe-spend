FROM node:18-alpine AS build

# Install python for prerender script
RUN apk add --no-cache python3

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

# Prerender routes for SEO and AI crawler visibility
RUN python3 prerender.py

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
