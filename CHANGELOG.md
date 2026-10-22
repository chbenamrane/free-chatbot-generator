# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

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
