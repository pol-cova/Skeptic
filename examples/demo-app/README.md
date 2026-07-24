# Demo app

Reference Next.js app for the invite-teammate verification demo.

## Run

```bash
pnpm --filter demo-app dev
```

Sign in at `http://127.0.0.1:3100/login` with `demo` / `skeptic-demo`.

Override credentials with `PROOF_TEST_USERNAME` and `PROOF_TEST_PASSWORD`.

## Modes

Default behavior seeds a persistence bug: a valid invite shows a success toast, but the pending list is empty after refresh.

Enable the prepared fix:

```bash
pnpm --filter demo-app dev:fixed
```

Or copy `fix/.env.fixed` to `.env.local`.

## Reset

```bash
pnpm --filter demo-app reset
```

The app must be running on port 3100.

Acceptance criteria: [acceptance.md](./acceptance.md)
