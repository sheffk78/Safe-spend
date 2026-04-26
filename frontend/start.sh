#!/bin/sh
echo "=== Starting Safe-Spend ==="
echo "PORT env var: ${PORT:-not set}"
cat /etc/nginx/conf.d/default.conf | head -3
PORT=${PORT:-80}
sed -i "s/listen 80/listen ${PORT}/" /etc/nginx/conf.d/default.conf
echo "After sed:"
cat /etc/nginx/conf.d/default.conf | head -3
echo "Starting nginx on port ${PORT}"
nginx -g "daemon off;"
