# Design Document: Native Google AI Provider

## Overview

This design specifies the implementation of native Google AI (Gemini) support for Skeptic using the `@ai-sdk/google` package. The native provider will follow the established provider pattern defined in ADR 0002, providing first-class integration with Google's Generative AI API while maintaining backward compatibility with the existing `openai-compatible` configuration.

The implementation adds `google-ai` as a recognized provider ID, handles API key validation, provides sensible defaults, and includes comprehensive preflight testing capabilities. This design ensures consistent integration with existing providers (chatgpt, openrouter, cerebras, bedrock) while leveraging native SDK features for better error messages and access to Gemini-specific capabilities.

### Key Design Goals

1. **Consistency**: Follow established provider patterns without introducing new architectural concepts
2. **Simplicity**: Minimize configuration burden with sensible defaults
3. **Clarity**: Provide clear error messages and validation feedback
4. **Compatibility**: Maintain support for existing openai-compatible Google AI configuration
5. **Testability**: Include comprehensive preflight validation capabilities

## Architecture

### Component Overview

The native Google AI provider integrates into Skeptic's existing model resolution architecture:

```
Environment Variables
        ↓
Model Provider Module (model-provider.ts)
        ↓
Provider Resolution Logic
        ↓
@ai-sdk/google Integration
        ↓
ResolvedSkepticModel
        ↓
Verification Agent
```

### Integration Points

1. **Provider Registry**: Add `"google-ai"` to the `skepticProviderIds` array
2. **Type System**: Include `"google-ai"` in the `SkepticProviderId` union type
3. **Default Models**: Define default model in the `defaultModels` record
4. **Resolution Logic**: Implement google-ai case in `resolveSkepticModel` function
5. **Preflight Scripts**: Create native validation script at `scripts/preflight/google-ai-native.ts`
6. **Package Scripts**: Add `preflight:google-ai-native` to root package.json
7. **Documentation**: Update integration docs and ADR 0002

## Components and Interfaces

### Model Provider Module Updates

**File**: `packages/core/src/model-provider.ts`

#### Provider ID Array Extension

```typescript
export const skepticProviderIds = [
  "chatgpt",
  "openrouter",
  "cerebras",
  "bedrock",
  "openai-compatible",
  "google-ai", // NEW
] as const;
```

**Rationale**: Adding to the const array ensures compile-time type safety and runtime validation.

#### Type Definition

The `SkepticProviderId` type automatically includes `"google-ai"` through type inference from the `skepticProviderIds` array. No explicit type changes required.

#### Default Model Configuration

```typescript
const defaultModels: Record<
  Exclude<SkepticProviderId, "openai-compatible">,
  string
> = {
  chatgpt: "gpt-5.6-sol",
  openrouter: "openai/gpt-5.4-mini",
  cerebras: "gpt-oss-120b",
  bedrock: "amazon.nova-lite-v1:0",
  "google-ai": "gemini-2.0-flash-exp", // NEW
};
```

**Model Selection Rationale**:

- `gemini-2.0-flash-exp`: Latest experimental flash model with improved performance
- Alternative: `gemini-1.5-flash` for stable production use
- The default balances performance, cost-effectiveness, and feature availability

#### Provider Resolution Implementation

Add new conditional branch in `resolveSkepticModel`:

```typescript
if (provider === "google-ai") {
  const modelId = env.SKEPTIC_MODEL ?? defaultModels["google-ai"];
  return {
    provider,
    modelId,
    credentialSource: "GOOGLE_GENERATIVE_AI_API_KEY",
    model: createGoogleGenerativeAI({
      apiKey: requireEnvironmentValue(env, "GOOGLE_GENERATIVE_AI_API_KEY"),
    })(modelId),
  };
}
```

**Implementation Details**:

- Import: `import { createGoogleGenerativeAI } from "@ai-sdk/google";`
- API Key: Required from `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
- Model Resolution: Uses default or explicit `SKEPTIC_MODEL` value
- Error Handling: Leverages existing `requireEnvironmentValue` for consistent error messages

### Package Dependencies

**File**: `packages/core/package.json` (inferred location)

Add dependency:

```json
{
  "dependencies": {
    "@ai-sdk/google": "^1.0.0"
  }
}
```

**Version Strategy**: Use caret (`^`) for minor version updates, consistent with existing AI SDK dependencies.

### Preflight Validation Script

**File**: `scripts/preflight/google-ai-native.ts`

The preflight script validates the native Google AI provider configuration and tests actual API connectivity.

#### Script Structure

```typescript
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveSkepticModel } from "@skeptic/core";

