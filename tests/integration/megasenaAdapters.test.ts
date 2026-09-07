import { describe, expect, it } from "vitest";
import { generateMegaMaxDiversification } from "../../src/modules/megasena/strategies/diversification";
import { validatePortfolio } from "../../src/modules/megasena/domain/validation";
import { generateUniformDistinctTickets, createSeededRandom } from "../../src/modules/megasena/domain/random";
import { evaluateMegaSenaPortfolio } from "../../src/modules/megasena/domain";

describe("Mega-Sena new app-level adapters (do not alter canonical domain math)", () => {
  it("max_diversification balances exposure and keeps canonical F6 = N / 50,063,860", () => {
    const result = generateMegaMaxDiversification({ numberOfTickets: 10, seed: "mega-div" });
    expect(result.tickets).toHaveLength(10);
    expect(validatePortfolio(result.tickets).valid).toBe(true);
    const evaluation = evaluateMegaSenaPortfolio(result.tickets, { ticketCostBRL: 6 });
    expect(evaluation.probability.sena.probability).toBeCloseTo(10 / 50_063_860, 15);
  });

  it("max_diversification respects fixed/excluded numbers", () => {
    const result = generateMegaMaxDiversification({ numberOfTickets: 6, fixedNumbers: [7], excludedNumbers: [60, 59], seed: "mega-div-fx" });
    for (const t of result.tickets) {
      expect(t).toContain(7);
      expect(t).not.toContain(60);
      expect(t).not.toContain(59);
    }
  });

  it("uniform_random (via the extracted generator) produces valid distinct tickets", () => {
    const tickets = generateUniformDistinctTickets(8, createSeededRandom("mega-unif"), new Set(), {});
    expect(tickets).toHaveLength(8);
    expect(validatePortfolio(tickets).valid).toBe(true);
  });

  it("is deterministic given the same seed", () => {
    const a = generateMegaMaxDiversification({ numberOfTickets: 5, seed: "mega-repro" });
    const b = generateMegaMaxDiversification({ numberOfTickets: 5, seed: "mega-repro" });
    expect(a.tickets).toEqual(b.tickets);
  });
});
