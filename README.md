# Free Chatbot Generator

**Build AI chatbots that cost nothing to run, teach them your content, and add them to any website with one line of code.**

Free Chatbot Generator is a self-hosted, open source (MIT) web app. You create chatbots in an admin panel, give each one its own knowledge, personality and look, then embed it in your site with a single `<script>` tag or call it from your own backend through a REST API.

It is built around **free AI APIs**. You bring free keys from providers such as Google Gemini, Groq, OpenRouter, Cerebras or Mistral. When one provider hits its quota or has an outage, the app switches to the next one automatically, so your chatbot stays online without a bill. Paid providers (OpenAI, Anthropic, or any OpenAI-compatible server) can be added at any time.

> Built with Next.js, TypeScript, Prisma and PostgreSQL. No SDKs, no vector database, no Redis.

## Why this project

- **No subscription, no per-message fee.** You host it, you own the data, and the AI side runs on free tiers.
- **Resilient by design.** A chain of providers per chatbot, with automatic fallback and temporary pauses for failing ones.
- **Answers from *your* content.** A chatbot answers factual questions only from the knowledge you give it, and tells visitors politely when it does not know.
- **It gets better over time.** Questions it could not answer are collected; you write the right answer once and it is remembered.
- **Simple to embed.** One script tag, a dependency-free widget, or a REST API with streaming.

## How it works

```
 Visitor's browser                            Your server (one Next.js app + PostgreSQL)
 ┌─────────────────┐   POST /api/v1/chat     ┌─────────────────────────────────────────┐
 │ widget.js       │ ──────────────────────▶ │ 1. check the key, the website, the limit │
 │ (Shadow DOM)    │ ◀── streamed answer ─── │ 2. cached answer? return it              │
 └─────────────────┘                         │ 3. find the relevant knowledge           │
                                             │ 4. ask the first AI provider ────────────┼──▶ Gemini, Groq, OpenRouter,
 Your own backend ── secret key ───────────▶ │    on failure: try the next one          │    Cerebras, Mistral, OpenAI,
                                             │ 5. log the exchange, cache the answer    │    Anthropic, custom endpoint
 You ── /admin ────────────────────────────▶ └─────────────────────────────────────────┘
```

Small knowledge bases are sent to the AI in full. Larger ones are searched with PostgreSQL full-text search, which works in any language without an extension.

## Features

| | |
|---|---|
| **Many chatbots** | Each one has its own name, languages, instructions, keys, AI providers, knowledge and look. |
| **100% free to run** | Works with the free tiers of Gemini, Groq, OpenRouter, Cerebras and Mistral. |
| **Automatic fallback** | Providers are tried in the order you choose (drag and drop). On a quota error, an outage or a refused key, the next one answers and the failing one is paused. |
| **Paid providers when needed** | OpenAI, Anthropic (Claude), and any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, Together, DeepSeek...). |
| **Learning** | Teach a chatbot with text, Q&As, web pages or files (`.txt`, `.md`, `.csv`, `.json`, `.html`). |
| **Improvement loop** | Unanswered questions, failed messages and "not helpful" ratings are listed; answer once and the chatbot learns. |
| **Dashboard** | Messages per day, visitors, answer rate, cache rate, feedback, provider usage, warnings and the latest messages. |
| **Embed anywhere** | One `<script>` tag, or a REST API with streaming. Ready-made snippets for HTML, React, Next.js, WordPress, cURL, Node.js and Python. |
| **Visitor details** | Optionally ask visitors for their name, e-mail, phone or custom questions, with a consent checkbox, a contacts list and CSV export. |
| **Reset button** | Optional button so visitors can start a new conversation. |
| **Customizable widget** | Colors, position, theme, avatar, texts and suggested questions, with a live preview. Dependency-free, Shadow DOM, accessible. |
| **Multilingual** | Each chatbot answers in the visitor's language, among the languages you pick. |
| **Safe by design** | Encrypted provider keys, hashed secret keys, allowed origins, rate limiting, SSRF-safe web import, encrypted key backups. |

## Quick start

### With Docker (recommended for a server)

```bash
git clone https://github.com/chbenamrane/free-chatbot-generator.git
cd free-chatbot-generator
cp .env.example .env
# edit .env: set APP_SECRET (the command to generate it is in the file) and POSTGRES_PASSWORD
docker compose up -d
```

Open <http://localhost:3010/admin> and create your admin account.

