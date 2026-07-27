# Hackathon submission narrative

## Innovation

Skeptic treats AI-generated software claims as **hypotheses to falsify**, not tasks to complete. Where coding agents optimize for "done," Skeptic optimizes for **evidence**: typed browser actions, deterministic assertions, and replayable Playwright tests that survive without the original model session.

The reference demo exposes a classic agent blind spot: a success toast with **no persisted state**. Skeptic catches the contradiction with assertion-backed FAIL verdicts instead of trusting UI copy.

## Impact

- **For builders:** Markdown acceptance criteria become executable verification contracts.
- **For reviewers:** Static HTML/Markdown reports bundle criterion text, verdict guidance, assertions, screenshots, and timelines — shareable without Skeptic installed.
- **For CI:** Deterministic `--verify` mode runs with zero model calls for gates and regression checks.

## Why a specialized agent (not a skill or script)

| Need                                    | Script | Prompt skill         | Skeptic agent |
| --------------------------------------- | ------ | -------------------- | ------------- |
| Interpret natural-language criteria     | ❌     | ⚠️ non-deterministic | ✅            |
| Adapt when elements move or flows block | ❌     | ⚠️                   | ✅            |
| Deterministic PASS/FAIL from evidence   | ✅     | ❌                   | ✅ (oracle)   |
| Replay without model                    | ✅     | ❌                   | ✅            |
| Explain attempts and prerequisites      | ❌     | ⚠️                   | ✅            |

## Implementation quality

- **Frozen public contract:** four verdicts, four readiness states, stable CLI (`verify`, `replay`, `report`).
- **Separation of concerns:** Eve plans; Playwright harness validates actions and captures evidence; oracle assigns verdicts only from assertions.
- **Provider flexibility:** Codex login, Google AI, OpenRouter, Cerebras, Bedrock — credentials stay local; no hosted inference proxy.
- **Kiro artifacts:** `.kiro/` documents spec-driven development; no runtime package imports Kiro files.

## Evidence pointers

- Broken/fixed screenshots: [assets/report-broken.png](./assets/report-broken.png), [assets/report-fixed.png](./assets/report-fixed.png)
- Architecture: [assets/architecture.svg](./assets/architecture.svg)
- Offline bundle: [fallback/](./fallback/)
- Fresh-clone + three-run evidence: [evidence/submission-evidence.json](./evidence/submission-evidence.json)
