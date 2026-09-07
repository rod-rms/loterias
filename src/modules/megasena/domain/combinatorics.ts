import {
  AT_LEAST_HIT_COUNTS,
  EXACT_HIT_COUNTS,
  MEGASENA_TICKET_SIZE,
  TOTAL_POSSIBLE_DRAWS,
} from "./constants";
import type { ProbabilityMetric } from "./types";

export function comb(n: number, k: number): bigint {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
    return 0n;
  }
  const kk = Math.min(k, n - k);
  let result = 1n;
  for (let i = 1; i <= kk; i += 1) {
    result = (result * BigInt(n - kk + i)) / BigInt(i);
  }
  return result;
}

function bigintToSafeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`Value ${value.toString()} exceeds Number safe integer range`);
  }
  return result;
}

export function countExactHits(hits: number): number {
  if (!Number.isInteger(hits) || hits < 0 || hits > MEGASENA_TICKET_SIZE) {
    throw new RangeError("hits must be an integer between 0 and 6");
  }
  return bigintToSafeNumber(comb(6, hits) * comb(54, 6 - hits));
}

export function countAtLeastHits(threshold: 4 | 5 | 6): number {
  let total = 0;
  for (let hits = threshold; hits <= 6; hits += 1) {
    total += countExactHits(hits);
  }
  return total;
}

export function probabilityFromFavourableDraws(
  favourableDraws: number,
  method: string,
): ProbabilityMetric {
  if (!Number.isInteger(favourableDraws) || favourableDraws < 0 || favourableDraws > TOTAL_POSSIBLE_DRAWS) {
    throw new RangeError("favourableDraws must be an integer within the draw universe");
  }
  const probability = favourableDraws / TOTAL_POSSIBLE_DRAWS;
  return {
    status: "exact",
    probability,
    percent: probability * 100,
    favourableDraws,
    denominator: TOTAL_POSSIBLE_DRAWS,
    oneIn: probability > 0 ? 1 / probability : null,
    method,
  };
}

/**
 * Exact probability formula, numerically evaluated with stable log1p/expm1:
 *   1 - C(M-K,N) / C(M,N)
 * where M is the number of elementary tickets and K is the number that match
 * a fixed draw at or above the requested threshold.
 */
export function uniformDistinctPortfolioAverageProbability(
  numberOfTickets: number,
  threshold: 4 | 5 | 6,
): ProbabilityMetric {
  if (!Number.isInteger(numberOfTickets) || numberOfTickets < 1 || numberOfTickets > TOTAL_POSSIBLE_DRAWS) {
    throw new RangeError("numberOfTickets must be between 1 and TOTAL_POSSIBLE_DRAWS");
  }
  const k = AT_LEAST_HIT_COUNTS[threshold];
  if (numberOfTickets > TOTAL_POSSIBLE_DRAWS - k) {
    // The exact probability is 1 once every possible disjoint portfolio must
    // intersect the K favourable ticket set. The normal project use is far below this.
    return {
      status: "exact",
      probability: 1,
      percent: 100,
      denominator: TOTAL_POSSIBLE_DRAWS,
      oneIn: 1,
      method: "exact hypergeometric complement: 1 - C(M-K,N)/C(M,N)",
      notes: ["Probability is 1 because N > M-K."],
    };
  }

  let logNoHit = 0;
  for (let j = 0; j < numberOfTickets; j += 1) {
    logNoHit += Math.log1p(-k / (TOTAL_POSSIBLE_DRAWS - j));
  }
  const probability = -Math.expm1(logNoHit);
  return {
    status: "exact",
    probability,
    percent: probability * 100,
    denominator: TOTAL_POSSIBLE_DRAWS,
    oneIn: probability > 0 ? 1 / probability : null,
    method: "exact hypergeometric complement: 1 - C(M-K,N)/C(M,N)",
    notes: ["Formula is exact; decimal representation uses IEEE-754 Number."],
  };
}

export function verifyCanonicalConstants(): boolean {
  return (
    countExactHits(4) === EXACT_HIT_COUNTS[4] &&
    countExactHits(5) === EXACT_HIT_COUNTS[5] &&
    countExactHits(6) === EXACT_HIT_COUNTS[6] &&
    countAtLeastHits(4) === AT_LEAST_HIT_COUNTS[4] &&
    countAtLeastHits(5) === AT_LEAST_HIT_COUNTS[5] &&
    countAtLeastHits(6) === AT_LEAST_HIT_COUNTS[6]
  );
}
