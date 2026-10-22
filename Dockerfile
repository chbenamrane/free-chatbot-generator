# Free Chatbot Generator - production image.
#   docker build -t free-chatbot-generator .
#   docker run -p 3010:3010 --env-file .env free-chatbot-generator
# The container applies the database migrations on start, then serves the app on $PORT (default 3010).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# "postinstall" runs "prisma generate", which needs the schema.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
# The build does not connect to the database; the variable only has to exist for the Prisma config.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3010 KEY_BACKUP_DIR=/data/backups
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/backups && chown -R app:app /data
COPY --from=build --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/prisma.config.ts ./
COPY --from=build --chown=app:app /app/src/generated ./src/generated
COPY --from=build --chown=app:app /app/next.config.ts ./
COPY --chown=app:app docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER app
VOLUME ["/data/backups"]
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/bots/pk_health/config" >/dev/null 2>&1 || [ $? -eq 8 ] || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
