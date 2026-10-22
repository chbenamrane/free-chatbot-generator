# Self-hosting

The app is a standard Node.js server plus PostgreSQL. It runs on a VPS, a home server, Docker, Railway/Render/Fly.io, or anywhere that can run Node 22 and reach a PostgreSQL database.

> Serverless platforms (Vercel, Netlify) can run the Next.js app, but note: key backups are written to disk (they are skipped quietly when the disk is read-only), and long streamed answers are subject to the platform's function time limit. A VPS or container is the simplest and most predictable.

## Option 1: Docker Compose (app + database)

```bash
git clone https://github.com/chbenamrane/free-chatbot-generator.git
cd free-chatbot-generator
cp .env.example .env
```

Edit `.env`: set `APP_SECRET`, `POSTGRES_PASSWORD`, and `APP_URL` (your public address, for example `https://bots.example.com`). Then:

```bash
docker compose up -d
docker compose logs -f app      # wait for "Ready"
```

The container applies the database migrations on every start. The app listens on port 3010 (`PORT` in `.env`). Data lives in the `fcg-data` volume (database) and `fcg-backups` (encrypted key backups).

Update:

```bash
git pull
docker compose build
docker compose up -d
```

## Option 2: a VPS without Docker

Requirements: Node.js 22, PostgreSQL, a process manager (systemd or pm2) and a reverse proxy.

```bash
git clone https://github.com/chbenamrane/free-chatbot-generator.git
cd free-chatbot-generator
npm ci
cp .env.example .env            # set DATABASE_URL, APP_SECRET, APP_URL
npm run db:deploy               # apply the migrations
npm run build
npm start -- -H 127.0.0.1 -p 3010
```

Example systemd unit (`/etc/systemd/system/fcg.service`):

```ini
[Unit]
Description=Free Chatbot Generator
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/free-chatbot-generator
ExecStart=/usr/bin/npm start -- -H 127.0.0.1 -p 3010
Restart=always
User=fcg
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

(`.env` in the working directory is read by Prisma; the app's other settings come from the environment, so you can also put them in the unit with `EnvironmentFile=`.)

Update: `git pull && npm ci && npm run db:deploy && npm run build && sudo systemctl restart fcg`.

## Reverse proxy

Always put the app behind HTTPS. Two things matter:

1. **Forward the visitor's IP address**, because rate limiting is per visitor. The app trusts `cf-connecting-ip` (Cloudflare) or the **last** value of `X-Forwarded-For` (the one added by your own proxy).
2. **Pass the host and protocol** (`X-Forwarded-Host`, `X-Forwarded-Proto`) or set `APP_URL`.
3. **Do not buffer streams**: the app sets `X-Accel-Buffering: no`, which nginx honors.

Caddy (automatic HTTPS):

```
bots.example.com {
    reverse_proxy 127.0.0.1:3010
}
```

nginx:

```nginx
server {
    server_name bots.example.com;
    listen 443 ssl;
    # ssl_certificate ... (certbot)

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;   # replace, do not append, so visitors cannot forge it
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Behind Cloudflare, make sure the origin only accepts Cloudflare traffic, otherwise `cf-connecting-ip` could be forged.

## Backups

Back up:

1. **The database**: `pg_dump "$DATABASE_URL" > backup.sql` on a schedule.
2. **`APP_SECRET`**: without it the encrypted API keys in a database backup are unreadable. Store it in a password manager.
3. Optionally the `backups/` folder (encrypted key copies, also useless without `APP_SECRET`).

Restore the keys of a chatbot that was deleted by mistake: `npm run keys:restore -- --map <oldBotId>=<newBotId>` (each backup file lists the old `botId` and `botName` of every key; see [security.md](security.md#api-key-protection-and-backups)).

## Health check

`GET /api/v1/bots/pk_health/config` answers `401` JSON when the app and the database are up (the Docker health check uses it).

## Checklist before going public

- [ ] HTTPS in front of the app
- [ ] `APP_SECRET` set, backed up, and not the example value
- [ ] Strong admin password (12+ characters)
- [ ] Each chatbot's **Allowed origins** set to your websites
- [ ] `ALLOW_PRIVATE_URLS` is `false`
- [ ] Database not exposed to the internet
- [ ] Backups scheduled
