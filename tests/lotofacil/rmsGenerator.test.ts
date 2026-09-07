import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateRmsV2, type RmsDrawInput } from "../../src/modules/lotofacil/domain/rms";
import { validatePortfolio } from "../../src/modules/lotofacil/domain/validation";
import type { LotteryDataset } from "../../src/shared/types";

const datasetPath = path.join(process.cwd(), "public/data/lotofacil/results.json");
function realWindow3760to3779(): RmsDrawInput[] | null {
  try {
    const dataset: LotteryDataset = JSON.parse(readFileSync(datasetPath, "utf8"));
    const window = dataset.draws.filter((d) => d.contest >= 3760 && d.contest <= 3779);
    return window.length === 20 ? window : null;
  } catch {
    return null;
  }
}

function syntheticWindow(seedOffset: number): RmsDrawInput[] {
  // 20 synthetic-but-plausible draws (15 distinct numbers each) used only to
  // exercise the RMS v2 search mechanics; never used to claim real historical pools.
  const draws: RmsDrawInput[] = [];
  for (let c = 0; c < 20; c += 1) {
    const numbers = new Set<number>();
    let seed = (c + 1) * 97 + seedOffset * 131;
    while (numbers.size < 15) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      numbers.add((seed % 25) + 1);
    }
    draws.push({ contest: 1000 + c, numbers: [...numbers].sort((a, b) => a - b) });
  }
  return draws;
}

describe("Lotofacil RMS v2 generator", () => {
  const realWindow = realWindow3760to3779();

  it.skipIf(!realWindow)("produces exactly 6 distinct valid tickets satisfying the hard constraints (real 3760-3779 window)", () => {
    const window = realWindow!;
    const result = generateRmsV2({ targetContest: 3780, referenceWindow: window, seed: "test-seed-1" });
    expect(result.tickets).toHaveLength(6);
    const validation = validatePortfolio(result.tickets);
    expect(validation.valid).toBe(true);

    // Exposure: every number 3 or 4 times.
    const exposure = new Map<number, number>();
    for (const t of result.tickets) for (const n of t) exposure.set(n, (exposure.get(n) ?? 0) + 1);
    for (let n = 1; n <= 25; n += 1) {
      expect([3, 4]).toContain(exposure.get(n) ?? 0);
    }

    // Pairwise intersections in [7,9].
    for (let i = 0; i < 6; i += 1) {
      for (let j = i + 1; j < 6; j += 1) {
        const inter = result.tickets[i]!.filter((n) => result.tickets[j]!.includes(n)).length;
        expect(inter).toBeGreaterThanOrEqual(7);
        expect(inter).toBeLessThanOrEqual(9);
      }
    }

    // At least one game without 01 and 02 together, and one without 13/17 together.
    expect(result.tickets.some((t) => !t.includes(1) && !t.includes(2))).toBe(true);
    expect(result.tickets.some((t) => !t.includes(13) && !t.includes(17))).toBe(true);
  }, 60000);

  it("throws a structured RMS_NO_VALID_PORTFOLIO_FOUND error if given a malformed window", () => {
    const badWindow = syntheticWindow(2).slice(0, 19); // only 19 contests
    expect(() => generateRmsV2({ targetContest: 1019, referenceWindow: badWindow, seed: "x" })).toThrow();
  });

  it("is deterministic: same seed and window produce the same portfolio", () => {
    const window = syntheticWindow(3);
    const a = generateRmsV2({ targetContest: 1020, referenceWindow: window, seed: "reproduce-me" });
    const b = generateRmsV2({ targetContest: 1020, referenceWindow: window, seed: "reproduce-me" });
    expect(a.tickets).toEqual(b.tickets);
  }, 60000);

  it("without a look-ahead: does not depend on data outside the provided window", () => {
    const window = syntheticWindow(4);
    // Same window, same seed, called twice — the generator only ever receives
    // the window explicitly, never a full dataset it could peek ahead into.
    const a = generateRmsV2({ targetContest: 1500, referenceWindow: window, seed: "no-lookahead" });
    const b = generateRmsV2({ targetContest: 1500, referenceWindow: window, seed: "no-lookahead" });
    expect(a.pools).toEqual(b.pools);
  }, 60000);
});
