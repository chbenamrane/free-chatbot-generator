# Security

This page explains what the app protects and how, so you can deploy it with confidence. To report a vulnerability, read [SECURITY.md](../SECURITY.md).

## Model

- One **admin** per instance manages everything. Visitors only reach the **public API** and the **widget**.
- A chatbot's **public key** (`pk_`) is visible in web pages: treat it as an identifier, not a secret. It is protected by *allowed origins* and rate limiting.
- A chatbot's **secret key** (`sk_`) and the **AI provider keys** are secrets.

## Admin area

| Protection | Details |
|---|---|
| Passwords | Hashed with argon2id (OWASP parameters). 12 characters minimum. |
| Sessions | Random 256-bit token in an `HttpOnly`, `SameSite=Strict` cookie (`__Host-` prefix and `Secure` in production). Only the SHA-256 of the token is stored; sessions last 8 hours and can be revoked. |
| Brute force | 5 failed sign-ins per e-mail and 20 per IP in 15 minutes lock sign-in. Unknown e-mails take the same time as wrong passwords. |
| Authorization | Every admin page and every server action calls `requireAdmin()` itself; the proxy cookie check is only a first barrier. |
| Setup | The setup page works only while there is no admin, and the database allows a single admin row. |
| Headers | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `noindex`, `no-store` on `/admin`. |

## Public API

| Protection | Details |
|---|---|
| Origins | Browsers calling with the public key must come from the chatbot's allowed origins. Preflight requests are answered; the real request enforces the rule. |
| Rate limiting | Per visitor and chatbot, and per chatbot (database-backed, so it holds with several processes). |
| Input | Body size capped (50 KB), message length capped (1000), strict schema validation. |
| Secret keys | Only the SHA-256 hash is stored; the key is shown once when generated. |
| Privacy | Visitor IPs are never stored: only a salted hash (to count unique visitors). |
| Prompt injection | The knowledge is wrapped as data and the model is told never to treat it as instructions. This reduces, but cannot eliminate, the risk: do not put secrets in the knowledge or instructions of a public chatbot. |

## Widget

- Lives in a Shadow DOM; the host page cannot style or read it.
- Messages are rendered with DOM nodes, never as HTML: an answer containing `<script>` or `<img onerror>` is shown as text. Links are limited to `http(s)`, open with `rel="noopener noreferrer nofollow"`.
- Avatar images must be `https`.

## Web import (SSRF)

The *Web page* importer refuses private, loopback, link-local (cloud metadata) and reserved addresses, checks every redirect, limits ports (80, 443, 8080, 8443), size (2 MB) and time (15 s), and accepts only `http(s)` without credentials. Set `ALLOW_PRIVATE_URLS=true` only on a trusted, non-public instance. (DNS is checked before the request; a DNS rebinding attack between the check and the request is theoretically possible, which is another reason to keep the admin account safe.)

## API key protection and backups

AI provider keys are encrypted with AES-256-GCM using `APP_SECRET` before they are stored. A leaked database dump does not reveal them without `APP_SECRET`.

To avoid ever losing keys during development or by accident, the app writes **encrypted** snapshots to `./backups` (`KEY_BACKUP_DIR`, last 40 kept, file mode `0600`):

- after you save a new key,
- before you remove a provider,
- before you delete a chatbot.

Commands:

```bash
npm run keys:backup                                   # write a snapshot now
npm run keys:restore                                  # restore the latest snapshot (keeps keys that already exist)
npm run keys:restore -- backups/keys-....json         # restore a given file
npm run keys:restore -- --overwrite                   # also replace existing keys
npm run keys:restore -- --map OLD_BOT_ID=NEW_BOT_ID   # restore into a chatbot that was deleted and recreated
```

A snapshot lists each key's `botId` and `botName`, so you can find the old id of a deleted chatbot. Snapshots are useless without `APP_SECRET`: **back up `APP_SECRET` too**. If the saved keys cannot be decrypted (the secret changed), the provider card shows a red *Key unreadable* badge.

## Hardening checklist

- Serve over HTTPS only.
- Set *Allowed origins* on every chatbot.
- Keep the secret key on servers only; rotate it if it leaks (*Regenerate*).
- Keep `ALLOW_PRIVATE_URLS=false` on public servers.
- Restrict network access to PostgreSQL.
- Behind a proxy, overwrite `X-Forwarded-For` (see [self-hosting.md](self-hosting.md#reverse-proxy)).
- Keep dependencies updated (`npm audit`, Dependabot).
- Back up the database **and** `APP_SECRET`.
