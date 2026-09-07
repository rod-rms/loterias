# Mega-Sena Integration Notes

## 1. Copy location

The ZIP root already mirrors the target repository. Extract/copy it directly into the root of `loterias/`.

Do not move the Mega-Sena source into a second application and do not add a nested `package.json`, `vite.config.ts` or `tsconfig.json`.

## 2. Primary import

```ts
import {
  generateMegaSenaPortfolio,
  evaluateMegaSenaPortfolio,
  validateMegaSenaPortfolio
} from "./modules/megasena";
```

All mathematical code is independent of React.

## 3. Existing project configuration

The consuming TypeScript configuration must support:

- target ES2020 or newer (ES2022 recommended);
- `bigint`;
- DOM types for the worker boundary;
- strict type checking recommended.

The existing Vite project should already satisfy these requirements or can be adjusted globally by the main integration session.

## 4. Test-runner decision

This handoff uses Node's built-in `node:test` as the allowed equivalent automated test runner. This keeps the handoff dependency-free and was used for the acceptance run.

If the unified repository standardizes on Vitest, the main integration session may migrate the test imports/assertions without changing the fixtures or mathematical expectations. This is an integration choice, not a mathematical change.

## 5. Candidate shared modules

The following are intentionally kept inside Mega-Sena in this handoff to avoid redesigning global architecture, but are candidates for `src/shared/` if Lotofácil needs equivalent behavior:

- deterministic seeded PRNG utilities;
- generic probability metric/result-status types;
- generic audit metadata helpers;
- generic Web Worker request/result envelope;
- baseline comparison formatting utilities.

Only extract them after confirming identical semantics across modalities.

## 6. Ticket cost source

The domain exposes the v0.1 BRL 6.00 value only as a reference fallback. The final app needs one authoritative configuration/source for current ticket cost and reference date.

Recommended application-level ownership:

```text
public/data/... or a shared runtime configuration service
```

Do not hard-code current prices in UI components.

## 7. Existing-ticket semantics

`numberOfTickets` is total target count including `existingTickets`.

Fixed/excluded constraints apply to newly generated tickets, not retroactively to existing user tickets. If the product requirement intends another interpretation, change it explicitly in one place and update tests/docs.

## 8. Baseline semantics

- no explicit restrictions: exact average over uniformly selected portfolios of `N` distinct tickets;
- fixed/excluded/existing restrictions: deterministic same-restriction uniform control portfolio.

A future enhancement may derive exact restricted-space baseline formulas for some classes of constraints.

## 9. Web Worker wiring

The worker module is framework-neutral. A Vite integration can instantiate it with the repository's standard worker pattern, for example using `new Worker(new URL(..., import.meta.url), { type: "module" })` in the UI adapter. Keep this code out of the domain layer.

## 10. No UI included

No Mega-Sena UI has been implemented in this handoff. The only UI-facing artifact is the contract document and the worker message boundary.

## 11. No runtime public data required in v1

The domain is self-contained and does not require `public/data/megasena/` for the current mathematical engine. The canonical research/oracle files live in `reference/megasena/` and test-only data lives in `tests/megasena/fixtures/`.

## 12. Integration decisions still required

The main session should decide:

1. authoritative current ticket-cost source and update cadence;
2. whether the unified repo keeps `node:test` or converts these tests to Vitest;
3. production browser thresholds for exact F4/F5 after benchmarking on target devices;
4. UI controls for quality/iterations/sample size, if exposed at all;
5. whether popularity remains diagnostics-only (recommended for v1) or is postponed entirely;
6. whether generic seeded-random/audit/probability utilities should move to `src/shared/` after Lotofácil code is compared.
