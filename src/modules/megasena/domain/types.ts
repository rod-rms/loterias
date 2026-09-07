export type MegaSenaNumber = number;
export type MegaSenaTicket = readonly MegaSenaNumber[];
export type MegaSenaPortfolio = readonly MegaSenaTicket[];

export type MegaSenaObjective = "quadra_or_better" | "quina_or_better";
export type PopularityMode = "off" | "experimental";
export type ProbabilityStatus =
  | "exact"
  | "estimated"
  | "upper_bound"
  | "lower_bound"
  | "not_computed";

export interface ProbabilityMetric {
  status: ProbabilityStatus;
  probability: number | null;
  percent: number | null;
  favourableDraws?: number;
  estimatedFavourableDraws?: number;
  denominator: number;
  oneIn?: number | null;
  method: string;
  sampleSize?: number;
  standardError?: number;
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

export interface OverlapDiagnostics {
  matrix: number[][];
  histogram: Record<string, number>;
  pairCount: number;
  min: number;
  max: number;
  mean: number;
  allPairsAtMost1: boolean;
  allPairsAtMost3: boolean;
  f4RegionsPairwiseDisjoint: boolean;
  f5RegionsPairwiseDisjoint: boolean;
}

export interface ExpectedWinningTickets {
  quadra: number;
  quina: number;
  sena: number;
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
  atLeast4: BaselineMetricComparison;
  atLeast5: BaselineMetricComparison;
  sena: BaselineMetricComparison;
  controlTickets?: MegaSenaTicket[];
  notes?: string[];
}

export interface TicketPopularityFeatures {
  ticket: MegaSenaTicket;
  calendarNumberCount: number;
  numbersAbove31Count: number;
  adjacentPairCount: number;
  longestConsecutiveRun: number;
  sameLastDigitPairCount: number;
  rangeBucketCounts: readonly [number, number, number, number, number, number];
  allNumbersAtOrBelow31: boolean;
  allNumbersAbove31: boolean;
}

export interface ExperimentalPopularityReport {
  status: "experimental_uncalibrated";
  score: null;
  warning: string;
  features: TicketPopularityFeatures[];
}

export interface MegaSenaAuditMetadata {
  modelVersion: string;
  algorithmVersion: string;
  generatedAt: string;
  objective: MegaSenaObjective | "evaluation_only";
  seed?: string | number;
  ticketCostBRL: number;
  ticketCostSource?: string;
  ticketCostReferenceDate?: string;
  evaluationMethod: "exact" | "estimated" | "mixed";
  iterations?: number;
  elapsedMs?: number;
  popularityMode: PopularityMode;
  warnings?: string[];
}

export interface MegaSenaGenerationInput {
  numberOfTickets?: number;
  budgetBRL?: number;
  ticketCostBRL: number;
  objective: MegaSenaObjective;
  existingTickets?: MegaSenaTicket[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  popularityMode?: PopularityMode;
  seed?: string | number;
  maxIterations?: number;
  timeBudgetMs?: number;
  candidatePoolSize?: number;
  evaluationSamples?: number;
}

export interface CoverageEvaluationOptions {
  exactF4MaxTickets?: number;
  exactF5MaxTickets?: number;
  estimationSamples?: number;
  seed?: string | number;
}

export interface PortfolioEvaluationOptions extends CoverageEvaluationOptions {
  ticketCostBRL?: number;
  ticketCostSource?: string;
  ticketCostReferenceDate?: string;
  popularityMode?: PopularityMode;
  seed?: string | number;
  objective?: MegaSenaObjective | "evaluation_only";
  algorithmVersion?: string;
  iterations?: number;
  elapsedMs?: number;
  warnings?: string[];
}

export interface MegaSenaPortfolioResult {
  tickets: MegaSenaTicket[];
  costBRL: number;
  totalDistinctTickets: number;
  probability: {
    atLeast4: ProbabilityMetric;
    atLeast5: ProbabilityMetric;
    sena: ProbabilityMetric;
    noPrize: ProbabilityMetric;
  };
  expectedWinningTickets: ExpectedWinningTickets;
  overlap: OverlapDiagnostics;
  randomBaseline?: PortfolioBaselineComparison;
  popularity?: ExperimentalPopularityReport;
  audit: MegaSenaAuditMetadata;
}
