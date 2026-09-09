import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/shared/lib/db";
import {
  deleteAllData,
  deletePortfolio,
  exportBackup,
  importBackup,
  listPortfolios,
  previewBackup,
  savePortfolio,
  setMarkedAsBet,
} from "../../src/shared/lib/portfolioStore";
import type { SavedPortfolio } from "../../src/shared/types";

function makePortfolio(id: string, overrides: Partial<SavedPortfolio> = {}): SavedPortfolio {
  return {
    schemaVersion: 1,
    id,
    modality: "lotofacil",
    contest: 3780,
    strategyId: "lotofacil.uniform_random",
    strategyVersion: "1.0.0",
    engineVersion: "1.0.0",
    createdAt: new Date().toISOString(),
    price: { ticketCostBRL: 3.5, referenceDate: "2026-09-07", source: "test" },
    seed: "seed-1",
    parameters: {},
    tickets: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
    metrics: {},
    audit: {},
    markedAsBet: false,
    ...overrides,
  };
}

describe("portfolio persistence (IndexedDB via Dexie)", () => {
  beforeEach(async () => {
    await db.portfolios.clear();
  });

  it("saves and reloads a portfolio", async () => {
    await savePortfolio(makePortfolio("p1"));
    const all = await listPortfolios();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe("p1");
  });

  it("filters by modality and markedAsBet", async () => {
    await savePortfolio(makePortfolio("p1", { modality: "lotofacil" }));
    await savePortfolio(makePortfolio("p2", { modality: "megasena" }));
    await savePortfolio(makePortfolio("p3", { modality: "lotofacil", markedAsBet: true }));

    expect(await listPortfolios({ modality: "megasena" })).toHaveLength(1);
    expect(await listPortfolios({ modality: "lotofacil" })).toHaveLength(2);
    expect(await listPortfolios({ markedAsBet: true })).toHaveLength(1);
  });

  it("toggles the markedAsBet flag", async () => {
    await savePortfolio(makePortfolio("p1"));
    await setMarkedAsBet("p1", true);
    const [p] = await listPortfolios();
    expect(p!.markedAsBet).toBe(true);
  });

  it("deletes a portfolio explicitly", async () => {
    await savePortfolio(makePortfolio("p1"));
    await deletePortfolio("p1");
    expect(await listPortfolios()).toHaveLength(0);
  });

  it("exports and re-imports a backup, skipping duplicate ids by default", async () => {
    await savePortfolio(makePortfolio("p1"));
    const backup = await exportBackup();
    expect(backup.portfolios).toHaveLength(1);

    const preview = previewBackup(backup);
    expect(preview.valid).toBe(true);
    if (preview.valid) expect(preview.count).toBe(1);

    const result = await importBackup(backup);
    expect(result.totalInFile).toBe(1);
    expect(result.imported).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
  });

  it("rejects an invalid backup file without throwing an unhandled error", () => {
    const preview = previewBackup({ not: "a backup" });
    expect(preview.valid).toBe(false);
  });

  it("erases all local data on request", async () => {
    await savePortfolio(makePortfolio("p1"));
    await savePortfolio(makePortfolio("p2"));
    await deleteAllData();
    expect(await listPortfolios()).toHaveLength(0);
  });

  it("backward compatibility: a pre-v1.1 portfolio shape (no dataset, no checkedResult fields) remains readable", async () => {
    // Deliberately omit `dataset` and `checkedResult` — fields added after
    // the original schema — to prove older saved records still parse and
    // round-trip cleanly rather than requiring a migration.
    const legacyShaped = makePortfolio("legacy-1");
    expect("dataset" in legacyShaped).toBe(false);
    expect("checkedResult" in legacyShaped).toBe(false);

    await savePortfolio(legacyShaped);
    const [loaded] = await listPortfolios();
    expect(loaded!.id).toBe("legacy-1");
    expect(loaded!.dataset).toBeUndefined();
    expect(loaded!.checkedResult).toBeUndefined();
  });

  it("backward compatibility: a v1.0-shaped backup file (no dataset field on its portfolios) previews and imports successfully", async () => {
    const legacyBackup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      portfolios: [makePortfolio("legacy-backup-1")],
    };
    const preview = previewBackup(legacyBackup);
    expect(preview.valid).toBe(true);
    if (preview.valid) expect(preview.count).toBe(1);

    const result = await importBackup(legacyBackup);
    expect(result.imported).toBe(1);
    const all = await listPortfolios();
    expect(all.find((p) => p.id === "legacy-backup-1")).toBeTruthy();
  });
});
