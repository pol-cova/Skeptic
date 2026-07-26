# ADR 0001: Freeze the public contract

## Status

Accepted.

## Decision

Every Skeptic surface uses these criterion verdicts:

| Verdict         | Meaning                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| `PASS`          | Deterministic evidence proves the criterion.                                     |
| `FAIL`          | Deterministic evidence disproves the criterion.                                  |
| `UNVERIFIABLE`  | A required product prerequisite is missing. This is not a product failure.       |
| `HARNESS_ERROR` | Skeptic could not complete reliable verification. This is not a product verdict. |

Run readiness is derived from verdicts with this precedence:

1. Any `HARNESS_ERROR` produces `ERROR`.
2. Otherwise, any `UNVERIFIABLE` produces `INCOMPLETE`.
3. Otherwise, any `FAIL` produces `NOT_READY`.
4. Otherwise, the run is `READY`.

| Readiness    | Exit code |
| ------------ | --------: |
| `READY`      |         0 |
| `NOT_READY`  |         1 |
| `INCOMPLETE` |         2 |
| `ERROR`      |         3 |

The TypeScript and JSON source of truth is
[`agent/lib/contracts.ts`](../../agent/lib/contracts.ts). CLI output, reports,
fixtures, and demo narration must import or reproduce these exact values without
aliases.

## Frozen names

- Commands: `skeptic verify --config`, `skeptic replay --run`, and
  `skeptic report --run`.
- Default config: `skeptic.config.ts`.
- Environment variables owned by Skeptic use the `SKEPTIC_` prefix. Provider
  credentials retain their provider-defined names.
- Run artifacts are written under `.proof/`.
- The source package is named `skeptic`. No public npm installation command is
  documented until the package name is reserved and a published artifact is
  verified.

## MVP boundary

P0 supports one Chromium browser, one authorized origin, and at most three
Markdown criteria per run. It includes bounded planning, typed actions,
deterministic assertions, retained evidence, replay, reports, and CLI workflows.

P0 excludes automatic repair or commits, arbitrary JavaScript execution,
multi-origin browsing, broad security scanning, production credentials, hosted
multi-tenant operation, and every optional P1 integration.

If Eve, the model provider, or Playwright cannot pass preflight, implementation
stops at the deterministic local fallback. Optional work never delays a P0 gate
or changes verdict semantics.
