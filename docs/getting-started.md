# Getting started

This guide walks you from installation to a passing verification run against your own web application.

## Prerequisites

- **Node.js 24+**
- A web app you are authorized to test (local dev server or staging)
- Test credentials with access to the flows you want to verify
- **Chromium** for Playwright: `npx playwright install chromium`

## Install Skeptic

```bash
npm install -g @pol-cova/skeptic@0.2.0
```

Verify the CLI:

```bash
skeptic --help
```

## Scaffold your project

From your application root (or a dedicated verification directory):

```bash
skeptic init
```

This creates verification project files:

| File                  | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `proof.config.ts`     | App URL, criteria file, scenario module, limits  |
| `acceptance.md`       | Numbered criteria in plain language              |
| `scenario.ts`         | Typed browser steps and assertions per criterion |
| `skeptic-config.d.ts` | Local TypeScript types (no npm package required) |
| `tsconfig.json`       | Typecheck support for config and scenario        |
| `.gitignore`          | Ignores `.proof/` run artifacts                  |

If files already exist, use `skeptic init --force` to overwrite them.

Optional: validate agent provider credentials during init:

```bash
skeptic init --provider chatgpt
# or: openrouter, cerebras, bedrock, google-ai, openai-compatible
```

Provider validation is only required for agent mode. Deterministic verification does not call a model.

## Configure your application

### 1. Point `proof.config.ts` at your app

Edit the scaffolded config to match your stack:

```typescript
import type { ProofConfig } from "./skeptic-config.d.ts";

export default {
  app: {
    baseUrl: "http://127.0.0.1:3000",
    startCommand: "npm run dev",
    readyPath: "/health",
    allowedOrigins: ["http://127.0.0.1:3000"],
  },
  criteria: {
    file: "acceptance.md",
    maxCriteria: 5,
  },
  auth: {
    loginPath: "/login",
    usernameEnv: "PROOF_TEST_USERNAME",
    passwordEnv: "PROOF_TEST_PASSWORD",
  },
  scenario: {
    module: "./scenario.ts",
  },
  prerequisites: {},
  limits: {
    maxSteps: 20,
    maxDurationMs: 180_000,
    maxInferenceAttempts: 10,
  },
} satisfies ProofConfig;
```

Monorepo contributors can use `defineProofConfig()` from `@skeptic/core` instead of `satisfies ProofConfig`.

**App lifecycle:** On `skeptic verify`, Skeptic checks whether `baseUrl` + `readyPath` already responds. If not, it runs `startCommand` and waits up to 90 seconds for the ready endpoint. If your app is already running, Skeptic reuses it.

**Origin guard:** Browser navigation is restricted to URLs listed in `allowedOrigins`. Add every origin your flows need (including alternate ports if applicable).

See [Configuration](configuration.md) for every field.

### 2. Add stable selectors to your UI

Skeptic targets elements through typed locators (`testId`, `role`, `name`, `label`, etc.). Prefer `data-testid` attributes for critical flows:

```tsx
<input data-testid="username" ... />
<button data-testid="login-submit">Sign in</button>
<div data-testid="dashboard">...</div>
```

Update `scenario.ts` so targets match your markup. The scaffold uses `testId` locators you can rename in one place.

### 3. Write acceptance criteria

Edit `acceptance.md` with numbered criteria — one verifiable statement per line:

```markdown
# Acceptance criteria

1. A signed-in user can reach the main dashboard after submitting valid credentials.
2. Invalid credentials show an error message and keep the user on the login page.
```

Rules:

- Use ordered list numbers `1.`, `2.`, … — these map to `criterionIndex` in `scenario.ts`.
- Keep each criterion falsifiable (something Skeptic can prove or disprove in the browser).
- Stay within `criteria.maxCriteria` (default 5, maximum 10).

See [Acceptance criteria](acceptance-criteria.md).

### 4. Implement `scenario.ts`

