import {
  ALGORITHM_VERSION,
  DEFAULT_CANDIDATE_POOL_SIZE,
  DEFAULT_ESTIMATION_SAMPLES,
  DEFAULT_EXACT_F4_MAX_TICKETS,
  DEFAULT_EXACT_F5_MAX_TICKETS,
  DEFAULT_OPTIMIZER_ITERATIONS,
} from "./constants";
import {
  countPortfolioCoverageExact,
  favourableDrawMasks,
  numbersToMask,
  popcountBigInt,
  ticketMask,
} from "./coverage";
import {
  buildSeededControlBaselineComparison,
  buildUniformAverageBaselineComparison,
  evaluateMegaSenaPortfolio,
} from "./portfolio";
import {
  createSeededRandom,
  generateUniformDistinctTickets,
  generateUniformTicket,
  shuffleInPlace,
} from "./random";
import type {
  MegaSenaGenerationInput,
  MegaSenaObjective,
  MegaSenaPortfolioResult,
  MegaSenaTicket,
} from "./types";
import {
  assertValidGenerationInput,
  canonicalizeTicket,
  determineTargetTicketCount,
  ticketKey,
} from "./validation";

interface ObjectiveContext {
  threshold: 4 | 5;
  exact: boolean;
  sampleDraws?: bigint[];
}

function objectiveThreshold(objective: MegaSenaObjective): 4 | 5 {
  return objective === "quadra_or_better" ? 4 : 5;
}

function createUniformSampleDraws(sampleSize: number, seed: string | number): bigint[] {
  const random = createSeededRandom(seed);
  const base = Array.from({ length: 60 }, (_, index) => index + 1);
  const draws: bigint[] = [];
  for (let i = 0; i < sampleSize; i += 1) {
    const values = [...base];
    shuffleInPlace(values, random);
    draws.push(numbersToMask(values.slice(0, 6)));
  }
  return draws;
}

function objectiveScore(tickets: readonly MegaSenaTicket[], context: ObjectiveContext): number {
  if (context.exact) return countPortfolioCoverageExact(tickets, context.threshold);
  const masks = tickets.map(ticketMask);
  let covered = 0;
  for (const draw of context.sampleDraws ?? []) {
    if (masks.some((mask) => popcountBigInt(mask & draw) >= context.threshold)) covered += 1;
  }
  return covered;
}

function marginalExactCoverage(
  candidate: MegaSenaTicket,
  currentCoverage: ReadonlySet<bigint>,
  threshold: 4 | 5,
): { gain: number; masks: bigint[] } {
  const masks = favourableDrawMasks(candidate, threshold);
  let gain = 0;
  for (const mask of masks) if (!currentCoverage.has(mask)) gain += 1;
  return { gain, masks };
}

function marginalSampleCoverage(
  candidate: MegaSenaTicket,
  coveredSample: readonly boolean[],
  sampleDraws: readonly bigint[],
  threshold: 4 | 5,
): number {
  const mask = ticketMask(candidate);
  let gain = 0;
  for (let i = 0; i < sampleDraws.length; i += 1) {
    if (!coveredSample[i] && popcountBigInt(mask & sampleDraws[i]) >= threshold) gain += 1;
  }
  return gain;
}

function markSampleCoverage(
  ticket: MegaSenaTicket,
  coveredSample: boolean[],
  sampleDraws: readonly bigint[],
  threshold: 4 | 5,
): void {
  const mask = ticketMask(ticket);
  for (let i = 0; i < sampleDraws.length; i += 1) {
    if (!coveredSample[i] && popcountBigInt(mask & sampleDraws[i]) >= threshold) coveredSample[i] = true;
  }
}

