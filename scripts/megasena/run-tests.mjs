#!/usr/bin/env node
/**
 * Cross-platform runner for the preserved Mega-Sena node:test regression
 * suite (tests/megasena/*.test.ts). Mirrors run-tests.sh (kept as the
 * original Bash reference) without requiring Bash on Windows: compiles the
 * legacy CommonJS test files to a temp directory, then runs them with
 * Node's built-in test runner.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
// Kept alongside the project (same drive) rather than the OS temp dir:
// TypeScript's `include` globs misbehave when tsconfig.json and the
// included files live on different drives on Windows.
const tmpDir = path.join(ROOT, ".tmp-megasena-tests");
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    module: "CommonJS",
    moduleResolution: "Node",
    lib: ["ES2022", "DOM"],
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    rootDir: ROOT.replace(/\\/g, "/"),
    outDir: path.join(tmpDir, "out").replace(/\\/g, "/"),
  },
  include: [
    path.join(ROOT, "src", "modules", "megasena", "domain", "**", "*.ts").replace(/\\/g, "/"),
    path.join(ROOT, "tests", "megasena", "**", "*.ts").replace(/\\/g, "/"),
  ],
};

writeFileSync(path.join(tmpDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
// Force CommonJS interpretation for the compiled output, overriding the
// project's own "type": "module" in the nearest ancestor package.json.
mkdirSync(path.join(tmpDir, "out"), { recursive: true });
writeFileSync(path.join(tmpDir, "out", "package.json"), JSON.stringify({ type: "commonjs" }));

function run(command, args, { useShell = false } = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: useShell });
  return result.status ?? 1;
}

try {
  const tscBin = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
  const tscCommand = existsSync(tscBin) ? tscBin : "npx";
  const tscArgs = existsSync(tscBin) ? ["-p", path.join(tmpDir, "tsconfig.json")] : ["tsc", "-p", path.join(tmpDir, "tsconfig.json")];
  const compileExit = run(tscCommand, tscArgs, { useShell: process.platform === "win32" });
  if (compileExit !== 0) {
    console.error("Failed to compile the Mega-Sena legacy test suite.");
    process.exit(compileExit);
  }

  const compiledTestsDir = path.join(tmpDir, "out", "tests", "megasena");
  const testFiles = readdirSync(compiledTestsDir)
    .filter((f) => f.endsWith(".test.js"))
    .map((f) => path.join(compiledTestsDir, f));
  const testExit = run(process.execPath, ["--test", ...testFiles]);
  process.exit(testExit);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
