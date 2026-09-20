# Alpha Bot — Architecture

This document is a running technical description of every module in Alpha Bot.
Each file gets a section covering what it does, what it depends on, and how it
fits into the overall pipeline. It is updated in the same step as the code.

## Overview

Alpha Bot is a VS Code extension. When the user runs the `Alpha Bot: Run Scan`
command, the extension will (across phases) validate a target URL, launch a
visible browser against it, discover form fields, and visibly type security-test
payloads into them.

Pipeline (target end state):

```
alphaBot.runScan (extension.ts)
  -> prompt for target URL
  -> targetValidation.ts   (localhost-only guard)   [Phase 1]
  -> launchBot.ts          (visible Chromium)        [Phase 1]
  -> formInteraction.ts    (discover fields)         [Phase 2]
  -> runAttackSequence.ts  (type + submit payloads)  [Phase 2]
       using payloads.ts   (payload library)         [Phase 2]
```

## Modules

### `src/extension.ts`

The extension entry point.

- **Purpose:** Activates the extension, registers the `alphaBot.runScan`
  command, and owns the shared "Alpha Bot" output channel.
- **Exports:**
  - `activate(context)` — registration hook called by VS Code.
  - `deactivate()` — cleanup hook; disposes the output channel.
  - `getOutputChannel()` — returns the shared output channel, created lazily.
  - `log(message)` — appends a `[Alpha Bot]`-prefixed line to that channel.
- **Depends on:** the `vscode` API.
- **Pipeline role:** Registers `alphaBot.runScan`. When invoked, the command
  prompts the user for a target URL (VS Code input box), shows the output
  channel, and calls `launchBot` (Phase 1). Later phases add form interaction
  and the attack sequence on the returned page.

### `src/bot/targetValidation.ts`

The safety guard (Operating Rule 5).

- **Purpose:** Decides whether a candidate URL is a permitted Alpha Bot target.
  It exists so Alpha Bot can never point a browser or attack logic at anything
  other than the local machine — this is why it runs before any browser work.
- **Exports:**
  - `validateTarget(rawUrl)` — returns a `TargetValidationResult`
    (`{ valid, reason, normalizedUrl? }`).
  - `TargetValidationResult` — the result interface.
- **Rules enforced:** the URL must parse; scheme must be `http`/`https`;
  hostname must be exactly `localhost` or `127.0.0.1`; any explicit port must be
  numeric (1-65535). Everything else — `0.0.0.0`, IPv6 loopback `::1`, other
  IPs, and all domain names — is rejected.
- **Depends on:** the global `URL` parser only (no VS Code / Playwright imports),
  which keeps it trivially unit-testable.
- **Verification:** `scripts/validateTarget.check.ts` (run via
  `node scripts/runValidationCheck.js`) exercises the required cases —
  `http://localhost:3000` and `http://127.0.0.1:8080` valid;
  `http://example.com` and `http://192.168.1.5:3000` rejected — plus `::1`,
  `0.0.0.0`, scheme, and parse-failure cases.

### `src/bot/launchBot.ts`

The browser launcher.

- **Purpose:** Validates the target (calling `validateTarget` FIRST), and only
  if permitted launches a visible Chromium window and navigates to it.
- **Exports:**
  - `launchBot(rawUrl)` — returns a `BotSession` (`{ browser, page, targetUrl }`)
    on success, or `undefined` if the target was rejected or launch failed.
  - `BotSession` — the live session interface, returned for later phases.
- **Behavior on rejection:** logs the reason to the output channel, shows a
  VS Code error message, and returns `undefined` without launching anything.
- **Behavior on success:** `chromium.launch({ headless: false })`, opens a page,
  and `page.goto(targetUrl)`.
- **Depends on:** `playwright` (`chromium`), `vscode` (error messages),
  `targetValidation`, and the `log` helper from `extension.ts`.
- **Pipeline role:** The bridge between the command and the browser. Phase 2
  consumes the returned `page`.

### `src/bot/payloads.ts`

The payload library.

