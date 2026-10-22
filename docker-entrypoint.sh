#!/bin/sh
# Applies the pending database migrations, then starts the app.
set -e

if [ -z "$APP_SECRET" ]; then
  echo "APP_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"" >&2
  exit 1
fi

npx prisma migrate deploy
exec npx next start -H 0.0.0.0 -p "${PORT:-3010}"
