import { createSeededRandom, randomInt, shuffleInPlace, type RandomSource } from "../../../shared/lib/prng";
import { assignPoolToBuckets as assignPoolToGames, assignPoolToBucketsWithExposureMap } from "../../../shared/lib/degreeAssignment";
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER, RMS_ALGORITHM_VERSION, RMS_HISTORY_WINDOW, RMS_NO_VALID_PORTFOLIO_FOUND } from "./constants";
import { ticketKey } from "./validation";
import type { LotofacilRmsPoolSnapshot, LotofacilTicket } from "./types";

export { assignPoolToGames };

export interface RmsDrawInput {
  contest: number;
  numbers: number[];
}

export interface RmsPattern {
  label: string;
  a: number;
  b: number;
  c: number;
}

const PATTERNS_BASE: RmsPattern[] = [
  { label: "9-3-3", a: 9, b: 3, c: 3 },
  { label: "8-3-4", a: 8, b: 3, c: 4 },
  { label: "8-4-3", a: 8, b: 4, c: 3 },
  { label: "10-2-3", a: 10, b: 2, c: 3 },
  { label: "10-3-2", a: 10, b: 3, c: 2 },
];

const J6_VARIANTS: RmsPattern[] = [
  { label: "9-4-2", a: 9, b: 4, c: 2 },
  { label: "9-2-4", a: 9, b: 2, c: 4 },
];

export class RmsNoValidPortfolioError extends Error {
  code = RMS_NO_VALID_PORTFOLIO_FOUND;
  unsatisfiedConstraints: string[];
  constructor(unsatisfiedConstraints: string[]) {
    super(`RMS v2: no valid portfolio found within search budget. Unsatisfied constraints in best attempt: ${unsatisfiedConstraints.join(", ") || "none (numerical instability)"}`);
    this.unsatisfiedConstraints = unsatisfiedConstraints;
  }
}

export function computeFrequencies(window: RmsDrawInput[]): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let n = LOTOFACIL_MIN_NUMBER; n <= LOTOFACIL_MAX_NUMBER; n += 1) freq[n] = 0;
  for (const draw of window) {
    for (const n of draw.numbers) freq[n] = (freq[n] ?? 0) + 1;
  }
  return freq;
}

/**
 * Builds pools A (15, most frequent), C (5, intermediate) and B (5, least
 * frequent) from the 20-contest reference window. Boundary ties are broken
 * deterministically using the RMS seed (never by claiming one tied number is
 * "more likely" than another).
 */
export function buildPools(window: RmsDrawInput[], random: RandomSource): LotofacilRmsPoolSnapshot {
  if (window.length !== RMS_HISTORY_WINDOW) {
    throw new Error(`RMS v2 requires exactly ${RMS_HISTORY_WINDOW} previous contests, received ${window.length}.`);
  }
  const frequencies = computeFrequencies(window);
  const numbers = Array.from({ length: LOTOFACIL_MAX_NUMBER }, (_, i) => i + 1);

  // Group numbers by frequency value, shuffle within each group deterministically
  // (seeded) to resolve boundary ties without implying predictive ranking.
  const byFrequency = new Map<number, number[]>();
  for (const n of numbers) {
    const f = frequencies[n] ?? 0;
    if (!byFrequency.has(f)) byFrequency.set(f, []);
    byFrequency.get(f)!.push(n);
  }
  const orderedFrequencies = Array.from(byFrequency.keys()).sort((a, b) => b - a);
  const ranked: number[] = [];
  const boundaryTies: LotofacilRmsPoolSnapshot["boundaryTies"] = [];
  for (const f of orderedFrequencies) {
    const group = byFrequency.get(f)!;
    shuffleInPlace([...group], random).forEach((n) => ranked.push(n));
    if (group.length > 1) {
      // Record if this frequency group straddles a pool boundary (15 or 20).
      const startIdx = ranked.length - group.length;
      const endIdx = ranked.length - 1;
      if (startIdx < 15 && endIdx >= 15) boundaryTies.push({ boundary: "A/C", frequency: f, numbers: [...group].sort((x, y) => x - y) });
      if (startIdx < 20 && endIdx >= 20) boundaryTies.push({ boundary: "C/B", frequency: f, numbers: [...group].sort((x, y) => x - y) });
    }
  }

  const poolA = ranked.slice(0, 15).sort((x, y) => x - y);
  const poolC = ranked.slice(15, 20).sort((x, y) => x - y);
  const poolB = ranked.slice(20, 25).sort((x, y) => x - y);

  return {
    fromContest: window[0]!.contest,
    toContest: window[window.length - 1]!.contest,
    frequencies,
    poolA,
    poolB,
    poolC,
    boundaryTies,
  };
}

