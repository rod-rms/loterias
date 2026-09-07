export type Modality = "lotofacil" | "megasena";
export type ProbabilityStatus = "exact" | "estimated" | "upper_bound" | "lower_bound" | "not_computed";

export type StrategyStatus = "active" | "experimental" | "research";
export type StrategyEvidence = "baseline" | "mathematical" | "structural" | "experimental";
export type QualityPreset = "fast" | "balanced" | "deep";

export interface TicketCountCapability {
  mode: "fixed" | "range";
  fixed?: number;
  min?: number;
  max?: number;
}

/**
 * Declarative capability contract for a strategy. The UI must configure
 * itself from these fields instead of branching on strategy id.
 */
export interface StrategyDefinition {
  id: string;
  version: string;
  modality: Modality;
  name: string;
  shortDescription: string;
  status: StrategyStatus;
  evidence: StrategyEvidence;

  ticketCount: TicketCountCapability;

  supportsBudget: boolean;
  supportsFixedNumbers: boolean;
  supportsExcludedNumbers: boolean;
  supportsUserSeed: boolean;
  supportsQualityPreset: boolean;
  requiresHistoricalDraws: boolean;
  requiresTargetContest: boolean;

  optimizedMetrics: string[];
  reportedMetrics: string[];
  disclaimers: string[];

  /** Number of previous contests required in the reference window, if any. */
  historyWindowSize?: number;
}

export interface GeneratePortfolioRequest {
  modality: Modality;
  strategyId: string;
  contest?: number;
  inputMode: "quantity" | "budget";
  numberOfTickets?: number;
  budgetBRL?: number;
  seed?: string | number;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  qualityPreset?: QualityPreset;
  advanced?: Record<string, unknown>;
}

export interface PortfolioEnvelope<TMetrics = unknown, TAudit = unknown> {
  id: string;
  modality: Modality;
  strategyId: string;
  strategyVersion: string;
  contest?: number;
  seed: string | number;
  tickets: number[][];
  costBRL: number;
  metrics: TMetrics;
  audit: TAudit;
  generationMethod: string;
  evaluationMethod: string;
  createdAt: string;
}

export type WorkerStage = "preparing" | "optimizing" | "evaluating" | "auditing" | "done";

export interface WorkerProgressMessage {
  type: "progress";
  stage: WorkerStage;
}

export interface WorkerSuccessMessage<T> {
  type: "success";
  result: T;
}

export interface WorkerErrorMessage {
  type: "error";
  error: { name: string; message: string; code?: string };
}

export type WorkerResponseMessage<T> =
  | WorkerProgressMessage
  | WorkerSuccessMessage<T>
  | WorkerErrorMessage;

export const QUALITY_PRESETS: readonly QualityPreset[] = ["fast", "balanced", "deep"];
export const DEFAULT_QUALITY_PRESET: QualityPreset = "balanced";