function greedyBuild(
  existing: MegaSenaTicket[],
  targetCount: number,
  objective: MegaSenaObjective,
  input: MegaSenaGenerationInput,
  seed: string | number,
  context: ObjectiveContext,
): MegaSenaTicket[] {
  const random = createSeededRandom(`${String(seed)}:greedy`);
  const tickets = existing.map(canonicalizeTicket);
  const keys = new Set(tickets.map(ticketKey));
  const candidatePoolSize = input.candidatePoolSize ?? DEFAULT_CANDIDATE_POOL_SIZE;
  const constraints = { fixedNumbers: input.fixedNumbers, excludedNumbers: input.excludedNumbers };
  const threshold = objectiveThreshold(objective);

  const currentCoverage = context.exact ? new Set<bigint>() : undefined;
  if (currentCoverage) {
    for (const ticket of tickets) {
      for (const mask of favourableDrawMasks(ticket, threshold)) currentCoverage.add(mask);
    }
  }
  const coveredSample = context.exact ? undefined : new Array(context.sampleDraws?.length ?? 0).fill(false);
  if (coveredSample && context.sampleDraws) {
    for (const ticket of tickets) markSampleCoverage(ticket, coveredSample, context.sampleDraws, threshold);
  }

  while (tickets.length < targetCount) {
    let best: MegaSenaTicket | undefined;
    let bestGain = -1;
    let bestMasks: bigint[] | undefined;
    const candidateKeys = new Set<string>();
    for (let c = 0; c < candidatePoolSize; c += 1) {
      let candidate: MegaSenaTicket;
      let key: string;
      let attempts = 0;
      do {
        if (attempts++ > 10_000) throw new Error("Unable to construct a distinct candidate pool.");
        candidate = generateUniformTicket(random, constraints);
        key = ticketKey(candidate);
      } while (keys.has(key) || candidateKeys.has(key));
      candidateKeys.add(key);

      if (context.exact && currentCoverage) {
        const scored = marginalExactCoverage(candidate, currentCoverage, threshold);
        if (scored.gain > bestGain) {
          best = candidate;
          bestGain = scored.gain;
          bestMasks = scored.masks;
        }
      } else if (coveredSample && context.sampleDraws) {
        const gain = marginalSampleCoverage(candidate, coveredSample, context.sampleDraws, threshold);
        if (gain > bestGain) {
          best = candidate;
          bestGain = gain;
        }
      }
    }
    if (!best) throw new Error("No candidate ticket could be generated.");
    tickets.push(best);
    keys.add(ticketKey(best));
    if (context.exact && currentCoverage) {
      for (const mask of bestMasks ?? favourableDrawMasks(best, threshold)) currentCoverage.add(mask);
    } else if (coveredSample && context.sampleDraws) {
      markSampleCoverage(best, coveredSample, context.sampleDraws, threshold);
    }
  }
  return tickets;
}

function localSearch(
  initial: MegaSenaTicket[],
  fixedPrefixLength: number,
  input: MegaSenaGenerationInput,
  seed: string | number,
  context: ObjectiveContext,
): { tickets: MegaSenaTicket[]; iterations: number } {
  const maxIterations = input.maxIterations ?? DEFAULT_OPTIMIZER_ITERATIONS;
  if (maxIterations <= 0 || initial.length <= fixedPrefixLength) return { tickets: initial, iterations: 0 };
  const random = createSeededRandom(`${String(seed)}:local`);
  const constraints = { fixedNumbers: input.fixedNumbers, excludedNumbers: input.excludedNumbers };
  let best = initial.map(canonicalizeTicket);
  let bestScore = objectiveScore(best, context);
  let iterations = 0;
  const started = performance.now();

  for (let i = 0; i < maxIterations; i += 1) {
    if (input.seed === undefined && input.timeBudgetMs !== undefined && performance.now() - started >= input.timeBudgetMs) break;
    iterations += 1;
    const replaceIndex = fixedPrefixLength + Math.floor(random() * (best.length - fixedPrefixLength));
    const keys = new Set(best.map(ticketKey));
    keys.delete(ticketKey(best[replaceIndex]));
    let candidate: MegaSenaTicket;
    let key: string;
    let attempts = 0;
    do {
      if (attempts++ > 10_000) break;
      candidate = generateUniformTicket(random, constraints);
      key = ticketKey(candidate);
    } while (keys.has(key));
    if (attempts > 10_000) continue;
    const proposed = best.slice();
    proposed[replaceIndex] = candidate!;
    const score = objectiveScore(proposed, context);
    if (score > bestScore) {
      best = proposed;
      bestScore = score;
    }
  }
  return { tickets: best, iterations };
}

