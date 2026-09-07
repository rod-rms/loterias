# Mega-Sena Known Limitations v1

## Mathematical scope

- The engine assumes every six-number draw from 1..60 is equiprobable.
- It does not predict future draws.
- It does not use hot/cold/overdue-number heuristics.
- It does not use historical draw data in generation or coverage calculations.

## Optimization

- Greedy + local search is not globally optimal and returns the best solution found under its search budget.
- Exact F4 scoring becomes memory-intensive because each ticket contributes 21,790 favourable draw masks before union deduplication.
- Default exact F4 union threshold is 25 tickets unless overlap conditions allow a closed form.
- Default exact F5 union threshold is 500 tickets unless overlap conditions allow a closed form.
- Above exact thresholds, deterministic Monte Carlo is used and explicitly marked `estimated`.
- Browser/device thresholds may need adjustment after production-device benchmarking.

## Constraints

- Extremely restrictive fixed/excluded combinations can make the requested number of distinct tickets impossible. The generator eventually throws rather than duplicating tickets, but v1 does not pre-compute every constrained-space capacity before generation.
- Existing tickets are preserved and count toward the target total; new fixed/excluded constraints do not retroactively invalidate their content.

## Popularity / rateio

- Popularity mode is experimental and uncalibrated.
- There is no calibrated Mega-Sena distribution of user-chosen combinations in the handoff sources.
- v1 intentionally produces no crowding probability and no weighted score.
- Observable popularity features do not alter draw probability.
- v1 popularity diagnostics do not alter the optimizer ranking.

## Financial interpretation

- `F4`/`F5` are probabilities of reaching a prize tier, not probabilities of positive financial return.
- Payout values and prize sharing are not modeled.
- No expected monetary value or ROI is calculated in v1.
- No ticket purchase, Caixa registration, payment or automated betting integration exists.

## Ticket price

- BRL 6.00 is retained only as the v0.1 reference value.
- Production code should provide the configured current price and optional source/reference date.

## Baselines

- The exact formula `1 - C(M-K,N)/C(M,N)` is the unrestricted uniform-distinct portfolio average.
- With explicit generation restrictions, v1 uses a seeded uniform control portfolio rather than claiming the unrestricted average has identical semantics.
- A single seeded control is not the same thing as the average over all portfolios in a restricted ticket space.

## Reproducibility

- Same seed + same input + same algorithm version + same iteration/sample settings reproduces tickets.
- `generatedAt` and measured elapsed time naturally differ across runs.
- For seeded runs, `timeBudgetMs` does not terminate local search; deterministic `maxIterations` takes precedence.

## Test/runtime environment

- Acceptance tests were executed with TypeScript 5.8.3 and Node.js 22.16.0 using `node:test` after compilation.
- The unified app may standardize on Vitest; migrating the harness should preserve all fixture values/invariants.
