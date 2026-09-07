import { comb } from "../../../shared/lib/combinatorics";
import { resolveSeed } from "../../../shared/lib/seed";
import { ticketsForBudget } from "../../../shared/utils/currency";
import { loadDataset, loadGameConfig, referenceWindow } from "../../../shared/lib/dataLoaders";
import type { GameConfig, GeneratePortfolioRequest, PortfolioEnvelope } from "../../../shared/types";
import {
  DIVERSIFICATION_ALGORITHM_VERSION,
  COVERAGE_ALGORITHM_VERSION,
  RMS_ALGORITHM_VERSION,
  RMS_HISTORY_WINDOW,
  UNIFORM_ALGORITHM_VERSION,
  LOTOFACIL_MAX_NUMBER,
  LOTOFACIL_TICKET_SIZE,
  evaluateLotofacilPortfolio,
  generateMaxDiversification,
  generateMaxCoverage,
  generateRmsV2,
  generateUniformRandomPortfolio,
  maxDistinctTicketsUnderConstraints,
  validateFixedExcluded,
  type LotofacilPortfolioResult,
  type LotofacilAuditMetadata,
} from "../domain";
import { buildUniformAverageBaselineComparison, buildSeededControlBaselineComparison } from "../domain/baseline";
import {
  LOTOFACIL_MAX_COVERAGE_11,
  LOTOFACIL_MAX_COVERAGE_12,
  LOTOFACIL_MAX_DIVERSIFICATION,
  LOTOFACIL_RMS_V2,
  LOTOFACIL_UNIFORM_RANDOM,
} from "./definitions";

export class LotofacilGenerationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function resolveTicketCount(request: GeneratePortfolioRequest, config: GameConfig["lotofacil"]): number {
  if (request.inputMode === "budget") {
    if (request.budgetBRL === undefined) throw new LotofacilGenerationError("MISSING_BUDGET", "budgetBRL is required for budget input mode.");
    return ticketsForBudget(request.budgetBRL, config.ticketCostBRL);
  }
  if (request.numberOfTickets === undefined) throw new LotofacilGenerationError("MISSING_QUANTITY", "numberOfTickets is required for quantity input mode.");
  return request.numberOfTickets;
}

function assertFeasible(numberOfTickets: number, strategyMax: number, fixedNumbers?: number[], excludedNumbers?: number[]): void {
  const fe = validateFixedExcluded({ fixedNumbers, excludedNumbers });
  if (!fe.valid) {
    throw new LotofacilGenerationError("INVALID_CONSTRAINTS", fe.issues.map((i) => i.message).join("; "));
  }
  if (numberOfTickets > strategyMax) {
    throw new LotofacilGenerationError(
      "QUANTITY_EXCEEDS_STRATEGY_LIMIT",
      `Requested ${numberOfTickets} tickets, but this strategy supports at most ${strategyMax}. The limit is not silently reduced; choose a smaller quantity/budget.`,
    );
  }
  const maxDistinct = maxDistinctTicketsUnderConstraints({ fixedNumbers, excludedNumbers });
  if (numberOfTickets > maxDistinct) {
    throw new LotofacilGenerationError(
      "QUANTITY_EXCEEDS_MAX_DISTINCT",
      `Requested ${numberOfTickets} tickets, but only ${maxDistinct} distinct tickets are possible under the supplied fixed/excluded numbers.`,
    );
  }
}

function buildEnvelope(
  strategyId: string,
  strategyVersion: string,
  request: GeneratePortfolioRequest,
  result: LotofacilPortfolioResult,
): PortfolioEnvelope<LotofacilPortfolioResult, LotofacilAuditMetadata> {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    modality: "lotofacil",
    strategyId,
    strategyVersion,
    contest: request.contest,
    seed: result.audit.seed ?? "n/a",
    tickets: result.tickets.map((t) => [...t]),
    costBRL: result.costBRL,
    metrics: result,
    audit: result.audit,
    generationMethod: result.audit.generationMethod,
    evaluationMethod: result.audit.evaluationMethod,
    createdAt: result.audit.generatedAt,
  };
}

