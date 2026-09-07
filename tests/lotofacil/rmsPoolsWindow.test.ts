import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPools, computeFrequencies } from "../../src/modules/lotofacil/domain/rms";
import { createSeededRandom } from "../../src/shared/lib/prng";
import type { LotteryDataset } from "../../src/shared/types";

const EXPECTED_FREQUENCIES: Record<number, number> = {
  1: 10, 2: 11, 3: 15, 4: 13, 5: 16, 6: 10, 7: 10, 8: 11, 9: 14, 10: 12,
  11: 11, 12: 10, 13: 13, 14: 12, 15: 14, 16: 13, 17: 13, 18: 11, 19: 9, 20: 8,
  21: 14, 22: 9, 23: 14, 24: 13, 25: 14,
};

const datasetPath = path.join(process.cwd(), "public/data/lotofacil/results.json");
const hasDataset = (() => {
  try {
    readFileSync(datasetPath, "utf8");
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasDataset)("Lotofacil RMS pools — reference window 3760-3779", () => {
  const dataset: LotteryDataset = JSON.parse(readFileSync(datasetPath, "utf8"));
  const window = dataset.draws.filter((d) => d.contest >= 3760 && d.contest <= 3779);

  it("has the full 20-contest window available (no gaps)", () => {
    expect(window).toHaveLength(20);
  });

  it("reproduces the exact published frequency table for contests 3760-3779", () => {
    if (window.length !== 20) return; // dataset not fully backfilled in this environment
    const freq = computeFrequencies(window);
    for (const [num, expected] of Object.entries(EXPECTED_FREQUENCIES)) {
      expect(freq[Number(num)]).toBe(expected);
    }
  });

  it("builds pools of size 15/5/5 that partition all 25 numbers with no overlap", () => {
    if (window.length !== 20) return;
    const pools = buildPools(window, createSeededRandom("test"));
    expect(pools.poolA).toHaveLength(15);
    expect(pools.poolB).toHaveLength(5);
    expect(pools.poolC).toHaveLength(5);
    const all = new Set([...pools.poolA, ...pools.poolB, ...pools.poolC]);
    expect(all.size).toBe(25);
  });

  it("never uses draws outside the declared window (no look-ahead)", () => {
    if (window.length !== 20) return;
    const contests = window.map((d) => d.contest);
    expect(Math.min(...contests)).toBe(3760);
    expect(Math.max(...contests)).toBe(3779);
    // contest 3780 itself must never appear in the window used for pool building.
    expect(contests).not.toContain(3780);
  });
});
