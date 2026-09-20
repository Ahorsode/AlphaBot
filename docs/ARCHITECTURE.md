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
- **Pipeline role:** Currently the whole pipeline — in Phase 0 the command
  simply logs and shows "Alpha Bot is ready." Later phases will call into the
  `src/bot/*` modules from here.

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
