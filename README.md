# Free Chatbot Generator

**Create custom AI chatbots that cost nothing to run, teach them your content, and embed them in any website with one line of code.**

Free Chatbot Generator is a self-hosted, open source (MIT) platform. You bring free API keys from providers such as Google Gemini, Groq, OpenRouter, Cerebras or Mistral; the app rotates between them automatically when one hits its quota, so your chatbots stay online without a bill. You can add paid providers (OpenAI, Anthropic, or any OpenAI-compatible server) whenever you need them.

> Built with Next.js, TypeScript, Prisma and PostgreSQL.

## Features

| | |
|---|---|
| **Many chatbots** | Create, rename and delete chatbots. Each one has its own name, languages, instructions, keys, AI providers, knowledge and look. |
| **100% free to run** | Works with the free tiers of Gemini, Groq, OpenRouter, Cerebras and Mistral. |
| **Automatic fallback** | Providers are tried in the order you choose (drag and drop). On a quota error, an outage or a refused key, the next one answers and the failing one is paused. |
| **Paid providers when needed** | OpenAI, Anthropic (Claude), and any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, Together, DeepSeek...). |
| **Learning** | Teach a chatbot with text, Q&As, web pages or files. Small knowledge is sent in full; large knowledge is searched with PostgreSQL full-text search. |
| **Improvement loop** | Questions the chatbot could not answer are collected. Write the right answer once and it is remembered. |
| **Dashboard** | Messages per day, visitors, answer rate, cache rate, feedback, provider usage, warnings and the latest messages (you choose how many). |
| **Embed anywhere** | One `<script>` tag, or a REST API with streaming. Snippets for HTML, React, Next.js, WordPress, cURL, Node.js and Python are generated for you. |
| **Visitor details** | Optionally ask visitors for their name, e-mail, phone or custom questions (before the chat or after a few messages), with consent, a contacts list and CSV export. |
| **Reset button** | Optional button so visitors can start a new conversation. |
| **Customizable widget** | Colors, position, theme, avatar, texts, suggested questions, with a live preview. Dependency-free, Shadow DOM, accessible. |
| **Multilingual** | Each chatbot answers in the languages you pick, in the visitor's language. |
| **Safe by design** | Encrypted API keys, hashed secret keys, allowed origins, rate limiting, SSRF-safe web import, encrypted key backups. |

## Quick start

### With Docker (recommended for a server)

```bash
git clone https://github.com/chbenamrane/free-chatbot-generator.git
cd free-chatbot-generator
cp .env.example .env
# edit .env: set APP_SECRET (command inside the file) and POSTGRES_PASSWORD
docker compose up -d
```

Open <http://localhost:3010/admin> and create your admin account.

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

See [docs/integration.md](docs/integration.md) for React, Next.js, WordPress and more.

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
| [Self-hosting](docs/self-hosting.md) | Docker, VPS with a reverse proxy, backups, updates |
| [Security](docs/security.md) | What is protected and how, hardening checklist |
| [Architecture](docs/architecture.md) | How the pieces fit together |
| [Development](docs/development.md) | Project layout, tests, migrations, contributing tips |
| [Troubleshooting](docs/troubleshooting.md) | Common problems and fixes |

## Important notes

- **Free tiers change.** Providers adjust their free quotas and models without notice. Use *List models* in the admin to see what your key can use, and keep two or three providers enabled.
- **Back up `APP_SECRET`.** It encrypts the API keys in the database. If it is lost or changed, the saved keys can no longer be read (you would paste them again). Encrypted key backups are also written to `./backups` (see [security](docs/security.md)).
- **Do not expose the secret key** (`sk_...`) in a web page or a mobile app. Use the public key (`pk_...`) in browsers.

## Contributing

Contributions are welcome: bug reports, ideas, documentation and code. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Security issues: see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Chams eddine BENAMRANE
