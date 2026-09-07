import { createSeededRandom, randomInt } from "../../../shared/lib/prng";
import { intersectionCount, ticketToMask } from "./bitmask";
import { generateUniformDistinctTickets, generateUniformTicket } from "./random";
import { ticketKey } from "./validation";
import type { LotofacilTicket } from "./types";
import type { QualityPreset } from "../../../shared/types";

export interface QualityPresetConfig {
  sampleSize: number;
  candidatePoolSize: number;
  iterations: number;
}

/**
 * Concrete search-effort values per preset. These are operational defaults
 * measured during implementation (docs/global/IMPLEMENTATION_BENCHMARKS_V1.md);
 * they change search effort only, never the underlying mathematics.
 */
export const QUALITY_PRESET_CONFIG: Record<QualityPreset, QualityPresetConfig> = {
  fast: { sampleSize: 3000, candidatePoolSize: 60, iterations: 200 },
  balanced: { sampleSize: 8000, candidatePoolSize: 150, iterations: 800 },
  deep: { sampleSize: 20000, candidatePoolSize: 400, iterations: 2000 },
};

export interface CoverageOptimizerOptions {
  numberOfTickets: number;
  threshold: 11 | 12;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  seed?: string | number;
  qualityPreset?: QualityPreset;
}

export interface CoverageOptimizerResult {
  tickets: LotofacilTicket[];
  seed: string | number;
  qualityPreset: QualityPreset;
  sampleSize: number;
  candidatePoolSize: number;
  iterations: number;
  bestSampledCoverageCount: number;
}

function computeCoverageBitset(ticketMask: number, sampleDraws: readonly number[], threshold: number): Uint8Array {
  const covered = new Uint8Array(sampleDraws.length);
  for (let i = 0; i < sampleDraws.length; i += 1) {
    if (intersectionCount(ticketMask, sampleDraws[i]!) >= threshold) covered[i] = 1;
  }
  return covered;
}

function countNonZero(counts: Int16Array): number {
  let count = 0;
  for (const v of counts) if (v > 0) count += 1;
  return count;
}

/**
 * LF-03 / LF-04: heuristic greedy + local search maximizing direct coverage
 * (count of sampled favourable draws reached by at least one ticket) at the
 * given hit threshold. The final portfolio is evaluated exactly and
 * separately by evaluateLotofacilPortfolio; this function only searches.
 */
export function generateMaxCoverage(options: CoverageOptimizerOptions): CoverageOptimizerResult {
  const preset = options.qualityPreset ?? "balanced";
  const config = QUALITY_PRESET_CONFIG[preset];
  const seed = options.seed ?? Date.now();
  const random = createSeededRandom(`${seed}:coverage:${options.threshold}`);

  const sampleDraws: number[] = [];
  for (let i = 0; i < config.sampleSize; i += 1) {
    sampleDraws.push(ticketToMask(generateUniformTicket(random)));
  }

  const constraints = { fixedNumbers: options.fixedNumbers, excludedNumbers: options.excludedNumbers };
  const pool: LotofacilTicket[] = generateUniformDistinctTickets(config.candidatePoolSize, random, new Set(), constraints);
  const poolCoverage: Uint8Array[] = pool.map((t) => computeCoverageBitset(ticketToMask(t), sampleDraws, options.threshold));

  function addCandidate(): number {
    const excludeKeys = new Set(pool.map((t) => ticketKey(t)));
    const [fresh] = generateUniformDistinctTickets(1, random, excludeKeys, constraints);
    pool.push(fresh!);
    poolCoverage.push(computeCoverageBitset(ticketToMask(fresh!), sampleDraws, options.threshold));
    return pool.length - 1;
  }

  const coverageCounts = new Int16Array(sampleDraws.length);
  const chosenIndexes: number[] = [];

  function marginalGain(coverageMask: Uint8Array): number {
    let gain = 0;
    for (let i = 0; i < coverageMask.length; i += 1) if (coverageMask[i] === 1 && coverageCounts[i] === 0) gain += 1;
    return gain;
  }
  function applyDelta(coverageMask: Uint8Array, delta: 1 | -1): void {
    for (let i = 0; i < coverageMask.length; i += 1) if (coverageMask[i] === 1) coverageCounts[i]! += delta;
  }

  while (chosenIndexes.length < options.numberOfTickets) {
    let bestIdx = -1;
    let bestGain = -1;
    for (let i = 0; i < pool.length; i += 1) {
      if (chosenIndexes.includes(i)) continue;
      const gain = marginalGain(poolCoverage[i]!);
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      bestIdx = addCandidate();
    }
    chosenIndexes.push(bestIdx);
    applyDelta(poolCoverage[bestIdx]!, 1);
  }

  let bestIndexes = [...chosenIndexes];
  let bestCoverageCount = countNonZero(coverageCounts);

  for (let iter = 0; iter < config.iterations; iter += 1) {
    const replaceAt = randomInt(random, 0, bestIndexes.length - 1);
    const oldIdx = bestIndexes[replaceAt]!;
    const newIdx = addCandidate();

    applyDelta(poolCoverage[oldIdx]!, -1);
    applyDelta(poolCoverage[newIdx]!, 1);
    const candidateCount = countNonZero(coverageCounts);

    if (candidateCount > bestCoverageCount) {
      bestIndexes = bestIndexes.map((v, idx) => (idx === replaceAt ? newIdx : v));
      bestCoverageCount = candidateCount;
    } else {
      // revert
      applyDelta(poolCoverage[newIdx]!, -1);
      applyDelta(poolCoverage[oldIdx]!, 1);
    }
  }

  const tickets = bestIndexes.map((i) => Object.freeze([...pool[i]!]) as LotofacilTicket);

  return {
    tickets,
    seed,
    qualityPreset: preset,
    sampleSize: config.sampleSize,
    candidatePoolSize: pool.length,
    iterations: config.iterations,
    bestSampledCoverageCount: bestCoverageCount,
  };
}
