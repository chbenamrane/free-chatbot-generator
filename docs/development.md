# Development

## Setup

```bash
npm install
cp .env.example .env            # set APP_SECRET
npm run db:dev-up               # PostgreSQL in Docker (or use your own and set DATABASE_URL)
npm run db:migrate
npm run dev                     # http://localhost:3010/admin
```

## Commands

| Command | |
|---|---|
| `npm run dev` | Dev server on port 3010 |
| `npm run lint` | ESLint |
| `npm test` | All tests (see below) |
| `npm run build` | Production build (also type-checks everything, tests included) |
| `npm run check` | lint + build + tests: run it before every commit |
| `npm run db:migrate` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply existing migrations (production, CI) |
| `npm run keys:backup` / `keys:restore` | API key safety net (see [security.md](security.md#api-key-protection-and-backups)) |

## Tests

`npm test` uses Node's built-in test runner with `tsx`.

- Pure unit tests (chunking, query building, SSRF guard, CORS, marker filter, appearance schema) always run.
- Integration tests (`api`, `knowledge-db`, `improve`, `stats`) need `DATABASE_URL` and are **skipped** without it. They create a temporary chatbot named `zz-test` and delete it afterwards; they never touch other data. `api.test.ts` starts a fake OpenAI-compatible provider on a random port, so no real API key is needed.
- `widget.test.ts` runs `public/widget.js` in jsdom with a fake `fetch`.

## Migrations and the `tsv` column

`KnowledgeChunk.tsv` is a PostgreSQL **generated** `tsvector` column declared in Prisma as `Unsupported("tsvector")`. Prisma cannot describe generated columns, so every `prisma migrate dev` adds this line to the new migration:

```sql
ALTER TABLE "KnowledgeChunk" ALTER COLUMN "tsv" DROP DEFAULT;
```

PostgreSQL rejects it. **Delete that statement from the generated `migration.sql` before applying** (use `prisma migrate dev --create-only`, edit, then `prisma migrate dev` or `npm run db:deploy`). If a migration already failed halfway, revert its partial changes by hand and run `prisma migrate resolve --rolled-back <name>`.

## Conventions

- TypeScript strict, Tailwind for styling, English everywhere (code, UI, docs, commit messages).
- Server code that must never reach the browser imports `server-only`. Pure logic that tests run directly (engine, chunking, CORS...) does not.
- Every admin page and server action calls `requireAdmin()`.
- Never wipe the development database in tests: only create and delete your own `zz-test` rows.
- Keep user-facing errors actionable and never include secrets in logs.

## Adding an AI provider

1. If it speaks the OpenAI protocol, add an entry to `PROVIDER_INFO` in `src/lib/ai/catalog.ts` (name, tier, help, key URL, default model, `baseUrl`) and its id to `PROVIDER_IDS`. That is all: the engine, the admin and the docs table pick it up.
2. If it has its own protocol, add an adapter next to `anthropic.ts` (stream, test, list models), set `protocol` in the catalog, and wire it in `src/lib/ai/engine.ts`.
3. Add it to the table in `docs/providers.md`.

## Releasing

Update `CHANGELOG.md`, bump `version` in `package.json`, tag `vX.Y.Z` and create a GitHub release.
