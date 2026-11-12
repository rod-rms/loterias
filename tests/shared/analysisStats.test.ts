import { describe, expect, it } from "vitest";
import {
  binomialRange,
  bonferroniLevel,
  bootstrapMeanInterval,
  cumulativeDifference,
  excludesReference,
  expectedMaxOfK,
  funnelHalfWidth,
  meanInterval,
  normalQuantile,
  tCritical,
  tQuantile,
} from "../../src/shared/lib/analysisStats";
import { hitsDistributionFor } from "../../src/shared/lib/hitsDistribution";

describe("quantiles (against published table values)", () => {
  it("Student t 97.5%: df 4, 10, 30, 134", () => {
    expect(tQuantile(0.975, 4)).toBeCloseTo(2.7764, 3);
    expect(tQuantile(0.975, 10)).toBeCloseTo(2.2281, 3);
    expect(tQuantile(0.975, 30)).toBeCloseTo(2.0423, 3);
    expect(tQuantile(0.975, 134)).toBeCloseTo(1.9779, 3);
    expect(tQuantile(0.5, 7)).toBe(0);
  });
  it("normal 97.5% and 99.5%", () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(normalQuantile(0.995)).toBeCloseTo(2.575829, 5);
    expect(normalQuantile(0.025)).toBeCloseTo(-1.959964, 5);
  });
  it("Bonferroni level for 5 comparisons is 99%", () => {
    expect(bonferroniLevel(0.95, 5)).toBeCloseTo(0.99, 12);
    expect(tCritical(10, 0.99)).toBeCloseTo(3.1693, 3);
  });
});

describe("meanInterval (clustered unit = contest)", () => {
  it("hand-computed: [1..5] -> mean 3, sd sqrt(2.5), se 0.7071, t(4)=2.7764 -> [1.0368, 4.9632]", () => {
    const i = meanInterval([1, 2, 3, 4, 5], 0.95);
    expect(i.n).toBe(5);
    expect(i.mean).toBe(3);
    expect(i.sd).toBeCloseTo(Math.sqrt(2.5), 10);
    expect(i.low).toBeCloseTo(3 - 2.7764 * Math.sqrt(2.5 / 5), 3);
    expect(i.high).toBeCloseTo(4.9632, 3);
    expect(i.method).toBe("t");
  });
  it("degenerate for n < 2 and for constant data", () => {
    expect(meanInterval([4])).toMatchObject({ low: 4, high: 4 });
    expect(meanInterval([2, 2, 2, 2])).toMatchObject({ mean: 2, low: 2, high: 2 });
  });
});

describe("bootstrapMeanInterval (seeded)", () => {
  const values = Array.from({ length: 60 }, (_, i) => (i % 7 === 0 ? 1 : 0));
  it("is deterministic for a seed and different for another", () => {
    const a = bootstrapMeanInterval(values, "s1");
    expect(bootstrapMeanInterval(values, "s1")).toEqual(a);
    const cont = Array.from({ length: 60 }, (_, i) => Math.sin(i) * 3);
    expect(bootstrapMeanInterval(cont, "s1")).toEqual(bootstrapMeanInterval(cont, "s1"));
    expect(bootstrapMeanInterval(cont, "s2").low).not.toBe(bootstrapMeanInterval(cont, "s1").low);
  });
  it("brackets the sample mean, stays within [0, 1] and is close to the normal interval", () => {
    const b = bootstrapMeanInterval(values, "s1");
    const t = meanInterval(values);
    expect(b.low).toBeLessThanOrEqual(b.mean);
    expect(b.high).toBeGreaterThanOrEqual(b.mean);
    expect(b.low).toBeGreaterThanOrEqual(0);
    expect(b.high).toBeLessThanOrEqual(1);
    expect(Math.abs(b.low - t.low)).toBeLessThan(0.05);
    expect(Math.abs(b.high - t.high)).toBeLessThan(0.05);
  });
  it("constant data gives a point interval", () => {
    expect(bootstrapMeanInterval([0, 0, 0, 0, 0], "x")).toMatchObject({ low: 0, high: 0 });
  });
});

describe("random reference", () => {
  it("E[max of 2 fair bits] = 0.75 and k=1 equals the mean", () => {
    expect(expectedMaxOfK([0.5, 0.5], 2)).toBeCloseTo(0.75, 12);
    const d = hitsDistributionFor("megasena");
    expect(expectedMaxOfK(d.pmf, 1)).toBeCloseTo(d.mean, 10);
  });
  it("E[max of 6 tickets] sits above the single-ticket mean for both modalities", () => {
    const lf = hitsDistributionFor("lotofacil");
    const ms = hitsDistributionFor("megasena");
    expect(expectedMaxOfK(lf.pmf, 6)).toBeGreaterThan(lf.mean + 1);
    expect(expectedMaxOfK(ms.pmf, 6)).toBeGreaterThan(ms.mean);
    expect(expectedMaxOfK(ms.pmf, 6)).toBeLessThan(2);
  });
});

describe("cumulative difference and funnel", () => {
  it("hand-computed running sums", () => {
    expect(cumulativeDifference([10, 8, 9, 11], 9)).toEqual([1, 0, 0, 2]);
  });
  it("funnel half-width is z * sd * sqrt(k)", () => {
    expect(funnelHalfWidth(4, 0.5, 1.96)).toBeCloseTo(1.96, 12);
    expect(funnelHalfWidth(100, 1.2247 / Math.sqrt(6), 1.96)).toBeCloseTo(9.8, 1);
  });
  it("excludesReference", () => {
    expect(excludesReference({ low: 8.9, high: 9.1 }, 9)).toBe(false);
    expect(excludesReference({ low: 9.1, high: 9.3 }, 9)).toBe(true);
    expect(excludesReference({ low: 8.5, high: 8.9 }, 9)).toBe(true);
  });
});

describe("binomialRange (exact)", () => {
  it("hand-computed: n=10, p=0.5, 95% -> [2, 8]", () => {
    expect(binomialRange(10, 0.5, 0.95)).toEqual({ low: 2, high: 8 });
  });
  it("Mega-Sena quadra: n=810, p=C(6,4)C(54,2)/C(60,6) -> expected 0.35, 99% range 0 to 3", () => {
    const p = hitsDistributionFor("megasena").pmf[4]!;
    expect(810 * p).toBeCloseTo(0.347, 2);
    expect(binomialRange(810, p, 0.99)).toEqual({ low: 0, high: 3 });
  });
  it("Lotofácil 11 points: n=2640, 99% range brackets the expectation, about +-2.576 sd", () => {
    const p = hitsDistributionFor("lotofacil").pmf[11]!;
    const r = binomialRange(2640, p, 0.99);
    const mu = 2640 * p;
    const sd = Math.sqrt(2640 * p * (1 - p));
    expect(r.low).toBeLessThan(mu);
    expect(r.high).toBeGreaterThan(mu);
    expect(Math.abs(r.low - (mu - 2.576 * sd))).toBeLessThan(3);
    expect(Math.abs(r.high - (mu + 2.576 * sd))).toBeLessThan(3);
  });
  it("degenerate probabilities", () => {
    expect(binomialRange(100, 0, 0.99)).toEqual({ low: 0, high: 0 });
    expect(binomialRange(100, 1, 0.99)).toEqual({ low: 100, high: 100 });
  });
});
