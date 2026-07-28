import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const packageRoot = join(repoRoot, "packages/skeptic");
const outputRoot = join(packageRoot, "dist");
const bundlePath = join(outputRoot, "skeptic.mjs");
const manifest = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8"),
);

const workspaceEntrypoints = {
  "@skeptic/core": join(repoRoot, "packages/core/src/index.ts"),
  "@skeptic/evidence": join(repoRoot, "packages/evidence/src/index.ts"),
  "@skeptic/playwright-harness": join(
    repoRoot,
    "packages/playwright-harness/src/index.ts",
  ),
  "@skeptic/report": join(repoRoot, "packages/report/src/index.ts"),
};

function assertNoForbiddenContent(source) {
  const forbiddenPatterns = [
    /\.kiro\//,
    /skeptic-demo/,
    /sk-[A-Za-z0-9]{10,}/,
    /BEGIN PRIVATE KEY/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      throw new Error(`Forbidden content matched ${pattern} in publish bundle`);
    }
  }
}

rmSync(outputRoot, { force: true, recursive: true });
mkdirSync(outputRoot, { recursive: true });

await esbuild.build({
  entryPoints: [join(repoRoot, "packages/cli/src/bin.ts")],
  outfile: bundlePath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external: Object.keys(manifest.dependencies),
  plugins: [
    {
      name: "workspace-packages",
      setup(build) {
        build.onResolve({ filter: /^@skeptic\// }, (args) => {
          const entry = workspaceEntrypoints[args.path];
          if (!entry) {
            throw new Error(`Unsupported workspace import: ${args.path}`);
          }
          return { path: entry };
        });
      },
    },
  ],
});

const bundled = readFileSync(bundlePath, "utf8");
assertNoForbiddenContent(bundled);

// Scaffold templates intentionally contain @skeptic import strings for generated files.
const bundledWithoutScaffold = bundled.replace(
  /(?:var|const)\s+SCAFFOLD_FILES\s*=\s*\{[\s\S]*?\n\};/,
  "",
);

if (
  bundledWithoutScaffold.includes('from "@skeptic/') ||
  bundledWithoutScaffold.includes("from '@skeptic/")
) {
  throw new Error("Publish bundle still contains unresolved @skeptic imports");
}

console.log(
  JSON.stringify({
    ok: true,
    outputRoot,
    bundlePath,
    bytes: bundled.length,
  }),
);
