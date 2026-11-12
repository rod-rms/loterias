import { describe, expect, it } from "vitest";
import { hitsDistributionFor, probAtLeast } from "../src/shared/lib/hitsDistribution";

describe("hitsDistribution (exact hypergeometric)", () => {
  it("Lotofácil: pmf sums to 1, mean 9.0, sd ≈ 1.22, known tail values", () => {
    const d = hitsDistributionFor("lotofacil");
    expect(d.pmf).toHaveLength(16);
    expect(d.pmf.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(d.mean).toBeCloseTo(9.0, 10);
    expect(d.sd).toBeCloseTo(1.2247, 3);
    expect(d.pmf[15]).toBeCloseTo(1 / 3268760, 12); // jackpot 1 / C(25,15)
    expect(probAtLeast(d, 11)).toBeCloseTo(0.10589, 4);
  });
  it("Mega-Sena: pmf sums to 1, mean 0.6, sd ≈ 0.70, jackpot 1/50063860", () => {
    const d = hitsDistributionFor("megasena");
    expect(d.pmf).toHaveLength(7);
    expect(d.pmf.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(d.mean).toBeCloseTo(0.6, 10);
    expect(d.sd).toBeCloseTo(0.7, 1);
    expect(d.pmf[6]).toBeCloseTo(1 / 50063860, 14);
    expect(probAtLeast(d, 3)).toBeCloseTo(0.010344, 5);
  });
});
