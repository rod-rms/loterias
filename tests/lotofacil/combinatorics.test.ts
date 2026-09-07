import { describe, expect, it } from "vitest";
import { comb } from "../../src/shared/lib/combinatorics";
import {
  AT_LEAST_HIT_COUNTS,
  EXACT_HIT_COUNTS,
  TOTAL_POSSIBLE_DRAWS,
} from "../../src/modules/lotofacil/domain/constants";

describe("Lotofacil combinatorics", () => {
  it("C(25,15) equals 3,268,760", () => {
    expect(comb(25, 15)).toBe(3_268_760n);
    expect(TOTAL_POSSIBLE_DRAWS).toBe(3_268_760);
  });

  it("exact hit counts match the canonical constants", () => {
    expect(EXACT_HIT_COUNTS[11]).toBe(286_650);
    expect(EXACT_HIT_COUNTS[12]).toBe(54_600);
    expect(EXACT_HIT_COUNTS[13]).toBe(4_725);
    expect(EXACT_HIT_COUNTS[14]).toBe(150);
    expect(EXACT_HIT_COUNTS[15]).toBe(1);
  });

  it("at-least (accumulated) hit counts match the canonical constants", () => {
    expect(AT_LEAST_HIT_COUNTS[11]).toBe(346_126);
    expect(AT_LEAST_HIT_COUNTS[12]).toBe(59_476);
    expect(AT_LEAST_HIT_COUNTS[13]).toBe(4_876);
    expect(AT_LEAST_HIT_COUNTS[14]).toBe(151);
    expect(AT_LEAST_HIT_COUNTS[15]).toBe(1);
  });

  it("accumulated counts equal the sum of exact counts from the threshold up", () => {
    expect(AT_LEAST_HIT_COUNTS[14]).toBe(EXACT_HIT_COUNTS[14] + EXACT_HIT_COUNTS[15]);
    expect(AT_LEAST_HIT_COUNTS[13]).toBe(EXACT_HIT_COUNTS[13] + EXACT_HIT_COUNTS[14] + EXACT_HIT_COUNTS[15]);
  });

  it("F15 for N distinct tickets equals N / C(25,15)", () => {
    const n = 6;
    expect(n / TOTAL_POSSIBLE_DRAWS).toBeCloseTo(6 / 3_268_760, 15);
  });
});
