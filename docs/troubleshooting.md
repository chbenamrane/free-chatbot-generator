# Troubleshooting

## The chatbot does not answer

| Symptom | Cause and fix |
|---|---|
| Widget shows "The chatbot is unavailable right now" / API returns `503 providers_unavailable` | No usable AI provider. Open *Configuration → AI providers*: enable at least one with a key, and look at the **Last error** on each card. The dashboard also lists these problems. |
| A provider shows **Paused** | It failed recently (quota, refused key...). Fix the cause, then *Save* or flip its switch to clear the pause. |
| `Quota reached` | The free quota of that provider is used up. Add another provider below it as a backup. |
| `rejected the API key` | The key is wrong, revoked or for another product. Paste it again. |
| `Model not found` | Click *List models* and pick one from the list. Free model names change often. |
| `Key unreadable` badge | `APP_SECRET` is not the one used when the key was saved. Restore the original secret, or paste the key again. Old copies: `npm run keys:restore`. |

## The widget does not appear

1. Open the browser console. `[FreeChatbot] not started: config 403` means the website is not in the chatbot's **Allowed origins** (use the exact `https://example.com`, without a path; `www.` counts as a different origin).
2. `config 401`: the `data-bot` key is wrong.
3. The chatbot is **disabled** (Configuration) — the widget hides itself.
4. Your site's Content Security Policy blocks the script: see [integration.md](integration.md#2-content-security-policy-on-your-website).
5. `data-api` or the script address does not point to your instance, or the instance is only reachable from your own computer (`localhost`).

## The chatbot says it does not know things it should know

- Open *Knowledge → Test what it finds* with the visitor's question. If nothing relevant appears, add the information, or add a **Q&A** worded like the question.
- Web pages built entirely with JavaScript import as empty text: paste the text instead.
- Check *Messages → To answer* and teach the answers.

## Everyone gets "Too many messages"

Rate limits are per IP address. Behind a reverse proxy that does not forward the visitor's address, all visitors look like one. Configure the proxy as in [self-hosting.md](self-hosting.md#reverse-proxy), or raise `CHAT_RATE_PER_MINUTE`.

## Importing a web page fails

- `points to a private network`: public servers refuse internal addresses on purpose. For an intranet instance set `ALLOW_PRIVATE_URLS=true`.
- `Only HTML and text pages are supported`: PDFs and images cannot be imported. Paste the text.
- Some sites block automated requests; paste the text instead.

## Database and migrations

- `Environment variable not found: DATABASE_URL`: create `.env` from `.env.example`.
- `APP_SECRET is missing` / `must be 32 bytes`: generate it with the command in `.env.example`.
- A migration fails on `"tsv" ... DROP DEFAULT`: see [development.md](development.md#migrations-and-the-tsv-column).

## Docker

- The app exits immediately with `APP_SECRET is not set`: set it in `.env`.
- `docker compose` complains about `POSTGRES_PASSWORD`: set it in `.env`.
- Port already in use: change `PORT` in `.env`.
- Logs: `docker compose logs -f app`.

Still stuck? Open an issue with the steps, the exact error message and your environment (never paste API keys or `APP_SECRET`).
