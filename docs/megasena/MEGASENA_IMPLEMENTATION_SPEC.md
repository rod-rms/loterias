# Mega-Sena Domain Engine — Implementation Specification v1

Status: normative for the Mega-Sena handoff module.

## 1. Purpose

This module is an auditable portfolio construction and evaluation engine for Mega-Sena under equiprobable 6-of-60 draws. It is not a draw prediction engine. The domain layer is TypeScript-only and has no React or generative-AI dependency.

The engine separates five concerns:

1. distinct elementary tickets;
2. combinatorial coverage (`F4`, `F5`, `F6`);
3. dependency/overlap diagnostics;
4. deterministic computational optimization;
5. an isolated, uncalibrated experimental popularity layer.

## 2. Game universe

- Valid numbers: integers from 1 through 60.
- Elementary ticket: exactly 6 distinct valid numbers.
- Draw/result: exactly 6 distinct valid numbers.
- Internal order is irrelevant.
- Total possible elementary results:

```text
C(60,6) = 50,063,860
```

A ticket is canonicalized by sorting ascending. Duplicate tickets are detected after canonicalization.

## 3. Core definitions

### Ticket

A six-number subset of `{1,...,60}`.

### Portfolio

A finite collection of distinct elementary tickets for the same draw.

### Result

The six-number subset drawn by the lottery.

### Exact hits

For ticket `s` and draw `D`, exact hits are `|s ∩ D|`.

For one elementary ticket, the number of draw results with exactly `h` hits is:

```text
C(6,h) * C(54,6-h)
```

Canonical values:

```text
exactly 4 hits = 21,465
exactly 5 hits =    324
exactly 6 hits =      1
```

Therefore:

```text
K4 = draws with >=4 hits = 21,790
K5 = draws with >=5 hits =    325
K6 = draws with  6 hits =       1
```

### F4

Probability that at least one ticket in the portfolio obtains four or more hits.

```text
F4(S) = |{D : exists s in S, |s ∩ D| >= 4}| / C(60,6)
```

### F5

Probability that at least one ticket obtains five or more hits.

```text
F5(S) = |{D : exists s in S, |s ∩ D| >= 5}| / C(60,6)
```

### F6

Probability that at least one ticket obtains Sena.

For `N` distinct elementary tickets:

```text
F6 = N / 50,063,860
```

No arrangement of the same `N` distinct tickets can improve this value.

### Expected number of winning tickets

For exactly `h` hits:

```text
E[Z_h] = N * C(6,h) * C(54,6-h) / C(60,6)
```

This expectation depends on `N`, not on overlap. Overlap changes the distribution/concentration of wins across possible draws, not this expectation.

### Coverage

The set/number of possible draws for which a portfolio reaches the target threshold at least once.

### Intersection and prize concentration

For tickets `i` and `j`:

```text
r_ij = |s_i ∩ s_j|
```

High intersection can concentrate multiple prizes into fewer draw outcomes. Lower intersection can distribute prize coverage across more draw outcomes.

### Popularity/rateio

Popularity concerns how other players choose tickets. It is logically separate from physical draw probability. The v1 module exposes observable features only and does not produce a calibrated probability of prize sharing.

## 4. System invariants

1. Tickets inside one portfolio must be distinct.
2. Every elementary ticket has exactly six distinct integers in `[1,60]`.
3. For `N` distinct tickets, `F6 = N / 50,063,860`.
4. Changing overlap cannot change `F6` when `N` is unchanged.
5. Changing overlap can change `F4`, `F5`, no-prize probability, and concentration of multiple winning tickets.
6. Potential popularity cannot change physical draw probability.
7. Popularity output must be labeled experimental/uncalibrated.
8. The generator must not claim to predict drawn numbers.
9. Estimated coverage may never be labeled exact.
10. Any 60-number bit representation must be safe beyond 32 bits; this implementation uses `bigint`.

## 5. Public domain contracts

The public module exports the required integration functions:

```ts
import {
  generateMegaSenaPortfolio,
  evaluateMegaSenaPortfolio,
  validateMegaSenaPortfolio
} from "./modules/megasena";
```

`MegaSenaGenerationInput` accepts:

- `numberOfTickets` and/or `budgetBRL`;
- mandatory `ticketCostBRL`;
- objective `quadra_or_better` or `quina_or_better`;
- optional existing tickets;
- optional fixed/excluded numbers;
- optional deterministic seed;
- optional iteration/time/candidate/sample limits;
- popularity mode `off` or `experimental`.

### Number/budget semantics

- `numberOfTickets` is the target total portfolio size, including `existingTickets`.
- When only `budgetBRL` is supplied, target size is `floor(budgetBRL / ticketCostBRL)`.
- When both are supplied, `numberOfTickets` must fit within the budget.
- Existing tickets are validated as legal/distinct but are not rewritten by newly supplied fixed/excluded constraints. Fixed/excluded constraints apply to generated tickets.

## 6. Validation and canonicalization

Implemented capabilities:

- `canonicalizeTicket(ticket)`;
- `ticketKey(ticket)`;
- `validateTicket(ticket)`;
- `validatePortfolio(tickets)` / `validateMegaSenaPortfolio(tickets)`;
- duplicate detection after canonicalization;
- fixed/excluded conflict validation;
- budget/quantity validation.

Invalid data is rejected or returned with explicit issues; it is not silently normalized into a valid but different bet.

## 7. Exact combinatorics

`comb(n,k)` returns `bigint` to preserve exact integer arithmetic.

`countExactHits(h)` reproduces the v0.1 oracle and is tested against the canonical constants.

The reference ticket cost of BRL 6.00 exists only as `REFERENCE_TICKET_COST_BRL_V0_1`. Production callers should pass the current configured price. Price is not treated as an immutable mathematical rule.

## 8. 60-bit representation

Tickets and draws may be represented as `bigint` bitmasks:

```ts
1n << BigInt(number - 1)
```

No JavaScript 32-bit bitwise number mask is used for the 60-number universe. Regression tests explicitly distinguish bits 32, 33 and 60.

## 9. Exact coverage algorithm

For a ticket and threshold `h`, the implementation enumerates only favourable draw results, following the v0.1 Python oracle.

For each hit count from `h` through 6:

1. choose the hit subset from the ticket;
2. choose the remaining non-hit numbers from the 54 numbers outside the ticket;
3. encode the resulting six-number draw as a `bigint` mask;
4. union masks across the portfolio.

Per-ticket enumeration size:

```text
F4: 21,790 masks
F5:    325 masks
F6:      1 mask
```

This avoids blindly enumerating all 50,063,860 possible draws per portfolio evaluation.

### Complexity

Ignoring set/hash constant factors:

```text
F4 exact union: O(N * 21,790)
F5 exact union: O(N * 325)
F6 exact:       O(1) after distinct-ticket validation
```

Memory for exact union is proportional to unique favourable masks. `Set<bigint>` has non-trivial browser overhead, so practical thresholds are intentionally conservative.

## 10. Closed-form coverage from overlap conditions

The module uses proved sufficient conditions before enumerating.

### F4

If every ticket pair satisfies:

```text
r_ij <= 1
```

two tickets cannot both obtain four or more hits in the same six-number draw, because that would require at least `4 + 4 - 1 = 7` drawn numbers.

Therefore F4 regions are pairwise disjoint and:

```text
favourable F4 draws = N * 21,790
```

### F5

If every pair satisfies:

```text
r_ij <= 3
```

two tickets cannot both obtain five or more hits, because that would require at least `5 + 5 - 3 = 7` drawn numbers.

Therefore:

```text
favourable F5 draws = N * 325
```

These are exact formulas under the stated conditions, not heuristics.

## 11. Exact-vs-estimated policy

Default browser-oriented limits:

```text
F4 exact union: up to 25 tickets, unless a closed-form overlap condition applies
F5 exact union: up to 500 tickets, unless a closed-form overlap condition applies
```

Above these thresholds, the default evaluator uses deterministic Monte Carlo over uniformly sampled six-number draws. The returned metric is explicitly:

```text
status: "estimated"
```

and includes sample size and standard error. The thresholds are operational defaults and may be benchmarked/tuned during app integration; they are not mathematical limits.

## 12. Uniform random baseline

For an unrestricted uniformly selected portfolio of `N` distinct elementary tickets, the exact mean probability of hitting a fixed draw at threshold `h` is:

```text
1 - C(M-K_h,N) / C(M,N)
```

where:

```text
M = 50,063,860
```