// Configuration loading (consistent with existing preflight scripts)
const modelId = process.env.SKEPTIC_MODEL ?? "gemini-2.0-flash-exp";
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Early validation
if (!apiKey) {
  console.error(
    "❌ Google AI Native preflight requires GOOGLE_GENERATIVE_AI_API_KEY",
  );
  console.error("\n💡 Setup:");
  console.error("   1. Get API key: https://aistudio.google.com/apikey");
  console.error("   2. Set: export GOOGLE_GENERATIVE_AI_API_KEY=your_key");
  console.error("   3. Set: export SKEPTIC_PROVIDER=google-ai");
  process.exit(2);
}

// Test schema for structured output validation
const responseSchema = z.object({
  status: z.literal("ok"),
  summary: z.string().min(1),
  provider: z.string(),
});

try {
  console.log("🧪 Testing native Google AI provider...\n");

  // Use resolveSkepticModel for consistency
  const resolved = resolveSkepticModel();

  console.log("📋 Configuration:");
  console.log(`   Provider: ${resolved.provider}`);
  console.log(`   Model: ${resolved.modelId}`);
  console.log(`   Credential source: ${resolved.credentialSource}\n`);

  console.log("🚀 Sending test prompt with structured output...");

  const result = await generateText({
    model: resolved.model,
    output: Output.object({ schema: responseSchema }),
    prompt:
      'Return JSON with status "ok", provider "Google AI Native", and a summary confirming native Gemini integration.',
    maxRetries: 2,
    timeout: 30_000,
  });

  console.log("\n✅ Success! Native Google AI provider is working.\n");
  console.log("📊 Response:");
  console.log(JSON.stringify(result.output, null, 2));

  process.exitCode = 0;
} catch (error) {
  console.error("\n❌ Native Google AI preflight failed!\n");

  if (error instanceof Error) {
    console.error("Error details:");
    console.error(`   Message: ${error.message}\n`);
  }

  console.error("💡 Troubleshooting:");
  console.error("   1. Verify GOOGLE_GENERATIVE_AI_API_KEY is valid");
  console.error("   2. Check API key at: https://aistudio.google.com/apikey");
  console.error("   3. Ensure SKEPTIC_PROVIDER=google-ai");
  console.error(
    "   4. Confirm model is available (use pnpm preflight:google-ai for openai-compatible check)",
  );

  process.exitCode = 1;
}
```

#### Key Features

1. **Early Validation**: Checks API key presence before attempting resolution
2. **Structured Output**: Tests both text generation and JSON schema compliance
3. **Clear Feedback**: Uses emoji and formatting for readable output
4. **Consistent Pattern**: Follows bedrock.ts and google-ai.ts script patterns
5. **Helpful Errors**: Provides actionable troubleshooting steps
6. **Integration Test**: Uses `resolveSkepticModel()` to test actual provider resolution

### Package Manager Script

**File**: Root `package.json`

Add script entry:

```json
{
  "scripts": {
    "preflight:google-ai-native": "node scripts/preflight/google-ai-native.ts"
  }
}
```

**Naming Convention**: Uses `-native` suffix to distinguish from existing `preflight:google-ai` (openai-compatible path).

### Environment Configuration Example

**File**: `.env.google-ai-native.example`

```bash
# Native Google AI (Gemini) Configuration for Skeptic
#
# This configuration uses the native @ai-sdk/google provider for direct integration.
# This is recommended over openai-compatible for better error messages and native features.
#
# Setup Instructions:
# 1. Get a free API key: https://aistudio.google.com/apikey
# 2. Copy this file to .env or add variables to existing .env
# 3. Replace placeholder values with your credentials
# 4. Run: pnpm preflight:google-ai-native

# Provider Configuration
# Use 'google-ai' for native integration (recommended)
SKEPTIC_PROVIDER=google-ai

# Google AI API Key
# Get yours at: https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here

# Model Selection (optional - defaults to gemini-2.0-flash-exp)
# Recommended models:
#   - gemini-2.0-flash-exp (default, latest experimental)
#   - gemini-1.5-flash (stable, production-ready)
#   - gemini-1.5-pro (more capable, higher latency)
SKEPTIC_MODEL=gemini-2.0-flash-exp

