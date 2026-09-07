# HANDOFF MANIFEST — Mega-Sena Domain v1

## Package purpose

Auditable Mega-Sena portfolio construction/evaluation domain for direct extraction into the root of the unified `loterias/` React/Vite/TypeScript repository.

No nested application configuration is included. No Mega-Sena UI is included.

## Acceptance status

- TypeScript strict compile check: **PASS**.
- Automated tests: **24/24 PASS**.
- Original Python v0.1 verifier rerun: **PASS**.
- Regenerated Python JSON vs preserved original: **byte-for-byte identical**.
- 60-number mask safety: **PASS using `bigint`**.
- Seed reproducibility: **PASS**.
- Mathematical divergence vs v0.1: **none found**.

Validation environment:

```text
Node.js 22.16.0
TypeScript 5.8.3
Python 3 (standard-library verifier)
Linux x64
```

## Canonical reference checksums

- `reference/megasena/modelo_megasena_cinco_estrategias_v0_1.md`: `770005e135b5b89d1555e2b0671dd9317e30b2c97597d195d3b0d154a9216313`
- `reference/megasena/verificar_modelo.py`: `dac0a4cb91556a9a63e5a5627ff20f146359a51e2d19534df06fde556694d983`
- `reference/megasena/resultados_verificados_original.json`: `2f275eb5776c7c02d352c58db911ef19faa849cbfd618ec8751e46e5e2afa21e`

## Delivered files

### Domain source

- `src/modules/megasena/domain/types.ts` — domain contracts, probability statuses, generation/evaluation results and audit types.
- `src/modules/megasena/domain/constants.ts` — mathematical constants, reference cost marker and operational thresholds.
- `src/modules/megasena/domain/combinatorics.ts` — exact combinations, hit counts and uniform-distinct baseline formula.
- `src/modules/megasena/domain/validation.ts` — canonicalization, validation, duplicate detection and generation-input validation.
- `src/modules/megasena/domain/coverage.ts` — `bigint` masks, exact favourable-draw union, closed-form conditions and explicitly labeled Monte Carlo fallback.
- `src/modules/megasena/domain/overlap.ts` — pairwise intersection matrix, histogram and F4/F5 non-overlap diagnostics.
- `src/modules/megasena/domain/portfolio.ts` — portfolio evaluation, cost, exact-hit expectations and baseline comparisons.
- `src/modules/megasena/domain/optimizer.ts` — seeded uniform control, direct-coverage greedy construction and local search.
- `src/modules/megasena/domain/popularity.ts` — isolated experimental/uncalibrated observable popularity features; no crowding probability.
- `src/modules/megasena/domain/audit.ts` — traceability metadata and exact/estimated/mixed aggregation.
- `src/modules/megasena/domain/random.ts` — deterministic seeded PRNG and constrained uniform ticket generation.
- `src/modules/megasena/domain/index.ts` — domain export barrel.
- `src/modules/megasena/index.ts` — public module entry point exposing generation, evaluation and validation.
- `src/modules/megasena/workers/optimizer.worker.ts` — Web Worker message adapter for heavy generation.

### Automated tests and fixtures

- `tests/megasena/fixtures/resultados_verificados_v0_1.json` — canonical v0.1 oracle fixture.
- `tests/megasena/fixtures/reference_portfolios.json` — concentrated and pairwise-disjoint 7-ticket portfolios.
- `tests/megasena/combinatorics.test.ts` — constants, N=7 uniform baseline and 60-bit `bigint` regression.
- `tests/megasena/validation.test.ts` — canonicalization, invalid tickets, duplicates and generation constraints.
- `tests/megasena/coverage.test.ts` — exact regression against oracle fixture for concentrated/disjoint portfolios.
- `tests/megasena/overlap.test.ts` — intersection and non-overlap sufficient-condition tests.
- `tests/megasena/portfolio.test.ts` — no-prize, expected exact-hit tickets, configurable cost and baseline comparison.
- `tests/megasena/optimizer.test.ts` — seed reproducibility, restrictions, no duplicates and experimental popularity labeling.
- `tests/megasena/invariants.test.ts` — Sena invariance, global relabeling, order invariance, bounds and monotonic F6.

### Documentation

- `docs/megasena/README.md` — integration/testing entry point.
- `docs/megasena/MEGASENA_IMPLEMENTATION_SPEC.md` — normative mathematical and implementation specification.
- `docs/megasena/MEGASENA_UI_CONTRACT.md` — UI/domain input-output contract and wording rules.
- `docs/megasena/MEGASENA_INTEGRATION_NOTES.md` — integration decisions, shared-code candidates and worker/cost guidance.
- `docs/megasena/MEGASENA_KNOWN_LIMITATIONS.md` — exact limits, optimizer/popularity/financial limitations and reproducibility notes.
- `docs/megasena/MEGASENA_BENCHMARKS.md` — summarized local performance observations.
- `docs/megasena/benchmarks_local.json` — raw benchmark result from the acceptance run.

### Reproducible scripts

- `scripts/megasena/run-tests.sh` — relative-path, no-nested-package acceptance test runner.
- `scripts/megasena/benchmark.ts` — benchmark workload for 1/7/10/25/50/100 tickets.
- `scripts/megasena/run-benchmark.sh` — relative-path benchmark compile/run helper.

### Preserved v0.1 reference

- `reference/megasena/modelo_megasena_cinco_estrategias_v0_1.md` — original conceptual document from this conversation.
- `reference/megasena/verificar_modelo.py` — original Python reference/oracle.
- `reference/megasena/resultados_verificados_original.json` — original Python output preserved unchanged.

## Mathematical validation summary

Validated exactly:

- `C(60,6) = 50,063,860`;
- exact hit counts `21,465 / 324 / 1`;
- `K4/K5/K6 = 21,790 / 325 / 1`;
- concentrated portfolio: `49,350 / 1,120 / 7` favourable draws;
- disjoint portfolio: `152,530 / 2,275 / 7` favourable draws;
- disjoint no-prize percentage from v0.1;
- exact uniform-distinct `N=7` baseline;
- `F6=N/50,063,860` invariance;
- global 1..60 relabeling invariance;
- sufficient intersection conditions `r<=1` for disjoint F4 regions and `r<=3` for disjoint F5 regions.

## Experimental / non-proven items

- popularity/rateio features are uncalibrated and do not produce a probability or score;
- greedy + local search is not globally optimal;
- Monte Carlo coverage above exact thresholds is an estimate and is labeled as such;
- BRL 6.00 is a v0.1 reference value, not an immutable production price.

## Integration decisions left to the main session

1. current ticket-cost source/reference date;
2. keep `node:test` or migrate assertions to the unified repo's Vitest convention;
3. benchmark/tune exact F4/F5 thresholds on target browsers/devices;
4. decide whether popularity diagnostics ship in v1 or remain hidden;
5. decide whether seeded-random/probability/audit helpers should be promoted to `src/shared/` after comparing Lotofácil needs.

## Extraction rule

The ZIP is intentionally created with `src/`, `tests/`, `docs/`, `scripts/`, `reference/` and this manifest at its root. Extract it directly into the root of `loterias/`; no manual reorganization should be required.
