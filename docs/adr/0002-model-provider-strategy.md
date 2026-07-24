# ADR 0002: Native subscription and BYOC model access

## Status

Accepted.

## Decision

Skeptic resolves every reasoning model to an AI SDK `LanguageModel`. The
verification loop, browser boundary, deterministic oracle, evidence, and replay
must not contain provider-specific behavior.

The default provider is `chatgpt`, using Eve's local Codex-login integration.
Developers can select `openrouter`, `cerebras`, `bedrock`, or
`openai-compatible` with `SKEPTIC_PROVIDER`.

| Provider | Credential source | Default model |
| --- | --- | --- |
| `chatgpt` | Existing `codex login` | `gpt-5.6-sol` |
| `openrouter` | `OPENROUTER_API_KEY` | `openai/gpt-5.4-mini` |
| `cerebras` | `CEREBRAS_API_KEY` | `gpt-oss-120b` |
| `bedrock` | Bedrock bearer token or AWS credential chain | `amazon.nova-lite-v1:0` |
| `openai-compatible` | Configurable environment variable | No default |

`SKEPTIC_MODEL` overrides a provider's default. OpenAI-compatible endpoints
also require `SKEPTIC_BASE_URL`; remote endpoints must use HTTPS.

The official hackathon demonstration and golden acceptance run use Bedrock.
Provider portability improves the public NPM developer experience without
changing the judged reference implementation.

## Security

- Secrets are read from the environment and never written to generated config.
- Logs may name the credential source but never print its value.
- Skeptic does not operate a shared inference proxy or distribute credentials.
- Provider setup fails before browser startup when required configuration is
  missing.

## Consequences

- Developers can reuse a ChatGPT subscription or bring existing model access.
- Provider-specific packages are runtime dependencies of the initial package.
- Provider capability differences require a preflight and shared eval suite.
- The local ChatGPT integration remains experimental upstream and must be
  documented as such.
