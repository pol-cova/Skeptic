# Requirements Document

## Introduction

This document specifies the requirements for adding native Google AI (Gemini) provider support to Skeptic. Currently, Google AI models can only be accessed through the `openai-compatible` provider configuration. This feature adds a dedicated `google-ai` provider that uses the `@ai-sdk/google` package for native integration, providing better error messages, access to Gemini-specific features, and a simpler configuration experience for users.

The native provider will follow the existing provider pattern established in ADR 0002 (Model Provider Strategy) and maintain backward compatibility with the current `openai-compatible` configuration.

## Glossary

- **Skeptic**: The AI verification agent that exercises web applications against acceptance criteria
- **Provider**: A model provider integration that supplies language models for Skeptic's reasoning
- **Model_Provider_Module**: The TypeScript module at `packages/core/src/model-provider.ts` that resolves provider configurations
- **Native_Provider**: A first-class provider integration using a dedicated AI SDK package (e.g., `@ai-sdk/google`)
- **OpenAI_Compatible_Provider**: The generic provider that uses OpenAI-compatible HTTP endpoints
- **Preflight_Script**: A validation script that tests provider configuration before runtime
- **ResolvedSkepticModel**: The data structure returned by provider resolution containing provider ID, model ID, credential source, and AI SDK LanguageModel instance
- **AI_SDK**: The `ai` package from Vercel that provides the LanguageModel interface
- **Google_AI_SDK**: The `@ai-sdk/google` package that provides native Google AI (Gemini) integration

## Requirements

### Requirement 1: Native Provider Registration

**User Story:** As a Skeptic developer, I want to use `SKEPTIC_PROVIDER=google-ai` in my environment configuration, so that I can access Google AI models through native integration rather than the generic openai-compatible provider.

#### Acceptance Criteria

1. THE Model_Provider_Module SHALL include `"google-ai"` in the `skepticProviderIds` array
2. WHEN `SKEPTIC_PROVIDER=google-ai` is set, THE Model_Provider_Module SHALL recognize it as a valid provider
3. WHEN an unrecognized provider is specified, THE Model_Provider_Module SHALL throw an error listing all valid provider IDs including `"google-ai"`

### Requirement 2: Default Model Configuration

**User Story:** As a Skeptic user, I want a sensible default Gemini model when using the google-ai provider, so that I don't need to specify SKEPTIC_MODEL for basic usage.

#### Acceptance Criteria

1. THE Model_Provider_Module SHALL define a default model for the `google-ai` provider in the `defaultModels` record
2. THE default model SHALL be `"gemini-1.5-flash"` or `"gemini-2.0-flash-exp"`
3. WHEN `SKEPTIC_PROVIDER=google-ai` is set without `SKEPTIC_MODEL`, THE Model_Provider_Module SHALL use the default model
4. WHEN `SKEPTIC_MODEL` is explicitly set, THE Model_Provider_Module SHALL use the specified model value regardless of the default

### Requirement 3: API Key Validation

**User Story:** As a Skeptic user, I want clear error messages when my Google AI API key is missing or invalid, so that I can quickly fix configuration issues.

#### Acceptance Criteria

1. WHEN `SKEPTIC_PROVIDER=google-ai` is set, THE Model_Provider_Module SHALL require the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
2. IF `GOOGLE_GENERATIVE_AI_API_KEY` is missing or empty, THEN THE Model_Provider_Module SHALL throw an error message stating "Missing GOOGLE_GENERATIVE_AI_API_KEY for the selected Skeptic provider."
3. THE ResolvedSkepticModel credentialSource field SHALL be set to `"GOOGLE_GENERATIVE_AI_API_KEY"`
4. THE Model_Provider_Module SHALL NOT log or print the actual API key value

### Requirement 4: Native SDK Integration

**User Story:** As a Skeptic developer, I want the google-ai provider to use the official `@ai-sdk/google` package, so that I benefit from native Gemini features and proper error handling.

#### Acceptance Criteria

1. WHEN `SKEPTIC_PROVIDER=google-ai` is set, THE Model_Provider_Module SHALL import and use `createGoogleGenerativeAI` from `@ai-sdk/google`
2. THE Model_Provider_Module SHALL pass the API key from `GOOGLE_GENERATIVE_AI_API_KEY` to the `createGoogleGenerativeAI` function
3. THE ResolvedSkepticModel model field SHALL be a LanguageModel instance created by calling the `generativeAI` function with the resolved model ID
4. THE implementation SHALL follow the same pattern as existing native providers (chatgpt, openrouter, cerebras, bedrock)

### Requirement 5: Provider Resolution

**User Story:** As a Skeptic developer, I want the resolveSkepticModel function to return complete configuration for the google-ai provider, so that the verification agent can use Google AI models.

#### Acceptance Criteria