- **Purpose:** Defines the security-test payloads Alpha Bot types into forms.
- **Exports:**
  - `Payload` — `{ id, category, value, description }`.
  - `PayloadCategory` — `"sqli" | "xss" | "authBypass"`.
  - `PAYLOADS` — readonly array of all payloads (3 SQLi, 3 XSS, 2 auth-bypass).
  - `payloadsByCategory(category)` — filter helper.
- **Depends on:** nothing (pure data + a filter).
- **Content policy:** only standard, widely-documented examples suitable for a
  deliberately vulnerable app (Juice Shop); no exotic payloads. The exact list
  is recorded in `CHANGELOG.md` for reproducibility.

### `src/bot/formInteraction.ts`

Form field discovery.

- **Purpose:** Given a page, finds the visible typeable fields and how to submit
  each one.
- **Exports:**
  - `discoverFields(page)` — returns `DiscoveredField[]` in DOM order.
  - `DiscoveredField` — `{ locator, label, submit }` where `submit` is either
    `"enter"` or a submit-button `Locator`.
- **Behavior:** iterates `input, textarea`; keeps only visible elements; skips
  non-text input types (checkbox, radio, file, submit, hidden, etc.); builds a
  readable label from name/id/placeholder/type; resolves a submit strategy from
  the enclosing `<form>`, else a page-level submit button, else Enter.
- **Depends on:** Playwright types (`Page`, `Locator`).

### `src/bot/runAttackSequence.ts`

Attack orchestration.

- **Purpose:** Drives the visible typing for the whole page.
- **Exports:**
  - `runAttackSequence(page, log, payloads?)` — for each discovered field, for
    each payload: clears the field, types it character-by-character
    (`pressSequentially`, 75ms delay), submits, waits ~800ms, and logs the
    attempt. Returns the total attempt count.
  - `LogFn` — the logger callback type (decouples this module from VS Code).
- **Scope boundary:** does NOT verify whether a payload worked — that is Phase 3.
  It only types, submits, and logs.
- **Depends on:** `formInteraction`, `payloads`, Playwright `Page`.
- **Pipeline role:** the last Phase 2 stage; called by `extension.ts` with the
  `page` from `launchBot` and the `log` helper.

### Verification scripts (`scripts/`)

Not shipped with the extension; run via `node scripts/runValidationCheck.js
[checkFile]` (bundled in-process with the esbuild JS API).

- `validateTarget.check.ts` — the Rule 5 validation cases (all pass).
- `formInteraction.check.ts` — an end-to-end Phase 2 check: serves a local login
  form, runs the real `runAttackSequence` headlessly, and asserts 2 fields were
  discovered, the payload was typed into each, and attempts were logged in order
  (passes).

## Build & tooling

- **esbuild** (`esbuild.js`) bundles `src/extension.ts` to `dist/extension.js`
  as a CommonJS module for the VS Code extension host. `vscode` and
  `playwright` are marked external.
- **TypeScript** (`tsconfig.json`) provides type-checking (`npm run typecheck`);
  esbuild handles the actual transpilation/bundling.
- **Launch** (`.vscode/launch.json` + `.vscode/tasks.json`) — F5 runs the
  default build task then opens the Extension Development Host.

## Decisions (Rule 1 log)

- **Scaffold method: manual TypeScript setup** rather than `yo code`. Avoids a
  global generator dependency and keeps every file explicit and reviewable.
- **Bundler: esbuild** — fast, standard for modern VS Code extensions.
- **`engines.vscode` / `@types/vscode`: `^1.90.0`** — a recent, widely-available
  baseline compatible with the locally installed VS Code (1.134.0).
- **IPv6 loopback `::1`: rejected** (confirmed) — only literal `localhost` and
  `127.0.0.1` are permitted targets.
- **Target input: VS Code input box** on command run (Phase 1 prompt says this
  is sufficient); default value `http://localhost:3000`.
- **Typing delay: 75ms/char; post-submit wait: ~800ms** — cosmetic values so
  typing is visible on screen; tunable after observing a run.
- **`runAttackSequence` takes a `LogFn`** rather than importing the VS Code
  output channel directly, so the module stays unit-testable.
