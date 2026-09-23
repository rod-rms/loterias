/**
 * MEGA-ROLL-001 — Rolling 20 Balanceada v2.1: grouping step ONLY (§2–§3 of
 * `docs/megasena/MEGASENA_ROLLING20_BALANCED_V2_1_SPEC.md`).
 *
 * VALIDATION SPIKE, NOT A STRATEGY. This file is intentionally NOT exported
 * from `./index` and is NOT registered in the Strategy Registry. It exists to
 * prove the G1/G2/G3 grouping algorithm reproduces the audited reference
 * fixture (contest 3056) before any full-implementation task is authorized —
 * the same "reproducible experiment before implementation" discipline as
 * DEC-017. Allocation (§4), structural filters (§5) and the optimizer (§6)
 * are explicitly out of scope here.
 *
 * Pure domain code, zero dependency on `shared/lib` (matching every other
 * file in `src/modules/megasena/domain/`): `deriveRolling20Window` reimplements
 * the same no-look-ahead window derivation as `shared/lib/dataLoaders`'s
 * `referenceWindow` (exactly the 20 draws immediately before the target
 * contest, or `null` on any gap), so this module has no way to see any draw
 * the caller's raw `draws` array doesn't contain, and so it can be compiled
 * and run by the plain Node `node:test` runner used for the Mega-Sena oracle
 * suite (which cannot process the Vite-only `import.meta.env` in
 * `dataLoaders.ts`). `computeRolling20Groups` then takes the already-resolved
 * window.
 */

export const ROLLING20_WINDOW_SIZE = 20;
export const MEGASENA_UNIVERSE_SIZE = 60;
export const ROLLING20_GROUP1_SIZE = 20;

export interface Rolling20DrawInput {
  contest: number;
  numbers: number[];
}

export interface Rolling20Groups {
  g1: number[];
  g2: number[];
  g3: number[];
}

export class Rolling20GroupingError extends Error {
  constructor(public code: "ROLLING20_INCOMPLETE_HISTORY_WINDOW" | "ROLLING20_INSUFFICIENT_SEEN_NUMBERS", message: string) {
    super(message);
    this.name = "Rolling20GroupingError";
  }
}

/**
 * Returns exactly the `targetContest - windowSize .. targetContest - 1` draws
 * from `draws`, or `null` if any contest in that range is missing (§2). This
 * mirrors `shared/lib/dataLoaders`'s `referenceWindow` but is reimplemented
 * here, dependency-free, so the grouping oracle can run under plain
 * `node:test` (see file header).
 */
export function deriveRolling20Window(draws: Rolling20DrawInput[], targetContest: number, windowSize: number = ROLLING20_WINDOW_SIZE): Rolling20DrawInput[] | null {
  const byContest = new Map(draws.map((d) => [d.contest, d] as const));
  const window: Rolling20DrawInput[] = [];
  for (let c = targetContest - windowSize; c < targetContest; c += 1) {
    const draw = byContest.get(c);
    if (!draw) return null;
    window.push(draw);
  }
  return window;
}

/**
 * Computes the G1/G2/G3 partition from `window`, which MUST be exactly the
 * `targetContest - 20 .. targetContest - 1` draws (§2) — the caller (e.g. via
 * `referenceWindow(dataset, targetContest, 20)`) is responsible for that
 * derivation and for no-look-ahead; this function only validates the size.
 *
 * §3 tie-break for G1 (mandatory, deterministic): (1) frequency descending;
 * (2) most recent occurrence in the window descending; (3) number ascending.
 */
export function computeRolling20Groups(window: Rolling20DrawInput[]): Rolling20Groups {
  if (window.length !== ROLLING20_WINDOW_SIZE) {
    throw new Rolling20GroupingError(
      "ROLLING20_INCOMPLETE_HISTORY_WINDOW",
      `Expected exactly ${ROLLING20_WINDOW_SIZE} draws in the window, got ${window.length}.`,
    );
  }

  const frequency = new Array<number>(MEGASENA_UNIVERSE_SIZE + 1).fill(0);
  // Most recent occurrence, measured as the draw's position in the window
  // (0 = oldest of the 20, 19 = the contest immediately before the target) —
  // used ONLY as a deterministic tie-break, never as a predictive weight.
  const lastOccurrenceIndex = new Array<number>(MEGASENA_UNIVERSE_SIZE + 1).fill(-1);
  window.forEach((draw, index) => {
    for (const n of draw.numbers) {
      frequency[n] = (frequency[n] ?? 0) + 1;
      lastOccurrenceIndex[n] = index;
    }
  });

  const seen: number[] = [];
  for (let n = 1; n <= MEGASENA_UNIVERSE_SIZE; n += 1) if ((frequency[n] ?? 0) > 0) seen.push(n);

  if (seen.length < ROLLING20_GROUP1_SIZE) {
    throw new Rolling20GroupingError(
      "ROLLING20_INSUFFICIENT_SEEN_NUMBERS",
      `Only ${seen.length} distinct numbers appeared in the window; at least ${ROLLING20_GROUP1_SIZE} are required to form G1 without including a zero-frequency number.`,
    );
  }

  const ranked = [...seen].sort((a, b) => {
    const freqA = frequency[a]!;
    const freqB = frequency[b]!;
    if (freqA !== freqB) return freqB - freqA; // (1) frequency descending
    const lastA = lastOccurrenceIndex[a]!;
    const lastB = lastOccurrenceIndex[b]!;
    if (lastA !== lastB) return lastB - lastA; // (2) most recent occurrence descending
    return a - b; // (3) number ascending
  });

  const g1 = ranked.slice(0, ROLLING20_GROUP1_SIZE).sort((a, b) => a - b);
  const g1Set = new Set(g1);
  const g2: number[] = [];
  const g3: number[] = [];
  for (let n = 1; n <= MEGASENA_UNIVERSE_SIZE; n += 1) {
    if (g1Set.has(n)) continue;
    if ((frequency[n] ?? 0) === 0) g2.push(n);
    else g3.push(n);
  }

  return { g1, g2, g3 };
}
