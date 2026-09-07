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
