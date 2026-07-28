# CI and workflows

Skeptic is designed for deterministic CI gates: zero model calls, stable exit codes, and artifact bundles you can archive or attach to pull requests.

## Recommended CI pattern

```yaml
name: Verify

on:
  pull_request:
  push:
    branches: [main]

jobs:
  skeptic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.7.0

      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium

      - name: Verify acceptance criteria
        env:
          PROOF_TEST_USERNAME: ${{ secrets.PROOF_TEST_USERNAME }}
          PROOF_TEST_PASSWORD: ${{ secrets.PROOF_TEST_PASSWORD }}
        run: |
          skeptic verify --config proof.config.ts --deterministic

      - name: Upload verification artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: skeptic-proof
          path: .proof/runs/
          retention-days: 14
```

### CI checklist

1. **Install Chromium** — `npx playwright install --with-deps chromium` on Linux runners.
2. **Store credentials in secrets** — never inline test passwords in workflow YAML.
3. **Use `--deterministic`** — no LLM provider keys required in CI.
4. **Start the app** — either let Skeptic run `startCommand` from config, or start your server in a prior step and ensure `readyPath` responds before verify.
5. **Archive `.proof/runs/`** — especially on failure, for debugging selectors and assertions.

## Exit code gates

Fail the job when Skeptic exits non-zero:

| Exit | Readiness    | CI interpretation                                       |
| ---: | ------------ | ------------------------------------------------------- |
|    0 | `READY`      | Ship criteria met                                       |
|    1 | `NOT_READY`  | Product regression — block merge                        |
|    2 | `INCOMPLETE` | Missing prerequisites or blocked flows — investigate    |
|    3 | `ERROR`      | Misconfiguration or harness failure — fix tooling first |

Treat exit `2` differently from `1` in policy if you use prerequisites heavily: `INCOMPLETE` may mean incomplete test data, not a broken feature.

## Local pre-merge workflow

```bash
export PROOF_TEST_USERNAME=...
export PROOF_TEST_PASSWORD=...

skeptic verify --config proof.config.ts --deterministic
# exit 0 → merge; non-zero → inspect report

skeptic report --run "$(ls -t .proof/runs | head -1)" --open
```

## Fix prompts for coding agents

When verification fails, Skeptic writes `.proof/runs/<run-id>/fix-prompt.md`. Regenerate anytime:

```bash
skeptic fix-prompt --run verify-1712345678901
```

Typical agent loop:

1. Run `skeptic verify` locally or in CI.
2. On `NOT_READY`, open or paste `fix-prompt.md` into your coding agent.
3. Agent implements fixes (Skeptic does not commit or patch code).
4. Re-run `skeptic verify` until `READY`.

The fix prompt references assertion failures, screenshot paths, and criterion text — not model speculation.

## Replay in CI

After a failed run, replay the exact saved fixture without restarting exploration:

```bash
skeptic replay --run verify-1712345678901
```

Replay is useful in a dedicated "confirm fix" job once selectors are stable. It reads `replay.json` from the artifact directory and makes zero model calls.

## Pull request comments

Parse verify JSON in a workflow step:

```bash
RESULT=$(skeptic verify --config proof.config.ts --deterministic)
echo "$RESULT" | jq -r '.verdicts[] | "C\(.criterionIndex): \(.verdict)"'
```

Attach `report.md` or link to uploaded artifacts for reviewers.

## Monorepo layout

Common patterns:

```
apps/web/                 # your application
proof/                    # verification project
  proof.config.ts
  acceptance.md
  scenario.ts
```

Run from the proof directory or pass an absolute config path:

```bash
skeptic verify --config proof/proof.config.ts
```

Set `startCommand` to start the app from the correct workspace (e.g. `pnpm --filter web dev`).

## Staging vs production

Run Skeptic against environments you are authorized to test. Prefer dedicated test accounts on staging or ephemeral preview deployments. See [Responsible use](responsible-use.md).

## npm package in CI

Install globally or as a dev dependency:

```bash
npm install -D @pol-cova/skeptic
npx skeptic verify --config proof.config.ts --deterministic
```

Pin the package version in `package.json` for reproducible CI.

## Related

- [CLI reference](cli.md)
- [Configuration](configuration.md)
- [Getting started](getting-started.md)
