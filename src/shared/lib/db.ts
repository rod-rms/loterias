import Dexie, { type Table } from "dexie";
import type { SavedPortfolio } from "../types";

export class LoteriasDatabase extends Dexie {
  portfolios!: Table<SavedPortfolio, string>;

  constructor() {
    super("loterias-db");
    this.version(1).stores({
      // id primary key; indexes for common filters used by "Minhas carteiras"
      portfolios: "id, modality, contest, strategyId, markedAsBet, createdAt",
    });
  }
}

export const db = new LoteriasDatabase();
