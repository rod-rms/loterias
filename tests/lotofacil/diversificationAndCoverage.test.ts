import { describe, expect, it } from "vitest";
import { generateMaxDiversification } from "../../src/modules/lotofacil/domain/diversification";
import { generateMaxCoverage } from "../../src/modules/lotofacil/domain/coverageOptimizer";
import { generateUniformRandomPortfolio } from "../../src/modules/lotofacil/domain/uniformRandom";
import { validatePortfolio } from "../../src/modules/lotofacil/domain/validation";

describe("Lotofacil max_diversification", () => {
  it("balances exposure close to the theoretical target for N=6 (q=3, r=15)", () => {
    const result = generateMaxDiversification({ numberOfTickets: 6, seed: "diversification-1" });
    expect(result.tickets).toHaveLength(6);
    expect(validatePortfolio(result.tickets).valid).toBe(true);
    const exposure = new Map<number, number>();
    for (const t of result.tickets) for (const n of t) exposure.set(n, (exposure.get(n) ?? 0) + 1);
    for (const count of exposure.values()) expect([3, 4]).toContain(count);
  });

  it("respects fixed numbers (present in every ticket) and excluded numbers (in none)", () => {
    const result = generateMaxDiversification({ numberOfTickets: 5, fixedNumbers: [1, 2], excludedNumbers: [25, 24], seed: "fx" });
    for (const t of result.tickets) {
      expect(t).toContain(1);
      expect(t).toContain(2);
      expect(t).not.toContain(25);
      expect(t).not.toContain(24);
    }
  });

  it("is deterministic given the same seed", () => {
    const a = generateMaxDiversification({ numberOfTickets: 8, seed: "repro" });
    const b = generateMaxDiversification({ numberOfTickets: 8, seed: "repro" });
    expect(a.tickets).toEqual(b.tickets);
  });
});

describe("Lotofacil coverage optimizers (11+/12+)", () => {
  it("produces N valid distinct tickets and reports search metadata", () => {
    const result = generateMaxCoverage({ numberOfTickets: 6, threshold: 11, seed: "cov11", qualityPreset: "fast" });
    expect(result.tickets).toHaveLength(6);
    expect(validatePortfolio(result.tickets).valid).toBe(true);
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.sampleSize).toBeGreaterThan(0);
  }, 20000);

  it("is deterministic given the same seed", () => {
    const a = generateMaxCoverage({ numberOfTickets: 5, threshold: 12, seed: "cov12-repro", qualityPreset: "fast" });
    const b = generateMaxCoverage({ numberOfTickets: 5, threshold: 12, seed: "cov12-repro", qualityPreset: "fast" });
    expect(a.tickets).toEqual(b.tickets);
  }, 20000);
});

describe("Lotofacil uniform_random", () => {
  it("generates distinct uniform tickets honoring fixed/excluded constraints", () => {
    const result = generateUniformRandomPortfolio({ numberOfTickets: 10, fixedNumbers: [3], excludedNumbers: [4, 5], seed: "unif" });
    expect(result.tickets).toHaveLength(10);
    expect(validatePortfolio(result.tickets).valid).toBe(true);
    for (const t of result.tickets) {
      expect(t).toContain(3);
      expect(t).not.toContain(4);
      expect(t).not.toContain(5);
    }
  });

  it("duplicates never count as distinct exposures (portfolio validation rejects them)", () => {
    const t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const result = validatePortfolio([t, [...t]]);
    expect(result.valid).toBe(false);
  });

  it("same seed and parameters reproduce the same portfolio", () => {
    const a = generateUniformRandomPortfolio({ numberOfTickets: 7, seed: "same-seed" });
    const b = generateUniformRandomPortfolio({ numberOfTickets: 7, seed: "same-seed" });
    expect(a.tickets).toEqual(b.tickets);
  });
});
