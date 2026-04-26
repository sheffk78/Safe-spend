#!/bin/sh
# Replace the hardcoded port 80 with Railway's dynamic PORT
sed -i "s/listen 80/listen ${PORT:-80}/" /etc/nginx/conf.d/default.conf
nginx -g "daemon off;"
