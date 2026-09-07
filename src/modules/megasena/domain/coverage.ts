import {
  AT_LEAST_HIT_COUNTS,
  DEFAULT_ESTIMATION_SAMPLES,
  DEFAULT_EXACT_F4_MAX_TICKETS,
  DEFAULT_EXACT_F5_MAX_TICKETS,
  MEGASENA_MAX_NUMBER,
  TOTAL_POSSIBLE_DRAWS,
} from "./constants";
import { probabilityFromFavourableDraws } from "./combinatorics";
import { analyzeOverlap } from "./overlap";
import { createSeededRandom, shuffleInPlace } from "./random";
import type {
  CoverageEvaluationOptions,
  MegaSenaPortfolio,
  MegaSenaTicket,
  ProbabilityMetric,
} from "./types";
import { assertValidPortfolio, assertValidTicket } from "./validation";

function* combinations<T>(items: readonly T[], choose: number, start = 0, prefix: T[] = []): Generator<T[]> {
  if (choose === 0) {
    yield [...prefix];
    return;
  }
  for (let i = start; i <= items.length - choose; i += 1) {
    prefix.push(items[i]);
    yield* combinations(items, choose - 1, i + 1, prefix);
    prefix.pop();
  }
}

export function numbersToMask(numbers: readonly number[]): bigint {
  let mask = 0n;
  for (const number of numbers) {
    if (!Number.isInteger(number) || number < 1 || number > 60) {
      throw new RangeError("Mask numbers must be integers from 1 to 60.");
    }
    mask |= 1n << BigInt(number - 1);
  }
  return mask;
}

export function ticketMask(ticket: MegaSenaTicket): bigint {
  return numbersToMask(assertValidTicket(ticket));
}

export function popcountBigInt(value: bigint): number {
  let v = value;
  let count = 0;
  while (v !== 0n) {
    v &= v - 1n;
    count += 1;
  }
  return count;
}

export function favourableDrawMasks(ticket: MegaSenaTicket, threshold: 4 | 5 | 6): bigint[] {
  const canonical = assertValidTicket(ticket);
  const ticketSet = new Set(canonical);
  const outside: number[] = [];
  for (let n = 1; n <= MEGASENA_MAX_NUMBER; n += 1) {
    if (!ticketSet.has(n)) outside.push(n);
  }
  const result: bigint[] = [];
  for (let hits = threshold; hits <= 6; hits += 1) {
    for (const hitPart of combinations(canonical, hits)) {
      const hitMask = numbersToMask(hitPart);
      for (const missPart of combinations(outside, 6 - hits)) {
        result.push(hitMask | numbersToMask(missPart));
      }
    }
  }
  return result;
}

export function countPortfolioCoverageExact(
  tickets: MegaSenaPortfolio,
  threshold: 4 | 5 | 6,
): number {
  const canonical = assertValidPortfolio(tickets);
  if (canonical.length === 0) return 0;
  if (threshold === 6) return canonical.length;
  const union = new Set<bigint>();
  for (const ticket of canonical) {
    for (const mask of favourableDrawMasks(ticket, threshold)) union.add(mask);
  }
  return union.size;
}

function randomDrawMask(random: () => number): bigint {
  const values = Array.from({ length: 60 }, (_, index) => index + 1);
  shuffleInPlace(values, random);
  return numbersToMask(values.slice(0, 6));
}

function estimateCoverage(
  tickets: MegaSenaPortfolio,
  threshold: 4 | 5,
  sampleSize: number,
  seed: string | number,
): ProbabilityMetric {
  const canonical = assertValidPortfolio(tickets);
  const masks = canonical.map(ticketMask);
  const random = createSeededRandom(seed);
  let hits = 0;
  for (let i = 0; i < sampleSize; i += 1) {
    const draw = randomDrawMask(random);
    if (masks.some((mask) => popcountBigInt(mask & draw) >= threshold)) hits += 1;
  }
  const probability = hits / sampleSize;
  const standardError = Math.sqrt((probability * (1 - probability)) / sampleSize);
  return {
    status: "estimated",
    probability,
    percent: probability * 100,
    estimatedFavourableDraws: Math.round(probability * TOTAL_POSSIBLE_DRAWS),
    denominator: TOTAL_POSSIBLE_DRAWS,
    oneIn: probability > 0 ? 1 / probability : null,
    method: `deterministic Monte Carlo over ${sampleSize.toLocaleString("en-US")} uniformly sampled draws`,
    sampleSize,
    standardError,
    notes: ["Estimate is not an exact enumeration of the 50,063,860 draw universe."],
  };
}

export function evaluateCoverageThreshold(
  tickets: MegaSenaPortfolio,
  threshold: 4 | 5 | 6,
  options: CoverageEvaluationOptions = {},
): ProbabilityMetric {
  const canonical = assertValidPortfolio(tickets);
  if (canonical.length === 0) {
    return probabilityFromFavourableDraws(0, "exact empty portfolio");
  }
  if (threshold === 6) {
    return probabilityFromFavourableDraws(canonical.length, "exact distinct-ticket identity: F6 = N / C(60,6)");
  }

  const overlap = analyzeOverlap(canonical);
  if (threshold === 4 && overlap.allPairsAtMost1) {
    return probabilityFromFavourableDraws(
      canonical.length * AT_LEAST_HIT_COUNTS[4],
      "exact pairwise-disjoint F4 regions because every ticket intersection is <= 1",
    );
  }
  if (threshold === 5 && overlap.allPairsAtMost3) {
    return probabilityFromFavourableDraws(
      canonical.length * AT_LEAST_HIT_COUNTS[5],
      "exact pairwise-disjoint F5 regions because every ticket intersection is <= 3",
    );
  }

  const exactLimit = threshold === 4
    ? (options.exactF4MaxTickets ?? DEFAULT_EXACT_F4_MAX_TICKETS)
    : (options.exactF5MaxTickets ?? DEFAULT_EXACT_F5_MAX_TICKETS);
  if (canonical.length <= exactLimit) {
    const favourable = countPortfolioCoverageExact(canonical, threshold);
    return probabilityFromFavourableDraws(
      favourable,
      `exact union enumeration of all per-ticket results with >= ${threshold} hits`,
    );
  }

  const sampleSize = options.estimationSamples ?? DEFAULT_ESTIMATION_SAMPLES;
  if (!Number.isInteger(sampleSize) || sampleSize < 1) {
    return {
      status: "not_computed",
      probability: null,
      percent: null,
      denominator: TOTAL_POSSIBLE_DRAWS,
      method: "not computed because estimationSamples is invalid",
    };
  }
  return estimateCoverage(canonical, threshold, sampleSize, options.seed ?? "megasena-coverage-estimate-v1");
}

export function evaluateF4(tickets: MegaSenaPortfolio, options: CoverageEvaluationOptions = {}): ProbabilityMetric {
  return evaluateCoverageThreshold(tickets, 4, options);
}

export function evaluateF5(tickets: MegaSenaPortfolio, options: CoverageEvaluationOptions = {}): ProbabilityMetric {
  return evaluateCoverageThreshold(tickets, 5, options);
}

export function evaluateF6(tickets: MegaSenaPortfolio): ProbabilityMetric {
  return evaluateCoverageThreshold(tickets, 6);
}
