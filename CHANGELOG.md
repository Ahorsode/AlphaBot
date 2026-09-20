# Changelog

All notable changes to Alpha Bot are documented here, one entry per phase (and
per significant change within a phase).

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
