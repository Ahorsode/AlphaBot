// End-to-end check for Phase 2: spins up a local login form, runs the real
// discoverFields + runAttackSequence against it (headless), and asserts that
// fields were found, payloads were typed, and attempts were logged.
// Bundled + executed via scripts/runValidationCheck-style runner. Not shipped.

import * as http from "http";
import { chromium } from "playwright";
import { runAttackSequence } from "../src/bot/runAttackSequence";
import type { Payload } from "../src/bot/payloads";

const PAGE_HTML = `<!doctype html><html><head><title>Test Login</title></head>
<body>
  <h1>Login</h1>
  <form method="GET" action="/">
    <input id="email" name="email" type="text" placeholder="Email" />
    <input id="password" name="password" type="password" placeholder="Password" />
    <button type="submit">Log in</button>
  </form>
</body></html>`;

async function main() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(PAGE_HTML);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}/`;

  const logs: string[] = [];
  const log = (m: string) => {
    logs.push(m);
    console.log(`[Alpha Bot] ${m}`);
  };

  // Use a single fast payload to keep the smoke test quick.
  const testPayloads: Payload[] = [
    { id: "sqli-1", category: "sqli", value: "' OR '1'='1", description: "test" }
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const attempts = await runAttackSequence(page, log, testPayloads);

    const problems: string[] = [];
    if (attempts !== 2) problems.push(`expected 2 attempts (2 fields x 1 payload), got ${attempts}`);
    if (!logs.some((l) => l.includes("Discovered 2 field"))) problems.push("did not discover 2 fields");
    if (!logs.some((l) => l.includes("email"))) problems.push("email field not logged");
    if (!logs.some((l) => l.includes("password"))) problems.push("password field not logged");
    if (!logs.some((l) => l.includes("sqli-1"))) problems.push("payload not logged");

    if (problems.length > 0) {
      console.error("\nFAILURES:\n - " + problems.join("\n - "));
      process.exitCode = 1;
    } else {
      console.log("\nPHASE 2 E2E PASSED");
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
