import { describe, expect, it } from "vitest";
import { analyzeExposure, analyzeOverlap } from "../../src/modules/lotofacil/domain/overlap";
import { evaluateLotofacilPortfolio } from "../../src/modules/lotofacil/domain/portfolio";
import { buildUniformAverageBaselineComparison } from "../../src/modules/lotofacil/domain/baseline";
import { generateUniformRandomPortfolio } from "../../src/modules/lotofacil/domain/uniformRandom";

describe("Lotofacil overlap and exposure", () => {
  it("diagonal-equivalent: a ticket's overlap with itself is its own size (15)", () => {
    const t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const overlap = analyzeOverlap([t, t.slice().reverse()]);
    expect(overlap.matrix[0]![0]).toBe(15);
  });

  it("computes exposure per number across a small portfolio", () => {
    const t1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const t2 = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const exposure = analyzeExposure([t1, t2]);
    expect(exposure.exposure[1]).toBe(1);
    expect(exposure.exposure[15]).toBe(2);
    expect(exposure.exposure[25]).toBe(1);
  });

  it("ticket order and portfolio order do not change the evaluation", () => {
    const { tickets } = generateUniformRandomPortfolio({ numberOfTickets: 5, seed: "order-invariance" });
    const reordered = tickets.map((t) => [...t].reverse());
    const shuffledPortfolio = [...reordered].reverse();
    const a = evaluateLotofacilPortfolio(tickets);
    const b = evaluateLotofacilPortfolio(shuffledPortfolio);
    expect(a.probability.atLeast11.favourableDraws).toBe(b.probability.atLeast11.favourableDraws);
  });
});

describe("Lotofacil baseline vs concrete random", () => {
  it("baseline is a separate concept from the uniform_random strategy output", () => {
    const { tickets } = generateUniformRandomPortfolio({ numberOfTickets: 6, seed: "concrete-vs-baseline" });
    const result = evaluateLotofacilPortfolio(tickets);
    const baseline = buildUniformAverageBaselineComparison(result);
    expect(baseline.kind).toBe("uniform_distinct_average");
    // The concrete portfolio's own probability need not equal the baseline mean exactly.
    expect(typeof baseline.atLeast11.absolutePercentagePointDifference).toBe("number");
  });

  it("F11 >= F12 >= F13 >= F14 >= F15 for any valid portfolio", () => {
    const { tickets } = generateUniformRandomPortfolio({ numberOfTickets: 10, seed: "monotonic" });
    const result = evaluateLotofacilPortfolio(tickets);
    const p = result.probability;
    expect(p.atLeast11.probability!).toBeGreaterThanOrEqual(p.atLeast12.probability!);
    expect(p.atLeast12.probability!).toBeGreaterThanOrEqual(p.atLeast13.probability!);
    expect(p.atLeast13.probability!).toBeGreaterThanOrEqual(p.atLeast14.probability!);
    expect(p.atLeast14.probability!).toBeGreaterThanOrEqual(p.exactly15.probability!);
  });

  it("all probabilities stay within [0,1]", () => {
    const { tickets } = generateUniformRandomPortfolio({ numberOfTickets: 20, seed: "bounds" });
    const result = evaluateLotofacilPortfolio(tickets);
    for (const metric of Object.values(result.probability)) {
      expect(metric.probability).toBeGreaterThanOrEqual(0);
      expect(metric.probability).toBeLessThanOrEqual(1);
    }
  });
});