1. WHEN `SKEPTIC_PROVIDER=google-ai` is configured correctly, THE `resolveSkepticModel` function SHALL return a ResolvedSkepticModel object
2. THE returned object provider field SHALL be `"google-ai"`
3. THE returned object modelId field SHALL be either the default model or the value from `SKEPTIC_MODEL`
4. THE returned object credentialSource field SHALL be `"GOOGLE_GENERATIVE_AI_API_KEY"`
5. THE returned object model field SHALL be a valid AI SDK LanguageModel instance

### Requirement 6: Preflight Validation Script

**User Story:** As a Skeptic user, I want to run `pnpm preflight:google-ai-native` to verify my Google AI configuration works, so that I can catch configuration errors before running actual verifications.

#### Acceptance Criteria

1. THE Preflight_Script SHALL exist at `scripts/preflight/google-ai-native.ts`
2. WHEN the script runs, THE Preflight_Script SHALL call `resolveSkepticModel()` to test provider resolution
3. WHEN the script runs, THE Preflight_Script SHALL send a test prompt using `streamText` from the AI SDK
4. WHEN the test succeeds, THE Preflight_Script SHALL print a success message and exit with code 0
5. IF the test fails, THEN THE Preflight_Script SHALL print error details and troubleshooting tips, then exit with code 1
6. THE Preflight_Script SHALL validate structured output by requesting JSON with a specific schema

### Requirement 7: Package Manager Script

**User Story:** As a Skeptic developer, I want to run `pnpm preflight:google-ai-native` from the project root, so that I have a convenient way to test the native Google AI provider.

#### Acceptance Criteria

1. THE root `package.json` SHALL include a script named `"preflight:google-ai-native"`
2. THE script SHALL execute `node scripts/preflight/google-ai-native.ts`
3. WHEN invoked, THE script SHALL run the preflight validation for the native Google AI provider

### Requirement 8: Documentation Updates

**User Story:** As a Skeptic user, I want updated documentation that explains the native google-ai provider option, so that I understand my configuration choices.

#### Acceptance Criteria

1. THE `docs/GOOGLE-AI-INTEGRATION.md` file SHALL be updated to document the native provider option
2. THE documentation SHALL explain the difference between `openai-compatible` and `google-ai` provider configurations
3. THE documentation SHALL include the required environment variable `GOOGLE_GENERATIVE_AI_API_KEY`
4. THE documentation SHALL document the default model for the native provider
5. THE documentation SHALL include instructions for running the native preflight check
6. THE documentation SHALL note that both configurations remain supported (backward compatibility)

### Requirement 9: ADR 0002 Updates

**User Story:** As a Skeptic maintainer, I want ADR 0002 (Model Provider Strategy) updated to include the google-ai provider, so that the provider table remains accurate and complete.

#### Acceptance Criteria

1. THE `docs/adr/0002-model-provider-strategy.md` file SHALL include `google-ai` in the provider table
2. THE table entry SHALL specify credential source as `GOOGLE_GENERATIVE_AI_API_KEY`
3. THE table entry SHALL specify the default model consistent with Requirement 2
4. THE updated ADR SHALL maintain the existing format and structure

### Requirement 10: Backward Compatibility

**User Story:** As an existing Skeptic user, I want my current `openai-compatible` Google AI configuration to continue working, so that I don't experience breaking changes when upgrading.

#### Acceptance Criteria

1. WHEN `SKEPTIC_PROVIDER=openai-compatible` is configured with Google AI endpoint, THE Model_Provider_Module SHALL continue to resolve successfully
2. THE existing `scripts/preflight/google-ai.ts` script SHALL continue to function for openai-compatible configuration
3. THE `pnpm preflight:google-ai` command SHALL continue to work for the openai-compatible provider path
4. THE documentation SHALL clearly state that both provider options are supported

### Requirement 11: Type Safety

**User Story:** As a Skeptic developer, I want TypeScript to enforce correct provider IDs at compile time, so that I catch configuration errors early.

#### Acceptance Criteria

1. THE `SkepticProviderId` type SHALL include `"google-ai"` as a valid literal type
2. THE TypeScript compiler SHALL reject invalid provider IDs at compile time when using the type
3. THE `defaultModels` record type SHALL require an entry for `google-ai`

### Requirement 12: Environment Variable Example File

**User Story:** As a new Skeptic user, I want an example .env file showing the native Google AI configuration, so that I can quickly set up my environment.

#### Acceptance Criteria

1. THE repository SHALL include a file named `.env.google-ai-native.example`
2. THE example file SHALL demonstrate `SKEPTIC_PROVIDER=google-ai` configuration
3. THE example file SHALL include `GOOGLE_GENERATIVE_AI_API_KEY` with a placeholder value
4. THE example file SHALL include `SKEPTIC_MODEL` with the default or a recommended model
5. THE example file SHALL include comments explaining each variable
6. THE example file SHALL include a reference to the native preflight command
