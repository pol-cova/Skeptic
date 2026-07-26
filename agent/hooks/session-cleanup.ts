import { defineHook } from "eve/hooks";

import { closeHarnessIfOpen } from "../lib/verification-session.ts";

export default defineHook({
  events: {
    async "session.completed"() {
      await closeHarnessIfOpen();
    },
  },
});
