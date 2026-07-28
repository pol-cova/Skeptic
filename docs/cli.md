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

Creates `proof.config.ts`, `acceptance.md`, `scenario.ts`, `skeptic-config.d.ts`, `tsconfig.json`, and `.gitignore` (including `.proof/`).

| Option | Description |
| --- | --- |
| `--force` | Overwrite existing scaffold files |
| `--provider <id>` | Validate agent provider credentials |

**Exit codes:** `0` success, `2` skipped files or invalid provider, `3` error.

---

### `skeptic validate`

Validate configuration, criteria, and scenario alignment **without** launching the browser.

```bash
skeptic validate
skeptic validate --config proof.config.ts
skeptic validate --check-app
skeptic validate --no-check-auth
```

| Option | Description |
| --- | --- |
| `--config <path>` | Path to `proof.config.ts` (auto-discovers `proof.config.ts` or `skeptic.config.ts`) |
| `--check-app` | Probe `app.readyPath` over the network |
| `--no-check-auth` | Skip credential environment variable checks |

**Exit codes:** `0` valid, `2` validation issues, `3` error.

Checks include: config schema, criteria numbering, scenario module load, criterion/scenario index alignment, assertions per criterion, duplicate `actionId`s within a criterion.

---

### `skeptic inspect`

Capture accessible elements from a live page to help author `scenario.ts` selectors.

```bash
skeptic inspect
skeptic inspect --url http://127.0.0.1:3000/login
skeptic inspect --headed
```

| Option | Description |
| --- | --- |
| `--config <path>` | Path to `proof.config.ts` (auto-discovered when omitted) |
| `--url <url>` | Page to inspect (defaults to `baseUrl` + `loginPath`) |
| `--headed` | Run browser in headed mode |

Starts or reuses the app from config, navigates to the URL, and returns a JSON page observation (roles, `testId`, names, values).

---

### `skeptic verify`

Run verification against a live application.

```bash
skeptic verify
skeptic verify --config proof.config.ts --deterministic
skeptic verify --headed
skeptic verify --compact-json
```

| Option | Default | Description |
| --- | --- | --- |
| `--config <path>` | auto-discover | Path to `proof.config.ts` |
| `--deterministic` | on | Replay `scenario.ts` with zero model calls |
| `--no-deterministic` | — | Reserved for agent verification |
| `--headed` | off | Run browser in headed mode |
| `--compact-json` | off | Emit minimal verdict JSON (index + verdict only) |

**Stdout:** JSON with `runId`, `readiness`, `exitCode`, `artifactRoot`, and `verdicts`. By default each verdict includes `explanation`, `assertionResults`, and `artifactRefs`.

**Errors:** Structured JSON on stdout (`{ ok: false, error: { category, message } }`) plus human-readable stderr.

---

### `skeptic replay`

Re-execute a prior run from saved artifacts without model calls. Starts the app from saved run metadata when available.

```bash
skeptic replay --latest
skeptic replay --run verify-1712345678901
skeptic replay --artifact-root ./downloaded-run
skeptic replay --headed
```

| Option | Description |
| --- | --- |
| `--run <run-id>` | Run ID under `.proof/runs/` |
| `--latest` | Replay the most recent run (default when `--run` omitted) |
| `--artifact-root <path>` | Path to a downloaded artifact directory |
| `--headed` | Run browser in headed mode |

Uses prerequisites and criteria from `metadata.json` when replaying.

---

### `skeptic report`

Regenerate HTML and Markdown reports for a prior run.

```bash
skeptic report --latest --open
skeptic report --run verify-1712345678901
skeptic report --artifact-root ./downloaded-run
```

| Option | Description |
| --- | --- |
| `--run <run-id>` | Run ID under `.proof/runs/` |
| `--latest` | Report the most recent run (default when `--run` omitted) |
| `--artifact-root <path>` | Path to a downloaded artifact directory |
| `--open` | Open HTML report in the default browser |

Reports link to `traces/trace.zip` when Playwright trace artifacts exist.

---

### `skeptic fix-prompt`

Generate or regenerate `fix-prompt.md` for a prior run.

```bash
skeptic fix-prompt --latest
skeptic fix-prompt --run verify-1712345678901
```

| Option | Description |
| --- | --- |
| `--run <run-id>` | Run ID under `.proof/runs/` |
| `--latest` | Use the most recent run (default when `--run` omitted) |
| `--artifact-root <path>` | Path to a downloaded artifact directory |

---

## Run artifacts

Each verify run creates `.proof/runs/<run-id>/`:

```text
.proof/runs/<run-id>/
├── metadata.json
├── events.jsonl
├── replay.json
├── generated/acceptance.spec.ts
├── screenshots/
├── traces/trace.zip
├── network/observations.json
├── report.html
├── report.md
└── fix-prompt.md
```

## Exit codes (verify and replay)

| Code | Readiness |
| ---: | --- |
| 0 | `READY` |
| 1 | `NOT_READY` |
| 2 | `INCOMPLETE` |
| 3 | `ERROR` |

## Related

- [Getting started](getting-started.md)
- [CI and workflows](ci-and-workflows.md)
- [ADR 0001: Public contract](adr/0001-public-contract.md)
