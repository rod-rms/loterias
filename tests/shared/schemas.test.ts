import { describe, expect, it } from "vitest";
import { gameConfigSchema, lotteryDatasetSchema, loteriasBackupSchema } from "../../src/shared/lib/schemas";

describe("dataset schema", () => {
  const validDataset = {
    schemaVersion: 1,
    modality: "lotofacil",
    source: "https://example.com",
    importedAt: new Date().toISOString(),
    latestContest: 2,
    draws: [
      { contest: 1, drawDate: "2020-01-01", numbers: Array.from({ length: 15 }, (_, i) => i + 1) },
      { contest: 2, drawDate: "2020-01-08", numbers: Array.from({ length: 15 }, (_, i) => i + 2) },
    ],
  };

  it("accepts a well-formed dataset", () => {
    expect(lotteryDatasetSchema.safeParse(validDataset).success).toBe(true);
  });

  it("rejects a draw with the wrong ticket size for the modality", () => {
    const broken = { ...validDataset, draws: [{ ...validDataset.draws[0], numbers: [1, 2, 3] }] };
    expect(lotteryDatasetSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects duplicate contests", () => {
    const broken = { ...validDataset, draws: [validDataset.draws[0], validDataset.draws[0]] };
    expect(lotteryDatasetSchema.safeParse(broken).success).toBe(false);
  });

  it("rejects numbers out of range", () => {
    const broken = { ...validDataset, draws: [{ ...validDataset.draws[0], numbers: [0, ...Array.from({ length: 14 }, (_, i) => i + 2)] }] };
    expect(lotteryDatasetSchema.safeParse(broken).success).toBe(false);
  });
});

describe("game config schema", () => {
  it("accepts a well-formed config", () => {
    const config = {
      schemaVersion: 1,
      updatedAt: "2026-09-07",
      lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3.5, source: "x", referenceDate: "2026-09-07", configVersion: "v1" },
      megasena: { simpleTicketSize: 6, ticketCostBRL: 6, source: "x", referenceDate: "2026-09-07", configVersion: "v1" },
    };
    expect(gameConfigSchema.safeParse(config).success).toBe(true);
  });
});

describe("backup schema", () => {
  it("accepts an empty backup", () => {
    expect(loteriasBackupSchema.safeParse({ schemaVersion: 1, exportedAt: new Date().toISOString(), portfolios: [] }).success).toBe(true);
  });

  it("rejects malformed content instead of silently coercing it", () => {
    expect(loteriasBackupSchema.safeParse({ schemaVersion: 1, portfolios: "not-an-array" }).success).toBe(false);
  });
});
