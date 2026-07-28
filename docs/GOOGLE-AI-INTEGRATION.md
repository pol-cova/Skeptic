# Google AI (Gemini) Integration for Skeptic

**Status**: ✅ Tested and Working  
**Author**: Community Contribution  
**Date**: July 25, 2026  
**Related**: [ADR 0002 - Model Provider Strategy](./adr/0002-model-provider-strategy.md)

## Overview

This document describes how to use Google AI (Gemini) models with Skeptic. Two integration options are available:

1. **Native Provider (Recommended)**: Direct integration using `@ai-sdk/google`
2. **OpenAI-Compatible Provider**: Generic integration via OpenAI-compatible endpoint

Both options are fully supported. The native provider is recommended for new projects due to simpler configuration and better error messages.

## Native Provider Option (Recommended)

Starting with the native provider support, Skeptic offers first-class integration with Google AI using `@ai-sdk/google`.

### Benefits Over OpenAI-Compatible

| Aspect            | Native (`google-ai`)   | OpenAI-Compatible    |
| ----------------- | ---------------------- | -------------------- |
| Config complexity | Low (2 variables)      | Medium (4 variables) |
| Error messages    | Excellent (native SDK) | Good (generic)       |
| Features          | Native Gemini features | OpenAI subset only   |
| Setup             | Direct integration     | Compatibility layer  |
| Default model     | Provided automatically | Must specify         |

### Setup Instructions

#### 1. Get Google AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

#### 2. Configure Environment Variables

Create or update `.env` in the project root:

```bash
# Native Google AI Configuration (Recommended)
SKEPTIC_PROVIDER=google-ai
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Optional: Override default model
# SKEPTIC_MODEL=gemini-1.5-flash
```

**Required Variables**:

- `SKEPTIC_PROVIDER=google-ai` - Selects the native provider
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your API key from Google AI Studio

**Optional Variables**:

- `SKEPTIC_MODEL` - Defaults to `gemini-2.0-flash-exp` if not specified

#### 3. Verify Configuration

Run the native Google AI preflight check:

```bash
pnpm preflight:google-ai-native
```

Expected output:

```text
🧪 Testing native Google AI provider...

📋 Configuration:
   Provider: google-ai
   Model: gemini-2.0-flash-exp
   Credential source: GOOGLE_GENERATIVE_AI_API_KEY

🚀 Sending test prompt with structured output...

✅ Success! Native Google AI provider is working.

📊 Response:
{
  "status": "ok",
  "summary": "...",
  "provider": "Google AI Native"
}
```

### Available Models (Native Provider)

Recommended models for Skeptic:

| Model                  | Description                | Use Case                    |
| ---------------------- | -------------------------- | --------------------------- |
| `gemini-2.0-flash-exp` | Latest experimental (fast) | **Default for native**      |
| `gemini-1.5-flash`     | Stable, production-ready   | **Recommended for Skeptic** |
| `gemini-1.5-pro`       | More capable, longer ctx   | Complex acceptance criteria |

### Migration from OpenAI-Compatible to Native

If you're currently using the `openai-compatible` provider for Google AI, migration is straightforward:

**Before (OpenAI-Compatible)**:

```bash
SKEPTIC_PROVIDER=openai-compatible
SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
SKEPTIC_API_KEY=your_api_key_here
SKEPTIC_MODEL=gemini-1.5-flash
```

**After (Native)**:

```bash
SKEPTIC_PROVIDER=google-ai
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
# SKEPTIC_MODEL is optional - defaults to gemini-2.0-flash-exp
```

**Benefits of Migration**:

- 2 environment variables instead of 4
- No need to specify base URL
- Better error messages from native SDK
- Access to Gemini-specific features
- Simpler troubleshooting

**Note**: Both configurations remain supported for backward compatibility.

## OpenAI-Compatible Provider Option

This is the original integration method and remains fully supported for backward compatibility.

### Benefits