# Note: Native provider is simpler than openai-compatible:
# - No SKEPTIC_BASE_URL required
# - No SKEPTIC_API_KEY_ENV configuration
# - Better error messages from Google AI SDK
# - Access to Gemini-specific features
```

**Design Decisions**:

- Clear comparison with openai-compatible approach
- Emphasizes simplicity and native features
- Includes validation command
- Provides model selection guidance

## Data Models

### ResolvedSkepticModel Structure

For the `google-ai` provider, the returned structure is:

```typescript
{
  provider: "google-ai",
  modelId: "gemini-2.0-flash-exp" | "<user-specified-model>",
  credentialSource: "GOOGLE_GENERATIVE_AI_API_KEY",
  model: LanguageModel  // from @ai-sdk/google
}
```

**Field Semantics**:

- `provider`: Identifies the provider type for logging and debugging
- `modelId`: Specific model identifier passed to the Google AI API
- `credentialSource`: Documents where credentials are sourced for troubleshooting
- `model`: AI SDK LanguageModel instance ready for inference

### Environment Variable Schema

| Variable                       | Required            | Default                  | Validation                      | Purpose                 |
| ------------------------------ | ------------------- | ------------------------ | ------------------------------- | ----------------------- |
| `SKEPTIC_PROVIDER`             | Yes                 | `"chatgpt"`              | Must be in `skepticProviderIds` | Selects provider        |
| `SKEPTIC_MODEL`                | No                  | `"gemini-2.0-flash-exp"` | Any string                      | Overrides default model |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes (for google-ai) | None                     | Non-empty string                | API authentication      |

## Error Handling

### Missing API Key

**Scenario**: User sets `SKEPTIC_PROVIDER=google-ai` without `GOOGLE_GENERATIVE_AI_API_KEY`

**Error Message**:

```
Error: Missing GOOGLE_GENERATIVE_AI_API_KEY for the selected Skeptic provider.
```

**Implementation**: Thrown by `requireEnvironmentValue` helper in model-provider.ts

**User Action**: Set environment variable and retry

### Invalid Provider

**Scenario**: User sets `SKEPTIC_PROVIDER=google` (typo)

**Error Message**:

```
Error: Unsupported SKEPTIC_PROVIDER "google". Expected chatgpt, openrouter, cerebras, bedrock, openai-compatible, google-ai.
```

**Implementation**: Thrown by `readProvider` function

**User Action**: Correct typo to `google-ai`

### API Connection Failure

**Scenario**: Invalid API key or network issue during preflight

**Error Handling**:

1. Catch error in preflight script
2. Display error message from Google AI SDK
3. Show troubleshooting steps
4. Exit with code 1

**Example Output**:

```
❌ Native Google AI preflight failed!

Error details:
   Message: Invalid API key provided

💡 Troubleshooting:
   1. Verify GOOGLE_GENERATIVE_AI_API_KEY is valid
   2. Check API key at: https://aistudio.google.com/apikey
   3. Ensure SKEPTIC_PROVIDER=google-ai
   4. Confirm model is available
```

### Model Not Found

**Scenario**: User specifies unavailable model in `SKEPTIC_MODEL`

**Behavior**: Error propagates from Google AI API during model creation

**Mitigation**: Preflight script catches and reports the error with guidance

## Testing Strategy

### Unit Testing

**Scope**: Not applicable for this feature. The implementation consists of configuration code and integration with external SDKs. Property-based testing is not appropriate for:

- Environment variable configuration
- SDK integration (already tested by @ai-sdk/google maintainers)
- Provider registration (declarative configuration)

### Integration Testing

**Primary Validation**: Preflight script serves as the integration test

**Test Coverage**:

1. **Configuration Resolution**: `resolveSkepticModel()` successfully creates provider instance
2. **API Connectivity**: Successful API call to Google AI
3. **Structured Output**: JSON schema validation works correctly
4. **Error Handling**: Clear error messages for missing/invalid configuration

**Test Execution**:

```bash
# Native provider path
export SKEPTIC_PROVIDER=google-ai
export GOOGLE_GENERATIVE_AI_API_KEY=<actual-key>
pnpm preflight:google-ai-native

