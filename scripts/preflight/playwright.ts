import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end("<main><h1>Skeptic preflight</h1></main>");
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
assert(address && typeof address === "object");

const screenshotPath = path.join(
  process.cwd(),
  ".proof",
  "preflight",
  "chromium.png",
);

let browser;

try {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}`);
  await assert.doesNotReject(() =>
    page.getByRole("heading", { name: "Skeptic preflight" }).waitFor(),
  );
  await page.screenshot({ path: screenshotPath });

  console.log(
    JSON.stringify({
      browser: "chromium",
      browserVersion: browser.version(),
      screenshot: path.relative(process.cwd(), screenshotPath),
    }),
  );
} finally {
  await browser?.close();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
