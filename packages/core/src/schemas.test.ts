import { describe, expect, it } from "vitest";

import {
  agentDecisionSchema,
  assertionResultSchema,
  assertionSchema,
  browserActionSchema,
  criterionVerdictSchema,
  pageObservationSchema,
  persistedRunBundleSchema,
  runEventSchema,
  runMetadataSchema,
} from "./schemas/index.ts";
import { defineProofConfig } from "./config.ts";
import {
  REDACTED_SECRET,
  redactForPersistence,
  resolveAuthSecrets,
  safeJsonStringify,
} from "./secrets.ts";

describe("core schemas", () => {
  it("validates browser actions and page observations", () => {
    const action = browserActionSchema.parse({
      actionId: "action-1",
      type: "click",
      target: { testId: "invite-submit" },
    });

    expect(action.type).toBe("click");

    const observation = pageObservationSchema.parse({
      url: "http://127.0.0.1:3100/team",
      title: "Team",
      elements: [{ role: "button", name: "Invite teammate" }],
      capturedAt: Date.now(),
    });

    expect(observation.elements).toHaveLength(1);
  });

  it("validates assertions, agent decisions, and criterion verdicts", () => {
    const assertion = assertionSchema.parse({
      type: "text",
      target: { role: "alert" },
      expected: "Invalid email address",
    });

    const assertionResult = assertionResultSchema.parse({
      assertion,
      passed: true,
      expected: "Invalid email address",
      observed: "Invalid email address",
      timestamp: Date.now(),
    });

    const decision = agentDecisionSchema.parse({
      criterionIndex: 1,
      hypothesis: "Invalid email shows validation without creating a row.",
      actions: [
        {
          actionId: "action-1",
          type: "fill",
          target: { testId: "invite-email" },
          value: "not-an-email",
        },
      ],
      decidedAt: Date.now(),
    });

    const verdict = criterionVerdictSchema.parse({
      criterionIndex: 1,
      sourceText: "An invalid email address shows a validation message.",
      verdict: "PASS",
      explanation: "Validation message appeared and no invitation was created.",
      assertionResults: [assertionResult],
    });

    expect(decision.actions).toHaveLength(1);
    expect(verdict.verdict).toBe("PASS");
  });

  it("validates persisted run metadata and events", () => {
    const config = defineProofConfig({
      app: {
        baseUrl: "http://127.0.0.1:3100",
        startCommand: "pnpm --filter demo-app dev",
        readyPath: "/health",
        allowedOrigins: ["http://127.0.0.1:3100"],
      },
      criteria: {
        file: "examples/demo-app/acceptance.md",
        maxCriteria: 3,
      },
    });

    const metadata = runMetadataSchema.parse({
      runId: "run-123",
      startedAt: Date.now(),
      config,
      criteria: [
        {
          index: 1,
          sourceText: "First criterion",
          prerequisites: [],
        },
      ],
      artifactRoot: ".proof/runs/run-123",
    });

    const event = runEventSchema.parse({
      runId: "run-123",
      sequence: 0,
      timestamp: Date.now(),
      actor: "system",
      type: "run.started",
      payload: { criteriaCount: 1 },
    });

    const bundle = persistedRunBundleSchema.parse({
      metadata,
      events: [event],
    });

    expect(bundle.events).toHaveLength(1);
  });
});

describe("secret redaction", () => {
  it("resolves auth secrets only from named environment variables", () => {
    const secrets = resolveAuthSecrets(
      {
        loginPath: "/login",
        usernameEnv: "PROOF_TEST_USERNAME",
        passwordEnv: "PROOF_TEST_PASSWORD",
      },
      {
        PROOF_TEST_USERNAME: "demo",
        PROOF_TEST_PASSWORD: "skeptic-demo",
      },
    );

    expect(secrets.usernameSource).toBe("PROOF_TEST_USERNAME");
    expect(secrets.passwordSource).toBe("PROOF_TEST_PASSWORD");
    expect(secrets.password).toBe("skeptic-demo");
  });

  it("redacts configured secret values from schema-safe output", () => {
    const payload = {
      auth: {
        usernameEnv: "PROOF_TEST_USERNAME",
        passwordEnv: "PROOF_TEST_PASSWORD",
        password: "skeptic-demo",
      },
      log: "login failed for skeptic-demo",
    };

    const redacted = redactForPersistence(payload, ["skeptic-demo"]);
    const serialized = safeJsonStringify(payload, ["skeptic-demo"]);

    expect(redacted.auth.password).toBe(REDACTED_SECRET);
    expect(redacted.log).toBe(`login failed for ${REDACTED_SECRET}`);
    expect(serialized.includes("skeptic-demo")).toBe(false);
    expect(serialized.includes("PROOF_TEST_PASSWORD")).toBe(true);
  });
});