function hasExplicitGenerationRestrictions(input: MegaSenaGenerationInput): boolean {
  return Boolean((input.fixedNumbers?.length ?? 0) || (input.excludedNumbers?.length ?? 0) || (input.existingTickets?.length ?? 0));
}

export function generateMegaSenaPortfolio(input: MegaSenaGenerationInput): MegaSenaPortfolioResult {
  assertValidGenerationInput(input);
  const started = performance.now();
  const targetCount = determineTargetTicketCount(input);
  const seed = input.seed ?? `${Date.now()}-${Math.random()}`;
  const existing = (input.existingTickets ?? []).map(canonicalizeTicket);
  const needed = targetCount - existing.length;
  const baselineRandom = createSeededRandom(`${String(seed)}:baseline`);
  const existingKeys = new Set(existing.map(ticketKey));
  const baselineGenerated = generateUniformDistinctTickets(
    needed,
    baselineRandom,
    existingKeys,
    { fixedNumbers: input.fixedNumbers, excludedNumbers: input.excludedNumbers },
  );
  const baselineTickets = [...existing, ...baselineGenerated];

  const threshold = objectiveThreshold(input.objective);
  const exactLimit = threshold === 4 ? DEFAULT_EXACT_F4_MAX_TICKETS : DEFAULT_EXACT_F5_MAX_TICKETS;
  const useExactObjective = targetCount <= exactLimit;
  const estimationSamples = input.evaluationSamples ?? DEFAULT_ESTIMATION_SAMPLES;
  const context: ObjectiveContext = useExactObjective
    ? { threshold, exact: true }
    : {
        threshold,
        exact: false,
        sampleDraws: createUniformSampleDraws(estimationSamples, `${String(seed)}:optimizer-sample`),
      };

  let best = greedyBuild(existing, targetCount, input.objective, input, seed, context);
  const searched = localSearch(best, existing.length, input, seed, context);
  best = searched.tickets;

  // Never return a solution that scores below the same-restriction seeded uniform control.
  if (objectiveScore(baselineTickets, context) > objectiveScore(best, context)) best = baselineTickets;

  const warnings: string[] = [];
  if (input.seed !== undefined && input.timeBudgetMs !== undefined) {
    warnings.push("timeBudgetMs does not stop deterministic seeded local search; maxIterations governs reproducibility.");
  }
  if (!useExactObjective) {
    warnings.push("Optimizer objective used a fixed deterministic Monte Carlo draw sample because exact browser-scale scoring exceeded the configured threshold.");
  }
  if (input.popularityMode === "experimental") {
    warnings.push("Popularity mode v1 reports uncalibrated observable features only and does not alter optimization ranking.");
  }

  const elapsedMs = performance.now() - started;
  const evaluationOptions = {
    ticketCostBRL: input.ticketCostBRL,
    popularityMode: input.popularityMode ?? "off" as const,
    seed: input.seed,
    objective: input.objective,
    algorithmVersion: `${ALGORITHM_VERSION}-${useExactObjective ? "exact" : "sampled"}`,
    iterations: searched.iterations,
    elapsedMs,
    estimationSamples,
    warnings,
  };
  const result = evaluateMegaSenaPortfolio(best, evaluationOptions);
  const constrained = hasExplicitGenerationRestrictions(input);
  if (!constrained) {
    result.randomBaseline = buildUniformAverageBaselineComparison(result);
  } else {
    const control = evaluateMegaSenaPortfolio(baselineTickets, {
      ...evaluationOptions,
      objective: "evaluation_only",
      popularityMode: "off",
      algorithmVersion: "uniform-seeded-control-v1",
    });
    result.randomBaseline = buildSeededControlBaselineComparison(result, control);
  }
  return result;
}
