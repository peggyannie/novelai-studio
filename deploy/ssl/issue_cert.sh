#!/usr/bin/env sh
set -eu

DOMAIN="${1:-novelai-studio.duckdns.org}"
EMAIL="${2:-}"

mkdir -p deploy/certbot/conf deploy/certbot/www

if [ -z "${EMAIL}" ]; then
  EMAIL_ARGS="--register-unsafely-without-email"
else
  EMAIL_ARGS="--email ${EMAIL}"
fi

docker run --rm \
  -v "$(pwd)/deploy/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/deploy/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d "${DOMAIN}" \
  ${EMAIL_ARGS} \
  --agree-tos \
  --no-eff-email

echo "Certificate issued for ${DOMAIN}."
