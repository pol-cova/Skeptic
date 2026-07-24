# Day 0 preflight

This document records the toolchain checks required by issue #3. Preflight
artifacts are written under `.proof/preflight/` and are never committed.

## Runtime policy

| Component                  | Version or policy                                                               |
| -------------------------- | ------------------------------------------------------------------------------- |
| Node.js                    | `24.x` supported; `26.4.0` used for this local preflight with an engine warning |
| pnpm                       | `10.7.0`                                                                        |
| Eve                        | `0.27.1`                                                                        |
| Amazon Bedrock provider    | `@ai-sdk/amazon-bedrock@5.0.28`                                                 |
| Cerebras provider          | `@ai-sdk/cerebras@3.0.14`                                                       |
| OpenAI-compatible provider | `@ai-sdk/openai-compatible@3.0.14`                                              |
| OpenRouter provider        | `@openrouter/ai-sdk-provider@3.0.0`                                             |
| Playwright                 | `1.61.1`                                                                        |
| Chromium                   | Playwright revision 1228, Chrome `149.0.7827.55` on macOS arm64                 |

The committed `pnpm-lock.yaml` is authoritative. CI and fresh clones must use
`pnpm install --frozen-lockfile`. macOS arm64 is the current development host;
Linux CI must install Chromium with `pnpm exec playwright install --with-deps
chromium`.

## Checks

### Eve

```bash
pnpm preflight:eve
```

Eve must report a ready compile and zero diagnostics.

### Playwright

Install Chromium once, then run the smoke test:

```bash
pnpm exec playwright install chromium
pnpm preflight:playwright
```

The test serves a page on loopback, launches isolated headless Chromium,
asserts visible content, and writes `.proof/preflight/chromium.png`.

### Amazon Bedrock

Authenticate with `AWS_BEARER_TOKEN_BEDROCK` or the standard AWS credential
chain. Set `AWS_REGION` and optionally override the model:

```bash
export AWS_REGION=us-east-1
export SKEPTIC_MODEL=amazon.nova-lite-v1:0
pnpm preflight:bedrock
```

The check requests schema-valid structured output, allows two transient retries,
and prints no credentials. Agent integration must not begin until this live call
passes.

### Selected model provider

The default uses the developer's existing local ChatGPT subscription:

```bash
codex login
pnpm preflight:model
```

Select a BYOC provider with `SKEPTIC_PROVIDER` and its credential variable:

```bash
SKEPTIC_PROVIDER=openrouter OPENROUTER_API_KEY=... pnpm preflight:model
SKEPTIC_PROVIDER=cerebras CEREBRAS_API_KEY=... pnpm preflight:model
```

Bedrock remains the official hackathon demonstration provider. The generic
preflight prints provider and model identifiers but never credential values.

### Package fallback

The unscoped npm name `skeptic` belongs to an existing package. Until a package
scope is reserved, the supported fallback is a local installable tarball:

```bash
pnpm preflight:package
```

Do not document a public npm installation command until a published artifact is
verified.

## Current result

| Check                                      | Result                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Eve discovery/build                        | Pass                                                                    |
| Local ChatGPT subscription structured call | Pass with existing `codex login`                                        |
| BYOC configuration validation              | Pass for OpenRouter, Cerebras, Bedrock, and OpenAI-compatible endpoints |
| Chromium launch, local page, screenshot    | Pass                                                                    |
| Runtime and lockfile policy                | Pass                                                                    |
| Installable tarball fallback               | Pass                                                                    |
| Structured Bedrock call                    | Blocked: no AWS authentication is configured on the development host    |

The live Bedrock call is the only remaining exit gate for the official
hackathon provider path in issue #3.
