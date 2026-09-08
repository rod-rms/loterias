import { describe, expect, it } from "vitest";
import { gameConfigSchema, lotteryDatasetSchema, loteriasBackupSchema, dataStatusSchema, savedPortfolioSchema } from "../../src/shared/lib/schemas";

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

describe("saved portfolio dataset snapshot", () => {
  const basePortfolio = {
    schemaVersion: 1,
    id: "p1",
    modality: "lotofacil" as const,
    strategyId: "lotofacil.uniform_random",
    strategyVersion: "1",
    engineVersion: "1",
    createdAt: new Date().toISOString(),
    price: { ticketCostBRL: 3, referenceDate: "2026-09-07", source: "test" },
    seed: "seed-1",
    parameters: {},
    tickets: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
    metrics: {},
    audit: {},
    markedAsBet: false,
  };

  it("accepts a portfolio with no dataset snapshot (older/backwards-compatible records)", () => {
    expect(savedPortfolioSchema.safeParse(basePortfolio).success).toBe(true);
  });

  it("accepts a portfolio with a full dataset snapshot", () => {
    const withDataset = { ...basePortfolio, dataset: { latestContest: 3779, importedAt: new Date().toISOString(), source: "test", latestDrawDate: "2026-09-03", statusSchemaVersion: 1 } };
    expect(savedPortfolioSchema.safeParse(withDataset).success).toBe(true);
  });

  it("accepts a dataset snapshot without the optional extended fields", () => {
    const minimal = { ...basePortfolio, dataset: { latestContest: 3779, importedAt: new Date().toISOString(), source: "test" } };
    expect(savedPortfolioSchema.safeParse(minimal).success).toBe(true);
  });
});

describe("data status schema (public/data/status.json)", () => {
  const validStatus = {
    schemaVersion: 1,
    lotofacil: {
      source: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil",
      latestContest: 3779,
      latestDrawDate: "2026-09-03",
      lastUpdatedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      status: "ok" as const,
      gapCount: 0,
    },
    megasena: {
      source: "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena",
      latestContest: 3054,
      latestDrawDate: "2026-09-06",
      lastUpdatedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      status: "ok" as const,
      gapCount: 0,
    },
  };

  it("accepts a well-formed status document", () => {
    expect(dataStatusSchema.safeParse(validStatus).success).toBe(true);
  });

  it("distinguishes lastUpdatedAt from lastCheckedAt: both are required and independent", () => {
    const onlyChecked = { ...validStatus, lotofacil: { ...validStatus.lotofacil, lastUpdatedAt: "" } };
    expect(dataStatusSchema.safeParse(onlyChecked).success).toBe(false);
  });

  it("rejects an unknown status value", () => {
    const broken = { ...validStatus, lotofacil: { ...validStatus.lotofacil, status: "unknown" } };
    expect(dataStatusSchema.safeParse(broken).success).toBe(false);
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
