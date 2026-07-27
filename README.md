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

## CLI

Deterministic verification (no model calls, no AWS credentials):

```bash
export PROOF_TEST_USERNAME=demo
export PROOF_TEST_PASSWORD=skeptic-demo
pnpm demo:dev

# In another terminal:
node --experimental-strip-types packages/cli/src/bin.ts verify \
  --config examples/demo-app/proof.config.ts \
  --deterministic
```

Replay a prior run from its artifact bundle:

```bash
node --experimental-strip-types packages/cli/src/bin.ts replay --run <run-id>
```

Regenerate or open the HTML report:

```bash
node --experimental-strip-types packages/cli/src/bin.ts report --run <run-id> --open
```

Exit codes follow the [public contract](docs/adr/0001-public-contract.md): `0` when all criteria pass, `1` on product `FAIL`, `2` on `UNVERIFIABLE`-only runs, `3` on config or harness errors.

Broken vs fixed demo:

| Phase  | C1   | C2   | C3           | Exit |
| ------ | ---- | ---- | ------------ | ---- |
| Broken | PASS | FAIL | UNVERIFIABLE | 1    |
| Fixed  | PASS | PASS | PASS         | 0    |

Enable persistence fix: `pnpm --filter demo-app dev:fixed` (port 3101) or `DEMO_PERSIST_INVITATIONS=true`.

## Development

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Skeptic uses a local ChatGPT subscription through `codex login` by default. Set `SKEPTIC_PROVIDER` to use OpenRouter, Cerebras, Bedrock, Google AI (Gemini), or an OpenAI-compatible endpoint. Credentials stay in environment variables; never commit them.

To use Google AI:

1. Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey)
2. Copy `.env.google-ai.example` to `.env` and add your key
3. See [Google AI integration guide](docs/GOOGLE-AI-INTEGRATION.md) for details

Repository layout:

- `packages/` — core, CLI, Playwright harness, and report
- `agent/` — Eve verification agent
- `examples/demo-app/` — reference application

Further reading:

- [Responsible use](docs/responsible-use.md)
- [Day 0 preflight](docs/preflight.md)
- [Public contract (ADR 0001)](docs/adr/0001-public-contract.md)
- [Model providers (ADR 0002)](docs/adr/0002-model-provider-strategy.md)
- [Demo app](examples/demo-app/README.md)

## Planned npm install

```bash
npm install @pol-cova/skeptic
skeptic verify --config proof.config.ts --deterministic
```

The published package ships the CLI entry point; local development uses `packages/cli` directly (see CLI section above).

## License

Apache-2.0. See [LICENSE](LICENSE).

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
