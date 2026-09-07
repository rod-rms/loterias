import {
  EXACT_HIT_COUNTS,
  REFERENCE_TICKET_COST_BRL_V0_1,
  TOTAL_POSSIBLE_DRAWS,
} from "./constants";
import { uniformDistinctPortfolioAverageProbability } from "./combinatorics";
import { createAuditMetadata, aggregateEvaluationMethod } from "./audit";
import { evaluateF4, evaluateF5, evaluateF6 } from "./coverage";
import { analyzeOverlap } from "./overlap";
import { analyzeExperimentalPopularity } from "./popularity";
import type {
  BaselineMetricComparison,
  ExpectedWinningTickets,
  MegaSenaPortfolio,
  MegaSenaPortfolioResult,
  PortfolioBaselineComparison,
  PortfolioEvaluationOptions,
  ProbabilityMetric,
} from "./types";
import { assertValidPortfolio } from "./validation";

export function senaProbability(numberOfDistinctTickets: number): ProbabilityMetric {
  if (!Number.isInteger(numberOfDistinctTickets) || numberOfDistinctTickets < 0 || numberOfDistinctTickets > TOTAL_POSSIBLE_DRAWS) {
    throw new RangeError("numberOfDistinctTickets must be an integer from 0 to TOTAL_POSSIBLE_DRAWS");
  }
  const probability = numberOfDistinctTickets / TOTAL_POSSIBLE_DRAWS;
  return {
    status: "exact",
    probability,
    percent: probability * 100,
    favourableDraws: numberOfDistinctTickets,
    denominator: TOTAL_POSSIBLE_DRAWS,
    oneIn: probability > 0 ? 1 / probability : null,
    method: "exact identity for distinct elementary tickets: F6 = N / C(60,6)",
  };
}

export function expectedWinningTickets(numberOfDistinctTickets: number): ExpectedWinningTickets {
  if (!Number.isInteger(numberOfDistinctTickets) || numberOfDistinctTickets < 0) {
    throw new RangeError("numberOfDistinctTickets must be a non-negative integer");
  }
  return {
    quadra: (numberOfDistinctTickets * EXACT_HIT_COUNTS[4]) / TOTAL_POSSIBLE_DRAWS,
    quina: (numberOfDistinctTickets * EXACT_HIT_COUNTS[5]) / TOTAL_POSSIBLE_DRAWS,
    sena: numberOfDistinctTickets / TOTAL_POSSIBLE_DRAWS,
  };
}

function complementMetric(metric: ProbabilityMetric, label: string): ProbabilityMetric {
  if (metric.probability === null) {
    return {
      status: metric.status,
      probability: null,
      percent: null,
      denominator: metric.denominator,
      method: `${label}: complement unavailable because source metric is not computed`,
      notes: metric.notes,
    };
  }
  const probability = 1 - metric.probability;
  const favourableDraws = metric.status === "exact" && metric.favourableDraws !== undefined
    ? TOTAL_POSSIBLE_DRAWS - metric.favourableDraws
    : undefined;
  return {
    status: metric.status,
    probability,
    percent: probability * 100,
    favourableDraws,
    estimatedFavourableDraws: metric.status === "estimated" ? Math.round(probability * TOTAL_POSSIBLE_DRAWS) : undefined,
    denominator: metric.denominator,
    oneIn: probability > 0 ? 1 / probability : null,
    method: `${label}: 1 - F4`,
    sampleSize: metric.sampleSize,
    standardError: metric.standardError,
    notes: metric.notes,
  };
}

function compareMetric(portfolio: ProbabilityMetric, baseline: ProbabilityMetric): BaselineMetricComparison {
  if (portfolio.percent === null || baseline.percent === null || portfolio.probability === null || baseline.probability === null) {
    return {
      portfolio,
      baseline,
      absolutePercentagePointDifference: null,
      relativeDifferencePercent: null,
    };
  }
  return {
    portfolio,
    baseline,
    absolutePercentagePointDifference: portfolio.percent - baseline.percent,
    relativeDifferencePercent: baseline.probability === 0
      ? null
      : ((portfolio.probability / baseline.probability) - 1) * 100,
  };
}