export function targetExposureSplit(poolSize: number, totalExposure: number): { exposure4Count: number; exposure3Count: number } {
  // poolSize numbers, each exposure 3 or 4, summing to totalExposure.
  const exposure4Count = totalExposure - poolSize * 3;
  return { exposure4Count, exposure3Count: poolSize - exposure4Count };
}

/**
 * Degree-constrained greedy assignment (Havel-Hakimi style): assigns pool
 * members to games such that each game receives exactly its quota from the
 * pool, and each pool member is used exactly its target exposure count.
 * Returns null if the greedy assignment gets stuck (caller should retry with
 * a different seed/shuffle).
 */
function countEven(ticket: number[]): number {
  return ticket.filter((n) => n % 2 === 0).length;
}
function count1to9(ticket: number[]): number {
  return ticket.filter((n) => n >= 1 && n <= 9).length;
}
function count20to25(ticket: number[]): number {
  return ticket.filter((n) => n >= 20 && n <= 25).length;
}
function maxConsecutiveRun(ticket: number[]): number {
  const sorted = [...ticket].sort((a, b) => a - b);
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1]! + 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return sorted.length ? best : 0;
}
function intersectionCount(a: number[], b: number[]): number {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).length;
}

function multisetDiffPenalty(actual: number[], target: number[]): number {
  const a = [...actual].sort((x, y) => x - y);
  const t = [...target].sort((x, y) => x - y);
  let penalty = 0;
  for (let i = 0; i < t.length; i += 1) penalty += Math.abs((a[i] ?? 0) - (t[i] ?? 0));
  return penalty;
}

interface PenaltyBreakdown {
  total: number;
  unsatisfied: string[];
}

function evaluateHardConstraintPenalty(games: number[][]): PenaltyBreakdown {
  let penalty = 0;
  const unsatisfied: string[] = [];

  // Pairwise intersections must be in [7,9].
  for (let i = 0; i < games.length; i += 1) {
    for (let j = i + 1; j < games.length; j += 1) {
      const inter = intersectionCount(games[i]!, games[j]!);
      if (inter < 7) {
        penalty += 7 - inter;
        unsatisfied.push(`intersection[${i},${j}]=${inter}<7`);
      } else if (inter > 9) {
        penalty += inter - 9;
        unsatisfied.push(`intersection[${i},${j}]=${inter}>9`);
      }
    }
  }

  // Parity multiset {5,6,7,7,8,9}.
  const evenCounts = games.map(countEven);
  const parityPenalty = multisetDiffPenalty(evenCounts, [5, 6, 7, 7, 8, 9]);
  penalty += parityPenalty;
  if (parityPenalty > 0) unsatisfied.push(`parity multiset mismatch: ${JSON.stringify(evenCounts)}`);

  // 20-25 multiset {2,3,3,4,4,5}.
  const range2025 = games.map(count20to25);
  const range2025Penalty = multisetDiffPenalty(range2025, [2, 3, 3, 4, 4, 5]);
  penalty += range2025Penalty;
  if (range2025Penalty > 0) unsatisfied.push(`20-25 multiset mismatch: ${JSON.stringify(range2025)}`);

  // 1-9 count in [4,7] per game.
  games.forEach((g, i) => {
    const c = count1to9(g);
    if (c < 4) {
      penalty += (4 - c) * 2;
      unsatisfied.push(`game[${i}] 1-9 count ${c}<4`);
    } else if (c > 7) {
      penalty += (c - 7) * 2;
      unsatisfied.push(`game[${i}] 1-9 count ${c}>7`);
    }
  });

  // Max consecutive run <= 7.
  games.forEach((g, i) => {
    const run = maxConsecutiveRun(g);
    if (run > 7) {
      penalty += (run - 7) * 2;
      unsatisfied.push(`game[${i}] max run ${run}>7`);
    }
  });

  // At least one game without 1 and 2 together.
  const hasGameWithoutOneTwo = games.some((g) => !g.includes(1) && !g.includes(2));
  if (!hasGameWithoutOneTwo) {
    penalty += 3;
    unsatisfied.push("no game without both 01 and 02");
  }
  // At least one game without 13 and 17 together.
  const hasGameWithoutThirteenSeventeen = games.some((g) => !g.includes(13) && !g.includes(17));
  if (!hasGameWithoutThirteenSeventeen) {
    penalty += 3;
    unsatisfied.push("no game without both 13 and 17");
  }

  // Distinct games.
  const keys = new Set(games.map((g) => ticketKey(g)));
  if (keys.size !== games.length) {
    penalty += 10;
    unsatisfied.push("duplicate tickets in portfolio");
  }

  return { total: penalty, unsatisfied };
}

