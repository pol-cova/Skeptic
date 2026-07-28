# Configuration

Skeptic is driven by `proof.config.ts` at the root of your verification project (or any path you pass to `--config`).

## Minimal example

```typescript
import { defineProofConfig } from "@skeptic/core";

export default defineProofConfig({
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
    maxSteps: 25,
    maxDurationMs: 180_000,
    maxInferenceAttempts: 10,
  },
});
```

Copy the template from [proof.config.template.ts](proof.config.template.ts) or run `skeptic init`.

## `app`

Controls how Skeptic reaches your application.

| Field            | Type       | Required | Description                                                 |
| ---------------- | ---------- | -------- | ----------------------------------------------------------- |
| `baseUrl`        | URL string | yes      | Origin of the app under test (e.g. `http://127.0.0.1:3000`) |
| `startCommand`   | string     | yes      | Shell command to start the app when not already running     |
| `readyPath`      | string     | yes      | Path (starting with `/`) polled until HTTP 200              |
| `allowedOrigins` | URL[]      | yes      | Origins the browser may navigate to (1–5 entries)           |

### App lifecycle

1. Skeptic requests `baseUrl` + `readyPath`.
2. If the endpoint responds, the existing process is reused.
3. Otherwise Skeptic runs `startCommand` in the config directory and polls every second for up to 90 seconds.
4. After verification completes, Skeptic stops only the process it started — not a server you already had running.

**Tips:**

- Expose a lightweight health route (`/health`, `/api/health`) that returns 200 when the app is ready.
- Match `baseUrl` exactly to how you run locally (scheme, host, port).
- List every origin your scenario navigates to in `allowedOrigins`. Cross-origin navigation outside this list is blocked.

## `criteria`

| Field         | Type    | Required | Description                                                 |
| ------------- | ------- | -------- | ----------------------------------------------------------- |
| `file`        | string  | yes      | Path to Markdown criteria, relative to the config directory |
| `maxCriteria` | integer | yes      | Maximum criteria to load (1–10)                             |

See [Acceptance criteria](acceptance-criteria.md).

## `auth`

Required for deterministic verification. Credentials are read from the environment at runtime — never stored in config files.

| Field         | Type   | Required | Description                                                       |
| ------------- | ------ | -------- | ----------------------------------------------------------------- |
| `loginPath`   | string | yes      | Login page path (starts with `/`)                                 |
| `usernameEnv` | string | yes      | Env var name for username (uppercase, e.g. `PROOF_TEST_USERNAME`) |
| `passwordEnv` | string | yes      | Env var name for password                                         |

`buildScenario()` receives resolved `username` and `password` values through `ScenarioBuildContext`.

## `scenario`

| Field    | Type   | Required | Description                                                |
| -------- | ------ | -------- | ---------------------------------------------------------- |
| `module` | string | yes      | Path to `scenario.ts` (or `.js`) exporting `buildScenario` |

The module path resolves relative to the directory containing `proof.config.ts`.

## `prerequisites`

Optional map of criterion index → array of indices that must `PASS` first.

```typescript
prerequisites: {
  "3": [2], // criterion 3 runs only after criterion 2 passes
},
```

If a prerequisite fails or is `UNVERIFIABLE`, dependent criteria are marked `UNVERIFIABLE` without re-running their steps.

## `limits`

Bounds agent-mode exploration. Ignored for pure deterministic replay unless shared with agent tooling.

| Field                  | Default | Description                                 |
| ---------------------- | ------- | ------------------------------------------- |
| `maxSteps`             | 25      | Maximum browser actions per criterion       |
| `maxDurationMs`        | 180000  | Wall-clock cap per criterion (ms)           |
| `maxInferenceAttempts` | 10      | Maximum model planning rounds per criterion |

## `defineProofConfig`

Use `defineProofConfig()` for TypeScript inference and compile-time validation. At runtime, Skeptic validates the loaded object with the same schema as the Zod definitions in `@skeptic/core`.

Configuration errors print field paths (e.g. `app.baseUrl: app.baseUrl must be a valid URL.`).

## Environment variables

| Variable              | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `PROOF_TEST_USERNAME` | Default scaffold username (rename via `auth.usernameEnv`) |
| `PROOF_TEST_PASSWORD` | Default scaffold password (rename via `auth.passwordEnv`) |
| `SKEPTIC_PROVIDER`    | Agent provider id (see [Agent mode](agent.md))            |
| `SKEPTIC_MODEL`       | Override default model for the selected provider          |

Provider-specific keys (`OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, etc.) are documented in [ADR 0002](adr/0002-model-provider-strategy.md).

## Config file location

Pass an explicit path:

```bash
skeptic verify --config path/to/proof.config.ts
```

Criteria, scenario module, and `startCommand` resolve relative to the **directory of the config file**, not necessarily your shell cwd.

## Related

- [Scenarios](scenarios.md) — implement `buildScenario()`
- [CLI reference](cli.md) — verify and artifact paths
- [ADR 0001](adr/0001-public-contract.md) — verdict semantics
