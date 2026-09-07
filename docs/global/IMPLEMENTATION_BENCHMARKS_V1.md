# Implementation Benchmarks — v1

Environment used for these measurements:

```text
Node.js v24.18.0
Windows 10/11 x64
```

Single-run local observations (Node, not browser); real browser/Worker performance varies by device. All Lotofácil computations below run inside a Web Worker in the app, so they never block the UI thread.

## Lotofácil — exact evaluation (`evaluateExactCoverage`)

Canonical enumeration of all `C(25,15) = 3,268,760` possible draws, checked against every ticket in the portfolio.

| Tickets (N) | Time (ms) |
|---:|---:|
| 1 | 282.6 |
| 6 | 812.6 |
| 10 | 1,116.2 |
| 25 | 2,359.8 |
| 50 | 6,357.1 |

Growth is roughly linear in N, as expected (O(M·N) with M = 3,268,760). Because the universe is small enough to enumerate exhaustively, Lotofácil coverage/probability metrics are always reported as `exact`, never `estimated` — unlike Mega-Sena, whose 50,063,860-draw universe requires the exact/estimated split described in `docs/megasena/MEGASENA_IMPLEMENTATION_SPEC.md`.

## Lotofácil — coverage optimizers (LF-03/LF-04)

Heuristic greedy + local search over a **sampled** set of draws (not the full universe), for speed during search; the final portfolio is still evaluated exactly and separately via `evaluateExactCoverage`. N=6, threshold 11+:

| Quality preset | Sample size | Candidate pool | Iterations | Time (ms) |
|---|---:|---:|---:|---:|
| Rápida (`fast`) | 3,000 | 60 | 200 | 259.5 |
| Equilibrada (`balanced`, default) | 8,000 | 150 | 800 | 2,422.5 |
| Profunda (`deep`) | 20,000 | 400 | 2,000 | 14,092.9 |

These concrete values live in `src/modules/lotofacil/domain/coverageOptimizer.ts` (`QUALITY_PRESET_CONFIG`) and are recorded in each generation's audit metadata. Preset changes search effort only, never the underlying mathematics.

## Lotofácil — RMS v2 generation

Structural constraint search (pool assignment with exact parity/range sums + swap-based local search across up to 2 J6 pattern variants), real reference window (contests 3760-3779):

```text
generateRmsV2: 45.8ms, attempts=2 (first valid solution found on the 2nd restart)
```

Default search budget: up to 20 restarts x 2,000 local-search iterations per J6 variant (2 variants). In practice a valid portfolio is found within the first few restarts once the initial pool split satisfies the exact parity/range sums (see "Technical decisions" in `IMPLEMENTATION_REPORT_V1.md` for why that construction step, not just more search iterations, was the fix that made this fast and reliable).

## Mega-Sena

The pre-existing benchmark (`docs/megasena/MEGASENA_BENCHMARKS.md`, `scripts/megasena/benchmark.ts`, `docs/megasena/benchmarks_local.json`) is preserved unmodified and remains the reference for the Mega-Sena domain, per the preservation rule in `00_START_HERE_CLAUDE_CODE.md`. No re-benchmarking of the canonical Mega-Sena functions was performed, since their code was not modified.

## Production bundle (`npm run build`)

```text
dist/index.html                            0.70 kB (gzip 0.43 kB)
dist/assets/index-*.css                   16.55 kB (gzip 3.87 kB)
dist/assets/index-*.js                   419 kB    (gzip 130 kB)
dist/assets/generate.worker-*.js (x2)     ~82 kB each (Lotofacil + Mega-Sena workers, code-split)
```

## Test suite wall-clock time (local)

```text
npm run test:unit           ~24s  (75 tests, 14 files)
npm run test:mega:oracle    ~6s   (24 tests, cross-platform node:test runner)
npm run test:lotofacil:oracle  (subset of test:unit; RMS oracle ~3.6s)
npm run test:e2e             ~80s (13 Playwright scenarios, single worker)
npm run build                ~5-10s
```