# Verify backward compatibility
export SKEPTIC_PROVIDER=openai-compatible
export SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
export SKEPTIC_API_KEY=<actual-key>
export SKEPTIC_MODEL=gemini-1.5-flash
pnpm preflight:google-ai
```

**Success Criteria**:

- Both paths succeed with valid credentials
- Native path is simpler (fewer environment variables)
- Error messages guide users to resolution
- Structured output validates correctly

### Manual Testing Checklist

Pre-merge validation:

- [ ] Native provider resolves with valid API key
- [ ] Missing API key produces clear error message
- [ ] Invalid provider ID is rejected with helpful message
- [ ] Default model works without SKEPTIC_MODEL
- [ ] Explicit SKEPTIC_MODEL override works
- [ ] Preflight script succeeds with valid configuration
- [ ] Preflight script fails gracefully with invalid configuration
- [ ] Openai-compatible path still works (backward compatibility)
- [ ] Documentation accurately reflects both paths
- [ ] ADR 0002 table includes google-ai entry

## Documentation Updates

### GOOGLE-AI-INTEGRATION.md

**Section to Add**: "Native Provider Option (Recommended)"

**Content Structure**:

````markdown
## Native Provider Option (Recommended)

Starting with v0.x.x, Skeptic supports native Google AI integration using `@ai-sdk/google`.

### Benefits over OpenAI-Compatible

- **Simpler Configuration**: Only 2 environment variables instead of 4
- **Better Error Messages**: Native SDK provides clearer diagnostics
- **Native Features**: Access to Gemini-specific capabilities
- **Direct Integration**: No compatibility layer overhead

### Setup

1. Get API key: https://aistudio.google.com/apikey
2. Configure environment:
   ```bash
   export SKEPTIC_PROVIDER=google-ai
   export GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
   # Optional: export SKEPTIC_MODEL=gemini-1.5-flash
   ```
````

3. Validate: `pnpm preflight:google-ai-native`

### Comparison

| Aspect            | Native (`google-ai`)   | OpenAI-Compatible   |
| ----------------- | ---------------------- | ------------------- |
| Config complexity | Low (2 vars)           | Medium (4 vars)     |
| Error messages    | Excellent              | Good                |
| Features          | Native Gemini features | OpenAI subset       |
| Setup             | Direct                 | Compatibility layer |

### Migration from OpenAI-Compatible

If you're currently using `openai-compatible` for Google AI:

**Before**:

```bash
SKEPTIC_PROVIDER=openai-compatible
SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
SKEPTIC_API_KEY=your_key
SKEPTIC_MODEL=gemini-1.5-flash
```

**After**:

```bash
SKEPTIC_PROVIDER=google-ai
GOOGLE_GENERATIVE_AI_API_KEY=your_key
# SKEPTIC_MODEL is optional with native provider
```

Both configurations remain supported for backward compatibility.

````

### ADR 0002 Updates

**File**: `docs/adr/0002-model-provider-strategy.md`

Update provider table:

```markdown
| Provider            | Credential source                            | Default model              |
| ------------------- | -------------------------------------------- | -------------------------- |
| `chatgpt`           | Existing `codex login`                       | `gpt-5.6-sol`              |
| `openrouter`        | `OPENROUTER_API_KEY`                         | `openai/gpt-5.4-mini`      |
| `cerebras`          | `CEREBRAS_API_KEY`                           | `gpt-oss-120b`             |
| `bedrock`           | Bedrock bearer token or AWS credential chain | `amazon.nova-lite-v1:0`    |
| `google-ai`         | `GOOGLE_GENERATIVE_AI_API_KEY`               | `gemini-2.0-flash-exp`     |
| `openai-compatible` | Configurable environment variable            | No default                 |
````

**Additional Context Section**:

````markdown
### Google AI Provider

The `google-ai` provider offers native integration with Google's Generative AI API using
`@ai-sdk/google`. This is the recommended approach for accessing Gemini models.

Configuration:

```bash
SKEPTIC_PROVIDER=google-ai
GOOGLE_GENERATIVE_AI_API_KEY=<api-key>
```
````

The existing `openai-compatible` configuration path remains supported for backward compatibility
and cases where the OpenAI-compatible endpoint is preferred.

````

### README Updates

**File**: Root `README.md` (if provider section exists)

Add `google-ai` to provider list with note about native integration being recommended over openai-compatible for Google AI models.

## Implementation Plan

### Phase 1: Core Integration (Minimal Deliverable)

1. Update `packages/core/src/model-provider.ts`:
   - Add `"google-ai"` to `skepticProviderIds`
   - Add default model to `defaultModels`
   - Add import for `@ai-sdk/google`
   - Implement google-ai resolution case
2. Add `@ai-sdk/google` dependency to packages/core
3. Run typecheck to verify type safety

**Validation**: TypeScript compiles without errors

### Phase 2: Preflight Validation

1. Create `scripts/preflight/google-ai-native.ts`
2. Add `preflight:google-ai-native` script to root package.json
3. Test with valid API key
4. Test error cases (missing key, invalid model)

**Validation**: Preflight succeeds with valid config, fails gracefully with clear errors

### Phase 3: Documentation

1. Create `.env.google-ai-native.example`
2. Update `docs/GOOGLE-AI-INTEGRATION.md` with native provider section
3. Update `docs/adr/0002-model-provider-strategy.md` table and content
4. Update product-spec.md if needed

