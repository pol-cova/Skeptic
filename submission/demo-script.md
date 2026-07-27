# Three-minute demo script

**Target length:** 2:45–3:00  
**Audience:** Hackathon judges (Reto 3 — specialized agent)  
**Stable path:** localhost demo on port 3100 (documented in README)

> Say aloud when switching from live to prerecorded: *"This next segment uses a prerecorded artifact bundle from submission/fallback — not a live model run."*

## Beat map

| Time | Beat | On screen | Narration |
| ---- | ---- | --------- | --------- |
| 0:00–0:20 | Problem | README tagline + broken invite UI | "Coding agents claim features work. Skeptic is an independent verification agent: it reads Markdown acceptance criteria, explores the app in Chromium, and returns evidence-backed verdicts." |
| 0:20–0:35 | Criteria | `examples/demo-app/acceptance.md` | "Three criteria: invalid email blocked, valid email persisted in Pending, duplicate invite rejected." |
| 0:35–1:05 | Broken run | Terminal: `pnpm skeptic verify --deterministic` | "Default demo seeds a persistence bug. Deterministic verify makes zero model calls — this is the harness oracle, not the agent planner." |
| 1:05–1:20 | Verdicts | Terminal JSON + report table | "Criterion 1 PASS — validation works. Criterion 2 FAIL — toast succeeds but the row disappears after refresh. Criterion 3 UNVERIFIABLE — duplicate flow is blocked because criterion 2 never established a persisted invite." |
| 1:20–1:45 | Evidence | `report.html` criterion sections + screenshots | "Every PASS or FAIL ties to deterministic assertions and PNG captures. UNVERIFIABLE means prerequisite missing, not necessarily a product bug." |
| 1:45–2:10 | Replay | Terminal: `pnpm skeptic replay --run <id>` with fixed demo | "Replay executes the recorded Playwright steps with **zero model calls**. Same criteria, fixed persistence — three PASS." |
| 2:10–2:35 | Fixed product | `pnpm --filter demo-app dev:fixed` + verify | "Enabling the prepared fix flips readiness to READY. Skeptic did not edit code — it proved the claim." |
| 2:35–3:00 | Why agent + close | Architecture diagram | "Natural-language criteria change; labels move; prerequisites fail. A fixed script cannot adapt. Skeptic separates Eve (planning) from the harness (typed actions + oracle). Only deterministic evidence establishes PASS or FAIL." |

## Commands (copy/paste)

**Terminal 1 — demo app (broken):**

```bash
pnpm demo:dev
```

**Terminal 2 — broken verify:**

```bash
export PROOF_TEST_USERNAME=demo
export PROOF_TEST_PASSWORD=skeptic-demo
pnpm skeptic verify --config examples/demo-app/proof.config.ts --deterministic
```

**Inspect evidence (no server):**

```bash
open .proof/runs/<run-id>/report.html
```

**Terminal 1 — switch to fixed demo:**

```bash
pnpm --filter demo-app dev:fixed
```

**Terminal 2 — model-free replay:**

```bash
pnpm skeptic replay --run <run-id-from-broken-verify>
```

Expected replay output highlights:

- `"modelCalls": 0`
- `"verdicts": [{"verdict":"PASS"}, {"verdict":"PASS"}, {"verdict":"PASS"}]`
- `"readiness": "READY"`

## Expected visible outcomes

| Phase | C1 | C2 | C3 | Readiness |
| ----- | -- | -- | -- | --------- |
| Broken verify | PASS | FAIL | UNVERIFIABLE | NOT_READY |
| Replay on fixed app | PASS | PASS | PASS | READY |
| Fixed verify | PASS | PASS | PASS | READY |

## Fallback narration (offline)

If Bedrock or network fails during recording:

1. Open `submission/fallback/broken/report.html` — state clearly: **prerecorded broken run**.
2. Open `submission/fallback/fixed/report.html` — **prerecorded fixed run**.
3. Show `submission/fallback/replay-three-pass.json` — **replay summary, zero model calls**.

Never imply a static HTML file is executing live verification.
