import type { Modality } from "./strategy";

export interface LotteryDraw {
  contest: number;
  drawDate: string;
  numbers: number[];
}

export interface LotteryDataset {
  schemaVersion: number;
  modality: Modality;
  source: string;
  importedAt: string;
  latestContest: number;
  draws: LotteryDraw[];
}

export interface GameConfigEntry {
  simpleTicketSize: number;
  ticketCostBRL: number;
  source: string;
  referenceDate: string;
  configVersion: string;
}

export interface GameConfig {
  schemaVersion: number;
  updatedAt: string;
  lotofacil: GameConfigEntry;
  megasena: GameConfigEntry;
}

/**
 * Versioned data-source transparency metadata (public/data/status.json).
 * `lastUpdatedAt` and `lastCheckedAt` are deliberately distinct: the local
 * dataset can be verified against the official source without a new draw
 * being available yet.
 */
export interface ModalityDataStatus {
  source: string;
  latestContest: number;
  latestDrawDate: string;
  lastUpdatedAt: string;
  lastCheckedAt: string;
  status: "ok" | "degraded";
  gapCount: number;
}

export interface DataStatus {
  schemaVersion: number;
  lotofacil: ModalityDataStatus;
  megasena: ModalityDataStatus;
}
