// Standalone verification for validateTarget (Phase 1 required test cases).
// Bundled by esbuild and executed with node; not shipped with the extension.
import { validateTarget } from "../src/bot/targetValidation";

const cases: Array<{ url: string; expectValid: boolean }> = [
  { url: "http://localhost:3000", expectValid: true },
  { url: "http://127.0.0.1:8080", expectValid: true },
  { url: "http://example.com", expectValid: false },
  { url: "http://192.168.1.5:3000", expectValid: false },
  // Confirmed decision: IPv6 loopback is rejected.
  { url: "http://[::1]:3000", expectValid: false },
  { url: "http://0.0.0.0:3000", expectValid: false },
  { url: "http://localhost", expectValid: true },
  { url: "https://127.0.0.1", expectValid: true },
  { url: "ftp://localhost", expectValid: false },
  { url: "not a url", expectValid: false }
];

let failures = 0;
for (const c of cases) {
  const r = validateTarget(c.url);
  const ok = r.valid === c.expectValid;
  if (!ok) failures++;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${c.url}  -> valid=${r.valid} (expected ${c.expectValid})  ${r.reason}`);
}

console.log(failures === 0 ? "\nALL CASES PASSED" : `\n${failures} CASE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
