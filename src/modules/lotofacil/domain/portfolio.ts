import { EXACT_HIT_COUNTS, TOTAL_POSSIBLE_DRAWS } from "./constants";
import { coverageToMetrics, evaluateExactCoverage } from "./coverage";
import { analyzeExposure, analyzeOverlap } from "./overlap";
import { assertValidPortfolio } from "./validation";
import { createAuditMetadata, aggregateEvaluationMethod } from "./audit";
import type { ExpectedExactHits, LotofacilPortfolio, LotofacilPortfolioResult, PortfolioEvaluationOptions } from "./types";

export function expectedExactHits(numberOfDistinctTickets: number): ExpectedExactHits {
  const n = numberOfDistinctTickets;
  return {
    exactly11: (n * EXACT_HIT_COUNTS[11]) / TOTAL_POSSIBLE_DRAWS,
    exactly12: (n * EXACT_HIT_COUNTS[12]) / TOTAL_POSSIBLE_DRAWS,
    exactly13: (n * EXACT_HIT_COUNTS[13]) / TOTAL_POSSIBLE_DRAWS,
    exactly14: (n * EXACT_HIT_COUNTS[14]) / TOTAL_POSSIBLE_DRAWS,
    exactly15: n / TOTAL_POSSIBLE_DRAWS,
  };
}

export function evaluateLotofacilPortfolio(
  tickets: LotofacilPortfolio,
  options: PortfolioEvaluationOptions = {},
): LotofacilPortfolioResult {
  const canonical = assertValidPortfolio(tickets);
  if (canonical.length < 1) throw new RangeError("Portfolio must contain at least one ticket.");

  const started = performance.now();
  const coverage = evaluateExactCoverage(canonical);
  const metrics = coverageToMetrics(coverage);
  const overlap = analyzeOverlap(canonical);
  const exposure = analyzeExposure(canonical);
  const ticketCostBRL = options.ticketCostBRL;
  if (ticketCostBRL !== undefined && (!Number.isFinite(ticketCostBRL) || ticketCostBRL <= 0)) {
    throw new RangeError("ticketCostBRL must be greater than zero");
  }
  const elapsedMs = options.elapsedMs ?? performance.now() - started;

  return {
    tickets: canonical,
    costBRL: ticketCostBRL ? canonical.length * ticketCostBRL : 0,
    totalDistinctTickets: canonical.length,
    probability: metrics,
    expectedExactHits: expectedExactHits(canonical.length),
    overlap,
    exposure,
    audit: createAuditMetadata({
      strategyId: options.strategyId ?? "unknown",
      strategyVersion: options.strategyVersion ?? "0.0.0",
      algorithmVersion: options.algorithmVersion ?? "evaluation-only",
      seed: options.seedForAudit,
      ticketCostBRL: ticketCostBRL ?? 0,
      ticketCostSource: options.ticketCostSource,
      ticketCostReferenceDate: options.ticketCostReferenceDate,
      generationMethod: options.generationMethod ?? "evaluation_only",
      evaluationMethod: aggregateEvaluationMethod([
        metrics.atLeast11,
        metrics.atLeast12,
        metrics.atLeast13,
        metrics.atLeast14,
        metrics.exactly15,
      ]),
      qualityPreset: options.qualityPreset,
      iterations: options.iterations,
      candidatePoolSize: options.candidatePoolSize,
      elapsedMs,
      bestScore: options.bestScore,
      warnings: options.warnings,
    }),
  };
}