async function evaluateAndAttachBaseline(
  tickets: number[][],
  options: Parameters<typeof evaluateLotofacilPortfolio>[1],
  restrictedControlTickets?: number[][],
): Promise<LotofacilPortfolioResult> {
  const result = evaluateLotofacilPortfolio(tickets, options);
  if (restrictedControlTickets) {
    const controlResult = evaluateLotofacilPortfolio(restrictedControlTickets, { ticketCostBRL: options?.ticketCostBRL });
    result.randomBaseline = buildSeededControlBaselineComparison(result, controlResult);
  } else {
    result.randomBaseline = buildUniformAverageBaselineComparison(result);
  }
  return result;
}

export async function generateRmsV2Adapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<LotofacilPortfolioResult, LotofacilAuditMetadata>> {
  if (request.contest === undefined) throw new LotofacilGenerationError("MISSING_CONTEST", "RMS v2 requires a target contest.");
  if (request.numberOfTickets !== undefined && request.numberOfTickets !== 6) {
    throw new LotofacilGenerationError("RMS_REQUIRES_SIX_TICKETS", "RMS v2 is fixed at exactly 6 tickets and does not accept a different quantity.");
  }
  const config = (await loadGameConfig()).lotofacil;
  const dataset = await loadDataset("lotofacil");
  const window = referenceWindow(dataset, request.contest, RMS_HISTORY_WINDOW);
  if (!window) {
    throw new LotofacilGenerationError(
      "RMS_INSUFFICIENT_HISTORY",
      `RMS v2 requires the ${RMS_HISTORY_WINDOW} contests immediately before contest ${request.contest} to be available in the dataset.`,
    );
  }
  const seed = resolveSeed(request.seed);
  const generation = generateRmsV2({ targetContest: request.contest, referenceWindow: window, seed });
  const result = await evaluateAndAttachBaseline(generation.tickets as number[][], {
    ticketCostBRL: config.ticketCostBRL,
    ticketCostSource: config.source,
    ticketCostReferenceDate: config.referenceDate,
    strategyId: LOTOFACIL_RMS_V2.id,
    strategyVersion: LOTOFACIL_RMS_V2.version,
    algorithmVersion: RMS_ALGORITHM_VERSION,
    generationMethod: `structural constraint search (patterns ${generation.patternUsed.join(", ")}; J6 variant ${generation.j6Variant})`,
    seedForAudit: seed,
    bestScore: generation.tieBreakScore,
    iterations: generation.attempts,
  });
  return buildEnvelope(LOTOFACIL_RMS_V2.id, LOTOFACIL_RMS_V2.version, request, result);
}

export async function generateMaxDiversificationAdapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<LotofacilPortfolioResult, LotofacilAuditMetadata>> {
  const config = (await loadGameConfig()).lotofacil;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, LOTOFACIL_MAX_DIVERSIFICATION.ticketCount.max ?? Infinity, request.fixedNumbers, request.excludedNumbers);
  const seed = resolveSeed(request.seed);
  const generation = generateMaxDiversification({
    numberOfTickets,
    fixedNumbers: request.fixedNumbers,
    excludedNumbers: request.excludedNumbers,
    seed,
  });
  const result = await evaluateAndAttachBaseline(
    generation.tickets as number[][],
    {
      ticketCostBRL: config.ticketCostBRL,
      ticketCostSource: config.source,
      ticketCostReferenceDate: config.referenceDate,
      strategyId: LOTOFACIL_MAX_DIVERSIFICATION.id,
      strategyVersion: LOTOFACIL_MAX_DIVERSIFICATION.version,
      algorithmVersion: DIVERSIFICATION_ALGORITHM_VERSION,
      generationMethod: "lexicographic balance (exposure, then overlap) + local search",
      seedForAudit: seed,
      iterations: generation.iterations,
    },
    request.fixedNumbers?.length || request.excludedNumbers?.length
      ? generateUniformRandomPortfolio({ numberOfTickets, fixedNumbers: request.fixedNumbers, excludedNumbers: request.excludedNumbers, seed: `${seed}:control` }).tickets as number[][]
      : undefined,
  );
  return buildEnvelope(LOTOFACIL_MAX_DIVERSIFICATION.id, LOTOFACIL_MAX_DIVERSIFICATION.version, request, result);
}

