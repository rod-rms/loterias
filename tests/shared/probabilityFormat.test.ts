import { describe, expect, it } from "vitest";
import { formatOneIn, formatProbabilityPercent } from "../../src/shared/utils/probabilityFormat";

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

  it("hides the one-in representation when probability is near certain", () => {
    expect(formatOneIn(0.995)).toBeNull();
  });

  it("hides the one-in representation for null/zero probability", () => {
    expect(formatOneIn(null)).toBeNull();
    expect(formatOneIn(0)).toBeNull();
  });
});