**Validation**: Documentation is clear and accurate

### Phase 4: Integration Testing

1. Test native provider in demo app environment
2. Verify backward compatibility with openai-compatible path
3. Test with multiple Gemini models
4. Validate structured output works correctly

**Validation**: All test cases pass, both paths work

### Phase 5: Final Review

1. Code review for consistency with existing patterns
2. Documentation review for clarity
3. Test all error scenarios
4. Verify ADR and spec alignment

**Validation**: Ready for merge

## Backward Compatibility

### Existing Configuration Support

The `openai-compatible` provider path for Google AI **remains fully supported**:

```bash
# This continues to work
SKEPTIC_PROVIDER=openai-compatible
SKEPTIC_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
SKEPTIC_API_KEY=<key>
SKEPTIC_MODEL=gemini-1.5-flash
````

**Validation Command**: `pnpm preflight:google-ai` (existing script)

### Migration Path

Users are **not required** to migrate. The native provider is an optional improvement.

**Recommended for new users**: Use `google-ai` provider for simplicity

**Recommended for existing users**: Migrate when convenient, or continue with current configuration

### Deprecation Policy

No deprecation planned for `openai-compatible` Google AI usage. Both paths will be maintained.

## Security Considerations

### API Key Handling

1. **No Logging**: API key values are never logged or printed
2. **Environment Only**: Keys read exclusively from environment variables
3. **No Defaults**: Missing keys cause immediate failure with clear error
4. **No Persistence**: Keys never written to files or config

### Validation

1. **Early Validation**: API key checked before browser startup
2. **Preflight**: Validation script catches configuration issues before runtime
3. **Clear Errors**: Missing or invalid keys produce actionable error messages

### Documentation

1. **Example Files**: Use placeholder values, never real keys
2. **Setup Guidance**: Point users to official Google AI Studio for key generation
3. **Best Practices**: Recommend environment variables over hardcoded values

## Dependencies

### New Runtime Dependencies

**Package**: `@ai-sdk/google`
**Version**: `^1.0.0` (or latest stable)
**License**: MIT (verify during implementation)
**Maintainer**: Vercel (AI SDK team)

**Justification**: Official Vercel AI SDK provider for Google AI, maintained alongside other providers used in Skeptic

### Transitive Dependencies

The `@ai-sdk/google` package depends on:

- `ai` (already a dependency)
- Google Generative AI client libraries

**Risk Assessment**: Low - Vercel actively maintains AI SDK providers

## Alternatives Considered

### Alternative 1: Continue with OpenAI-Compatible Only

**Pros**:

- No code changes required
- Works today

**Cons**:

- More complex configuration (4 env vars vs 2)
- Generic error messages
- No access to native Gemini features
- Compatibility layer overhead

**Decision**: Rejected - Native integration provides better developer experience

### Alternative 2: Use @google/genai Instead

**Pros**:

- Official Google SDK
- Direct access to all features

**Cons**:

- Requires custom LanguageModel adapter
- Not part of AI SDK ecosystem
- Inconsistent with other Skeptic providers
- More implementation complexity

**Decision**: Rejected - Inconsistent with ADR 0002 requirement for AI SDK LanguageModel

### Alternative 3: Replace OpenAI-Compatible Path

**Pros**:

- Single supported configuration path
- Simpler documentation

**Cons**:

- Breaking change for existing users
- Violates backward compatibility requirement
- Forces migration

**Decision**: Rejected - Violates Requirement 10 (Backward Compatibility)

## Open Questions

None. Design is complete and ready for implementation.

## Success Criteria

1. ✅ `SKEPTIC_PROVIDER=google-ai` is recognized and validated
2. ✅ Default model works without explicit SKEPTIC_MODEL
3. ✅ API key validation provides clear error messages
4. ✅ Preflight script validates configuration successfully
5. ✅ Native provider follows same pattern as bedrock/cerebras/openrouter
6. ✅ Documentation clearly explains both provider options
7. ✅ Backward compatibility maintained for openai-compatible path
8. ✅ TypeScript enforces provider ID correctness at compile time
9. ✅ ADR 0002 accurately reflects google-ai provider
10. ✅ Example .env file demonstrates native configuration

## References

- [ADR 0002: Model Provider Strategy](../../docs/adr/0002-model-provider-strategy.md)
- [Requirements Document](./requirements.md)
- [Google AI Studio](https://aistudio.google.com/)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/)
- Existing provider implementations: bedrock.ts, cerebras integration, openrouter integration