function tieBreakScore(games: number[][]): number {
  let sumAbsDeviation = 0;
  let maxAbsDeviation = 0;
  for (let i = 0; i < games.length; i += 1) {
    for (let j = i + 1; j < games.length; j += 1) {
      const dev = Math.abs(intersectionCount(games[i]!, games[j]!) - 8);
      sumAbsDeviation += dev;
      maxAbsDeviation = Math.max(maxAbsDeviation, dev);
    }
  }
  return sumAbsDeviation * 1000 + maxAbsDeviation;
}

interface PoolAssignment {
  poolLetter: "A" | "B" | "C";
  numbers: number[];
  membership: number[][]; // membership[gameIndex] = numbers from this pool in that game
}

// The wallet-level parity multiset {5,6,7,7,8,9} and 20-25 multiset
// {2,3,3,4,4,5} target fixed SUMS (42 and 21). Because a swap-based local
// search only relocates a number between games without changing its total
// exposure count, these sums are entirely determined by the initial choice
// of WHICH numbers get exposure 4 (vs 3) — never by later game-membership
// swaps. So that choice must hit the exact required sums up front.
const TOTAL_EVEN_NUMBERS_1_TO_25 = 12; // 2,4,...,24
const TOTAL_NUMBERS_20_TO_25 = 6;
const TARGET_EVEN_EXPOSURE_SUM = 5 + 6 + 7 + 7 + 8 + 9; // 42
const TARGET_RANGE_2025_EXPOSURE_SUM = 2 + 3 + 3 + 4 + 4 + 5; // 21
// exposure4Count(evens) solved from: 4*E + 3*(12-E) = 42
const TARGET_EVEN_EXPOSURE4_COUNT = TARGET_EVEN_EXPOSURE_SUM - 3 * TOTAL_EVEN_NUMBERS_1_TO_25;
// exposure4Count(20-25) solved from: 4*R + 3*(6-R) = 21
const TARGET_RANGE_2025_EXPOSURE4_COUNT = TARGET_RANGE_2025_EXPOSURE_SUM - 3 * TOTAL_NUMBERS_20_TO_25;

function isEven(n: number): boolean {
  return n % 2 === 0;
}
function isIn2025(n: number): boolean {
  return n >= 20 && n <= 25;
}

/**
 * Chooses, for each pool, exactly `exposure4Count` members to receive
 * exposure 4 (the rest get 3), such that across all three pools combined the
 * exposure-4 set contains exactly TARGET_EVEN_EXPOSURE4_COUNT even numbers
 * and exactly TARGET_RANGE_2025_EXPOSURE4_COUNT numbers in 20-25. Rejection
 * sampling: cheap per attempt, and the target sums are moderate, so this
 * converges quickly in practice.
 */
function selectExposureHighSets(
  poolDefs: { letter: "A" | "B" | "C"; numbers: number[]; exposure4Count: number }[],
  random: RandomSource,
  maxAttempts = 20000,
): Map<string, Set<number>> | null {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const highSets = new Map<string, Set<number>>();
    let evenCount = 0;
    let rangeCount = 0;
    for (const def of poolDefs) {
      const shuffled = shuffleInPlace([...def.numbers], random);
      const chosen = new Set(shuffled.slice(0, def.exposure4Count));
      highSets.set(def.letter, chosen);
      for (const n of chosen) {
        if (isEven(n)) evenCount += 1;
        if (isIn2025(n)) rangeCount += 1;
      }
    }
    if (evenCount === TARGET_EVEN_EXPOSURE4_COUNT && rangeCount === TARGET_RANGE_2025_EXPOSURE4_COUNT) {
      return highSets;
    }
  }
  return null;
}

function buildInitialAssignment(
  pool: LotofacilRmsPoolSnapshot,
  patterns: RmsPattern[],
  random: RandomSource,
): PoolAssignment[] | null {
  const poolDefs: { letter: "A" | "B" | "C"; numbers: number[]; quotas: number[] }[] = [
    { letter: "A", numbers: pool.poolA, quotas: patterns.map((p) => p.a) },
    { letter: "B", numbers: pool.poolB, quotas: patterns.map((p) => p.b) },
    { letter: "C", numbers: pool.poolC, quotas: patterns.map((p) => p.c) },
  ];

  const exposureCounts: { letter: "A" | "B" | "C"; numbers: number[]; quotas: number[]; exposure4Count: number }[] = [];
  for (const def of poolDefs) {
    const total = def.quotas.reduce((a, b) => a + b, 0);
    const { exposure4Count } = targetExposureSplit(def.numbers.length, total);
    if (exposure4Count < 0 || exposure4Count > def.numbers.length) return null;
    exposureCounts.push({ ...def, exposure4Count });
  }

  const highSets = selectExposureHighSets(exposureCounts, random);
  if (!highSets) return null;

  const assignments: PoolAssignment[] = [];
  for (const def of exposureCounts) {
    const membership = assignPoolToBucketsWithExposureMap(def.numbers, def.quotas, highSets.get(def.letter)!, random, 4, 3);
    if (!membership) return null;
    assignments.push({ poolLetter: def.letter, numbers: def.numbers, membership });
  }
  return assignments;
}

