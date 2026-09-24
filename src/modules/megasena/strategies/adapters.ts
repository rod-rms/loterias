import { comb } from "../../../shared/lib/combinatorics";
import { resolveSeed } from "../../../shared/lib/seed";
import { ticketsForBudget } from "../../../shared/utils/currency";
import { loadGameConfig, loadDataset, referenceWindow } from "../../../shared/lib/dataLoaders";
import type { GameConfig, GeneratePortfolioRequest, PortfolioEnvelope } from "../../../shared/types";
import {
  MEGASENA_MAX_NUMBER,
  MEGASENA_TICKET_SIZE,
  evaluateMegaSenaPortfolio,
  generateMegaSenaPortfolio,
  buildUniformAverageBaselineComparison,
  buildSeededControlBaselineComparison,
  ALGORITHM_VERSION,
  computeRolling20Groups,
  Rolling20GroupingError,
  ROLLING20_WINDOW_SIZE,
  type MegaSenaAuditMetadata,
  type MegaSenaPortfolioResult,
} from "../domain";
import { generateUniformDistinctTickets, createSeededRandom } from "../domain/random";
import { generateMegaMaxDiversification } from "./diversification";
import { generateRolling20Portfolio, Rolling20SearchError } from "./rolling20";
import { MEGASENA_MAX_DIVERSIFICATION, MEGASENA_MAX_F4, MEGASENA_MAX_F5, MEGASENA_ROLLING20_V2, MEGASENA_UNIFORM_RANDOM } from "./definitions";

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

