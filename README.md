# Free Chatbot Generator

Create custom chatbots that run on **free AI APIs**, teach them your content, and embed them in any website
with one script tag or through a REST API. Self-hosted, open source (MIT).

> **Status: work in progress.** Phase 1 (foundations) is done: project setup, database, admin sign-in.
> Roadmap below.

## Planned features

- **Multiple chatbots** per instance: rename them, customize their look, each with its own API keys and allowed origins.
- **Free AI providers with automatic fallback**: Gemini, Groq, OpenRouter, Cerebras, Mistral. When one hits its quota, the next one takes over.
- **Paid providers when you need them**: OpenAI, Anthropic, any OpenAI-compatible endpoint.
- **Learning**: feed your bot text, FAQs, web pages and files.
- **Improvement loop**: questions the bot could not answer are collected; answer them once and the bot remembers.
- **Dashboard**: statistics and the latest messages (the number shown is configurable).
- **Multilingual**: each bot answers in the languages you choose.
- **Embed anywhere**: `<script>` snippet or REST API.

## Stack

Next.js (App Router) · TypeScript · Prisma · PostgreSQL · Tailwind CSS

## Getting started (development)

Requirements: Node.js 22+, PostgreSQL 15+ (or Docker).

```bash
git clone <this repository>
cd free-chatbot-generator
npm install

# 1. Database (skip if you already have PostgreSQL)
docker compose up -d

# 2. Configuration
cp .env.example .env
# edit .env: set DATABASE_URL and generate APP_SECRET (command inside the file)

# 3. Create the tables
npm run db:migrate

# 4. Run
npm run dev        # http://localhost:3010/admin
```

On first visit you are asked to create the admin account. There is exactly one admin per instance.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3010 |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run lint` | ESLint |

## License

[MIT](LICENSE)
