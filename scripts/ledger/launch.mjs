#!/usr/bin/env node
/**
 * Launcher for the ledger scripts: bundles a TypeScript entry with esbuild (already a dependency of Vite) so the real
 * src/ code runs unchanged under Node (src/shared/lib/dataLoaders.ts reads import.meta.env at load time), then runs it.
 *
 *   node scripts/ledger/launch.mjs run|validate|backtest|backtest-validate [args...]   (backtest = ANL-002, same bundling)
 */
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [which, ...rest] = process.argv.slice(2);
const entries = { run: "cli.ts", validate: "validate.ts", backtest: "../backtest/cli.ts", "backtest-validate": "../backtest/validate.ts" };
if (!entries[which]) {
  console.error("usage: node scripts/ledger/launch.mjs run|validate|backtest|backtest-validate [args...]");
  process.exit(2);
}
const out = mkdtempSync(path.join(tmpdir(), "ledger-"));
try {
  const outfile = path.join(out, `${which}.mjs`);
  await build({
    entryPoints: [path.join(here, entries[which])],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    define: { "import.meta.env": "{}" },
    logLevel: "error",
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  });
  const res = spawnSync(process.execPath, [outfile, ...rest], { stdio: "inherit", env: { ...process.env, LEDGER_VALIDATE_CLI: which === "validate" ? "1" : "", BACKTEST_VALIDATE_CLI: which === "backtest-validate" ? "1" : "" } });
  process.exitCode = res.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