- **Cost-effective**: Google AI offers generous free tier
- **Easy setup**: No AWS configuration required
- **Fast inference**: Gemini 1.5 Flash provides quick responses
- **Accessible**: API keys available at [Google AI Studio](https://aistudio.google.com/apikey)

### Configuration

### 1. Get Google AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Configure Environment Variables

Create or update `.env` in the project root:

```bash
SKEPTIC_PROVIDER=openai-compatible
SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
SKEPTIC_MODEL=gemini-1.5-flash
SKEPTIC_API_KEY=your_google_ai_api_key_here
```

**Important**: The trailing slash `/` in `SKEPTIC_BASE_URL` is required.

### 3. Verify Configuration

Run the Google AI preflight check:

```bash
pnpm preflight:google-ai
```

Expected output:

```
✅ Loaded configuration from .env file
🧪 Testing Google AI (Gemini) via openai-compatible provider...
📋 Configuration:
   Provider: openai-compatible
   Model: gemini-1.5-flash
   Credential source: SKEPTIC_API_KEY
🚀 Sending test prompt...
✅ Success! Google AI is working with Skeptic.
```

## Available Models (OpenAI-Compatible)

Recommended models for Skeptic (as of July 2026):

| Model              | Description                  | Use Case                    |
| ------------------ | ---------------------------- | --------------------------- |
| `gemini-1.5-flash` | Fast, efficient, stable      | **Recommended for Skeptic** |
| `gemini-1.5-pro`   | More capable, longer context | Complex acceptance criteria |
| `gemini-3.6-flash` | Latest generation            | Experimental features       |

To list all available models with your API key:

```bash
node scripts/preflight/list-google-models.ts
```

**Note**: For native provider users, see the "Available Models (Native Provider)" section above.

## Integration Architecture

### Native Provider

Skeptic uses the native Google AI integration from `@ai-sdk/google`:

```text
Skeptic → AI SDK → @ai-sdk/google → Google AI API (direct)
```

Benefits:

- Direct API communication
- Native error messages
- Access to all Gemini features
- No compatibility layer

### OpenAI-Compatible Provider

Skeptic uses the OpenAI-compatible provider from `@ai-sdk/openai-compatible`:

```text
Skeptic → AI SDK → OpenAI-Compatible Provider → Google AI API (compatibility layer)
```

The provider abstraction handles:

- Request translation (OpenAI format → Google AI format)
- Response mapping
- Streaming support
- Error handling

## Troubleshooting

### Native Provider Issues

#### Error: "Missing GOOGLE_GENERATIVE_AI_API_KEY"

**Solution**: Ensure `.env` file contains:

```bash
SKEPTIC_PROVIDER=google-ai
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

#### Error: "Unsupported SKEPTIC_PROVIDER"

**Solution**: Check for typos. Must be exactly `google-ai` (not `google` or `googleai`).

#### Error: 401 or 403 from Google AI

**Solution**: API key is invalid or expired. Generate a new key at [Google AI Studio](https://aistudio.google.com/apikey).

#### Native preflight fails with network error

**Solution**:

1. Verify API key is valid
2. Check network connectivity
3. Ensure no proxy is blocking `generativelanguage.googleapis.com`

### OpenAI-Compatible Provider Issues

#### Error: "Missing SKEPTIC_BASE_URL"

**Solution**: Ensure `.env` file contains all required variables.

#### Error: "model not found"

**Solution**: Model name may have changed. Run `list-google-models.ts` to see available models.

#### Error: 401 Unauthorized

**Solution**: API key is invalid or expired. Generate a new key at [Google AI Studio](https://aistudio.google.com/apikey).

#### Error: 404 Not Found with URL ending in `openaichat/completions`

**Solution**: Missing trailing slash in `SKEPTIC_BASE_URL`. Must be:

```bash
SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

## Testing

### Native Provider Tests

Test the native Google AI provider:

```bash
pnpm preflight:google-ai-native
```

### OpenAI-Compatible Provider Tests

#### Manual Test (Direct HTTP)

Test without AI SDK libraries:

```bash
node scripts/preflight/test-google-manual.ts
```

#### List Available Models

```bash
node scripts/preflight/list-google-models.ts
```

#### Full Skeptic Preflight

```bash
pnpm preflight:google-ai
```

## Limitations

- **Rate limits**: Subject to Google AI's rate limits (see [pricing](https://ai.google.dev/pricing))
- **Features**: Some Gemini-specific features may not be available through OpenAI compatibility layer
- **Experimental**: OpenAI compatibility is still in beta at Google

## Comparison with Other Providers

| Provider               | Setup Complexity | Cost                | Performance | Notes                         |
| ---------------------- | ---------------- | ------------------- | ----------- | ----------------------------- |
| Codex (ChatGPT)        | Low              | Subscription        | High        | Requires `codex login`        |
| Bedrock                | High             | Pay-per-use         | High        | AWS-hosted models             |
| OpenRouter             | Low              | Pay-per-use         | Varies      | Multiple models               |
| Cerebras               | Low              | Pay-per-use         | Very High   | Fastest inference             |
| **Google AI (Native)** | **Low**          | **Free tier + Pay** | **High**    | **Recommended for new users** |
| Google AI (OpenAI)     | Low              | Free tier + Pay     | High        | Backward compatible           |

## Future Enhancements

Potential improvements:

1. **Enhanced Native Features**:
   - Leverage Gemini-specific capabilities (thinking mode, multimodal)
   - Context caching for repeated verifications
   - Native streaming optimizations

2. **Model Auto-Selection**: Automatically choose model based on criteria complexity

3. **Multi-Modal Support**: Use Gemini's vision capabilities for UI screenshot analysis

## Contributing

To contribute improvements to Google AI integration:

1. Test changes with `pnpm preflight:google-ai-native` (for native) or `pnpm preflight:google-ai` (for OpenAI-compatible)
2. Update this documentation
3. Submit PR with test results
4. Link to issue tracker

## References

- [Google AI for Developers](https://ai.google.dev/)
- [OpenAI Compatibility Docs](https://ai.google.dev/gemini-api/docs/openai)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Skeptic ADR 0002](./adr/0002-model-provider-strategy.md)

## Changelog

- **2026-07-26**: Added native provider support
  - Documented `google-ai` provider using `@ai-sdk/google`
  - Added comparison table (native vs OpenAI-compatible)
  - Documented migration path from OpenAI-compatible
  - Added native preflight instructions
  - Maintained backward compatibility documentation
- **2026-07-25**: Initial integration and documentation
  - Verified OpenAI-compatible endpoint
  - Created preflight scripts
  - Documented configuration and troubleshooting
