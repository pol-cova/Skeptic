# Skeptic — Product Spec (v1.1)

**Status:** Active — aligned with repo, July 26, 2026  
**Supersedes:** Codex draft PRD v1.0  
**Contracts:** [ADR 0001](./adr/0001-public-contract.md), [ADR 0002](./adr/0002-model-provider-strategy.md)  
**Tracker:** [Issue #1](https://github.com/pol-cova/Skeptic/issues/1)

Share with the team. Point AI agents at [AGENTS.md](../AGENTS.md).

## 1. Product

Skeptic is an independent verification agent. It reads Markdown acceptance criteria, exercises a live web app in Chromium, and returns evidence-backed verdicts with replayable Playwright tests.

**Tagline:** AI makes code cheap. Skeptic makes claims trustworthy.

Skeptic is a **judge**, not a builder. No code fixes, no commits, no arbitrary JS in the target app.

## 2. Frozen contract

### Verdicts

| Verdict         | Meaning                                        |
| --------------- | ---------------------------------------------- |
| `PASS`          | Deterministic evidence proves the criterion    |
| `FAIL`          | Deterministic evidence disproves the criterion |
| `UNVERIFIABLE`  | Prerequisite missing — not a product failure   |
| `HARNESS_ERROR` | Skeptic failed — not a product verdict         |

### Readiness (precedence)

1. Any `HARNESS_ERROR` → `ERROR` (exit 3)
2. Else any `FAIL` → `NOT_READY` (exit 1)
3. Else any `UNVERIFIABLE` → `INCOMPLETE` (exit 2)
4. Else → `READY` (exit 0)

`INCOMPLETE` applies only when no `FAIL` or `HARNESS_ERROR` is present — blocked
prerequisites must not mask a proven product defect.

Source: `packages/core/src/contracts.ts`.

### CLI (frozen names)

```bash
skeptic verify --config <path>
skeptic replay --run <run-id>
skeptic report --run <run-id>
```

- Default config: `skeptic.config.ts` (demo: `examples/demo-app/proof.config.ts`)
- Env prefix: `SKEPTIC_*`
- Artifacts: `.proof/` (gitignored)
- Package: `@pol-cova/skeptic` (Apache-2.0; CLI in development)

## 3. MVP (P0)

**In:** one Chromium, one origin, max 3 criteria, Eve agent, typed actions, deterministic assertions, evidence, replay, reports, CLI, invite demo, Codex login default, Bedrock for official demo, BYOC providers.

**Out:** auto-repair, arbitrary JS, multi-origin, security scan, production creds, P1 ([#22](https://github.com/pol-cova/Skeptic/issues/22)).

## 4. Reference demo

```bash
pnpm demo:dev   # :3100, demo / skeptic-demo
```

Criteria (`examples/demo-app/acceptance.md`):

1. Invalid email → validation, no invite
2. Valid email → invite in Pending list
3. Duplicate email → error, no second row

| Phase  | C1   | C2   | C3           | Readiness   |
| ------ | ---- | ---- | ------------ | ----------- |
| Broken | PASS | FAIL | UNVERIFIABLE | `NOT_READY` |
| Fixed  | PASS | PASS | PASS         | `READY`     |

Fix: `pnpm --filter demo-app dev:fixed`

## 5. Architecture

```text
CLI → @skeptic/core → Eve agent ↔ Playwright harness → oracle → .proof/
```

- **Agent:** interpret, plan, adapt, explain
- **Harness:** validate actions, enforce limits, capture evidence, run assertions, assign verdict

Only deterministic assertions establish `PASS`/`FAIL`.

## 6. Models

| Provider     | Credential                     | Default                 |
| ------------ | ------------------------------ | ----------------------- |
| `chatgpt`    | `codex login`                  | `gpt-5.6-sol`           |
| `openrouter` | `OPENROUTER_API_KEY`           | `openai/gpt-5.4-mini`   |
| `cerebras`   | `CEREBRAS_API_KEY`             | `gpt-oss-120b`          |
| `bedrock`    | AWS                            | `amazon.nova-lite-v1:0` |
| `google-ai`  | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.0-flash-exp`  |

Golden runs: **Bedrock**. Daily dev: **Codex login** or **Google AI** (free tier). See [preflight.md](./preflight.md) and [Google AI integration](../docs/GOOGLE-AI-INTEGRATION.md).

## 7. Example config

```typescript
import { defineProofConfig } from "@skeptic/core";

export default defineProofConfig({
  app: {
    baseUrl: "http://127.0.0.1:3100",
    startCommand: "pnpm --filter demo-app dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3100"],
  },
  criteria: {
    file: "examples/demo-app/acceptance.md",
    maxCriteria: 3,
  },
  auth: {
    loginPath: "/login",
    usernameEnv: "PROOF_TEST_USERNAME",
    passwordEnv: "PROOF_TEST_PASSWORD",
  },
});
```

## 8. Artifacts

```text
.proof/runs/<run-id>/
├── metadata.json, events.jsonl, replay.json, verdicts.json
├── generated/acceptance.spec.ts
├── screenshots/, traces/, network/observations.json
├── report.html, report.md
```

Static reports include criterion text, verdict guidance, assertions, artifact links, ordered timeline, and a broken/fixed reference comparison. Reports are generated automatically when the evidence bundle is finalized.

## 9. Delivery

**Done:** #2–#15, #17 CLI (deterministic verify + replay + report), #16 static HTML/Markdown reports wired on evidence finalize, #19 public docs and responsible-use guidance

**Next:** remaining Day 4 hardening (#18, #20, #21) and submission polish

One issue per PR when practical. Full list: [issue #1](https://github.com/pol-cova/Skeptic/issues/1).

See [responsible-use.md](../../docs/responsible-use.md) for data exposure and limitations.

## 10. Changes from Codex PRD v1.0

| Topic           | v1.0 PRD                 | v1.1 (current)           |
| --------------- | ------------------------ | ------------------------ |
| Readiness order | FAIL before UNVERIFIABLE | FAIL before UNVERIFIABLE |
| Demo port       | :3000                    | :3100                    |
| npm             | `skeptic@latest`         | `@pol-cova/skeptic`      |
| License         | Apache or MIT            | Apache-2.0               |
| Import          | `skeptic/config`         | `@skeptic/core`          |
| Living spec     | single PRD file          | issues + ADRs + this doc |

## 11. Links

- [Team guide](./team-guide.md)
- [AGENTS.md](../AGENTS.md)
- [Contributing](../CONTRIBUTING.md)
- [Demo app](../examples/demo-app/README.md)
