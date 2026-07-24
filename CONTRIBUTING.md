# Contributing

Thank you for helping improve Skeptic.

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Check existing issues and keep changes within the documented MVP boundary.
- Open an issue before starting a large feature or changing a public contract.
- Never include credentials, private application data, or `.proof/` artifacts.

## Development

Use Node.js 24 and pnpm 10.7.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm exec eve info
pnpm build
pnpm demo:dev
```

Keep pull requests focused. Explain the behavior change, link the relevant
issue, and list the checks you ran. New verdict names or readiness semantics
require an architecture decision.

By contributing, you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE).
