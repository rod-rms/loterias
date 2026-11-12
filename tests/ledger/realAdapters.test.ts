import { describe, expect, it, vi } from "vitest";
import type { GameConfig, LotteryDataset } from "../../src/shared/types";
import { ledgerSeed } from "../../scripts/ledger/core";
import { LOTOFACIL_STRATEGIES } from "../../src/modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../src/modules/megasena/strategies/definitions";
import { makeDataset } from "./helpers";

/**
 * The ledger calls the SAME adapters the generation workers call. These tests pin that wiring: the registry
 * definitions give exactly the protocol's strategies, and the real adapters are deterministic for the ledger seed.
 */

const config: GameConfig = {
  schemaVersion: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3.5, source: "test", referenceDate: "2026-01-01", configVersion: "1" },
  megasena: { simpleTicketSize: 6, ticketCostBRL: 6, source: "test", referenceDate: "2026-01-01", configVersion: "1" },
};
const datasets: Record<string, LotteryDataset> = {
  lotofacil: makeDataset("lotofacil", 120, "2026-11-10"),
  megasena: makeDataset("megasena", 120, "2026-11-10"),
};

vi.mock("../../src/shared/lib/dataLoaders", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/dataLoaders")>("../../src/shared/lib/dataLoaders");
  return { ...actual, loadGameConfig: async () => config, loadDataset: async (m: string) => datasets[m] };
});

const { generateLotofacilPortfolio } = await import("../../src/modules/lotofacil/strategies/adapters");
const { generateMegaSenaPortfolioRequest } = await import("../../src/modules/megasena/strategies/adapters");

describe("ledger wiring to the strategy registry", () => {
  it("each modality has exactly the 5 strategies of the protocol", () => {
    expect(LOTOFACIL_STRATEGIES.map((s) => s.id).sort()).toEqual(
      ["lotofacil.max_coverage_11", "lotofacil.max_coverage_12", "lotofacil.max_diversification", "lotofacil.rms_v2", "lotofacil.uniform_random"],
    );
    expect(MEGASENA_STRATEGIES.map((s) => s.id).sort()).toEqual(
      ["megasena.max_diversification", "megasena.max_f4", "megasena.max_f5", "megasena.rolling_20_v2", "megasena.uniform_random"],
    );
  });

  it.each([
    ["lotofacil", "lotofacil.uniform_random", 121],
    ["megasena", "megasena.uniform_random", 121],
  ] as const)("real %s adapter: the ledger seed gives identical tickets twice, 6 sorted distinct tickets", async (modality, strategyId, target) => {
    const version = (modality === "lotofacil" ? LOTOFACIL_STRATEGIES : MEGASENA_STRATEGIES).find((s) => s.id === strategyId)!.version;
    const request = { modality, strategyId, contest: target, inputMode: "quantity" as const, numberOfTickets: 6, qualityPreset: "balanced" as const, seed: ledgerSeed(modality, target, strategyId, version) };
    const generate = modality === "lotofacil" ? generateLotofacilPortfolio : generateMegaSenaPortfolioRequest;
    const a = await generate(request);
    const b = await generate(request);
    expect(a.tickets).toEqual(b.tickets);
    expect(a.tickets).toHaveLength(6);
    expect(new Set(a.tickets.map((t) => t.join(","))).size).toBe(6);
    for (const t of a.tickets) expect([...t]).toEqual([...t].sort((x, y) => x - y));
    expect(a.strategyVersion).toBe(version);
  });
});
