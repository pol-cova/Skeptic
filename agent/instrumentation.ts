import { defineInstrumentation } from "eve/instrumentation";

import {
  formatProviderLog,
  resolveProviderOrThrow,
} from "./lib/provider-setup.ts";
import { verificationSession } from "./lib/verification-session.ts";

const provider = resolveProviderOrThrow();

export default defineInstrumentation({
  recordInputs: false,
  recordOutputs: false,
  events: {
    "step.started"() {
      verificationSession.update((current) => ({
        ...current,
        inferenceCount: current.inferenceCount + 1,
      }));

      return {
        runtimeContext: {
          "skeptic.provider": provider.provider,
          "skeptic.model": provider.modelId,
          "skeptic.credential_source": provider.credentialSource,
          "skeptic.inference_count": verificationSession.get().inferenceCount,
          ...formatProviderLog(provider),
        },
      };
    },
  },
});