function assertFeasible(numberOfTickets: number, strategyMax: number, fixedNumbers?: number[], excludedNumbers?: number[]): void {
  if (numberOfTickets > strategyMax) {
    throw new MegaSenaGenerationError(
      "QUANTITY_EXCEEDS_STRATEGY_LIMIT",
      `Requested ${numberOfTickets} tickets, but this strategy supports at most ${strategyMax}. The limit is not silently reduced; choose a smaller quantity/budget.`,
    );
  }
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
  assertFeasible(numberOfTickets, definition.ticketCount.max ?? Infinity, request.fixedNumbers, request.excludedNumbers);
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
  assertFeasible(numberOfTickets, MEGASENA_MAX_DIVERSIFICATION.ticketCount.max ?? Infinity, request.fixedNumbers, request.excludedNumbers);
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

/**
 * MEGA-ROLL-001 — Rolling 20 Balanceada v2.1. Follows the same historical-
 * window wiring shape as `lotofacil.rms_v2`
 * (`modules/lotofacil/strategies/adapters.ts`'s `generateRmsV2Adapter`):
 * resolve target contest → `loadDataset` → `referenceWindow` (no-look-ahead:
 * never returns a window reaching the target contest, `null` on any gap) →
 * domain grouping (§2-§3) → allocation (§4) + search (§6, in `./rolling20`)
 * → shared `evaluateMegaSenaPortfolio` for the final reported metrics
 * (F4/F5/F6, overlap, baseline) — never a bespoke evaluation path.
 */
export async function generateRolling20Adapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata>> {
  if (request.contest === undefined || !Number.isInteger(request.contest) || request.contest <= 0) {
    throw new MegaSenaGenerationError("ROLLING20_INVALID_TARGET_CONTEST", "Rolling 20 Balanceada requires a valid target contest (a positive integer).");
  }
  const config = (await loadGameConfig()).megasena;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, MEGASENA_ROLLING20_V2.ticketCount.max ?? Infinity, undefined, undefined);

  const dataset = await loadDataset("megasena");
  const window = referenceWindow(dataset, request.contest, ROLLING20_WINDOW_SIZE);
  if (!window) {
    throw new MegaSenaGenerationError(
      "ROLLING20_INCOMPLETE_HISTORY_WINDOW",
      `Rolling 20 Balanceada requires the ${ROLLING20_WINDOW_SIZE} contests immediately before contest ${request.contest} to be available in the dataset.`,
    );
  }

  let groups;
  try {
    groups = computeRolling20Groups(window);
  } catch (error) {
    if (error instanceof Rolling20GroupingError) throw new MegaSenaGenerationError(error.code, error.message);
    throw error;
  }

  const seed = resolveSeed(request.seed);
  // Both ludic options (spec §5's "Opções lúdicas") default OFF and are read
  // only from an explicit `advanced` request payload — never enabled
  // implicitly, and never folded into the standard filter set.
  const advanced = (request.advanced ?? {}) as { repeatPreviousDraw?: boolean; requireLow10?: boolean };
  const filterOptions = { repeatPreviousDraw: advanced.repeatPreviousDraw === true, requireLow10: advanced.requireLow10 === true };
  const previousDraw = filterOptions.repeatPreviousDraw ? dataset.draws.find((d) => d.contest === request.contest! - 1)?.numbers : undefined;

  let generation;
  try {
    generation = generateRolling20Portfolio({
      numberOfTickets,
      groups,
      seed,
      qualityPreset: request.qualityPreset,
      filterOptions,
      previousDraw,
    });
  } catch (error) {
    if (error instanceof Rolling20SearchError) throw new MegaSenaGenerationError(error.code, error.message);
    throw error;
  }

  const windowFirstContest = request.contest - ROLLING20_WINDOW_SIZE;
  const windowLastContest = request.contest - 1;
  const warnings: string[] = [];
  if (request.fixedNumbers?.length || request.excludedNumbers?.length) {
    warnings.push("Rolling 20 Balanceada não suporta dezenas fixas/excluídas; a solicitação foi ignorada (sem suporte parcial silencioso).");
  }
  const result = evaluateMegaSenaPortfolio(generation.tickets, {
    ticketCostBRL: config.ticketCostBRL,
    ticketCostSource: config.source,
    ticketCostReferenceDate: config.referenceDate,
    seed,
    objective: "evaluation_only",
    algorithmVersion: `${MEGASENA_ROLLING20_V2.version}+rolling20-grouping-allocation-filters-search-v1`,
    iterations: generation.iterations,
    warnings: warnings.length > 0 ? warnings : undefined,
    // Spec §7 audit snapshot: grouping window/G1-G2-G3, tie-break rule,
    // allocation per pattern, active filters and seed — all descriptive,
    // never re-entering as a score.
    strategySnapshot: {
      strategyId: MEGASENA_ROLLING20_V2.id,
      strategyVersion: MEGASENA_ROLLING20_V2.version,
      targetContest: request.contest,
      windowFirstContest,
      windowLastContest,
      datasetLatestContest: dataset.latestContest,
      datasetImportedAt: dataset.importedAt,
      frequency: groups.frequency.slice(1),
      groups: { g1: groups.g1, g2: groups.g2, g3: groups.g3 },
      tieBreakRule: "frequency desc, then most recent occurrence in window desc, then number asc",
      allocation: {
        targetG2Slots: generation.allocation.targetG2Slots,
        baseB: generation.allocation.baseB,
        extraB: generation.allocation.extraB,
        perTicket: generation.allocation.perTicket,
      },
      filtersActive: filterOptions,
      seed,
      qualityPreset: generation.qualityPreset,
      generationMethod: `rolling-20 grouping (§2-§3) + proportional G2 allocation (§4) + structural filters (§5) + lexicographic exposure/overlap local search, F4 as final tie-break only (§6), ${generation.iterations} iterations`,
      candidateAttempts: generation.candidateAttempts,
      score: generation.score,
    },
  });
  result.randomBaseline = buildUniformAverageBaselineComparison(result);
  return buildEnvelope(MEGASENA_ROLLING20_V2.id, MEGASENA_ROLLING20_V2.version, request, result);
}

export async function generateUniformRandomAdapter(request: GeneratePortfolioRequest): Promise<PortfolioEnvelope<MegaSenaPortfolioResult, MegaSenaAuditMetadata>> {
  const config = (await loadGameConfig()).megasena;
  const numberOfTickets = resolveTicketCount(request, config);
  assertFeasible(numberOfTickets, MEGASENA_UNIFORM_RANDOM.ticketCount.max ?? Infinity, request.fixedNumbers, request.excludedNumbers);
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
    case MEGASENA_ROLLING20_V2.id:
      return generateRolling20Adapter(request);
    default:
      throw new MegaSenaGenerationError("UNKNOWN_STRATEGY", `Unknown Mega-Sena strategy: ${request.strategyId}`);
  }
}
