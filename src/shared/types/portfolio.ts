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

  markedAsBet: boolean;
  notes?: string;

  checkedResult?: CheckedResult;
}

export interface LoteriasBackup {
  schemaVersion: number;
  exportedAt: string;
  portfolios: SavedPortfolio[];
  preferences?: Record<string, unknown>;
}
