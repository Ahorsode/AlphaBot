// esbuild bundler configuration for the Alpha Bot VS Code extension.
//
// Bundles src/extension.ts into dist/extension.js as a CommonJS module for the
// VS Code extension host. The `vscode` module and `playwright` are marked
// external: `vscode` is provided by the host at runtime, and `playwright`
// (added in Phase 1) ships its own binaries and must not be bundled.
//
// Usage:
//   node esbuild.js              development build
//   node esbuild.js --watch      rebuild on change
//   node esbuild.js --production minified production build

const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  const context = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode", "playwright"],
    logLevel: "info"
  });

  if (watch) {
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
