# Skeptic

> Your coding agent says it works. Skeptic proves it.

Skeptic is an open-source verification agent for AI-built web applications. Give it a running app and acceptance criteria written in Markdown; it explores the product in a real browser, attempts to disprove each claim, and returns evidence-backed verdicts with replayable Playwright tests.

Each criterion is classified as `PASS`, `FAIL`, `UNVERIFIABLE`, or `HARNESS_ERROR`.

## Requirements

- Node.js 24
- pnpm 10.7

## Install

Published npm package:

```bash
npm install @pol-cova/skeptic
```

The package name is reserved. The verification CLI is still under development in this repository.

Clone and install from source:

```bash
git clone https://github.com/pol-cova/Skeptic.git
cd Skeptic
pnpm install
```

## Quick start

Run the reference demo app:

```bash
pnpm demo:dev
```

Open `http://127.0.0.1:3100/login` and sign in with `demo` / `skeptic-demo`.

Start the Eve agent:

```bash
pnpm dev
```

## Development

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Skeptic uses a local ChatGPT subscription through `codex login` by default. Set `SKEPTIC_PROVIDER` to use OpenRouter, Cerebras, Bedrock, or an OpenAI-compatible endpoint. Credentials stay in environment variables; never commit them.

Repository layout:

- `packages/` — core, CLI, Playwright harness, and report
- `agent/` — Eve verification agent
- `examples/demo-app/` — reference application

Further reading:

- [Day 0 preflight](docs/preflight.md)
- [Public contract (ADR 0001)](docs/adr/0001-public-contract.md)
- [Model providers (ADR 0002)](docs/adr/0002-model-provider-strategy.md)
- [Demo app](examples/demo-app/README.md)

## Planned CLI

```bash
skeptic verify \
  --url https://preview.example.com \
  --criteria acceptance.md
```

## License

Apache-2.0. See [LICENSE](LICENSE).

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
