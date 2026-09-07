import {
  ALGORITHM_VERSION,
  MODEL_VERSION,
  REFERENCE_TICKET_COST_BRL_V0_1,
} from "./constants";
import type {
  MegaSenaAuditMetadata,
  MegaSenaObjective,
  PopularityMode,
  ProbabilityMetric,
} from "./types";

export function aggregateEvaluationMethod(
  metrics: readonly ProbabilityMetric[],
): "exact" | "estimated" | "mixed" {
  const statuses = new Set(metrics.map((metric) => metric.status));
  if ([...statuses].every((status) => status === "exact")) return "exact";
  if ([...statuses].every((status) => status === "estimated")) return "estimated";
  return "mixed";
}

export interface AuditInput {
  objective: MegaSenaObjective | "evaluation_only";
  seed?: string | number;
  ticketCostBRL?: number;
  ticketCostSource?: string;
  ticketCostReferenceDate?: string;
  evaluationMethod: "exact" | "estimated" | "mixed";
  iterations?: number;
  elapsedMs?: number;
  popularityMode?: PopularityMode;
  algorithmVersion?: string;
  warnings?: string[];
}

export function createAuditMetadata(input: AuditInput): MegaSenaAuditMetadata {
  return {
    modelVersion: MODEL_VERSION,
    algorithmVersion: input.algorithmVersion ?? ALGORITHM_VERSION,
    generatedAt: new Date().toISOString(),
    objective: input.objective,
    seed: input.seed,
    ticketCostBRL: input.ticketCostBRL ?? REFERENCE_TICKET_COST_BRL_V0_1,
    ticketCostSource: input.ticketCostSource,
    ticketCostReferenceDate: input.ticketCostReferenceDate,
    evaluationMethod: input.evaluationMethod,
    iterations: input.iterations,
    elapsedMs: input.elapsedMs,
    popularityMode: input.popularityMode ?? "off",
    warnings: input.warnings,
  };
}
