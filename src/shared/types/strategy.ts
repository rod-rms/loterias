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
 * Plain-language presentation metadata for a strategy, shown to
 * non-technical users. Purely presentational: never used for branching
 * logic, never changes domain behavior. The technical name/id/version stay
 * available in "Detalhes técnicos" sections.
 */
export interface StrategyUxMetadata {
  /** Short, goal-oriented title shown on the strategy card (e.g. "Variar mais os jogos"). */
  title: string;
  /** One or two plain-language sentences describing what the strategy does. */
  summary: string;
  /** Short plain-language badge (e.g. "Mais diversidade"), replacing raw evidence labels in the primary flow. */
  badge: string;
  /** Title shown in the InfoHelp/expandable explanation. */
  helpTitle: string;
  /** Longer plain-language explanation, may include limitations, shown in "Como funciona". */
  helpBody: string;
  /** The original technical/internal display name, shown only in technical details. */
  technicalName: string;
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

  /** Plain-language presentation metadata for lay users. See {@link StrategyUxMetadata}. */
  ux: StrategyUxMetadata;
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
