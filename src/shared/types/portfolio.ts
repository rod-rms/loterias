import type { Modality } from "./strategy";

export interface SavedPortfolioPrice {
  ticketCostBRL: number;
  referenceDate: string;
  source: string;
}

export interface SavedPortfolioDatasetRef {
  latestContest: number;
  importedAt: string;
  source: string;
  /** Optional, backwards-compatible: added when the snapshot schema gained more detail. Older saved portfolios simply omit these. */
  latestDrawDate?: string;
  statusSchemaVersion?: number;
}

export interface CheckedResult {
  contest: number;
  numbers: number[];
  source?: string;
  checkedAt: string;
  hitsPerTicket: number[];
  prizeGrossBRL?: number;
}

/** Whether the official result was already present in LotoAtlas's own dataset when a bet selection was recorded. Describes dataset state, NOT the user's real-world bet-placement time. */
export type BetResultAvailability = "before_result_in_dataset" | "after_result_in_dataset" | "unknown";

export interface BetSelectionRevision {
  /** 1-based ticket numbers (J1 = 1), ascending, unique, each within 1..portfolio.tickets.length. Empty = bet registration removed. */
  selectedTicketNumbers: number[];
  recordedAt: string;
  resultAvailability: BetResultAvailability;
  datasetLatestContestAtRecording?: number;
}

/** Append-only history of actual-bet declarations; the current selection is the LAST revision. Metadata ABOUT a saved portfolio — never alters portfolio.tickets. */
export interface BetSelection {
  schemaVersion: 1;
  revisions: BetSelectionRevision[];
}

export interface SavedPortfolio {
  schemaVersion: number;
  id: string;
  modality: Modality;
  contest?: number;

  strategyId: string;
  strategyVersion: string;
  engineVersion: string;

  createdAt: string;
  dataset?: SavedPortfolioDatasetRef;

  price: SavedPortfolioPrice;

  seed: string | number;
  parameters: unknown;
  tickets: number[][];
  metrics: unknown;
  audit: unknown;

  /** Indexed aggregate flag: true when at least one ticket is currently declared as bet (or legacy whole-portfolio bet with no betSelection). */
  markedAsBet: boolean;
  /** Richer per-ticket bet record. When present it is the source of truth over markedAsBet. */
  betSelection?: BetSelection;
  notes?: string;

  checkedResult?: CheckedResult;
}

export interface LoteriasBackup {
  schemaVersion: number;
  exportedAt: string;
  portfolios: SavedPortfolio[];
  preferences?: Record<string, unknown>;
}
