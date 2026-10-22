# Contributing

Thank you for helping! Bug reports, ideas, documentation fixes and code are all welcome.

## Before you start

- Look at the [open issues](https://github.com/chbenamrane/free-chatbot-generator/issues) and open a new one for anything bigger than a small fix, so we can agree on the approach first.
- By contributing you agree that your work is released under the [MIT license](LICENSE).
- Be kind: see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Set up

See [docs/development.md](docs/development.md). In short:

```bash
npm install
cp .env.example .env     # set APP_SECRET
npm run db:dev-up && npm run db:migrate
npm run dev
```

## Making a change

1. Fork the repository and create a branch from `main` (`feature/short-name` or `fix/short-name`).
2. Make your change. Keep it focused; match the style of the surrounding code (TypeScript, Tailwind, English).
3. Add or update **tests** for behavior changes, and **docs** for anything user-facing.
4. Run `npm run check` (lint + build + tests). It must pass.
5. If you changed `prisma/schema.prisma`, include the migration and remove the spurious `tsv ... DROP DEFAULT` line (see [docs/development.md](docs/development.md#migrations-and-the-tsv-column)).
6. Commit with a short imperative subject in English (`Add Cohere provider`), then a body explaining *what* and *why*.
7. Open a pull request and fill in the template.

## Ideas that would be great contributions

- New providers or better default models
- Importers (PDF, sitemap crawling)
- Embeddings-based retrieval as an optional mode
- Translations of the admin interface
- Widget improvements (voice, file upload, human handoff)
- More integration guides

## Reporting bugs

Use the bug report template. Include the steps, what you expected, what happened, your environment, and the relevant logs. **Never** paste API keys, `APP_SECRET` or `.env` contents.

## Security issues

Do not open a public issue. See [SECURITY.md](SECURITY.md).
