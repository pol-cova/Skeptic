# Agent mode

Agent mode uses an **AI SDK tool loop** inside `skeptic verify --no-deterministic` to explore your application when browser flows are not fully scripted in `scenario.ts`. The Playwright harness still validates every action before execution, and the **deterministic oracle** decides verdicts from typed assertions — not from model confidence.

For interactive tool development, you can also run the **Eve** agent server from the Skeptic source repo (`pnpm dev`).

## When to use agent mode

| Use deterministic mode (`--deterministic`) | Use agent mode (`--no-deterministic`) |
| ------------------------------------------ | ------------------------------------- |
| CI gates and release checks                | Early exploration of new criteria     |
| Stable, repeatable flows                   | UI still changing frequently          |
| Zero LLM cost or latency                   | You have not finished `scenario.ts`   |
| Full audit trail from your script          | Discovering selectors and steps       |

**Recommendation:** start with agent mode to learn the UI, then codify flows in `scenario.ts` and switch to deterministic verification for CI.

## Running agent verification

Agent verification through the CLI (no `scenario.ts` replay — the agent explores live):

```bash
export SKEPTIC_PROVIDER=openrouter
export OPENROUTER_API_KEY=...

skeptic verify --no-deterministic
```

Config and credentials are auto-discovered when `proof.config.ts` exists in the working directory. Agent runs write evidence and verdicts to `.proof/runs/<run-id>/` but do **not** produce a replayable `scenario.ts` fixture — codify successful flows manually (or with `skeptic inspect`) then switch to `--deterministic` for CI.

Interactive development (Eve dev server with browser tools):

```bash
# From Skeptic repo root, after pnpm install
pnpm dev
```

Agent sessions respect `limits` in `proof.config.ts`:

| Limit                  | Default | Purpose                             |
| ---------------------- | ------- | ----------------------------------- |
| `maxSteps`             | 20      | Cap browser actions per criterion   |
| `maxDurationMs`        | 180000  | Wall-clock timeout per criterion    |
| `maxInferenceAttempts` | 10      | Model planning rounds per criterion |

## Model providers

Set `SKEPTIC_PROVIDER` and the provider's credential environment variable. Run `skeptic init --provider <id>` to validate setup.

| Provider            | Credential                                | Default model           |
| ------------------- | ----------------------------------------- | ----------------------- |
| `chatgpt`           | Local `codex login`                       | `gpt-5.6-sol`           |
| `openrouter`        | `OPENROUTER_API_KEY`                      | `openai/gpt-5.4-mini`   |
| `cerebras`          | `CEREBRAS_API_KEY`                        | `gpt-oss-120b`          |
| `bedrock`           | AWS bearer token or credential chain      | `amazon.nova-lite-v1:0` |
| `google-ai`         | `GOOGLE_GENERATIVE_AI_API_KEY`            | `gemini-2.0-flash-exp`  |
| `openai-compatible` | Configurable env var + `SKEPTIC_BASE_URL` | none                    |

Override the model:

```bash
export SKEPTIC_MODEL=anthropic/claude-sonnet-4.6  # provider-specific identifier
```

Full details: [ADR 0002: Model provider strategy](adr/0002-model-provider-strategy.md).

Google-specific setup: [GOOGLE-AI-INTEGRATION.md](GOOGLE-AI-INTEGRATION.md).

## Agent tool boundary

CLI agent mode exposes these tools to the model:

| Tool              | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `inspect`         | Read current page observation                   |
| `browserAction`   | One typed browser action                        |
| `assertion`       | One deterministic assertion                     |
| `captureEvidence` | Screenshot artifact for PASS eligibility        |
| `finish`          | Submit criterion to the oracle and end the loop |

The interactive Eve dev server uses the same tool boundary (`inspect`, `browser-action`, `assertion`, `evidence`, `finish`) with equivalent schemas.

There is no shell, arbitrary JavaScript, or unrestricted network access. Actions must match the same schemas as deterministic mode.

## Verdict semantics in agent mode

The model proposes steps and an advisory verdict. The oracle finalizes:

- `PASS` only when deterministic assertions pass **and** at least one artifact ref was persisted (see [README oracle section](../README.md#deterministic-oracle)).
- `FAIL` when assertions fail.
- `UNVERIFIABLE` when prerequisites are missing, no assertions were recorded, or the model proposed `PASS`/`FAIL` without satisfying oracle constraints.
- `HARNESS_ERROR` when Skeptic itself fails (provider error, harness fault, loop limits).

A model cannot mark a criterion `PASS` without supporting assertion evidence and a persisted artifact reference.

## Preflight

Before relying on a provider in production workflows, run contributor preflight checks (from the Skeptic source repo):

```bash
pnpm preflight:model
pnpm preflight:playwright
```

See [Preflight](preflight.md).

## Security

- Credentials stay in environment variables or local provider login stores.
- Skeptic does not host inference or store API keys in generated config.
- Logs name the credential **source**, never the value.

## Related

- [Scenarios](scenarios.md) — codify discovered flows for CI
- [Configuration](configuration.md) — `limits` and auth
- [Responsible use](responsible-use.md)
