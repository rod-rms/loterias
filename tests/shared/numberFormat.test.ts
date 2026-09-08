import { describe, expect, it } from "vitest";
import { formatDecimalPtBR } from "../../src/shared/utils/numberFormat";

describe("formatDecimalPtBR", () => {
  it("uses a comma as the decimal separator (pt-BR), not a dot", () => {
    expect(formatDecimalPtBR(8.0, 1)).toBe("8,0");
    expect(formatDecimalPtBR(8.04, 2)).toBe("8,04");
  });

  it("pads to the requested number of decimals", () => {
    expect(formatDecimalPtBR(8, 1)).toBe("8,0");
    expect(formatDecimalPtBR(8, 2)).toBe("8,00");
  });
});
