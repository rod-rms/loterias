# Mega-Sena Local Benchmarks

Environment used for this handoff:

```text
Node.js v22.16.0
Linux x64
```

Single-run local observations; these are not browser SLAs.

| Tickets | Validation ms | Overlap ms | F4 ms | F5 ms | Baseline ms | Optimization ms |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0.261 | 0.237 | 0.194 | 0.118 | 0.103 | 9.515 |
| 7 | 0.015 | 0.225 | 0.125 | 0.117 | 0.075 | 88.136 |
| 10 | 0.033 | 0.491 | 93.172 | 0.171 | 0.008 | 126.170 |
| 25 | 0.034 | 1.809 | 293.284 | 0.703 | 0.010 | 323.087 |
| 50 | 0.057 | 2.261 | 62.252 | 7.244 | 0.016 | 73.125 |
| 100 | 0.082 | 7.895 | 53.379 | 17.506 | 0.023 | 165.065 |

## Benchmark configuration

- `F4`: exact union up to 25 tickets unless a closed-form intersection condition applies; deterministic Monte Carlo with 10,000 samples above that threshold in this benchmark.
- `F5`: exact for all listed portfolio sizes.
- Optimization column: `quina_or_better`, small interactive-scale search budget (8 iterations/12 candidates for <=10 tickets; 3 iterations/6 candidates above 10), with a 5,000-draw evaluation sample available if needed.

The non-monotonic F4 times are expected: some small portfolios satisfy the closed-form non-overlap condition and avoid enumeration, while larger portfolios above the exact threshold use a bounded sample rather than constructing a large `Set<bigint>`.

Raw output is in `benchmarks_local.json` and the reproducible benchmark script is `scripts/megasena/benchmark.ts`.
