import { describe, expect, it } from "vitest";
import {
  canonicalizeTicket,
  maxDistinctTicketsUnderConstraints,
  ticketKey,
  validateFixedExcluded,
  validatePortfolio,
  validateTicket,
} from "../../src/modules/lotofacil/domain/validation";

describe("Lotofacil validation", () => {
  it("canonicalizes tickets regardless of input order", () => {
    const a = [5, 3, 1, 4, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const b = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    expect(canonicalizeTicket(a)).toEqual(canonicalizeTicket(b));
    expect(ticketKey(a)).toBe(ticketKey(b));
  });

  it("rejects a ticket with the wrong size or out-of-range numbers", () => {
    expect(validateTicket(Array.from({ length: 14 }, (_, i) => i + 1)).valid).toBe(false);
    expect(validateTicket([0, ...Array.from({ length: 14 }, (_, i) => i + 2)]).valid).toBe(false);
    expect(validateTicket([26, ...Array.from({ length: 14 }, (_, i) => i + 2)]).valid).toBe(false);
  });

  it("detects duplicate tickets in a portfolio regardless of internal order", () => {
    const t1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const t2 = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const result = validatePortfolio([t1, t2]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "DUPLICATE_TICKET")).toBe(true);
  });

  it("rejects fixed numbers that are also excluded", () => {
    const result = validateFixedExcluded({ fixedNumbers: [1, 2], excludedNumbers: [2, 3] });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "FIXED_EXCLUDED_CONFLICT")).toBe(true);
  });

  it("computes maxDistinct = C(25-f-e, 15-f)", () => {
    expect(maxDistinctTicketsUnderConstraints({})).toBe(3_268_760);
    // 5 fixed, 0 excluded => C(20,10) = 184756
    expect(maxDistinctTicketsUnderConstraints({ fixedNumbers: [1, 2, 3, 4, 5] })).toBe(184_756);
    // 0 fixed, 10 excluded => C(15,15) = 1
    expect(maxDistinctTicketsUnderConstraints({ excludedNumbers: Array.from({ length: 10 }, (_, i) => i + 1) })).toBe(1);
  });
});
