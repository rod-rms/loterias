import { enumerateAllDraws, intersectionCount, ticketToMask } from "./bitmask";
import { TOTAL_POSSIBLE_DRAWS } from "./constants";
import type { LotofacilPortfolio, ProbabilityMetric } from "./types";

export interface ExactCoverageResult {
  favourableDraws: Record<11 | 12 | 13 | 14 | 15, number>;
  noAtLeast11FavourableDraws: number;
}

/**
 * Canonical exact evaluation: walks all C(25,15) = 3,268,760 possible draws
 * exactly once and checks, for each, whether any ticket in the portfolio
 * reaches each hit threshold. The universe is small enough that this is
 * exact for any portfolio size used in v1 (up to 50 tickets).
 */
export function evaluateExactCoverage(tickets: LotofacilPortfolio): ExactCoverageResult {
  const masks = tickets.map((t) => ticketToMask(t));
  const favourable = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 } as Record<11 | 12 | 13 | 14 | 15, number>;
  let noAtLeast11 = 0;

  for (const draw of enumerateAllDraws()) {
    let bestHits = 0;
    for (const mask of masks) {
      const hits = intersectionCount(mask, draw);
      if (hits > bestHits) bestHits = hits;
      if (bestHits === 15) break;
    }
    if (bestHits >= 11) favourable[11] += 1;
    else noAtLeast11 += 1;
    if (bestHits >= 12) favourable[12] += 1;
    if (bestHits >= 13) favourable[13] += 1;
    if (bestHits >= 14) favourable[14] += 1;
    if (bestHits >= 15) favourable[15] += 1;
  }

  return { favourableDraws: favourable, noAtLeast11FavourableDraws: noAtLeast11 };
}

function toMetric(favourableDraws: number, method: string): ProbabilityMetric {
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

export function coverageToMetrics(coverage: ExactCoverageResult) {
  return {
    atLeast11: toMetric(coverage.favourableDraws[11], "canonical enumeration of C(25,15) possible draws"),
    atLeast12: toMetric(coverage.favourableDraws[12], "canonical enumeration of C(25,15) possible draws"),
    atLeast13: toMetric(coverage.favourableDraws[13], "canonical enumeration of C(25,15) possible draws"),
    atLeast14: toMetric(coverage.favourableDraws[14], "canonical enumeration of C(25,15) possible draws"),
    exactly15: toMetric(coverage.favourableDraws[15], "canonical enumeration of C(25,15) possible draws"),
    noAtLeast11: toMetric(coverage.noAtLeast11FavourableDraws, "canonical enumeration of C(25,15) possible draws"),
  };
}

/** For a single elementary ticket: exact count of draws with hits == h. Formula: C(15,h) * C(10,15-h). */
export function singleTicketExactHitFraction(exactCount: number): number {
  return exactCount / TOTAL_POSSIBLE_DRAWS;
}
