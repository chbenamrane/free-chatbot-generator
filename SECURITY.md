# Security policy

## Supported versions

Security fixes are released for the latest version on `main` and the latest tagged release.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately with GitHub's *Report a vulnerability* button (Security tab of the repository: <https://github.com/chbenamrane/free-chatbot-generator/security/advisories/new>).

Please include: a description, the steps to reproduce, the affected version or commit, and the impact you see. You will get an acknowledgement as soon as possible, and we will work with you on a fix and a coordinated disclosure.

## Scope

In scope: authentication and sessions, the public API (`/api/v1`), the widget (`public/widget.js`), the encryption of API keys, the web page importer (SSRF), and access control between chatbots.

Out of scope: the security of third-party AI providers, a compromised server or admin account, and denial of service by sheer volume against an instance without a reverse proxy or rate limits.

See [docs/security.md](docs/security.md) for how the application protects itself and a hardening checklist for deployments.