function assemblyGamesFromAssignment(assignments: PoolAssignment[], gameCount: number): number[][] {
  const games: number[][] = Array.from({ length: gameCount }, () => []);
  for (const assignment of assignments) {
    assignment.membership.forEach((members, gi) => {
      games[gi]!.push(...members);
    });
  }
  return games.map((g) => [...g].sort((a, b) => a - b));
}

/** Attempts a swap-based local search to drive the hard-constraint penalty to zero. */
function localSearchRepair(
  assignments: PoolAssignment[],
  gameCount: number,
  random: RandomSource,
  maxIterations: number,
): { games: number[][]; penalty: PenaltyBreakdown } {
  let games = assemblyGamesFromAssignment(assignments, gameCount);
  let penalty = evaluateHardConstraintPenalty(games);
  let bestGames = games;
  let bestPenalty = penalty;
  const reheatEvery = Math.max(200, Math.floor(maxIterations / 8));
  const stagnationKickAfter = Math.max(60, Math.floor(reheatEvery / 4));
  let temperature = 1.0;
  const coolingRate = 1 - 3 / Math.max(reheatEvery, 1);
  let iterationsSinceImprovement = 0;

  const CANDIDATES_PER_ITERATION = 16;

  function forceRandomSwap(): void {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const poolIdx = randomInt(random, 0, assignments.length - 1);
      const assignment = assignments[poolIdx]!;
      const gi = randomInt(random, 0, gameCount - 1);
      const gj = randomInt(random, 0, gameCount - 1);
      if (gi === gj) continue;
      const membersI = assignment.membership[gi]!;
      const membersJ = assignment.membership[gj]!;
      const onlyInI = membersI.filter((n) => !membersJ.includes(n));
      const onlyInJ = membersJ.filter((n) => !membersI.includes(n));
      if (onlyInI.length === 0 || onlyInJ.length === 0) continue;
      const x = onlyInI[randomInt(random, 0, onlyInI.length - 1)]!;
      const y = onlyInJ[randomInt(random, 0, onlyInJ.length - 1)]!;
      assignment.membership[gi] = membersI.filter((n) => n !== x).concat(y);
      assignment.membership[gj] = membersJ.filter((n) => n !== y).concat(x);
      return;
    }
  }

  for (let iter = 0; iter < maxIterations && penalty.total > 0; iter += 1) {
    if (iter > 0 && iter % reheatEvery === 0) temperature = 1.0;
    if (iterationsSinceImprovement >= stagnationKickAfter) {
      // Stuck at a local optimum: apply a handful of blind random swaps to
      // jump to a different neighborhood, then resume guided optimization.
      for (let kick = 0; kick < 5; kick += 1) forceRandomSwap();
      games = assemblyGamesFromAssignment(assignments, gameCount);
      penalty = evaluateHardConstraintPenalty(games);
      iterationsSinceImprovement = 0;
      temperature = 1.0;
    }
    const poolIdx = randomInt(random, 0, assignments.length - 1);
    const assignment = assignments[poolIdx]!;
    const gi = randomInt(random, 0, gameCount - 1);
    const gj = randomInt(random, 0, gameCount - 1);
    if (gi === gj) continue;
    const membersI = assignment.membership[gi]!;
    const membersJ = assignment.membership[gj]!;
    const onlyInI = membersI.filter((n) => !membersJ.includes(n));
    const onlyInJ = membersJ.filter((n) => !membersI.includes(n));
    if (onlyInI.length === 0 || onlyInJ.length === 0) continue;

    // Best-of-K move selection: sample several candidate (x,y) swaps within
    // this (pool, gi, gj) neighborhood and keep the one with lowest resulting
    // penalty, instead of evaluating only a single random swap per iteration.
    let bestCandidateGames: number[][] | null = null;
    let bestCandidatePenalty: PenaltyBreakdown | null = null;
    let bestX = -1;
    let bestY = -1;
    const attempts = Math.min(CANDIDATES_PER_ITERATION, onlyInI.length * onlyInJ.length);
    for (let k = 0; k < attempts; k += 1) {
      const x = onlyInI[randomInt(random, 0, onlyInI.length - 1)]!;
      const y = onlyInJ[randomInt(random, 0, onlyInJ.length - 1)]!;
      assignment.membership[gi] = membersI.filter((n) => n !== x).concat(y);
      assignment.membership[gj] = membersJ.filter((n) => n !== y).concat(x);
      const candidateGames = assemblyGamesFromAssignment(assignments, gameCount);
      const candidatePenalty = evaluateHardConstraintPenalty(candidateGames);
      if (!bestCandidatePenalty || candidatePenalty.total < bestCandidatePenalty.total) {
        bestCandidateGames = candidateGames;
        bestCandidatePenalty = candidatePenalty;
        bestX = x;
        bestY = y;
      }
      // revert before trying the next sampled pair
      assignment.membership[gi] = membersI;
      assignment.membership[gj] = membersJ;
    }
    if (!bestCandidateGames || !bestCandidatePenalty) continue;

    const delta = bestCandidatePenalty.total - penalty.total;
    const accept = delta <= 0 || random() < Math.exp(-delta / Math.max(temperature, 1e-6));
    if (accept) {
      assignment.membership[gi] = membersI.filter((n) => n !== bestX).concat(bestY);
      assignment.membership[gj] = membersJ.filter((n) => n !== bestY).concat(bestX);
      games = bestCandidateGames;
      penalty = bestCandidatePenalty;
      if (penalty.total < bestPenalty.total) {
        bestGames = games;
        bestPenalty = penalty;
        iterationsSinceImprovement = 0;
      } else {
        iterationsSinceImprovement += 1;
      }
    } else {
      iterationsSinceImprovement += 1;
    }
    temperature *= coolingRate;
  }

  return bestPenalty.total <= penalty.total ? { games: bestGames, penalty: bestPenalty } : { games, penalty };
}

