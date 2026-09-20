// One-off runner: bundles a TypeScript check file with the esbuild JS API,
// then executes it in-process. Not part of the shipped extension.
//
// Usage: node scripts/runValidationCheck.js [checkFile]
//   default checkFile = validateTarget.check.ts
const esbuild = require("esbuild");
const path = require("path");
const Module = require("module");

async function main() {
  const file = process.argv[2] || "validateTarget.check.ts";
  const entry = path.join(__dirname, file);
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["playwright"],
    write: false
  });

  const code = result.outputFiles[0].text;
  const m = new Module(file);
  m.filename = entry;
  m.paths = Module._nodeModulePaths(path.dirname(entry));
  m._compile(code, entry.replace(/\.ts$/, ".js"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
