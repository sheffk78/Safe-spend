#!/bin/sh
# Replace port 80 with Railway's PORT env var
PORT=${PORT:-80}
sed -i "s/listen 80/listen ${PORT}/" /etc/nginx/conf.d/default.conf
echo "Starting nginx on port ${PORT}"
nginx -g "daemon off;"
