import { comb } from "../../../shared/lib/combinatorics";
import { resolveSeed } from "../../../shared/lib/seed";
import { ticketsForBudget } from "../../../shared/utils/currency";
import { loadGameConfig } from "../../../shared/lib/dataLoaders";
import type { GameConfig, GeneratePortfolioRequest, PortfolioEnvelope } from "../../../shared/types";
import {
  MEGASENA_MAX_NUMBER,
  MEGASENA_TICKET_SIZE,
  evaluateMegaSenaPortfolio,
  generateMegaSenaPortfolio,
  buildUniformAverageBaselineComparison,
  buildSeededControlBaselineComparison,
  ALGORITHM_VERSION,
  type MegaSenaAuditMetadata,
  type MegaSenaPortfolioResult,
} from "../domain";
import { generateUniformDistinctTickets, createSeededRandom } from "../domain/random";
import { generateMegaMaxDiversification } from "./diversification";
import { MEGASENA_MAX_DIVERSIFICATION, MEGASENA_MAX_F4, MEGASENA_MAX_F5, MEGASENA_UNIFORM_RANDOM } from "./definitions";

export class MegaSenaGenerationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function resolveTicketCount(request: GeneratePortfolioRequest, config: GameConfig["megasena"]): number {
  if (request.inputMode === "budget") {
    if (request.budgetBRL === undefined) throw new MegaSenaGenerationError("MISSING_BUDGET", "budgetBRL is required for budget input mode.");
    return ticketsForBudget(request.budgetBRL, config.ticketCostBRL);
  }
  if (request.numberOfTickets === undefined) throw new MegaSenaGenerationError("MISSING_QUANTITY", "numberOfTickets is required for quantity input mode.");
  return request.numberOfTickets;
}

function assertFeasible(numberOfTickets: number, fixedNumbers?: number[], excludedNumbers?: number[]): void {
  const f = new Set(fixedNumbers ?? []).size;
  const e = new Set(excludedNumbers ?? []).size;
  const maxDistinct = Number(comb(MEGASENA_MAX_NUMBER - f - e, MEGASENA_TICKET_SIZE - f));
  if (numberOfTickets > maxDistinct) {
    throw new MegaSenaGenerationError(
      "QUANTITY_EXCEEDS_MAX_DISTINCT",
      `Requested ${numberOfTickets} tickets, but only ${maxDistinct} distinct tickets are possible under the supplied fixed/excluded numbers.`,
    );
  }
}

function buildEnvelope(
  strategyId: string,
  strategyVersion: string,
  request: GeneratePortfolioRequest,
  result: MegaSenaPortfolioResult,
): PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata> {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    modality: "megasena",
    strategyId,
    strategyVersion,
    contest: request.contest,
    seed: result.audit.seed ?? "n/a",
    tickets: result.tickets.map((t) => [...t]),
    costBRL: result.costBRL,
    metrics: result,
    audit: result.audit,
    generationMethod: result.audit.objective,
    evaluationMethod: result.audit.evaluationMethod,
    createdAt: result.audit.generatedAt,
  };
}

async function generateCoverageAdapter(
  request: GeneratePortfolioRequest,
  objective: "quadra_or_better" | "quina_or_better",
  definition: typeof MEGASENA_MAX_F4,
): Promise<PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata>> {
  const config = (await loadGameConfig()).megasena;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, request.fixedNumbers, request.excludedNumbers);
  const seed = resolveSeed(request.seed);
  const result = generateMegaSenaPortfolio({
    numberOfTickets,
    ticketCostBRL: config.ticketCostBRL,
    objective,
    fixedNumbers: request.fixedNumbers,
    excludedNumbers: request.excludedNumbers,
    seed,
    popularityMode: "off",
  });
  result.randomBaseline = buildUniformAverageBaselineComparison(result);
  return buildEnvelope(definition.id, definition.version, request, result);
}

export const generateMaxF4Adapter = (request: GeneratePortfolioRequest) => generateCoverageAdapter(request, "quadra_or_better", MEGASENA_MAX_F4);
export const generateMaxF5Adapter = (request: GeneratePortfolioRequest) => generateCoverageAdapter(request, "quina_or_better", MEGASENA_MAX_F5);

export async function generateMaxDiversificationAdapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata>> {
  const config = (await loadGameConfig()).megasena;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, request.fixedNumbers, request.excludedNumbers);
  const seed = resolveSeed(request.seed);
  const generation = generateMegaMaxDiversification({
    numberOfTickets,
    fixedNumbers: request.fixedNumbers,
    excludedNumbers: request.excludedNumbers,
    seed,
  });
  const result = evaluateMegaSenaPortfolio(generation.tickets, {
    ticketCostBRL: config.ticketCostBRL,
    ticketCostSource: config.source,
    ticketCostReferenceDate: config.referenceDate,
    seed,
    objective: "evaluation_only",
    algorithmVersion: `${ALGORITHM_VERSION}+diversification-lexicographic-v1`,
    iterations: generation.iterations,
  });
  if (request.fixedNumbers?.length || request.excludedNumbers?.length) {
    const controlTickets = generateUniformDistinctTickets(numberOfTickets, createSeededRandom(`${seed}:control`), new Set(), {
      fixedNumbers: request.fixedNumbers,
      excludedNumbers: request.excludedNumbers,
    });
    const control = evaluateMegaSenaPortfolio(controlTickets, { ticketCostBRL: config.ticketCostBRL });
    result.randomBaseline = buildSeededControlBaselineComparison(result, control);
  } else {
    result.randomBaseline = buildUniformAverageBaselineComparison(result);
  }
  return buildEnvelope(MEGASENA_MAX_DIVERSIFICATION.id, MEGASENA_MAX_DIVERSIFICATION.version, request, result);
}

export async function generateUniformRandomAdapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata>> {
  const config = (await loadGameConfig()).megasena;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, request.fixedNumbers, request.excludedNumbers);
  const seed = resolveSeed(request.seed);
  const tickets = generateUniformDistinctTickets(numberOfTickets, createSeededRandom(`${seed}:uniform_random`), new Set(), {
    fixedNumbers: request.fixedNumbers,
    excludedNumbers: request.excludedNumbers,
  });
  const result = evaluateMegaSenaPortfolio(tickets, {
    ticketCostBRL: config.ticketCostBRL,
    ticketCostSource: config.source,
    ticketCostReferenceDate: config.referenceDate,
    seed,
    objective: "evaluation_only",
    algorithmVersion: "uniform-random-v1",
  });
  result.randomBaseline = buildUniformAverageBaselineComparison(result);
  return buildEnvelope(MEGASENA_UNIFORM_RANDOM.id, MEGASENA_UNIFORM_RANDOM.version, request, result);
}

export async function generateMegaSenaPortfolioRequest(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata>> {
  switch (request.strategyId) {
    case MEGASENA_MAX_F4.id:
      return generateMaxF4Adapter(request);
    case MEGASENA_MAX_F5.id:
      return generateMaxF5Adapter(request);
    case MEGASENA_MAX_DIVERSIFICATION.id:
      return generateMaxDiversificationAdapter(request);
    case MEGASENA_UNIFORM_RANDOM.id:
      return generateUniformRandomAdapter(request);
    default:
      throw new MegaSenaGenerationError("UNKNOWN_STRATEGY", `Unknown Mega-Sena strategy: ${request.strategyId}`);
  }
}
