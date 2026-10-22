# Getting started

## Requirements

- **Node.js 22 or newer** and npm
- **PostgreSQL 15 or newer** (a Docker image is provided for development)
- An API key from at least one AI provider. Free options: [Google AI Studio](https://aistudio.google.com/apikey), [Groq](https://console.groq.com/keys), [OpenRouter](https://openrouter.ai/settings/keys), [Cerebras](https://cloud.cerebras.ai/platform), [Mistral](https://console.mistral.ai/api-keys)

## 1. Get the code

```bash
git clone https://github.com/chbenamrane/free-chatbot-generator.git
cd free-chatbot-generator
npm install
```

`npm install` also generates the Prisma client (`postinstall`).

## 2. Configure

```bash
cp .env.example .env
```

Edit `.env`:

1. **`DATABASE_URL`**: your PostgreSQL connection string. If you use the bundled Docker database (`npm run db:dev-up`), the default value already matches.
2. **`APP_SECRET`**: generate it with
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   and paste the result. **Keep a copy of this secret**: it encrypts your saved API keys.

Every variable is described in [configuration.md](configuration.md).

## 3. Create the tables

```bash
npm run db:migrate      # development (creates and applies migrations)
# or, on a server:
npm run db:deploy       # applies the existing migrations only
```

## 4. Run

```bash
npm run dev             # development, http://localhost:3010
npm run build && npm start   # production (port 3000 by default, use -p to change)
```

## 5. First visit

Open `/admin`. On a fresh install you are redirected to a setup page where you create **the** admin account (one admin per instance). Choose a password of at least 12 characters.

## 6. Create and test a chatbot

Follow *Your first chatbot in 5 minutes* in the [README](../README.md#your-first-chatbot-in-5-minutes).

## Next steps

- Add a second provider as a backup: [providers.md](providers.md)
- Put the chatbot on your website: [integration.md](integration.md)
- Deploy: [self-hosting.md](self-hosting.md)
