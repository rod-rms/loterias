import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateExactCoverage } from "../../src/modules/lotofacil/domain/coverage";
import { analyzeExposure, analyzeOverlap } from "../../src/modules/lotofacil/domain/overlap";
import { evaluateLotofacilPortfolio } from "../../src/modules/lotofacil/domain/portfolio";
import { buildUniformAverageBaselineComparison } from "../../src/modules/lotofacil/domain/baseline";

const fixture = JSON.parse(
  readFileSync(path.join(process.cwd(), "tests/lotofacil/fixtures/rms_3780_oracle.json"), "utf8"),
);

describe("Lotofacil RMS v2 — contest 3780 canonical oracle", () => {
  const tickets: number[][] = fixture.tickets;

  it("reproduces the exact favourable-draw counts by exhaustive enumeration", () => {
    const coverage = evaluateExactCoverage(tickets);
    expect(coverage.favourableDraws[11]).toBe(fixture.expected.coverageFavourableDraws["11+"]);
    expect(coverage.favourableDraws[12]).toBe(fixture.expected.coverageFavourableDraws["12+"]);
    expect(coverage.favourableDraws[13]).toBe(fixture.expected.coverageFavourableDraws["13+"]);
    expect(coverage.favourableDraws[14]).toBe(fixture.expected.coverageFavourableDraws["14+"]);
    expect(coverage.favourableDraws[15]).toBe(fixture.expected.coverageFavourableDraws["15"]);
  });

  it("reproduces the exact pairwise intersection matrix (diagonal 15, all pairs 8)", () => {
    const overlap = analyzeOverlap(tickets);
    expect(overlap.matrix).toEqual(fixture.expected.pairwiseIntersectionMatrix);
    expect(overlap.min).toBe(8);
    expect(overlap.max).toBe(8);
  });

  it("reproduces the exact exposure per number (10 numbers x3, 15 numbers x4)", () => {
    const exposure = analyzeExposure(tickets);
    for (const [num, count] of Object.entries(fixture.expected.exposure)) {
      expect(exposure.exposure[Number(num)]).toBe(count);
    }
    expect(fixture.expected.numbersAppearing3Times).toHaveLength(10);
    expect(fixture.expected.numbersAppearing4Times).toHaveLength(15);
  });

  it("reproduces the exact probability values from the fixture", () => {
    const result = evaluateLotofacilPortfolio(tickets);
    expect(result.probability.atLeast11.probability).toBeCloseTo(fixture.expected.coverageProbability["11+"], 12);
    expect(result.probability.atLeast12.probability).toBeCloseTo(fixture.expected.coverageProbability["12+"], 12);
    expect(result.probability.atLeast13.probability).toBeCloseTo(fixture.expected.coverageProbability["13+"], 12);
    expect(result.probability.atLeast14.probability).toBeCloseTo(fixture.expected.coverageProbability["14+"], 12);
    expect(result.probability.exactly15.probability).toBeCloseTo(fixture.expected.coverageProbability["15"], 12);
    for (const metric of [
      result.probability.atLeast11,
      result.probability.atLeast12,
      result.probability.atLeast13,
      result.probability.atLeast14,
      result.probability.exactly15,
    ]) {
      expect(metric.status).toBe("exact");
    }
  });

  it("reproduces the uniform-distinct N=6 baseline from the fixture", () => {
    const result = evaluateLotofacilPortfolio(tickets);
    const baseline = buildUniformAverageBaselineComparison(result);
    expect(baseline.atLeast11.baseline.probability).toBeCloseTo(fixture.expected.uniformDistinctBaselineN6["11+"], 10);
    expect(baseline.atLeast12.baseline.probability).toBeCloseTo(fixture.expected.uniformDistinctBaselineN6["12+"], 10);
    expect(baseline.atLeast13.baseline.probability).toBeCloseTo(fixture.expected.uniformDistinctBaselineN6["13+"], 10);
  });

  it("F15 for 6 distinct tickets equals 6 / 3,268,760", () => {
    const result = evaluateLotofacilPortfolio(tickets);
    expect(result.probability.exactly15.probability).toBeCloseTo(6 / 3_268_760, 15);
  });
});
