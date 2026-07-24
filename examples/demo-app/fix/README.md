# Prepared persistence fix

The demo ships with a seeded persistence defect for criterion 2. Applying this
fix enables durable invitations without changing the acceptance criteria.

## Apply the fix

From the repository root:

```bash
cp examples/demo-app/fix/.env.fixed examples/demo-app/.env.local
```

Or run the fixed dev server directly:

```bash
pnpm --filter demo-app dev:fixed
```

Restart the app after applying the fix.

## Verify

1. Sign in at `/login` with `demo` / `skeptic-demo`.
2. Invite `teammate@example.com` and confirm the pending row survives refresh.
3. Invite the same email again and confirm the duplicate error appears.

Reset state between runs:

```bash
pnpm --filter demo-app reset
```
