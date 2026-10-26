# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security

- The visitor IP used by rate limiting is now read from a header only when `TRUST_PROXY` is set (`cloudflare` or `xff`); by default forged forwarding headers can no longer bypass the limits.
- Optional `SETUP_TOKEN` protects the first-run admin setup.
- Failed sign-in records are purged even when nobody signs in successfully.
- Optional `RETENTION_DAYS` deletes old chat messages.
- `X-Content-Type-Options` and `Referrer-Policy` on every response; Dependabot and `npm audit` in CI; read-only CI token; the development database only listens on localhost.
- Updated Next.js, React and dotenv.

### Added

- Optional **visitor information form** in the widget (name, e-mail, phone, company, up to 3 custom questions) shown before the chat or after N messages, with required fields, optional skip, consent checkbox and thank-you message; server-side validation; `POST /api/v1/leads`; a **Leads** tab with live preview, contacts list, per-conversation link, delete, delete all and CSV export (formula-injection safe); a Leads tile on the dashboard.
- The visitor's name is passed to the chatbot (sanitised, never cached).
- Optional **reset button** in the widget to start a new conversation (with in-widget confirmation).
- Chat API accepts an optional `visitor.name`.

## [0.1.0] - 2026-10-22

First public release.

### Added

- Single-admin authentication (argon2id, database sessions, brute-force protection, first-run setup).
- Multiple chatbots with names, languages, instructions, welcome message, allowed origins, public and secret keys.
- AI providers per chatbot: Gemini, Groq, OpenRouter, Cerebras, Mistral (free tiers), OpenAI, Anthropic, and any OpenAI-compatible endpoint. Encrypted keys, model listing, connection test, drag-and-drop priority, on/off switch, automatic fallback with pauses on quota or errors.
- Learning from text, Q&As, web pages (SSRF-safe) and files; PostgreSQL full-text retrieval; admin-side retrieval test.
- Improvement loop: unanswered questions are collected, answered in place and remembered.
- Public REST API: chat (JSON and streaming), feedback, widget config; public and secret key authentication, allowed origins, CORS, rate limiting, answer cache.
- Embeddable dependency-free chat widget with live-preview appearance editor.
- Dashboard: statistics, provider usage, health notices and a configurable list of latest messages.
- Encrypted API key snapshots and restore commands.
- Docker image, Docker Compose, CI workflow, documentation, MIT license.
