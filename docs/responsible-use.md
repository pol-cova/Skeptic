# Responsible use

Skeptic is a **verification judge**, not a builder. It evaluates acceptance criteria against a live application and returns evidence-backed verdicts. It does **not** modify your code, open pull requests, or apply fixes automatically.

## What Skeptic captures

Verification runs persist artifacts under `.proof/runs/<run-id>/`:

- **Screenshots** — may show UI state including emails, names, or credentials rendered on screen
- **Traces** — browser interaction archives
- **Network observations** — request method, path, and status (not full bodies by default)
- **Event logs** — typed harness and oracle events

Treat artifact directories like test output that may contain sensitive data. Do not commit `.proof/` to version control or share bundles without reviewing them first.

## Credentials and authorization

- Store credentials in **environment variables** or your provider's local login store (`codex login`, AWS profiles, API keys).
- Never commit secrets to the repository or embed them in config files.
- Run Skeptic only against applications and environments you are **authorized** to test.
- Do not point Skeptic at production systems with real user data unless your organization explicitly approves that workflow.

## Model access

Skeptic can use LLM providers for agent-driven exploration. **Deterministic verification** (`skeptic verify --deterministic`, the default) makes **zero model calls** and requires no model provider credentials.

When using model-backed verification:

- Provider credentials stay in environment variables
- Skeptic does not proxy or host inference on your behalf
- Kiro artifacts (`.kiro/`) document the build process; they are **not** runtime dependencies

## Limitations (P0)

Skeptic intentionally does **not**:

- Auto-repair failing code or create commits
- Execute arbitrary JavaScript in the target application
- Perform broad security scanning or penetration testing
- Support multi-origin navigation beyond the configured allow list
- Guarantee coverage of criteria it marks `UNVERIFIABLE` when prerequisites fail

## Verdict semantics

| Verdict         | Meaning                                              |
| --------------- | ---------------------------------------------------- |
| `PASS`          | Deterministic assertions prove the criterion         |
| `FAIL`          | Deterministic assertions disprove the criterion      |
| `UNVERIFIABLE`  | Prerequisite missing — not necessarily a product bug |
| `HARNESS_ERROR` | Skeptic failed — not a product verdict               |

Only deterministic harness assertions establish `PASS` or `FAIL`. Agent reasoning guides exploration; the oracle decides from typed evidence.

## Reporting issues safely

When filing bugs or sharing reports:

- Redact screenshots and logs before posting publicly
- Remove `.proof/` bundles from attachments unless reviewers need them
- Prefer `report.md` summaries over raw event logs for external sharing

See also [SECURITY.md](../SECURITY.md) and [ADR 0001](./adr/0001-public-contract.md).
