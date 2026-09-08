import { describe, expect, it } from "vitest";
import { formatOneIn, formatPercentagePointDifference, formatProbabilityPercent } from "../../src/shared/utils/probabilityFormat";

describe("formatProbabilityPercent", () => {
  it("uses 2 decimals for percentages >= 10%", () => {
    expect(formatProbabilityPercent(0.558537)).toBe("55,85%");
  });

  it("uses 4 decimals for percentages >= 0.01%", () => {
    expect(formatProbabilityPercent(0.000277)).toBe("0,0277%");
  });

  it("never displays a non-zero probability as 0,0000% or 0%", () => {
    const tinySenaProbability = 6 / 50_063_860; // ~0.00001198%
    const formatted = formatProbabilityPercent(tinySenaProbability);
    expect(formatted).not.toBe("0%");
    expect(formatted).not.toMatch(/^0[.,]0*%$/);
    expect(Number(formatted.replace("%", "").replace(",", "."))).toBeGreaterThan(0);
  });

  it("formats an extremely small probability with enough significant digits to stay visibly non-zero", () => {
    const formatted = formatProbabilityPercent(0.00000009987);
    expect(formatted).not.toBe("0%");
    expect(Number(formatted.replace("%", "").replace(",", "."))).toBeGreaterThan(0);
  });

  it("formats exactly zero as 0%", () => {
    expect(formatProbabilityPercent(0)).toBe("0%");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatProbabilityPercent(null)).toBe("—");
    expect(formatProbabilityPercent(undefined)).toBe("—");
  });
});

describe("formatOneIn", () => {
  it("formats a small probability as an approximate 1-in-X phrase", () => {
    expect(formatOneIn(1 / 544_793)).toBe("Aproximadamente 1 em 544.793");
  });

  it("hides the one-in representation for probabilities >= 5% (common events)", () => {
    expect(formatOneIn(0.05)).toBeNull();
    expect(formatOneIn(0.5585)).toBeNull(); // ~55.85%, e.g. Lotofacil atLeast11 for a small portfolio
  });

  it("hides the one-in representation when probability is near certain", () => {
    expect(formatOneIn(0.995)).toBeNull();
  });

  it("hides the one-in representation for null/zero probability", () => {
    expect(formatOneIn(null)).toBeNull();
    expect(formatOneIn(0)).toBeNull();
  });

  it("shows the one-in representation for genuinely rare probabilities below 5%", () => {
    expect(formatOneIn(0.01)).toBe("Aproximadamente 1 em 100");
  });
});

describe("formatPercentagePointDifference", () => {
  it("renders 'Igual' for a difference indistinguishable from zero (floating-point noise)", () => {
    expect(formatPercentagePointDifference(0)).toBe("Igual");
    expect(formatPercentagePointDifference(1e-13)).toBe("Igual");
    expect(formatPercentagePointDifference(-3.5e-14)).toBe("Igual");
  });

  it("renders 'Igual' for mathematically identical jackpot metrics (e.g. Sena vs. baseline, same N)", () => {
    // F6 = N / 50,063,860 is identical for the portfolio and the unrestricted
    // baseline at the same N; any residual is floating-point noise only.
    const portfolio = 6 / 50_063_860;
    const baseline = 6 / 50_063_860;
    const diffPercentagePoints = (portfolio - baseline) * 100;
    expect(formatPercentagePointDifference(diffPercentagePoints)).toBe("Igual");
  });

  it("never exposes a long floating-point tail for a real but sub-0.0001 p.p. difference", () => {
    expect(formatPercentagePointDifference(0.00000003)).toBe("+ menos de 0,0001 p.p.");
    expect(formatPercentagePointDifference(-0.00000003)).toBe("- menos de 0,0001 p.p.");
  });

  it("uses adaptive precision with a sign and pt-BR formatting for larger differences", () => {
    expect(formatPercentagePointDifference(3.6325)).toBe("+3,63 p.p.");
    expect(formatPercentagePointDifference(-3.6325)).toBe("-3,63 p.p.");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatPercentagePointDifference(null)).toBe("—");
    expect(formatPercentagePointDifference(undefined)).toBe("—");
  });
});
