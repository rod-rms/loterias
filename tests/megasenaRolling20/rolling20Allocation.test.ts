import { describe, expect, it } from "vitest";
import { computeRolling20Allocation, roundHalfUp } from "../../src/modules/megasena/domain/rolling20Allocation";

/**
 * MEGA-ROLL-001 — proportional G2/G3 allocation (spec §4), verified against
 * every worked example in the spec, including the half-point cases.
 */
describe("Rolling 20 Balanceada — allocation (spec §4)", () => {
  it("round-half-up matches the spec's explicit formula for representative half-point inputs", () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(3.5)).toBe(4);
    expect(roundHalfUp(0)).toBe(0);
    expect(roundHalfUp(0.4)).toBe(0);
    expect(roundHalfUp(0.6)).toBe(1);
  });

  function patternCounts(perTicket: { g2Slots: number; g3Slots: number }[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const t of perTicket) {
      const key = `2-${t.g2Slots}-${t.g3Slots}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }

  it("g2=7, N=3 → 1 ticket 2-0-4, 2 tickets 2-1-3", () => {
    const { perTicket } = computeRolling20Allocation(3, 7);
    expect(patternCounts(perTicket)).toEqual({ "2-0-4": 1, "2-1-3": 2 });
  });

  it("g2=7, N=6 → 2 tickets 2-0-4, 4 tickets 2-1-3", () => {
    const { perTicket } = computeRolling20Allocation(6, 7);
    expect(patternCounts(perTicket)).toEqual({ "2-0-4": 2, "2-1-3": 4 });
  });

  it("g2=7, N=100 → 30 tickets 2-0-4, 70 tickets 2-1-3", () => {
    const { perTicket } = computeRolling20Allocation(100, 7);
    expect(patternCounts(perTicket)).toEqual({ "2-0-4": 30, "2-1-3": 70 });
  });

  it("g2=10, any N → every ticket is 2-1-3", () => {
    for (const n of [1, 3, 6, 17, 100]) {
      const { perTicket } = computeRolling20Allocation(n, 10);
      expect(patternCounts(perTicket)).toEqual({ "2-1-3": n });
    }
  });

  it("g2=15, N=6 → 3 tickets 2-1-3, 3 tickets 2-2-2", () => {
    const { perTicket } = computeRolling20Allocation(6, 15);
    expect(patternCounts(perTicket)).toEqual({ "2-1-3": 3, "2-2-2": 3 });
  });

  it("every ticket always has exactly 2 G1 slots and totals exactly 6 (2 + g2Slots + g3Slots)", () => {
    for (const [n, g2] of [[3, 7], [6, 7], [100, 7], [1, 40], [6, 15], [17, 0]] as const) {
      const { perTicket } = computeRolling20Allocation(n, g2);
      expect(perTicket).toHaveLength(n);
      for (const t of perTicket) {
        expect(t.g1Slots).toBe(2);
        expect(t.g1Slots + t.g2Slots + t.g3Slots).toBe(6);
        expect(t.g2Slots).toBeGreaterThanOrEqual(0);
        expect(t.g3Slots).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("g2=0 → every ticket is 2-0-4 (no G2 slots at all)", () => {
    const { perTicket, targetG2Slots } = computeRolling20Allocation(10, 0);
    expect(targetG2Slots).toBe(0);
    expect(patternCounts(perTicket)).toEqual({ "2-0-4": 10 });
  });

  it("rejects a non-positive N or a negative g2", () => {
    expect(() => computeRolling20Allocation(0, 7)).toThrow(RangeError);
    expect(() => computeRolling20Allocation(-1, 7)).toThrow(RangeError);
    expect(() => computeRolling20Allocation(6, -1)).toThrow(RangeError);
  });
});