async function generateMaxCoverageAdapter(
  request: GeneratePortfolioRequest,
  threshold: 11 | 12,
  definition: typeof LOTOFACIL_MAX_COVERAGE_11,
): Promise<PortfolioEnvelope<LotofacilPortfolioResult, LotofacilAuditMetadata>> {
  const config = (await loadGameConfig()).lotofacil;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, definition.ticketCount.max ?? Infinity, request.fixedNumbers, request.excludedNumbers);
  const seed = resolveSeed(request.seed);
  const generation = generateMaxCoverage({
    numberOfTickets,
    threshold,
    fixedNumbers: request.fixedNumbers,
    excludedNumbers: request.excludedNumbers,
    seed,
    qualityPreset: request.qualityPreset,
  });
  const result = await evaluateAndAttachBaseline(
    generation.tickets as number[][],
    {
      ticketCostBRL: config.ticketCostBRL,
      ticketCostSource: config.source,
      ticketCostReferenceDate: config.referenceDate,
      strategyId: definition.id,
      strategyVersion: definition.version,
      algorithmVersion: COVERAGE_ALGORITHM_VERSION,
      generationMethod: `heuristic greedy + local search over sampled coverage (preset ${generation.qualityPreset}, sample ${generation.sampleSize}, candidates ${generation.candidatePoolSize}, iterations ${generation.iterations})`,
      qualityPreset: generation.qualityPreset,
      candidatePoolSize: generation.candidatePoolSize,
      iterations: generation.iterations,
      bestScore: generation.bestSampledCoverageCount,
      seedForAudit: seed,
    },
    request.fixedNumbers?.length || request.excludedNumbers?.length
      ? generateUniformRandomPortfolio({ numberOfTickets, fixedNumbers: request.fixedNumbers, excludedNumbers: request.excludedNumbers, seed: `${seed}:control` }).tickets as number[][]
      : undefined,
  );
  return buildEnvelope(definition.id, definition.version, request, result);
}

export const generateMaxCoverage11Adapter = (request: GeneratePortfolioRequest) => generateMaxCoverageAdapter(request, 11, LOTOFACIL_MAX_COVERAGE_11);
export const generateMaxCoverage12Adapter = (request: GeneratePortfolioRequest) => generateMaxCoverageAdapter(request, 12, LOTOFACIL_MAX_COVERAGE_12);

export async function generateUniformRandomAdapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<LotofacilPortfolioResult, LotofacilAuditMetadata>> {
  const config = (await loadGameConfig()).lotofacil;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, LOTOFACIL_UNIFORM_RANDOM.ticketCount.max ?? Infinity, request.fixedNumbers, request.excludedNumbers);
  const seed = resolveSeed(request.seed);
  const generation = generateUniformRandomPortfolio({
    numberOfTickets,
    fixedNumbers: request.fixedNumbers,
    excludedNumbers: request.excludedNumbers,
    seed,
  });
  const result = await evaluateAndAttachBaseline(generation.tickets as number[][], {
    ticketCostBRL: config.ticketCostBRL,
    ticketCostSource: config.source,
    ticketCostReferenceDate: config.referenceDate,
    strategyId: LOTOFACIL_UNIFORM_RANDOM.id,
    strategyVersion: LOTOFACIL_UNIFORM_RANDOM.version,
    algorithmVersion: UNIFORM_ALGORITHM_VERSION,
    generationMethod: "uniform random sampling without replacement",
    seedForAudit: seed,
  });
  return buildEnvelope(LOTOFACIL_UNIFORM_RANDOM.id, LOTOFACIL_UNIFORM_RANDOM.version, request, result);
}

export async function generateLotofacilPortfolio(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<LotofacilPortfolioResult, LotofacilAuditMetadata>> {
  switch (request.strategyId) {
    case LOTOFACIL_RMS_V2.id:
      return generateRmsV2Adapter(request);
    case LOTOFACIL_MAX_DIVERSIFICATION.id:
      return generateMaxDiversificationAdapter(request);
    case LOTOFACIL_MAX_COVERAGE_11.id:
      return generateMaxCoverage11Adapter(request);
    case LOTOFACIL_MAX_COVERAGE_12.id:
      return generateMaxCoverage12Adapter(request);
    case LOTOFACIL_UNIFORM_RANDOM.id:
      return generateUniformRandomAdapter(request);
    default:
      throw new LotofacilGenerationError("UNKNOWN_STRATEGY", `Unknown Lotofacil strategy: ${request.strategyId}`);
  }
}

export { comb, LOTOFACIL_MAX_NUMBER, LOTOFACIL_TICKET_SIZE };
