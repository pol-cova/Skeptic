# CLI reference

The `skeptic` binary is the primary interface for verification, replay, reporting, and project scaffolding.

```bash
npm install -g @pol-cova/skeptic
skeptic --help
```

## Commands

### `skeptic init`

Scaffold verification files in the current directory.

```bash
skeptic init
skeptic init --force
skeptic init --provider chatgpt
```

| Option | Description |
| --- | --- |
| `--force` | Overwrite existing `proof.config.ts`, `acceptance.md`, `scenario.ts` |
| `--provider <id>` | Validate agent provider credentials (`chatgpt`, `openrouter`, `cerebras`, `bedrock`, `google-ai`, `openai-compatible`) |

**Exit codes:** `0` success, `2` skipped files or invalid provider, `3` error.

Prints JSON with `created`, `skipped`, and `nextSteps`.

---

### `skeptic verify`

Run verification against a live application.

```bash
skeptic verify --config proof.config.ts
skeptic verify --config proof.config.ts --deterministic
skeptic verify --config proof.config.ts --no-deterministic
```

| Option | Default | Description |
| --- | --- | --- |
| `--config <path>` | required | Path to `proof.config.ts` |
| `--deterministic` | on | Replay `scenario.ts` with zero model calls |
| `--no-deterministic` | — | Enable Eve agent for exploratory verification |

**Stdout:** JSON summary with `runId`, `readiness`, `exitCode`, `verdicts`, `artifactRoot`, and optional `fixPromptPath`.

**Stderr:** Human-readable error prefix on failure (`Configuration error`, `Environment error`, `Harness error`).

**Exit codes:**

| Code | Readiness |
| ---: | --- |
| 0 | `READY` |
| 1 | `NOT_READY` |
| 2 | `INCOMPLETE` |
| 3 | `ERROR` |

When exit code is non-zero and criteria failed, Skeptic writes `fix-prompt.md` under the run directory.

---

### `skeptic replay`

Re-execute a prior run from saved artifacts without model calls.

```bash
skeptic replay --run verify-1712345678901
```

| Option | Description |
| --- | --- |
| `--run <run-id>` | Directory name under `.proof/runs/` |

**Stdout:** JSON with `runId`, `readiness`, `exitCode`, `modelCalls` (always 0), and `verdicts`.

Use replay after fixing selectors or application bugs to confirm the saved flow still produces the expected verdicts.

---

### `skeptic report`

Regenerate HTML and Markdown reports from a completed run.

```bash
skeptic report --run verify-1712345678901
skeptic report --run verify-1712345678901 --open
```

| Option | Description |
| --- | --- |
| `--run <run-id>` | Run directory under `.proof/runs/` |
| `--open` | Open HTML report in the default browser |

**Stdout:** JSON with `htmlPath` and `markdownPath`.

---

### `skeptic fix-prompt`

Generate or regenerate `fix-prompt.md` for a prior run.

```bash
skeptic fix-prompt --run verify-1712345678901
```

Use when you need a structured handoff for a coding agent after a failed verification. The prompt summarizes failing criteria, evidence paths, and suggested investigation steps — it does not modify your repository.

---

## Run artifacts

Each verify run creates `.proof/runs/<run-id>/`:

```text
.proof/runs/<run-id>/
├── metadata.json           # Run config, criteria, timestamps
├── events.jsonl            # Typed harness and oracle events
├── replay.json             # Full ReplayFixture for replay
├── generated/
│   └── acceptance.spec.ts  # Generated Playwright test
├── screenshots/            # Per-step captures
├── network/
│   └── observations.json   # Request method, path, status
├── report.html
├── report.md
└── fix-prompt.md           # Present when run is not READY
```

Treat `.proof/` as local test output. Do not commit it — it may contain screenshots with sensitive UI state. See [Responsible use](responsible-use.md).

## JSON output

All commands emit structured JSON on stdout for scripting:

```bash
skeptic verify --config proof.config.ts | jq .readiness
```

Parse `exitCode` from JSON or use the process exit code — they match for `verify` and `replay`.

## Global options

```bash
skeptic --version
skeptic --help
skeptic <command> --help
```

## Related

- [Getting started](getting-started.md)
- [CI and workflows](ci-and-workflows.md)
- [ADR 0001: Public contract](adr/0001-public-contract.md)
