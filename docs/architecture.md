# Architecture

## Overview

```
 Visitor's browser                          Your server (one Next.js app + PostgreSQL)
 ┌──────────────────┐   GET  /api/v1/bots/{pk}/config   ┌──────────────────────────────────────┐
 │ widget.js        │ ───────────────────────────────▶ │ Public API  (src/lib/api/handlers.ts) │
 │ (Shadow DOM)     │   POST /api/v1/chat (SSE stream) │  auth → origin → rate limit → cache   │
 └──────────────────┘ ───────────────────────────────▶ │            │                          │
                                                        │            ▼                          │
 Your backend ── Bearer sk_… ─────────────────────────▶ │  answerQuestion (src/lib/chat)        │
                                                        │   1 retrieve knowledge (full-text)    │
 Admin ── /admin (session cookie) ───────────────────▶  │   2 build prompt                      │
                                                        │   3 provider chain with fallback ─────┼──▶ Gemini / Groq / OpenRouter /
                                                        │   4 strip the no-answer marker        │    Cerebras / Mistral / OpenAI /
                                                        │   5 log + cache                       │    Anthropic / custom endpoint
                                                        └──────────────────────────────────────┘
```

## Layout

| Path | What lives there |
|---|---|
| `src/app/admin` | Admin UI (App Router): dashboard, chatbots (configuration, knowledge, messages, appearance, embed). Server actions do the writing. |
| `src/app/api/v1` | Thin route files that forward to `src/lib/api/handlers.ts`. |
| `src/lib/api` | Public API: authentication (public/secret key), CORS, rate limiting, handlers, JSON errors. Handlers take a `Request` and return a `Response`, so tests call them directly. |
| `src/lib/ai` | Providers. `openai-compat.ts` (every provider that speaks the OpenAI protocol), `anthropic.ts`, `engine.ts` (fallback logic, pure), `bot-chain.ts` (loads providers from the database, pauses failing ones), `catalog.ts` (provider list, client-safe). |
| `src/lib/chat` | Prompt builder, no-answer marker filter, answer cache keys, the answer pipeline (`respond.ts`), the improvement loop. |
| `src/lib/knowledge` | Chunking, HTML to text, SSRF-safe fetch, ingestion, full-text query and search. |
| `src/lib/auth`, `crypto` | Sessions, password hashing, rate limiting of sign-in, AES-256-GCM secret box. |
| `src/lib/backup` | Encrypted key snapshots and restore. |
| `src/lib/stats.ts` | Dashboard figures. |
| `public/widget.js` | The embeddable widget (plain JavaScript, no build step). |
| `prisma/` | Schema and SQL migrations. |
| `tests/` | Node's built-in test runner. Unit tests, plus integration tests (database, fake AI provider, jsdom). |
| `scripts/` | Command line tools (`keys.ts`). |

## Data model

`Admin` (single) → `AdminSession`. `Bot` → `BotProvider` (encrypted key, model, order, pause state), `KnowledgeSource` → `KnowledgeChunk` (generated `tsvector` column + GIN index), `ChatLog` (one row per exchange), `ChatCache`, `Lead` (visitor information, one row per conversation). `RateHit` and `LoginAttempt` count requests. Chatbot appearance and the visitor information form are JSON columns validated by `src/lib/bots/appearance.ts` and `src/lib/bots/lead-form.ts` (the latter also validates every submission).

## Key design decisions

- **One protocol for most providers.** Gemini, Groq, OpenRouter, Cerebras, Mistral, OpenAI and custom endpoints all use the OpenAI chat-completions protocol (Gemini through its compatible endpoint), so one small `fetch` adapter covers them; Anthropic has its own adapter. No SDKs.
- **Fallback before the first token.** The engine reads the first chunk of a provider's stream; if it fails, the next provider is tried transparently. After the first token the answer is committed.
- **Lexical search, no embeddings.** PostgreSQL full-text search with the `simple` configuration works for every language, costs nothing and needs no extension. Small knowledge bases skip search and are sent whole.
- **Stateless chat API.** The client sends the recent history; the server stores only the log. This keeps the API trivial to scale and to use from anywhere.
- **Public key + origins for browsers, secret key for servers.**
- **Database-backed counters** (rate limits, cache) so several processes behave consistently without Redis.
