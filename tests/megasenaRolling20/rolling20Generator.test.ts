import { describe, expect, it } from "vitest";
import { generateRolling20Portfolio, Rolling20SearchError } from "../../src/modules/megasena/strategies/rolling20";
import { passesRolling20StructuralFilters } from "../../src/modules/megasena/domain/rolling20Filters";
import type { Rolling20Groups } from "../../src/modules/megasena/domain/rolling20Grouping";

/**
 * MEGA-ROLL-001 — the search/candidate-generation step (spec §6), exercised
 * with small synthetic (but structurally realistic) groups rather than the
 * real dataset, so these stay fast and deterministic. The grouping fixture
 * itself is oracle-tested separately (`tests/megasena/rolling20GroupingOracle.test.ts`).
 */
function makeGroups(g1Size: number, g2Size: number): Rolling20Groups {
  const g1 = Array.from({ length: g1Size }, (_, i) => i + 1);
  const g2 = Array.from({ length: g2Size }, (_, i) => g1Size + i + 1);
  const g3 = Array.from({ length: 60 - g1Size - g2Size }, (_, i) => g1Size + g2Size + i + 1);
  const frequency = new Array(61).fill(0);
  return { g1, g2, g3, frequency };
}

describe("Rolling 20 Balanceada — search (spec §6)", () => {
  it("produces exactly N tickets, all globally distinct, each with exactly 6 numbers", () => {
    const groups = makeGroups(20, 7);
    const { tickets } = generateRolling20Portfolio({ numberOfTickets: 20, groups, seed: "test-seed-1" });
    expect(tickets).toHaveLength(20);
    const keys = new Set(tickets.map((t) => [...t].sort((a, b) => a - b).join("-")));
    expect(keys.size).toBe(20);
    for (const t of tickets) expect(t).toHaveLength(6);
  });

  it("every ticket satisfies the exact group allocation for its pattern (2 G1 always; G2/G3 per §4)", () => {
    const groups = makeGroups(20, 7);
    const { tickets, allocation } = generateRolling20Portfolio({ numberOfTickets: 6, groups, seed: "test-seed-2" });
    const g1Set = new Set(groups.g1);
    const g2Set = new Set(groups.g2);
    const g3Set = new Set(groups.g3);
    tickets.forEach((ticket, i) => {
      const g1Count = ticket.filter((n) => g1Set.has(n)).length;
      const g2Count = ticket.filter((n) => g2Set.has(n)).length;
      const g3Count = ticket.filter((n) => g3Set.has(n)).length;
      expect(g1Count).toBe(2);
      expect(g2Count).toBe(allocation.perTicket[i]!.g2Slots);
      expect(g3Count).toBe(allocation.perTicket[i]!.g3Slots);
    });
  });

  it("every ticket passes the standard structural filters", () => {
    const groups = makeGroups(20, 10); // g2=10 -> every ticket is 2-1-3
    const { tickets } = generateRolling20Portfolio({ numberOfTickets: 30, groups, seed: "test-seed-3" });
    for (const t of tickets) expect(passesRolling20StructuralFilters(t)).toBe(true);
  });

  it("is deterministic: the same seed and inputs always produce the same tickets", () => {
    const groups = makeGroups(20, 7);
    const a = generateRolling20Portfolio({ numberOfTickets: 15, groups, seed: "same-seed" });
    const b = generateRolling20Portfolio({ numberOfTickets: 15, groups, seed: "same-seed" });
    expect(a.tickets).toEqual(b.tickets);
  });

  it("a different seed produces a different (valid) portfolio", () => {
    const groups = makeGroups(20, 7);
    const a = generateRolling20Portfolio({ numberOfTickets: 15, groups, seed: "seed-a" });
    const b = generateRolling20Portfolio({ numberOfTickets: 15, groups, seed: "seed-b" });
    expect(a.tickets).not.toEqual(b.tickets);
  });

  it("historical per-number frequency never influences the search: two groupings with identical G1/G2/G3 but different frequency arrays produce the same search behavior", () => {
    const groupsLowFreq: Rolling20Groups = { ...makeGroups(20, 7), frequency: new Array(61).fill(1) };
    const groupsHighFreq: Rolling20Groups = { ...makeGroups(20, 7), frequency: new Array(61).fill(99) };
    const a = generateRolling20Portfolio({ numberOfTickets: 10, groups: groupsLowFreq, seed: "freq-test" });
    const b = generateRolling20Portfolio({ numberOfTickets: 10, groups: groupsHighFreq, seed: "freq-test" });
    expect(a.tickets).toEqual(b.tickets);
  });

  it("supports g2=0 (every ticket 2-0-4)", () => {
    const groups = makeGroups(20, 0);
    const { tickets, allocation } = generateRolling20Portfolio({ numberOfTickets: 5, groups, seed: "g2-zero" });
    expect(tickets).toHaveLength(5);
    for (const t of allocation.perTicket) expect(t.g2Slots).toBe(0);
  });

  it("qualityPreset selects a different iteration budget (fast <= balanced <= deep)", () => {
    const groups = makeGroups(20, 7);
    const fast = generateRolling20Portfolio({ numberOfTickets: 6, groups, seed: "preset-test", qualityPreset: "fast" });
    const deep = generateRolling20Portfolio({ numberOfTickets: 6, groups, seed: "preset-test", qualityPreset: "deep" });
    expect(fast.iterations).toBeLessThanOrEqual(deep.iterations);
  });

  it("throws ROLLING20_NO_VALID_CANDIDATE when a pattern's only possible combination can never pass the filters", () => {
    // g1 has only 2 members (both always picked), g2 empty, g3 has exactly 4
    // members: every ticket is forced to be the SAME {1,2,5,6,7,8}, whose sum
    // (29) fails the 130-249 filter — so no valid ticket can ever be sampled.
    const groups: Rolling20Groups = { g1: [1, 2], g2: [], g3: [5, 6, 7, 8], frequency: new Array(61).fill(0) };
    expect(() => generateRolling20Portfolio({ numberOfTickets: 2, groups, seed: "infeasible" })).toThrow(Rolling20SearchError);
  });

  it("rejects a non-positive ticket count", () => {
    const groups = makeGroups(20, 7);
    expect(() => generateRolling20Portfolio({ numberOfTickets: 0, groups, seed: "x" })).toThrow(RangeError);
  });
});
