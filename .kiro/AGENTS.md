# Skeptic — Agent Guide

This repository builds **Skeptic**, an open-source verification agent for AI-built web
applications. Skeptic takes a running app plus Markdown acceptance criteria, explores the
product in a real browser, and returns evidence-backed verdicts with replayable Playwright
tests.

> Your coding agent says it works. Skeptic proves it.

Before writing code, read this guide and the linked docs. Follow the spec-driven workflow
below so changes stay inside the MVP boundary and match the frozen public contract.

## What we are building

Skeptic is a **judge**, not a builder. It verifies claims; it does not fix the app,
commit code, or run arbitrary JavaScript in the target product.

Each criterion is classified as one of four frozen verdicts:

| Verdict         | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `PASS`          | Deterministic evidence proves the criterion.                         |
| `FAIL`          | Deterministic evidence disproves the criterion.                      |
| `UNVERIFIABLE`  | A required product prerequisite is missing. Not a product failure.   |
| `HARNESS_ERROR` | Skeptic could not complete reliable verification. Not a product verdict. |

Run readiness (`READY`, `NOT_READY`, `INCOMPLETE`, `ERROR`) and CLI exit codes are derived
from those verdicts. Do not rename, alias, or add verdict states without a new ADR.

## Repository layout

```
packages/
  core/                 Shared types, Zod schemas, config, criteria parsing, secrets
  cli/                  skeptic verify | replay | report
  playwright-harness/   Isolated browser control and safe action boundary
  report/               HTML and Markdown evidence reports
  skeptic/              Published npm package (@pol-cova/skeptic)
agent/                  Eve verification agent runtime
examples/demo-app/      Seeded invite-demo reference application
docs/
  preflight.md          Toolchain and provider preflight checks
  adr/                  Architecture decisions (public contract, model providers)
scripts/preflight/      Preflight scripts for Eve, Playwright, Bedrock, package
.proof/                 Run artifacts (gitignored — never commit)
```

## Tech stack

| Component   | Version / policy                          |
| ----------- | ----------------------------------------- |
| Node.js     | `24.x` (engine enforced)                  |
| pnpm        | `10.7.0` (`pnpm-lock.yaml` is authoritative) |
| TypeScript  | Strict mode, ESM, `.ts` imports           |
| Eve         | Agent runtime (`eve dev`, `eve build`)    |
| Playwright  | Chromium only for P0                      |
| Zod         | Config and schema validation              |
| Vitest      | Unit and integration tests                |
| AI SDK      | Provider-native model access              |

## Commands

Run these from the repository root after `pnpm install`:

```bash
pnpm typecheck          # TypeScript across workspace
pnpm test               # Vitest
pnpm lint               # ESLint + Prettier check
pnpm build              # Build packages and Eve agent
pnpm dev                # Start Eve agent in dev mode
pnpm demo:dev           # Run reference demo app on :3100
pnpm format:write       # Fix Prettier issues before pushing
```

Preflight checks (see [docs/preflight.md](docs/preflight.md)):

```bash
pnpm preflight:eve
pnpm preflight:playwright
pnpm preflight:model
pnpm preflight:bedrock
```

CI runs `lint`, `typecheck`, `test`, and `build` on every pull request.

## Required reading

Read these before touching code in the relevant area:

| Topic                         | Document |
| ----------------------------- | -------- |
| Verdicts, readiness, MVP scope | [docs/adr/0001-public-contract.md](docs/adr/0001-public-contract.md) |
| Model providers and BYOC      | [docs/adr/0002-model-provider-strategy.md](docs/adr/0002-model-provider-strategy.md) |
| Toolchain preflight           | [docs/preflight.md](docs/preflight.md) |
| Human contributor workflow    | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Eve framework                 | `node_modules/eve/docs/` or https://eve.dev/docs |
| Epic and P0 checklist         | GitHub issue #1 |

The TypeScript source of truth for verdicts and readiness lives in
`packages/core/src/contracts.ts` and `agent/lib/contracts.ts`. Keep them aligned.

## MVP boundary

**P0 (in scope):** one Chromium browser, one authorized origin, at most three Markdown
criteria per run, bounded planning, typed browser actions, deterministic assertions,
evidence retention, replay, reports, and CLI workflows.

**P0 (out of scope):** automatic repair, arbitrary JS execution, multi-origin browsing,
security scanning, production credentials, hosted multi-tenant operation, and every P1
stretch item.

If a request falls outside P0, stop and ask. Optional work must not delay a P0 gate or
change verdict semantics.

## Spec-driven development (SDD)

Skeptic uses **spec-driven development**. GitHub issues are the specs. Code without a
linked issue and clear acceptance criteria is out of process.

### Where specs live

