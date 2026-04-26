#!/bin/sh
PORT=${PORT:-80}
echo "=== Starting Safe-Spend ==="
echo "PORT env var: ${PORT}"
echo "Before sed:"
cat /etc/nginx/conf.d/default.conf | head -3
sed -i "s/listen 80/listen ${PORT}/" /etc/nginx/conf.d/default.conf
# Also bind to all interfaces
sed -i "s/listen ${PORT};/listen ${PORT};/" /etc/nginx/conf.d/default.conf
echo "After sed:"
cat /etc/nginx/conf.d/default.conf | head -5
echo "Starting nginx on port ${PORT}"
exec nginx -g "daemon off;"