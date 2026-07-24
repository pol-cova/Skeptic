export function persistenceEnabled(): boolean {
  return process.env.DEMO_PERSIST_INVITATIONS === "true";
}

export function demoCredentials(): { username: string; password: string } {
  return {
    username: process.env.PROOF_TEST_USERNAME ?? "demo",
    password: process.env.PROOF_TEST_PASSWORD ?? "skeptic-demo",
  };
}
