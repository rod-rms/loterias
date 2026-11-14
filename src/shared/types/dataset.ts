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

/** Sections a modality can expose in the navigation shell (UI-001). */
export type ModalitySection = "gerar" | "carteiras" | "analise" | "metodologia";

/** One entry of the modality registry in game-config.json (UI-001). */
export interface ModalityRegistryEntry {
  id: Modality;
  slug: string;
  displayName: string;
  shortName: string;
  enabled: boolean;
  order: number;
  sections: ModalitySection[];
  datasetPath: string;
  officialUrl: string;
  colors: { accent: string; accentStrong: string; soft: string; onAccent: string; text: string };
}

export interface GameConfig {
  schemaVersion: number;
  updatedAt: string;
  lotofacil: GameConfigEntry;
  megasena: GameConfigEntry;
  /** Modality registry; optional only for legacy fixtures, always present in the shipped config. */
  modalities?: ModalityRegistryEntry[];
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
