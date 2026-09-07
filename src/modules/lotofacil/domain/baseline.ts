import { uniformAtLeastOneProbability } from "../../../shared/lib/combinatorics";
import { AT_LEAST_HIT_COUNTS, TOTAL_POSSIBLE_DRAWS } from "./constants";
import type { BaselineMetricComparison, LotofacilPortfolioResult, PortfolioBaselineComparison, ProbabilityMetric } from "./types";

function uniformBaselineMetric(numberOfTickets: number, threshold: 11 | 12 | 13 | 14 | 15): ProbabilityMetric {
  const favourableForOneTicket = AT_LEAST_HIT_COUNTS[threshold];
  const probability = uniformAtLeastOneProbability(TOTAL_POSSIBLE_DRAWS, favourableForOneTicket, numberOfTickets);
  return {
    status: "exact",
    probability,
    percent: probability * 100,
    denominator: TOTAL_POSSIBLE_DRAWS,
    oneIn: probability > 0 ? 1 / probability : null,
    method: "exact mean over uniformly selected portfolios of N distinct elementary tickets: 1 - C(M-K,N)/C(M,N)",
  };
}

function compareMetric(portfolio: ProbabilityMetric, baseline: ProbabilityMetric): BaselineMetricComparison {
  if (portfolio.percent === null || baseline.percent === null || portfolio.probability === null || baseline.probability === null) {
    return { portfolio, baseline, absolutePercentagePointDifference: null, relativeDifferencePercent: null };
  }
  return {
    portfolio,
    baseline,
    absolutePercentagePointDifference: portfolio.percent - baseline.percent,
    relativeDifferencePercent: baseline.probability === 0 ? null : ((portfolio.probability / baseline.probability) - 1) * 100,
  };
}

export function buildUniformAverageBaselineComparison(
  result: Pick<LotofacilPortfolioResult, "totalDistinctTickets" | "probability">,
): PortfolioBaselineComparison {
  const n = result.totalDistinctTickets;
  return {
    kind: "uniform_distinct_average",
    sameTicketCount: true,
    sameRestrictions: true,
    atLeast11: compareMetric(result.probability.atLeast11, uniformBaselineMetric(n, 11)),
    atLeast12: compareMetric(result.probability.atLeast12, uniformBaselineMetric(n, 12)),
    atLeast13: compareMetric(result.probability.atLeast13, uniformBaselineMetric(n, 13)),
    atLeast14: compareMetric(result.probability.atLeast14, uniformBaselineMetric(n, 14)),
    exactly15: compareMetric(result.probability.exactly15, uniformBaselineMetric(n, 15)),
    notes: ["Baseline is the exact mean over uniformly selected, unrestricted portfolios of N distinct elementary tickets."],
  };
}

export function buildSeededControlBaselineComparison(
  result: Pick<LotofacilPortfolioResult, "totalDistinctTickets" | "probability">,
  control: Pick<LotofacilPortfolioResult, "tickets" | "probability">,
): PortfolioBaselineComparison {
  return {
    kind: "seeded_uniform_control",
    sameTicketCount: control.tickets.length === result.totalDistinctTickets,
    sameRestrictions: true,
    atLeast11: compareMetric(result.probability.atLeast11, control.probability.atLeast11),
    atLeast12: compareMetric(result.probability.atLeast12, control.probability.atLeast12),
    atLeast13: compareMetric(result.probability.atLeast13, control.probability.atLeast13),
    atLeast14: compareMetric(result.probability.atLeast14, control.probability.atLeast14),
    exactly15: compareMetric(result.probability.exactly15, control.probability.exactly15),
    controlTickets: control.tickets,
    notes: ["Control is one deterministic uniformly generated portfolio under the same explicit generation restrictions."],
  };
}
