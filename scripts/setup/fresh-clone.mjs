import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(repoRoot, "node_modules"))) {
  console.error("Run `pnpm install --frozen-lockfile` before setup.");
  process.exit(1);
}

console.log("Installing Playwright Chromium...");
run("pnpm", ["exec", "playwright", "install", "chromium"]);

console.log("Building the publishable Skeptic package...");
run("pnpm", ["--filter", "@pol-cova/skeptic", "run", "build"]);

console.log("Validating CLI help...");
run("node", ["--experimental-strip-types", "packages/cli/src/bin.ts", "--help"]);

console.log(
  [
    "",
    "Setup complete.",
    "Next steps:",
    "  1. pnpm demo:dev",
    "  2. export PROOF_TEST_USERNAME=demo PROOF_TEST_PASSWORD=skeptic-demo",
    "  3. pnpm skeptic verify --config examples/demo-app/proof.config.ts --deterministic",
    "",
  ].join("\n"),
);
