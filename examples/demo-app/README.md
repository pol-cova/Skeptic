# Reference example app

Internal Next.js application used for Skeptic integration tests and contributor development. It is **not** required to use Skeptic in your own project — run `skeptic init` against your application instead.

See [Getting started](../../docs/getting-started.md) for the user workflow.

## Run (contributors)

```bash
pnpm --filter demo-app dev
```

Default URL: `http://127.0.0.1:3100/login`

Set test credentials via `PROOF_TEST_USERNAME` and `PROOF_TEST_PASSWORD`.

## Verify (from repo root)

```bash
export PROOF_TEST_USERNAME=...
export PROOF_TEST_PASSWORD=...
pnpm skeptic verify --config examples/demo-app/proof.config.ts --deterministic
```

Acceptance criteria: [acceptance.md](./acceptance.md)

## Reset state

```bash
pnpm --filter demo-app reset
```

Requires the app running on port 3100.