| Artifact              | Role |
| --------------------- | ---- |
| Issue #1 (epic)       | Master spec: outcome, P0 checklist, exit gates |
| P0 child issues (#2–#21)| Feature specs with acceptance criteria |
| ADRs in `docs/adr/`   | Frozen architectural decisions |
| PR descriptions       | Implementation notes tied to issue acceptance criteria |

Each P0 issue follows this structure:

- **Outcome** — what changes for the user or system
- **Scope** — concrete deliverables
- **Acceptance criteria** — testable checkboxes that define "done"
- **Blocked by** — dependency issues that must land first
- **Exit gate** — integration or demo proof required before closing
- **Explicitly out of scope** — guardrails to prevent scope creep

Treat the issue body as the spec. Do not implement behavior that is not covered by the
issue you are working on.

### SDD workflow for agents

Do not skip phases. Do not advance until the current phase is validated.

```
PICK ISSUE ──→ PLAN ──→ IMPLEMENT ──→ VERIFY ──→ PR
      │           │          │            │        │
      ▼           ▼          ▼            ▼        ▼
  Read spec   Outline     One issue    Run CI     Link issue,
  + ADRs      approach    per branch   checks     close on merge
  + blockers  in chat     minimal diff
```

#### 1. Pick and read the spec

1. Choose an open P0 issue whose blockers are satisfied.
2. Read the issue, linked ADRs, and any files listed in **PRD coverage**.
3. List assumptions before coding:

   ```
   ASSUMPTIONS:
   1. Issue #7 owns app startup — I will not add harness logic here.
   2. Config shape comes from packages/core schemas added in #6.
   → Correct me now or I'll proceed with these.
   ```

4. If requirements are ambiguous, ask. Do not silently expand scope.

#### 2. Plan

Before editing files, state a short plan:

- Which packages or directories you will touch
- Implementation order and dependencies
- How you will verify each acceptance criterion
- What you will **not** change (especially verdict names, CLI flags, artifact paths)

For changes touching more than ~5 files or multiple packages, write the plan in the issue
comment or PR description before implementing.

#### 3. Implement

- Work on a branch named after the issue (example: `issue-7-app-lifecycle`).
- Keep PRs focused on **one issue**.
- Prefer extending existing modules over new abstractions.
- Put shared types and schemas in `@skeptic/core`.
- Use Zod validators for config and persisted artifacts.
- Never use `Date.now()` inside Convex-style reactive queries (N/A here) or skip awaits on
  promises in async code.
- Match existing code style; run `pnpm format:write` before pushing.

#### 4. Verify

Every PR must pass locally before opening:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Map verification to acceptance criteria in the PR **Test plan** section. Example:

```
- [x] Readiness timeout → HARNESS_ERROR (unit test in packages/core/...)
- [x] Existing process reused (integration test in ...)
```

#### 5. Pull request

- Title: concise summary of the behavior change
- Body: link the issue (`Closes #N`), summarize changes, list checks run
- Wait for CI green before merge
- Do not merge your own PR unless the user explicitly asks

### When SDD is lightweight

Small, unambiguous fixes (typo, Prettier, single-test fix) still need acceptance criteria
but can skip a written plan. State what "done" means in one sentence.

### Living specs

- If implementation reveals a spec gap, update the issue or open an ADR **before** coding
  around it.
- If scope grows, split a new issue rather than expanding the current one.
- Closed issues are historical specs; do not reopen without a new decision.

## Agent boundaries

### Always

- Read the relevant issue and ADRs before coding
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before opening a PR
- Link PRs to GitHub issues
- Keep changes within P0 MVP scope
- Redact secrets in logs, artifacts, and test fixtures
- Use environment variables for credentials (`SKEPTIC_*` for Skeptic-owned config)

### Ask first

- Changing verdict names, readiness semantics, or CLI command shapes
- Adding dependencies or changing CI workflow
- Touching ADR decisions or expanding beyond the current issue's scope
- Publishing or changing the public npm package surface

### Never

- Commit `.env*`, credentials, or `.proof/` artifacts
- Add automatic code repair or commit-to-repo behavior
- Execute arbitrary JavaScript in the target application
- Remove or skip failing tests without approval
- Force-push to `main`
- Implement P1 (#22) work before the epic exit gate passes

## Eve agent runtime

The verification agent lives under `agent/` and runs on Eve. Before changing agent code:

1. Read Eve docs from `node_modules/eve/docs/` (or https://eve.dev/docs).
2. Respect the bounded observe-plan-act loop defined in issue #13.
3. Route model access through the provider boundary in `@skeptic/core` (ADR 0002).

Default local model access uses `codex login`. BYOC providers: OpenRouter, Cerebras,
Bedrock, and OpenAI-compatible endpoints via `SKEPTIC_PROVIDER`.

## Current delivery status

Track progress on [issue #1](https://github.com/pol-cova/Skeptic/issues/1). Completed P0
items include public contract freeze (#2), monorepo scaffold (#4), demo app (#5), and
core schemas (#6). Pick the next open issue whose blockers are satisfied.

When in doubt: read the spec, stay inside P0, preserve the four verdicts, and prove your
change with tests.
