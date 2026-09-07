# Mega-Sena Domain Handoff v1

This directory documents the TypeScript Mega-Sena domain engine delivered for integration into the unified `loterias` React/Vite repository.

## What is included

- pure TypeScript mathematical/domain engine;
- deterministic generator/optimizer;
- Web Worker adapter;
- automated tests and canonical fixtures;
- original v0.1 Python oracle/reference files;
- implementation/UI/integration/limitation documentation;
- local benchmark script and results.

No Mega-Sena UI, purchase flow, Caixa registration integration, historical prediction model, or generative-AI dependency is included.

## Main import

```ts
import {
  generateMegaSenaPortfolio,
  evaluateMegaSenaPortfolio,
  validateMegaSenaPortfolio
} from "./src/modules/megasena";
```

## TypeScript compile check

From the unified repository root, with TypeScript available:

```bash
npx tsc --noEmit
```

This handoff was independently checked in `strict` mode with ES2022 + DOM libraries.

## Run the supplied acceptance tests

The handoff uses Node's built-in `node:test`, an allowed equivalent to Vitest. A helper script is included:

```bash
bash scripts/megasena/run-tests.sh
```

Requirements:

- Node.js 22+;
- TypeScript compiler available as `npx tsc` or `tsc`.

The helper creates a temporary compile directory and removes it afterward. It does not create or require a nested package configuration.

If the unified repo uses Vitest, the integration session may port the test imports while keeping the same fixtures and assertions.

## Run benchmarks

```bash
bash scripts/megasena/run-benchmark.sh
```

or use the repository's TS runner to execute:

```text
scripts/megasena/benchmark.ts
```

See `MEGASENA_BENCHMARKS.md` for the acceptance-run observations.

## Canonical reference

Do not edit the v0.1 oracle files under `reference/megasena/` when changing TypeScript code. They are preserved as historical regression references.
