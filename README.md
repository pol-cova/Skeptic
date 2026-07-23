# Skeptic

> Your coding agent says it works. Skeptic proves it.

Skeptic is an open-source verification agent for AI-built web applications. Give it a running app and natural-language acceptance criteria; it explores the product in a real browser, attempts to disprove each claim, and returns evidence-backed verdicts with replayable Playwright tests.

## TL;DR

Give Skeptic two things:

1. A URL for the running application.
2. The acceptance criteria you want independently verified.

Skeptic operates the app in a real browser, tries to disprove each claim, and produces an evidence report plus replayable Playwright tests.

Skeptic returns `PASS`, `FAIL`, `UNVERIFIABLE`, or `HARNESS_ERROR` for every criterion, backed by observable evidence.

## Planned CLI

The target command-line experience is:

```bash
skeptic verify \
  --url https://preview.example.com \
  --criteria acceptance.md
```

> Skeptic is currently a hackathon build. The NPM package has not been published yet, so installation instructions will be added after the package name and scope are reserved.

## Development

Requires Node.js 24 and pnpm 10.7.

```bash
pnpm install
pnpm dev
```

Eve guides you through configuring an AI Gateway credential when the agent
starts. Do not commit credentials.

Validate the project with:

```bash
pnpm typecheck
pnpm exec eve info
pnpm build
```

See the [Day 0 preflight](docs/preflight.md) for Eve, Bedrock, Playwright, and
package checks.

## Why Skeptic?

Coding agents are optimized to produce changes. Skeptic is an independent agent optimized to find reasons those changes should not ship.

Unlike a static testing skill, Skeptic can interpret ambiguous requirements, inspect an unfamiliar interface, adapt its verification plan, and gather evidence. A deterministic harness—not the model—controls browser actions and assigns passing verdicts.

## License

Apache-2.0