export function buildUniformAverageBaselineComparison(
  result: Pick<MegaSenaPortfolioResult, "totalDistinctTickets" | "probability">,
): PortfolioBaselineComparison {
  const n = result.totalDistinctTickets;
  const b4 = uniformDistinctPortfolioAverageProbability(n, 4);
  const b5 = uniformDistinctPortfolioAverageProbability(n, 5);
  const b6 = uniformDistinctPortfolioAverageProbability(n, 6);
  return {
    kind: "uniform_distinct_average",
    sameTicketCount: true,
    sameRestrictions: true,
    atLeast4: compareMetric(result.probability.atLeast4, b4),
    atLeast5: compareMetric(result.probability.atLeast5, b5),
    sena: compareMetric(result.probability.sena, b6),
    notes: ["Baseline is the exact mean over uniformly selected portfolios of N distinct elementary tickets."],
  };
}

export function buildSeededControlBaselineComparison(
  result: Pick<MegaSenaPortfolioResult, "totalDistinctTickets" | "probability">,
  control: Pick<MegaSenaPortfolioResult, "tickets" | "probability">,
): PortfolioBaselineComparison {
  return {
    kind: "seeded_uniform_control",
    sameTicketCount: control.tickets.length === result.totalDistinctTickets,
    sameRestrictions: true,
    atLeast4: compareMetric(result.probability.atLeast4, control.probability.atLeast4),
    atLeast5: compareMetric(result.probability.atLeast5, control.probability.atLeast5),
    sena: compareMetric(result.probability.sena, control.probability.sena),
    controlTickets: control.tickets,
    notes: ["Control is one deterministic uniformly generated portfolio under the same explicit generation restrictions."],
  };
}

export function evaluateMegaSenaPortfolio(
  tickets: MegaSenaPortfolio,
  options: PortfolioEvaluationOptions = {},
): MegaSenaPortfolioResult {
  const canonical = assertValidPortfolio(tickets);
  if (canonical.length < 1) throw new RangeError("Portfolio must contain at least one ticket.");

  const started = performance.now();
  const atLeast4 = evaluateF4(canonical, options);
  const atLeast5 = evaluateF5(canonical, options);
  const sena = evaluateF6(canonical);
  const noPrize = complementMetric(atLeast4, "probability of no Quadra-or-better prize");
  const overlap = analyzeOverlap(canonical);
  const ticketCostBRL = options.ticketCostBRL ?? REFERENCE_TICKET_COST_BRL_V0_1;
  if (!Number.isFinite(ticketCostBRL) || ticketCostBRL <= 0) {
    throw new RangeError("ticketCostBRL must be greater than zero");
  }
  const elapsedMs = options.elapsedMs ?? (performance.now() - started);
  const popularityMode = options.popularityMode ?? "off";
  const result: MegaSenaPortfolioResult = {
    tickets: canonical,
    costBRL: canonical.length * ticketCostBRL,
    totalDistinctTickets: canonical.length,
    probability: { atLeast4, atLeast5, sena, noPrize },
    expectedWinningTickets: expectedWinningTickets(canonical.length),
    overlap,
    popularity: popularityMode === "experimental" ? analyzeExperimentalPopularity(canonical) : undefined,
    audit: createAuditMetadata({
      objective: options.objective ?? "evaluation_only",
      seed: options.seed,
      ticketCostBRL,
      ticketCostSource: options.ticketCostSource,
      ticketCostReferenceDate: options.ticketCostReferenceDate,
      evaluationMethod: aggregateEvaluationMethod([atLeast4, atLeast5, sena]),
      iterations: options.iterations,
      elapsedMs,
      popularityMode,
      algorithmVersion: options.algorithmVersion,
      warnings: options.warnings,
    }),
  };
  return result;
}