export interface RmsGenerationResult {
  tickets: LotofacilTicket[];
  pools: LotofacilRmsPoolSnapshot;
  patternUsed: string[];
  j6Variant: string;
  tieBreakScore: number;
  attempts: number;
  seed: string | number;
}

export interface RmsGenerationOptions {
  targetContest: number;
  referenceWindow: RmsDrawInput[];
  seed?: string | number;
  maxRestartsPerVariant?: number;
  maxIterationsPerRestart?: number;
}

export function generateRmsV2(options: RmsGenerationOptions): RmsGenerationResult {
  const seed = options.seed ?? `rms-v2:${options.targetContest}:${RMS_ALGORITHM_VERSION}`;
  const maxRestarts = options.maxRestartsPerVariant ?? 20;
  const maxIterations = options.maxIterationsPerRestart ?? 2000;

  const poolRandom = createSeededRandom(`${seed}:pools`);
  const pools = buildPools(options.referenceWindow, poolRandom);

  let best: { games: number[][]; penalty: PenaltyBreakdown; variantLabel: string } | null = null;
  let attempts = 0;

  for (const variant of J6_VARIANTS) {
    const patterns = [...PATTERNS_BASE, variant];
    for (let restart = 0; restart < maxRestarts; restart += 1) {
      attempts += 1;
      const restartRandom = createSeededRandom(`${seed}:${variant.label}:${restart}`);
      const assignments = buildInitialAssignment(pools, patterns, restartRandom);
      if (!assignments) continue;
      const { games, penalty } = localSearchRepair(assignments, patterns.length, restartRandom, maxIterations);
      if (penalty.total === 0) {
        if (!best || tieBreakScore(games) < tieBreakScore(best.games)) {
          best = { games, penalty, variantLabel: variant.label };
        }
        break; // valid solution found for this variant; no need for more restarts of it
      }
      if (!best || penalty.total < best.penalty.total) {
        best = { games, penalty, variantLabel: variant.label };
      }
    }
  }

  if (!best || best.penalty.total > 0) {
    throw new RmsNoValidPortfolioError(best?.penalty.unsatisfied ?? ["no candidate could be constructed"]);
  }

  const tickets = best.games.map((g) => Object.freeze([...g].sort((a, b) => a - b))) as LotofacilTicket[];

  return {
    tickets,
    pools,
    patternUsed: [...PATTERNS_BASE.map((p) => p.label), best.variantLabel],
    j6Variant: best.variantLabel,
    tieBreakScore: tieBreakScore(best.games),
    attempts,
    seed,
  };
}
