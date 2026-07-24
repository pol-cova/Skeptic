# Skeptic demo app

Reference Next.js application for the invite-teammate hackathon demo.

## Run

```bash
pnpm --filter demo-app dev
```

Open `http://127.0.0.1:3100/login` and sign in with:

- Username: `demo`
- Password: `skeptic-demo`

Override credentials with `PROOF_TEST_USERNAME` and `PROOF_TEST_PASSWORD`.

## Seeded bug (default)

By default the app shows a success toast for valid invitations but does not
persist them. After a page refresh, the pending list is empty again.

Expected Skeptic result on the broken build:

```text
Criterion 1: PASS
Criterion 2: FAIL
Criterion 3: UNVERIFIABLE
Overall: NOT READY
```

## Prepared fix

See [fix/README.md](./fix/README.md). The fix sets `DEMO_PERSIST_INVITATIONS=true`.

## Reset between runs

```bash
pnpm --filter demo-app reset
```

## Acceptance criteria

The canonical criteria live in [acceptance.md](./acceptance.md).
