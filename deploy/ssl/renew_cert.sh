#!/usr/bin/env sh
set -eu

mkdir -p deploy/certbot/conf deploy/certbot/www

docker run --rm \
  -v "$(pwd)/deploy/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/deploy/certbot/www:/var/www/certbot" \
  certbot/certbot renew --webroot -w /var/www/certbot

docker compose --env-file .env.prod -f docker-compose.prod.yml restart nginx

echo "Certificate renewal completed."
