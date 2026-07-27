# Skeptic

> Your coding agent says it works. Skeptic proves it.

Skeptic is an open-source verification agent for AI-built web applications. Give it a running app and acceptance criteria written in Markdown; it explores the product in a real browser, attempts to disprove each claim, and returns evidence-backed verdicts with replayable Playwright tests.

Each criterion is classified as `PASS`, `FAIL`, `UNVERIFIABLE`, or `HARNESS_ERROR`.

## Why an agent (not a skill or script)

Acceptance criteria are written in natural language and products change during development. Skeptic must interpret intent, choose browser actions under uncertainty, recover from blocked flows, and explain what it tried. A fixed Playwright script cannot adapt when labels move or prerequisites fail. A prompt-only skill cannot produce deterministic verdicts or replayable evidence on its own.

Skeptic separates concerns deliberately:

- **Agent (Eve):** interpret criteria, plan exploration, adapt when blocked, propose next actions
- **Harness (Playwright):** validate actions, enforce origin and step limits, capture typed evidence
- **Oracle (`@skeptic/core`):** map assertions to the four frozen verdicts — only deterministic evidence establishes `PASS` or `FAIL`

## Requirements

- Node.js 24
- pnpm 10.7

## Install

```bash
npm install -g @pol-cova/skeptic
```

Or from source for development:

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

## Demo script (broken → fixed)

1. **Broken run (default demo):** `pnpm demo:dev`, then run deterministic verify (CLI section below). Expect C1 `PASS`, C2 `FAIL`, C3 `UNVERIFIABLE`, readiness `NOT_READY`, exit `1`.
2. **Inspect evidence:** open `.proof/runs/<run-id>/report.html` from disk — no server required.
3. **Replay:** `skeptic replay --run <run-id>` reproduces the recorded flow with zero model calls.
4. **Fixed run:** `pnpm --filter demo-app dev:fixed` or `DEMO_PERSIST_INVITATIONS=true`, then verify again. Expect all criteria `PASS`, readiness `READY`, exit `0`.

## Architecture

```text
Markdown criteria
      │
      ▼
┌─────────────┐     typed actions      ┌──────────────────┐
│  Eve agent  │ ◄────────────────────► │ Playwright harness│
└──────┬──────┘                        └────────┬─────────┘
       │ finish (advisory)                       │ assertions, screenshots
       ▼                                         ▼
┌─────────────┐                        ┌──────────────────┐
│   Oracle    │ ◄── evidence events ─│  Evidence store  │
└──────┬──────┘                        └────────┬─────────┘
       │ verdicts                               │ finalize
       ▼                                         ▼
              .proof/runs/<run-id>/
              events.jsonl, metadata.json, replay.json,
              generated/acceptance.spec.ts, report.html, report.md
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

### Verdict semantics and stop rules

| Verdict         | Meaning                                              | Stop rule                                      |
| --------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `PASS`          | Deterministic assertions prove the criterion         | Criterion complete                             |
| `FAIL`          | Deterministic assertions disprove the criterion      | Criterion complete                             |
| `UNVERIFIABLE`  | Prerequisite missing — not necessarily a product bug | Criterion complete; run may continue           |
| `HARNESS_ERROR` | Skeptic failed — not a product verdict               | Criterion complete; may escalate run readiness |

Aggregate readiness precedence: any `HARNESS_ERROR` → `ERROR` (3); else any `FAIL` → `NOT_READY` (1); else any `UNVERIFIABLE` → `INCOMPLETE` (2); else `READY` (0).

Broken vs fixed demo:

| Phase  | C1   | C2   | C3           | Exit |
| ------ | ---- | ---- | ------------ | ---- |
| Broken | PASS | FAIL | UNVERIFIABLE | 1    |
| Fixed  | PASS | PASS | PASS         | 0    |

Enable persistence fix: `pnpm --filter demo-app dev:fixed` (port 3101) or `DEMO_PERSIST_INVITATIONS=true`.

### Artifact layout

```text
.proof/runs/<run-id>/
├── metadata.json          # run config, verdicts, readiness
├── events.jsonl           # ordered harness/oracle timeline
├── replay.json            # replay fixture
├── generated/acceptance.spec.ts
├── screenshots/           # PNG captures keyed by event sequence
├── traces/                # optional Playwright trace
├── network/observations.json
├── report.html            # self-contained static report
└── report.md              # PR-friendly Markdown summary
```

### Provider selection

| Provider     | Credential env / login         | Typical use               |
| ------------ | ------------------------------ | ------------------------- |
| `chatgpt`    | `codex login` (local store)    | Daily development         |
| `google-ai`  | `GOOGLE_GENERATIVE_AI_API_KEY` | Free-tier development     |
| `openrouter` | `OPENROUTER_API_KEY`           | BYOC                      |
| `cerebras`   | `CEREBRAS_API_KEY`             | BYOC                      |
| `bedrock`    | AWS profile / env              | Official demo golden runs |

Credentials stay in environment variables or the provider's local login store — never commit them. Skeptic does not host a shared inference proxy. Kiro artifacts under `.kiro/` document the build process; **no runtime package imports them**.

Deterministic verify (`--deterministic`) makes zero model calls and is the fastest path for gates and CI.

## P0 boundaries and limitations

Skeptic P0 intentionally does **not**:

- Auto-repair code or open commits
- Run arbitrary JavaScript inside the target application
- Perform broad security scanning or penetration testing
- Accept production credentials or test unauthorized systems
- Proxy model inference through a hosted Skeptic service

See [Responsible use](docs/responsible-use.md) for data exposure and authorization requirements.

## Development

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Repository layout:

- `packages/` — core, CLI, Playwright harness, evidence, and report
- `agent/` — Eve verification agent
- `examples/demo-app/` — reference application
- `.kiro/` — Kiro specs and steering (documentation only)

Further reading:

- [Hackathon submission assets](submission/README.md)
- [Responsible use](docs/responsible-use.md)
- [Day 0 preflight](docs/preflight.md)
- [Public contract (ADR 0001)](docs/adr/0001-public-contract.md)
- [Model providers (ADR 0002)](docs/adr/0002-model-provider-strategy.md)
- [Demo app](examples/demo-app/README.md)

## npm install

```bash
npm install -g @pol-cova/skeptic
skeptic verify --config proof.config.ts --deterministic
```

For monorepo development, use the source install and `pnpm skeptic` entry point shown above.

## License

Apache-2.0. See [LICENSE](LICENSE).

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
