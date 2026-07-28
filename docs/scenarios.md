# Scenarios

A scenario is a typed, replayable description of browser interactions and assertions. Skeptic loads it from the module specified in `proof.config.ts` (`scenario.module`, default `./scenario.ts`).

## Structure

Export a single builder function:

```typescript
import type { ScenarioBuildContext } from "@skeptic/core";
import type { ReplayFixture } from "@skeptic/playwright-harness";

export function buildScenario(ctx: ScenarioBuildContext): ReplayFixture {
  return {
    version: 1,
    baseUrl: ctx.baseUrl,
    allowedOrigins: [...ctx.allowedOrigins],
    generatedAt: Date.now(),
    criteria: [
      {
        criterionIndex: 1,
        sourceText: "…criterion text from acceptance.md…",
        steps: [
          /* BrowserAction[] */
        ],
      },
    ],
  };
}
```

### `ScenarioBuildContext`

| Field            | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `baseUrl`        | From `proof.config.ts`                                  |
| `allowedOrigins` | From `proof.config.ts`                                  |
| `username`       | Resolved from `auth.usernameEnv`                        |
| `password`       | Resolved from `auth.passwordEnv`                        |
| `loginPath`      | From `auth.loginPath`                                   |
| `runId`          | Unique id for this verification run                     |
| `variables`      | Optional run-scoped values (e.g. generated test emails) |

Use `runId` or `variables` for unique test data (emails, slugs) to avoid collisions across runs.

## Browser actions

Each step is a discriminated union on `type`. Every action requires a unique `actionId` string for evidence and replay.

### `goto`

Navigate to a URL (must match `allowedOrigins`).

```typescript
{ actionId: "open-login", type: "goto", url: `${ctx.baseUrl}${ctx.loginPath}` }
```

### `click`

```typescript
{
  actionId: "submit-login",
  type: "click",
  target: { testId: "login-submit" },
}
```

### `fill`

```typescript
{
  actionId: "fill-username",
  type: "fill",
  target: { testId: "username" },
  value: ctx.username,
}
```

### `select`

Choose an option on a `<select>` element.

```typescript
{
  actionId: "pick-role",
  type: "select",
  target: { label: "Role" },
  value: "admin",
}
```

### `press`

Keyboard key (optional target for focus).

```typescript
{ actionId: "submit-enter", type: "press", key: "Enter", target: { testId: "search" } }
```

### `waitFor`

Wait for an element (optional timeout).

```typescript
{
  actionId: "wait-dashboard",
  type: "waitFor",
  target: { testId: "dashboard" },
  timeoutMs: 10_000,
}
```

### `assert`

Run a deterministic assertion (see below). Assertions drive the oracle verdict.

```typescript
{
  actionId: "assert-dashboard-visible",
  type: "assert",
  assertion: { type: "visible", target: { testId: "dashboard" } },
}
```

## Element targets

At least one locator field is required:

| Field         | Resolves via                  |
| ------------- | ----------------------------- |
| `testId`      | `[data-testid="…"]`           |
| `role`        | ARIA role (+ optional `name`) |
| `name`        | Accessible name               |
| `label`       | Associated label text         |
| `placeholder` | Placeholder attribute         |
| `text`        | Visible text content          |

**Recommendation:** use `data-testid` for flows under verification — stable across copy and styling changes.

```tsx
<button data-testid="invite-submit">Send invite</button>
```

## Assertions

| Type       | Fields                     | Checks                              |
| ---------- | -------------------------- | ----------------------------------- |
| `visible`  | `target`                   | Element is visible                  |
| `hidden`   | `target`                   | Element is not visible              |
| `text`     | `target`, `expected`       | Element text equals expected string |
| `count`    | `target`, `expected`       | Number of matching elements         |
| `url`      | `expected`                 | Current page URL                    |
| `response` | `method`, `path`, `status` | Matching network request observed   |

Example — API-backed criterion:

```typescript
{
  actionId: "assert-create-201",
  type: "assert",
  assertion: {
    type: "response",
    method: "POST",
    path: "/api/invitations",
    status: 201,
  },
}
```

End each criterion's `steps` with at least one assertion that proves or disproves the acceptance statement.

## Full criterion example

```typescript
{
  criterionIndex: 2,
  sourceText:
    "Invalid credentials show an error message and keep the user on the login page.",
  steps: [
    { actionId: "goto-login", type: "goto", url: loginUrl },
    {
      actionId: "fill-user",
      type: "fill",
      target: { testId: "username" },
      value: ctx.username,
    },
    {
      actionId: "fill-bad-pass",
      type: "fill",
      target: { testId: "password" },
      value: "intentionally-wrong",
    },
    {
      actionId: "click-submit",
      type: "click",
      target: { testId: "login-submit" },
    },
    {
      actionId: "assert-error",
      type: "assert",
      assertion: { type: "visible", target: { testId: "login-error" } },
    },
    {
      actionId: "assert-still-login",
      type: "assert",
      assertion: { type: "url", expected: loginUrl },
    },
  ],
}
```

## Generated artifacts

After `skeptic verify`, Skeptic writes:

- `.proof/runs/<run-id>/replay.json` — full fixture for replay
- `.proof/runs/<run-id>/generated/acceptance.spec.ts` — standalone Playwright spec

Use these for debugging selectors or importing into your existing test suite.

## Origin guard

The harness rejects navigation and actions outside `allowedOrigins`. If a step needs a different host or port, add it to `proof.config.ts` before adding the `goto` step.

## Agent vs deterministic mode

| Mode                        | Who produces steps                                                   |
| --------------------------- | -------------------------------------------------------------------- |
| `--deterministic` (default) | Your `scenario.ts` only                                              |
| `--no-deterministic`        | Eve agent proposes actions; harness validates types before execution |

Deterministic mode never calls an LLM. Prefer scripting flows in `scenario.ts` for CI reliability.

## Related

- [Configuration](configuration.md) — `scenario.module`, `prerequisites`, `limits`
- [CLI reference](cli.md) — replay and generated specs
- [Agent mode](agent.md) — when to use exploratory verification
