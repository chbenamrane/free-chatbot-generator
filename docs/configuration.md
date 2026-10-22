# Configuration

All settings are environment variables, read from `.env` in development or from your hosting environment in production. The template is [`.env.example`](../.env.example).

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | | PostgreSQL connection string, for example `postgresql://user:password@host:5432/dbname?schema=public`. |
| `APP_SECRET` | yes | | 32 random bytes encoded in base64. Encrypts the AI provider API keys (AES-256-GCM) and salts visitor hashes. **Never change it** after saving keys: they would become unreadable. |
| `APP_URL` | no | derived from the request | Public address of the instance (for example `https://bots.example.com`). Used in the embed snippets, and the origin it designates is always allowed to call the API (the admin preview relies on it). Set it behind a reverse proxy. |
| `ALLOW_PRIVATE_URLS` | no | `false` | When `true`, the *Web page* importer may fetch addresses on private networks (localhost, intranet). Leave it off on a public server: it is the protection against SSRF. |
| `CHAT_RATE_PER_MINUTE` | no | `15` | Messages per minute per visitor (IP address) and chatbot, for public-key calls. |
| `CHAT_BOT_RATE_PER_MINUTE` | no | `300` | Messages per minute per chatbot, all callers together. |
| `KEY_BACKUP_DIR` | no | `./backups` | Folder where encrypted copies of the API keys are written. In Docker it is `/data/backups` (a volume). |
| `POSTGRES_PASSWORD` | Docker Compose | | Password of the bundled PostgreSQL container. |
| `PORT` | no | `3010` | Port published by Docker Compose. In development the port is fixed to 3010 by `npm run dev`. |

## Per-chatbot settings (in the admin)

| Setting | Where | Notes |
|---|---|---|
| Name, description | Configuration | The name is used in the prompt and as the default widget title. |
| Languages | Configuration | The chatbot answers in the visitor's language when it is in this list, otherwise in the first one. |
| Welcome message | Configuration | First bubble of the widget. |
| Instructions | Configuration | Tone, scope and rules added to the prompt (4000 characters). |
| Allowed origins | Configuration | Websites allowed to use the public key. Empty = any website. |
| Enabled | Configuration | A disabled chatbot refuses to answer (HTTP 403) and the widget hides itself. |
| AI providers | Configuration | Keys, models, order and on/off switches. See [providers.md](providers.md). |
| Appearance | Appearance | Colors, position, theme, texts, suggestions, optional reset button. |
| Visitor details | Leads | Form asking visitors for their name, e-mail, phone...; the list of collected contacts and the CSV export. See [leads.md](leads.md). |

## Dashboard

*Latest messages → Show N* sets how many recent messages the dashboard lists (1 to 100). It is saved on the admin account.