> Exposing the instance on the Internet? Read [Before going public](#before-going-public) first.

### For development

Requirements: Node.js 22+ and PostgreSQL 15+ (or Docker).

```bash
git clone https://github.com/chbenamrane/free-chatbot-generator.git
cd free-chatbot-generator
npm install
cp .env.example .env            # set APP_SECRET, check DATABASE_URL
npm run db:dev-up               # optional: PostgreSQL in Docker
npm run db:migrate              # create the tables
npm run dev                     # http://localhost:3010/admin
```

Useful commands: `npm run check` (lint, build and tests), `npm test`, `npm run keys:backup`.

## Your first chatbot in 5 minutes

1. **Create the admin account** on the first visit to `/admin`.
2. **Chatbots → New chatbot**: give it a name and the languages it should speak.
3. **Configuration → AI providers**: open Google Gemini (or any free provider), click *Get a key*, paste the key, *Save*, then *Test*. Add a second provider as a backup and drag it below the first.
4. **Knowledge**: paste a few paragraphs about your business, add Q&As, or import a web page. Use *Test what it finds* to check.
5. **Try it** (in Configuration) to talk to your chatbot.
6. **Appearance**: pick the colors and texts with the live preview.
7. **Embed & API**: copy the one-line snippet into your website. In *Configuration → Allowed origins*, list your website so nobody else can use your chatbot.
8. Watch **Messages**: answer what the chatbot could not, and it learns.

## Embedding

```html
<script src="https://YOUR-INSTANCE/widget.js" data-bot="pk_xxxxxxxx" defer></script>
```

REST API (details in [docs/api-reference.md](docs/api-reference.md)):

```bash
curl -X POST https://YOUR-INSTANCE/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Bot-Key: pk_xxxxxxxx" \
  -d '{"message": "What are your opening hours?"}'
```

Each chatbot has a **public key** (`pk_...`, safe in a web page, restricted to your allowed websites) and an optional **secret key** (`sk_...`, for your servers only). See [docs/integration.md](docs/integration.md) for React, Next.js, WordPress and more.

## Configuration

Everything is set with environment variables (see [`.env.example`](.env.example) and [docs/configuration.md](docs/configuration.md)). The ones that matter most:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. |
| `APP_SECRET` | Required. Encrypts the provider API keys stored in the database. |
| `APP_URL` | Public address of the instance, used in the embed snippets. |
| `SETUP_TOKEN` | Optional. Required to create the first admin account. |
| `TRUST_PROXY` | `none` (default), `cloudflare` or `xff`. Which header holds the visitor's IP, for rate limiting. |
| `RETENTION_DAYS` | Optional. Automatically delete chat messages older than this. |

## Before going public

If your instance is reachable from the Internet:

- Serve it over **HTTPS** behind a reverse proxy, and set `APP_URL`.
- Set **`SETUP_TOKEN`** before the first start, so nobody else can create the admin account.
- Set **`TRUST_PROXY`** to match your proxy, and make sure the proxy overwrites the forwarding header.
- List your websites in each chatbot's **Allowed origins**.
- Keep `ALLOW_PRIVATE_URLS=false`, restrict network access to PostgreSQL, and **back up the database and `APP_SECRET`**.

The full checklist is in [docs/security.md](docs/security.md) and [docs/self-hosting.md](docs/self-hosting.md).

## Project layout

```
src/app/admin      admin panel (dashboard, chatbots, knowledge, messages, leads, appearance, embed)
src/app/api/v1     public REST API (chat, feedback, leads, widget config)
src/lib/ai         AI providers and the fallback engine
src/lib/chat       prompt building, answer pipeline, cache, improvement loop
src/lib/knowledge  chunking, web import (SSRF-safe), full-text search
src/lib/auth       sessions, password hashing, sign-in rate limiting
public/widget.js   the embeddable widget (plain JavaScript, no build step)
prisma/            schema and SQL migrations
tests/             unit and integration tests (Node's built-in test runner)
docs/              full documentation
```

## Documentation

| Guide | |
|---|---|
| [Getting started](docs/getting-started.md) | Installation and first steps in detail |
| [Configuration](docs/configuration.md) | Every environment variable |
| [AI providers](docs/providers.md) | Free and paid providers, fallback, quotas, keys |
| [Knowledge and learning](docs/knowledge.md) | How a chatbot learns and finds answers |
| [Visitor details and reset](docs/leads.md) | Asking visitors for their details, contacts, export, privacy, the reset button |
| [Integration](docs/integration.md) | Widget, frameworks, CMS, content security policy |
| [API reference](docs/api-reference.md) | Endpoints, authentication, errors, streaming |
| [Self-hosting](docs/self-hosting.md) | Docker, a server with a reverse proxy, backups, updates |
| [Security](docs/security.md) | What is protected and how, hardening checklist |
| [Architecture](docs/architecture.md) | How the pieces fit together |
| [Development](docs/development.md) | Project layout, tests, migrations, contributing tips |
| [Troubleshooting](docs/troubleshooting.md) | Common problems and fixes |

## Good to know

- **Free tiers change.** Providers adjust their free quotas and models without notice. Use *List models* in the admin to see what your key can use, and keep two or three providers enabled.
- **Back up `APP_SECRET`.** If it is lost or changed, the saved provider keys can no longer be read and you would paste them again. Encrypted key snapshots are also written to `./backups` (see [security](docs/security.md)).
- **One admin per instance.** The admin panel is meant for the owner of the instance, not for multiple users.
- **Keyword search, not embeddings.** Retrieval uses PostgreSQL full-text search. It is fast, free and works in every language, but it matches words rather than meaning, so phrase Q&As the way visitors ask.
- **Personal data.** If you collect visitor details, you are responsible for the consent text and for deleting data on request. See [docs/leads.md](docs/leads.md).
- **Prompt injection.** The knowledge is treated as data, which reduces but cannot eliminate the risk: never put secrets in a public chatbot's knowledge or instructions.

## Contributing

Contributions are welcome: bug reports, ideas, documentation and code. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Chams eddine BENAMRANE
