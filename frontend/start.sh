#!/bin/sh
set -e

# Replace the hardcoded port 80 with Railway's dynamic PORT
sed -i "s/listen 80/listen ${PORT:-80}/" /etc/nginx/conf.d/default.conf

# Start nginx as PID 1 for proper signal forwarding
exec nginx -g "daemon off;"
