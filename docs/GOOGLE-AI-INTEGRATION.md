# Google AI (Gemini) Integration for Skeptic

**Status**: ✅ Tested and Working  
**Author**: Community Contribution  
**Date**: July 25, 2026  
**Related**: [ADR 0002 - Model Provider Strategy](./adr/0002-model-provider-strategy.md)

## Overview

This document describes how to use Google AI (Gemini) models with Skeptic via the OpenAI-compatible endpoint. This integration expands model provider options without requiring changes to Skeptic's core architecture.

## Benefits

- **Cost-effective**: Google AI offers generous free tier
- **Easy setup**: No AWS configuration required
- **Fast inference**: Gemini 1.5 Flash provides quick responses
- **Accessible**: API keys available at [Google AI Studio](https://aistudio.google.com/apikey)

## Configuration

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
SKEPTIC_MODEL=gemini-3.1-flash-lite
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
   Model: gemini-3.1-flash-lite
   Credential source: SKEPTIC_API_KEY
🚀 Sending test prompt...
✅ Success! Google AI is working with Skeptic.
```

## Available Models

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

## Integration Architecture

Skeptic uses the OpenAI-compatible provider from `@ai-sdk/openai-compatible`:

```
Skeptic → AI SDK → OpenAI-Compatible Provider → Google AI API
```

No code changes required in Skeptic's core. The provider abstraction handles:

- Request translation (OpenAI format → Google AI format)
- Response mapping
- Streaming support
- Error handling

## Troubleshooting

### Error: "Missing SKEPTIC_BASE_URL"

**Solution**: Ensure `.env` file contains all required variables.

### Error: "model not found"

**Solution**: Model name may have changed. Run `list-google-models.ts` to see available models.

### Error: 401 Unauthorized

**Solution**: API key is invalid or expired. Generate a new key at [Google AI Studio](https://aistudio.google.com/apikey).

### Error: 404 Not Found with URL ending in `openaichat/completions`

**Solution**: Missing trailing slash in `SKEPTIC_BASE_URL`. Must be:

```
SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

## Testing

### Manual Test (Direct HTTP)

Test without AI SDK libraries:

```bash
node scripts/preflight/test-google-manual.ts
```

### List Available Models

```bash
node scripts/preflight/list-google-models.ts
```

### Full Skeptic Preflight

```bash
pnpm preflight:google-ai
```

## Limitations

- **Rate limits**: Subject to Google AI's rate limits (see [pricing](https://ai.google.dev/pricing))
- **Features**: Some Gemini-specific features may not be available through OpenAI compatibility layer
- **Experimental**: OpenAI compatibility is still in beta at Google

## Comparison with Other Providers

| Provider        | Setup Complexity | Cost                | Performance | Notes                  |
| --------------- | ---------------- | ------------------- | ----------- | ---------------------- |
| Codex (ChatGPT) | Low              | Subscription        | High        | Requires `codex login` |
| Bedrock         | High             | Pay-per-use         | High        | Official for hackathon |
| OpenRouter      | Low              | Pay-per-use         | Varies      | Multiple models        |
| Cerebras        | Low              | Pay-per-use         | Very High   | Fastest inference      |
| **Google AI**   | **Low**          | **Free tier + Pay** | **High**    | **Easy to start**      |

## Future Enhancements

Potential improvements:

1. **Native Google AI Provider**: Use `@ai-sdk/google` instead of OpenAI-compatible
   - Access to Gemini-specific features (thinking mode, multimodal)
   - Better error messages
   - Native streaming support

2. **Model Auto-Selection**: Automatically choose model based on criteria complexity

3. **Caching**: Leverage Gemini's context caching for repeated verifications

## Contributing

To contribute improvements to Google AI integration:

1. Test changes with `pnpm preflight:google-ai`
2. Update this documentation
3. Submit PR with test results
4. Link to issue tracker

## References

- [Google AI for Developers](https://ai.google.dev/)
- [OpenAI Compatibility Docs](https://ai.google.dev/gemini-api/docs/openai)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Skeptic ADR 0002](./adr/0002-model-provider-strategy.md)

## Changelog

- **2026-07-25**: Initial integration and documentation
  - Verified OpenAI-compatible endpoint
  - Created preflight scripts
  - Documented configuration and troubleshooting
