# Changelog

All notable changes to Alpha Bot are documented here, one entry per phase (and
per significant change within a phase).

## [Phase 2] - 2026-09-20

Attack payload library & visible form interaction.

### Added

- `src/bot/payloads.ts`: `Payload` type (`id`, `category`, `value`,
  `description`), `PAYLOADS` library, and `payloadsByCategory()`.
- `src/bot/formInteraction.ts`: `discoverFields()` — finds visible typeable
  `input`/`textarea` fields and resolves a submit strategy (enclosing form's
  submit button, page-level submit button, or Enter).
- `src/bot/runAttackSequence.ts`: `runAttackSequence()` — for each field x each
  payload, types character-by-character (75ms delay via `pressSequentially`),
  submits, waits ~800ms, and logs every attempt to the `[Alpha Bot]` output
  channel. No result verification (Phase 3).
- `scripts/formInteraction.check.ts`: end-to-end Phase 2 verification against a
  local login form (passes).

### Changed

- `src/extension.ts`: after a successful launch, `alphaBot.runScan` now runs the
  attack sequence on the page and reports the attempt count.
- `scripts/runValidationCheck.js`: now accepts a check-file argument so it can
  run either verification script.

### Payload set used (for reproducibility)

SQL injection (`sqli`):
- `sqli-1`: `' OR '1'='1` — classic always-true string condition.
- `sqli-2`: `' OR 1=1--` — always-true numeric condition with a line comment.
- `sqli-3`: `admin'--` — comments out the password check after a known username.

Cross-site scripting (`xss`):
- `xss-1`: `<script>alert(1)</script>` — canonical inline-script probe.
- `xss-2`: `<img src=x onerror=alert(1)>` — onerror handler probe.
- `xss-3`: `"><svg onload=alert(1)>` — attribute-breakout + SVG onload.

Authentication bypass (`authBypass`):
- `authbypass-1`: `' OR 1=1--` — always-true WHERE clause, comment out password.
- `authbypass-2`: `admin' OR '1'='1` — admin-targeted always-true OR condition.

## [Phase 1] - 2026-09-20

Core bot: launch a visible browser, safely.

### Added

- `playwright` dependency; Chromium installed via `npx playwright install
  chromium` (documented in README).
- `src/bot/targetValidation.ts`: `validateTarget()` — Rule 5 safety guard.
  Permits only `localhost`/`127.0.0.1` (http/https, numeric port); rejects
  `0.0.0.0`, IPv6 `::1`, other IPs, and all domains.
- `src/bot/launchBot.ts`: `launchBot()` — validates first, then launches a
  visible Chromium window (`headless: false`) and navigates to the target;
  returns a `BotSession` for later phases, or `undefined` on rejection/failure.
- `scripts/validateTarget.check.ts` + `scripts/runValidationCheck.js`: verifies
  the required validation cases (all pass).

### Changed

- `src/extension.ts`: `alphaBot.runScan` now prompts for a target URL, shows the
  output channel, and calls `launchBot` (replacing the Phase 0 readiness
  message).
- `README.md`: added Playwright install and OWASP Juice Shop (Docker) steps.

## [Phase 0] - 2026-09-20

Environment & extension scaffold.

### Added

- Manual TypeScript VS Code extension scaffold.
- `package.json` with identity ("Alpha Bot"), the `alphaBot.runScan` command
  (title "Alpha Bot: Run Scan"), and esbuild/typescript tooling.
- `src/extension.ts`: `activate`/`deactivate`, `alphaBot.runScan` registration
  (shows "Alpha Bot is ready."), and the shared `[Alpha Bot]` output channel.
- `esbuild.js` bundler config (bundles to `dist/extension.js`).
- `tsconfig.json` for type-checking.
- `.vscode/launch.json` and `.vscode/tasks.json` so F5 opens the Extension
  Development Host.
- `.gitignore` (`node_modules/`, `out/`, `dist/`, `*.vsix`).
- Initial `README.md`, `docs/ARCHITECTURE.md`, and this changelog.
- Initialized git repository.