The implementation evaluates the exact formula numerically with `log1p`/`expm1` to avoid catastrophic cancellation. Returned decimal values are IEEE-754 approximations to the exact rational formula.

Required `N=7` values are regression-tested.

For generation with explicit fixed/excluded/existing-ticket restrictions, the unrestricted closed-form average is not claimed to be the same-restriction average. In that case the generator compares against a deterministic uniformly generated control portfolio under the same explicit restrictions.

## 13. Optimizer v1

The optimizer is deterministic when a seed and iteration budget are supplied.

Pipeline:

1. validate input;
2. resolve target total ticket count;
3. preserve validated existing tickets;
4. construct a same-restriction uniform baseline portfolio;
5. choose threshold from the user objective;
6. perform greedy construction from candidate pools using direct marginal coverage;
7. perform local replacement search using direct portfolio coverage score;
8. never return a result scoring below the seeded uniform control on the optimization objective;
9. independently evaluate the final portfolio and attach audit metadata.

### Exact optimizer objective

When within configured thresholds, candidate/local-search scores are actual favourable-draw coverage counts.

### Sampled optimizer objective

For larger portfolios, the optimizer uses one fixed deterministic sample of uniformly generated draws and maximizes the number of sampled draws covered. This is a direct Monte Carlo estimate of `F4`/`F5`, not an overlap proxy. The final report is labeled estimated where exact evaluation is unavailable.

### Global optimality

The algorithm is greedy + local search. It is not proven globally optimal. User-facing language must say `melhor solução encontrada`, never `solução ótima`, unless a future solver adds a proof/certificate.

### Seed and time budgets

Reproducibility has priority. When `seed` is supplied, `maxIterations` controls deterministic search. `timeBudgetMs` is not used to terminate seeded local search because wall-clock termination would make results machine-dependent; a warning is attached if both are supplied.

Without a seed, `timeBudgetMs` may stop local search between iterations.

## 14. Popularity/rateio layer

`popularity.ts` is separate from coverage and disabled by default.

Current v1 output is:

```text
EXPERIMENTAL / NAO CALIBRADO PARA PROBABILIDADE REAL DE RATEIO
```

Observable ticket features include:

- count of numbers from 1 through 31;
- count above 31;
- adjacent pairs;
- longest consecutive run;
- same-last-digit pairs;
- counts in six ten-number buckets;
- all numbers <=31 / all numbers >31 flags.

No weighted crowding score is produced in v1 because the handoff contains no calibrated Mega-Sena choice-distribution data from which defensible weights can be derived.

The popularity mode therefore reports features but does not alter optimization ranking in v1.

## 15. Global relabeling invariant

For any bijection/permutation of labels `1..60` applied consistently to every ticket, under a uniform 6-of-60 draw model:

- pairwise intersection sizes are preserved;
- `F4` is preserved;
- `F5` is preserved;
- `F6` is preserved.

This is covered by automated regression tests.

## 16. Worker boundary

Heavy generation should run in a Web Worker. `src/modules/megasena/workers/optimizer.worker.ts` defines a small message boundary:

- input: `MegaSenaGenerationInput`;
- success: `{ ok: true, result }`;
- failure: `{ ok: false, error: { name, message } }`.

The domain itself remains synchronous and framework-independent, so it can also run in tests, Node tooling, or a future server process.

## 17. Auditability

Every evaluation/generation result carries metadata including:

- model version;
- algorithm version;
- generation timestamp;
- objective;
- seed where supplied;
- ticket cost and optional source/reference date;
- exact/estimated/mixed evaluation method;
- iterations;
- elapsed time;
- popularity mode;
- warnings.

The mathematical outputs can therefore be reproduced independently from UI state.

## 18. Reference-oracle compatibility

The v1 TypeScript regression suite reproduces the v0.1 Python oracle for:

- `TOTAL = 50,063,860`;
- exact hit counts 21,465 / 324 / 1;
- `K4 = 21,790`, `K5 = 325`, `K6 = 1`;
- concentrated 7-ticket portfolio coverage: 49,350 / 1,120 / 7;
- disjoint 7-ticket portfolio coverage: 152,530 / 2,275 / 7;
- no-prize percentage for disjoint portfolio;
- exact uniform-distinct `N=7` baseline values.

No mathematical divergence from the v0.1 oracle was found during this handoff implementation.
