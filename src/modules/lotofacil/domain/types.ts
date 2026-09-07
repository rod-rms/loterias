export type LotofacilNumber = number;
export type LotofacilTicket = readonly LotofacilNumber[];
export type LotofacilPortfolio = readonly LotofacilTicket[];

export type ProbabilityStatus = "exact" | "estimated" | "upper_bound" | "lower_bound" | "not_computed";

export interface ProbabilityMetric {
  status: ProbabilityStatus;
  probability: number | null;
  percent: number | null;
  favourableDraws?: number;
  denominator: number;
  oneIn?: number | null;
  method: string;
  notes?: string[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface HitThresholdMetrics {
  atLeast11: ProbabilityMetric;
  atLeast12: ProbabilityMetric;
  atLeast13: ProbabilityMetric;
  atLeast14: ProbabilityMetric;
  exactly15: ProbabilityMetric;
  noAtLeast11: ProbabilityMetric;
}

export interface ExpectedExactHits {
  exactly11: number;
  exactly12: number;
  exactly13: number;
  exactly14: number;
  exactly15: number;
}

export interface OverlapDiagnostics {
  matrix: number[][];
  histogram: Record<string, number>;
  pairCount: number;
  min: number;
  max: number;
  mean: number;
}

export interface ExposureDiagnostics {
  /** number -> how many tickets in the portfolio contain it */
  exposure: Record<number, number>;
  min: number;
  max: number;
}

export interface BaselineMetricComparison {
  portfolio: ProbabilityMetric;
  baseline: ProbabilityMetric;
  absolutePercentagePointDifference: number | null;
  relativeDifferencePercent: number | null;
}

export interface PortfolioBaselineComparison {
  kind: "uniform_distinct_average" | "seeded_uniform_control";
  sameTicketCount: boolean;
  sameRestrictions: boolean;
  atLeast11: BaselineMetricComparison;
  atLeast12: BaselineMetricComparison;
  atLeast13: BaselineMetricComparison;
  atLeast14: BaselineMetricComparison;
  exactly15: BaselineMetricComparison;
  controlTickets?: LotofacilTicket[];
  notes?: string[];
}

export interface LotofacilAuditMetadata {
  modelVersion: string;
  algorithmVersion: string;
  generatedAt: string;
  strategyId: string;
  strategyVersion: string;
  seed?: string | number;
  ticketCostBRL: number;
  ticketCostSource?: string;
  ticketCostReferenceDate?: string;
  generationMethod: string;
  evaluationMethod: "exact" | "estimated" | "mixed";
  qualityPreset?: string;
  iterations?: number;
  candidatePoolSize?: number;
  elapsedMs?: number;
  bestScore?: number;
  warnings?: string[];
}

export interface LotofacilPortfolioResult {
  tickets: LotofacilTicket[];
  costBRL: number;
  totalDistinctTickets: number;
  probability: HitThresholdMetrics;
  expectedExactHits: ExpectedExactHits;
  overlap: OverlapDiagnostics;
  exposure: ExposureDiagnostics;
  randomBaseline?: PortfolioBaselineComparison;
  audit: LotofacilAuditMetadata;
}

export interface LotofacilRmsPoolSnapshot {
  fromContest: number;
  toContest: number;
  frequencies: Record<number, number>;
  poolA: number[];
  poolB: number[];
  poolC: number[];
  boundaryTies: { boundary: "A/C" | "C/B"; frequency: number; numbers: number[] }[];
}

export interface GenerationOptions {
  ticketCostBRL: number;
  ticketCostSource?: string;
  ticketCostReferenceDate?: string;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  seed?: string | number;
  qualityPreset?: "fast" | "balanced" | "deep";
}

export interface CoverageEvaluationOptions {
  seed?: string | number;
}

export interface PortfolioEvaluationOptions extends CoverageEvaluationOptions {
  ticketCostBRL?: number;
  ticketCostSource?: string;
  ticketCostReferenceDate?: string;
  strategyId?: string;
  strategyVersion?: string;
  algorithmVersion?: string;
  generationMethod?: string;
  qualityPreset?: string;
  iterations?: number;
  candidatePoolSize?: number;
  elapsedMs?: number;
  bestScore?: number;
  warnings?: string[];
  seedForAudit?: string | number;
}
