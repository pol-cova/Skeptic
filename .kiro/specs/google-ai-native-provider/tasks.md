# Implementation Plan: Native Google AI Provider

## Overview

This implementation adds native Google AI (Gemini) provider support to Skeptic using the `@ai-sdk/google` package. The feature follows the established provider pattern (ADR 0002) and maintains backward compatibility with the existing `openai-compatible` configuration. The implementation includes core integration, preflight validation, documentation updates, and comprehensive testing.

## Tasks

- [x] 1. Add @ai-sdk/google dependency
  - Add `"@ai-sdk/google": "^1.0.0"` to packages/core/package.json dependencies
  - Run `pnpm install` to update lockfile
  - _Requirements: 4.1_

- [x] 2. Implement core provider integration
  - [x] 2.1 Register google-ai provider ID
    - Add `"google-ai"` to `skepticProviderIds` array in packages/core/src/model-provider.ts
    - Import `createGoogleGenerativeAI` from `@ai-sdk/google` at top of file
    - _Requirements: 1.1, 1.2, 11.1, 11.2_
  - [x] 2.2 Add default model configuration
    - Add `"google-ai": "gemini-2.0-flash-exp"` entry to `defaultModels` record
    - Ensure TypeScript requires the google-ai entry (type safety)
    - _Requirements: 2.1, 2.2, 11.3_
  - [x] 2.3 Implement provider resolution logic
    - Add `if (provider === "google-ai")` conditional branch in `resolveSkepticModel` function
    - Implement model resolution: `const modelId = env.SKEPTIC_MODEL ?? defaultModels["google-ai"]`
    - Call `requireEnvironmentValue(env, "GOOGLE_GENERATIVE_AI_API_KEY")` for API key
    - Create model instance: `createGoogleGenerativeAI({ apiKey })(modelId)`
    - Return `ResolvedSkepticModel` with provider, modelId, credentialSource, and model
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 2.4 Write unit tests for provider resolution
    - Test successful resolution with valid API key
    - Test error when API key is missing
    - Test default model usage
    - Test explicit SKEPTIC_MODEL override
    - _Requirements: 1.1, 2.3, 2.4, 3.1, 3.2_

- [x] 3. Checkpoint - Verify core integration compiles
  - Run `pnpm typecheck` to verify TypeScript compiles without errors
  - Ensure all tests pass, ask the user if questions arise

- [x] 4. Create preflight validation script
  - [x] 4.1 Implement google-ai-native.ts preflight script
    - Create file at `scripts/preflight/google-ai-native.ts`
    - Import required modules: `@ai-sdk/google`, `ai`, `zod`, `@skeptic/core`
    - Implement early API key validation with helpful error message
    - Call `resolveSkepticModel()` to test provider resolution
    - Test structured output with `generateText` and response schema
    - Print configuration details (provider, model, credential source)
    - Handle errors with troubleshooting guidance
    - Exit with code 0 on success, code 1 on failure, code 2 on missing config
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 4.2 Write integration tests for preflight script
    - Test success path with valid configuration
    - Test failure with missing API key
    - Test failure with invalid API key
    - _Requirements: 6.4, 6.5_

- [x] 5. Add package manager script
  - Add `"preflight:google-ai-native": "node scripts/preflight/google-ai-native.ts"` to root package.json scripts section
  - Verify script runs correctly with `pnpm preflight:google-ai-native` (requires valid API key)
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Create environment configuration example
  - Create `.env.google-ai-native.example` file in project root
  - Include SKEPTIC_PROVIDER=google-ai configuration
  - Include GOOGLE_GENERATIVE_AI_API_KEY with placeholder value
  - Include SKEPTIC_MODEL with default/recommended value
  - Add comments explaining each variable and setup steps
  - Include reference to native preflight command
  - Add link to Google AI Studio for API key generation
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 7. Checkpoint - Test preflight validation
  - Manually test preflight script with valid API key
  - Manually test error cases (missing key, invalid provider)
  - Ensure all tests pass, ask the user if questions arise

- [x] 8. Update integration documentation
  - [x] 8.1 Update GOOGLE-AI-INTEGRATION.md
    - Add "Native Provider Option (Recommended)" section to docs/GOOGLE-AI-INTEGRATION.md
    - Document benefits over openai-compatible (simpler config, better errors, native features)
    - Include setup instructions with required environment variables
    - Add comparison table (native vs openai-compatible)
    - Document migration path from openai-compatible to native
    - Note backward compatibility support
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.4_
  - [x] 8.2 Update ADR 0002
    - Add google-ai entry to provider table in docs/adr/0002-model-provider-strategy.md
    - Include credential source: GOOGLE_GENERATIVE_AI_API_KEY
    - Include default model: gemini-2.0-flash-exp
    - Add context section explaining native provider and backward compatibility
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 9. Final integration testing
  - [x] 9.1 Test native provider end-to-end
    - Set SKEPTIC_PROVIDER=google-ai with valid API key
    - Verify provider resolution succeeds
    - Test with default model (no SKEPTIC_MODEL set)
    - Test with explicit SKEPTIC_MODEL override
    - Verify structured output works correctly
    - _Requirements: 1.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 9.2 Verify backward compatibility
    - Test existing openai-compatible Google AI configuration still works
    - Verify `pnpm preflight:google-ai` (existing script) succeeds
    - Confirm both provider paths work independently
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 9.3 Test error scenarios
    - Test missing API key produces clear error
    - Test invalid provider ID is rejected with helpful message
    - Test preflight fails gracefully with invalid configuration
    - Verify error messages guide users to resolution
    - _Requirements: 3.1, 3.2, 1.3_

- [x] 10. Final checkpoint - Complete verification
  - Run full test suite: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
  - Verify all documentation is accurate and complete
  - Ensure backward compatibility maintained
  - Confirm all requirements are met
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The implementation follows existing provider patterns (bedrock, cerebras, openrouter)
- Backward compatibility with openai-compatible configuration is maintained
- TypeScript provides compile-time validation of provider IDs and configuration
- Preflight script serves as the primary integration test

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3"] },
    { "id": 3, "tasks": ["2.4", "4.1", "6"] },
    { "id": 4, "tasks": ["4.2", "5", "8.1", "8.2"] },
    { "id": 5, "tasks": ["9.1", "9.2"] },
    { "id": 6, "tasks": ["9.3"] }
  ]
}
```