Export `buildScenario(context)` returning a `ReplayFixture` with steps per criterion:

```typescript
import type {
  ReplayFixture,
  ScenarioBuildContext,
} from "./skeptic-config.d.ts";

export function buildScenario(ctx: ScenarioBuildContext): ReplayFixture {
  // return { version: 1, baseUrl, allowedOrigins, generatedAt, criteria: [...] }
}
```

Each criterion entry needs:

- `criterionIndex` — matches the number in `acceptance.md`
- `sourceText` — copy of the criterion text
- `steps` — ordered `goto`, `click`, `fill`, `assert`, etc.

See [Scenarios](scenarios.md) for the full action and assertion reference.

## Set credentials

Never commit secrets. Export env vars referenced in `proof.config.ts`:

```bash
export PROOF_TEST_USERNAME=your-test-user
export PROOF_TEST_PASSWORD=your-test-password
```

Use dedicated test accounts in local or staging environments only.

## Validate before verify

Catch config/criteria/scenario mismatches without launching the browser:

```bash
skeptic validate
skeptic validate --check-app   # optional: probe readyPath
```

## Run verification

```bash
skeptic verify --deterministic
```

The CLI prints JSON summary:

```json
{
  "runId": "verify-1712345678901",
  "readiness": "READY",
  "exitCode": 0,
  "verdicts": [
    { "criterionIndex": 1, "verdict": "PASS" },
    { "criterionIndex": 2, "verdict": "PASS" }
  ],
  "artifactRoot": ".proof/runs/verify-1712345678901"
}
```

### Exit codes

| Code | Readiness    | Meaning                             |
| ---: | ------------ | ----------------------------------- |
|    0 | `READY`      | All criteria passed                 |
|    1 | `NOT_READY`  | At least one criterion failed       |
|    2 | `INCOMPLETE` | At least one criterion unverifiable |
|    3 | `ERROR`      | Harness or configuration error      |

## Inspect results

```bash
skeptic report --latest --open
```

Open `.proof/runs/<run-id>/report.html` for per-criterion evidence: assertions, screenshots, traces, and network observations.

When verification fails:

```bash
skeptic fix-prompt --latest
```

Read `.proof/runs/<run-id>/fix-prompt.md` and attach it to your coding agent. Skeptic records what failed and why; it does not patch your code.

## Discover selectors

```bash
skeptic inspect --url http://127.0.0.1:3000/login
```

Returns accessible elements (`testId`, roles, names) to help author `scenario.ts`.

## Replay without re-running the agent

```bash
skeptic replay --latest
```

Replay executes the saved `replay.json` with zero model calls — useful for confirming fixes or debugging flaky selectors.

## Next steps

- Add criteria and matching scenario blocks as your product grows.
- Wire `skeptic verify` into CI — [CI and workflows](ci-and-workflows.md).
- Use agent mode when flows are not fully scripted — [Agent mode](agent.md).
- Review [Responsible use](responsible-use.md) before testing shared or staging environments.

## Troubleshooting

| Symptom                           | Likely cause                        | Fix                                                     |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `skeptic validate` errors         | Criteria/scenario misalignment      | Fix indices, assertions, or duplicate `actionId`s       |
| `Environment error` on verify     | Missing `PROOF_TEST_*` vars         | Export credentials                                      |
| `App failed to start`             | Wrong `startCommand` or `readyPath` | Fix config; ensure `/health` (or your path) returns 200 |
| `HARNESS_ERROR` / origin blocked  | Navigation outside `allowedOrigins` | Add origin to config                                    |
| `UNVERIFIABLE` on criterion N     | Prerequisite criterion did not pass | Fix earlier criteria or set `prerequisites`             |
| Assertion timeout                 | Wrong `testId` or selector          | Align `scenario.ts` with your DOM                       |
| `Configuration error` on scenario | Invalid module path                 | Check `scenario.module` relative to config directory    |

For contributor toolchain checks, see [Preflight](preflight.md).
