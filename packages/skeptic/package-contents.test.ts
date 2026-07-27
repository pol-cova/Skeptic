import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(import.meta.dirname, "../..");
const packageRoot = join(repoRoot, "packages/skeptic");
const distRoot = join(packageRoot, "dist");

describe("publishable package contents", () => {
  it("builds a single runtime bundle without tests or internal docs", () => {
    expect(existsSync(join(distRoot, "skeptic.mjs"))).toBe(true);

    const bundled = readFileSync(join(distRoot, "skeptic.mjs"), "utf8");
    expect(bundled.length).toBeGreaterThan(10_000);
    expect(bundled).toContain("runCli");
    expect(bundled).not.toContain(".test.ts");
    expect(bundled).not.toContain(".kiro");
  });

  it("does not include demo credentials or secret placeholders in the bundle", () => {
    const bundled = readFileSync(join(distRoot, "skeptic.mjs"), "utf8");
    const forbidden = [/skeptic-demo/, /\.kiro\//, /sk-[A-Za-z0-9]{10,}/, /BEGIN PRIVATE KEY/];

    for (const pattern of forbidden) {
      expect(bundled).not.toMatch(pattern);
    }
  });

  it("packs the built artifact with bin wiring and pinned dependencies", () => {
    execSync("pnpm run build", {
      cwd: packageRoot,
      stdio: "pipe",
    });

    const packDestination = join(packageRoot, ".pack-tmp");
    execSync(`mkdir -p "${packDestination}"`, { stdio: "pipe" });
    execSync(`pnpm pack --pack-destination "${packDestination}"`, {
      cwd: packageRoot,
      stdio: "pipe",
    });

    const tarball = readdirSync(packDestination).find((name) => name.endsWith(".tgz"));
    expect(tarball).toBeDefined();

    const listing = execSync(`tar -tzf "${join(packDestination, tarball!)}"`, {
      encoding: "utf8",
    });
    expect(listing).toContain("package/bin.js");
    expect(listing).toContain("package/dist/skeptic.mjs");
    expect(listing).not.toContain(".kiro");

    const manifest = JSON.parse(
      readFileSync(join(packageRoot, "package.json"), "utf8"),
    );
    expect(manifest.dependencies.playwright).toBe("1.61.1");
    expect(manifest.dependencies.commander).toBe("14.0.3");
  });
});
