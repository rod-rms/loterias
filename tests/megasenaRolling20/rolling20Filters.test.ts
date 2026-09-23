import { describe, expect, it } from "vitest";
import { countMaximalConsecutiveBlocks, passesRolling20StructuralFilters } from "../../src/modules/megasena/domain/rolling20Filters";

/**
 * MEGA-ROLL-001 — structural filters (spec §5), with a dedicated test for
 * the maximal-run distinction the spec explicitly calls out as a bug risk:
 * `10-11-12-13` is ONE block, not two or three overlapping pairs.
 */
describe("Rolling 20 Balanceada — consecutive-block counting (maximal runs, spec §5)", () => {
  it("10-11-12 is one block", () => {
    expect(countMaximalConsecutiveBlocks([10, 11, 12])).toBe(1);
  });

  it("10-11-12-13 is ONE block, not two", () => {
    expect(countMaximalConsecutiveBlocks([10, 11, 12, 13])).toBe(1);
  });

  it("10-11 and 20-21 together are two blocks, not one", () => {
    expect(countMaximalConsecutiveBlocks([10, 11, 20, 21])).toBe(2);
  });

  it("no adjacent numbers at all is zero blocks", () => {
    expect(countMaximalConsecutiveBlocks([1, 10, 30, 59])).toBe(0);
  });

  it("a single number is zero blocks", () => {
    expect(countMaximalConsecutiveBlocks([42])).toBe(0);
  });

  it("two separate runs of different lengths count as two blocks total", () => {
    expect(countMaximalConsecutiveBlocks([1, 2, 3, 10, 11])).toBe(2);
  });
});

function makeValidBaseTicket(): number[] {
  // 2, 4, 15, 25, 40, 55 — even=2, sum=141, low30=4 (2,4,15,25), low10=1 (2), 0 consecutive blocks.
  return [2, 4, 15, 25, 40, 55];
}

describe("Rolling 20 Balanceada — standard structural filters (spec §5)", () => {
  it("accepts a combination satisfying every standard filter", () => {
    const ticket = makeValidBaseTicket();
    const evenCount = ticket.filter((n) => n % 2 === 0).length;
    const sum = ticket.reduce((a, b) => a + b, 0);
    const low30 = ticket.filter((n) => n <= 30).length;
    const low10 = ticket.filter((n) => n <= 10).length;
    expect(evenCount).toBeGreaterThanOrEqual(2);
    expect(evenCount).toBeLessThanOrEqual(4);
    expect(sum).toBeGreaterThanOrEqual(130);
    expect(sum).toBeLessThanOrEqual(249);
    expect(low30).toBeGreaterThanOrEqual(2);
    expect(low30).toBeLessThanOrEqual(4);
    expect(low10).toBeLessThanOrEqual(2);
    expect(passesRolling20StructuralFilters(ticket)).toBe(true);
  });

  it("rejects fewer than 2 even numbers", () => {
    // 1,3,5,7,9,60 -> only 1 even number (60)
    expect(passesRolling20StructuralFilters([1, 3, 5, 7, 9, 60])).toBe(false);
  });

  it("rejects more than 4 even numbers", () => {
    // 2,4,6,8,10,11 -> 5 even numbers
    expect(passesRolling20StructuralFilters([2, 4, 6, 8, 10, 11])).toBe(false);
  });

  it("rejects a sum below 130", () => {
    expect(passesRolling20StructuralFilters([1, 2, 3, 4, 5, 6])).toBe(false); // sum=21
  });

  it("rejects a sum above 249", () => {
    expect(passesRolling20StructuralFilters([55, 56, 57, 58, 59, 60])).toBe(false); // sum=345
  });

  it("rejects fewer than 2 numbers in 01-30", () => {
    expect(passesRolling20StructuralFilters([31, 32, 33, 34, 58, 60])).toBe(false); // 0 numbers <=30
  });

  it("rejects more than 4 numbers in 01-30", () => {
    expect(passesRolling20StructuralFilters([2, 4, 6, 8, 10, 40])).toBe(false); // 5 numbers <=30
  });

  it("rejects more than 2 numbers in 01-10", () => {
    expect(passesRolling20StructuralFilters([1, 2, 3, 20, 40, 60])).toBe(false); // 3 numbers <=10
  });

  it("accepts zero numbers in 01-10 when requireLow10 is off (default)", () => {
    const ticket = [12, 14, 21, 23, 40, 42]; // even=4, sum=152, low30=4, low10=0, 0 blocks
    expect(passesRolling20StructuralFilters(ticket, { requireLow10: false })).toBe(true);
  });

  it("rejects zero numbers in 01-10 when requireLow10 is explicitly enabled", () => {
    const clean = [12, 14, 21, 23, 40, 42]; // even=4, sum=152, low30=4, low10=0
    expect(passesRolling20StructuralFilters(clean, { requireLow10: false })).toBe(true);
    expect(passesRolling20StructuralFilters(clean, { requireLow10: true })).toBe(false);
  });

  it("rejects more than one consecutive block", () => {
    // 10-11 and 30-31: two blocks -> rejected regardless of other filters passing
    const ticket = [10, 11, 30, 31, 45, 50];
    expect(countMaximalConsecutiveBlocks(ticket)).toBe(2);
    expect(passesRolling20StructuralFilters(ticket)).toBe(false);
  });

  it("accepts exactly one consecutive block (10-11-12 counts as one)", () => {
    const ticket = [10, 11, 12, 30, 45, 50];
    expect(countMaximalConsecutiveBlocks(ticket)).toBe(1);
  });

  it("repeatPreviousDraw off (default) never requires overlap with the previous draw", () => {
    const ticket = [12, 14, 21, 23, 40, 42];
    expect(passesRolling20StructuralFilters(ticket, {}, [1, 2, 3, 4, 5, 6])).toBe(true);
  });

  it("repeatPreviousDraw on requires at least one shared number with the previous draw", () => {
    const ticket = [12, 14, 21, 23, 40, 42];
    expect(passesRolling20StructuralFilters(ticket, { repeatPreviousDraw: true }, [12, 50, 51, 52, 53, 54])).toBe(true);
    expect(passesRolling20StructuralFilters(ticket, { repeatPreviousDraw: true }, [1, 2, 3, 4, 5, 6])).toBe(false);
  });

  it("ludic options are off by default (equivalent to calling with no options)", () => {
    const ticket = [12, 14, 21, 23, 40, 42];
    expect(passesRolling20StructuralFilters(ticket)).toBe(passesRolling20StructuralFilters(ticket, {}));
  });
});
