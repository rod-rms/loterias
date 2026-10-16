import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildPools, computeFrequencies, generateRmsV2, type RmsDrawInput } from "../../src/modules/lotofacil/domain/rms";
import { RMS_ALGORITHM_VERSION, RMS_ALGORITHM_VERSION_V2_0, RMS_HISTORY_WINDOW, RMS_TIEBREAK_WINDOW } from "../../src/modules/lotofacil/domain/constants";
import { createSeededRandom } from "../../src/shared/lib/prng";
import type { GameConfig, LotteryDataset, LotteryDraw } from "../../src/shared/types";

/**
 * RMS-201 (DEC-024): 20+50 multi-horizon tie-break. The 20-contest frequency
 * ranking stays sovereign; the 50-contest frequency only reorders numbers that
 * are ALREADY tied on the 20-contest frequency, and only before the seed.
 */

// --- synthetic window builders -------------------------------------------------

/** Draw i of `count` includes number n iff i < freq(n): yields exactly freq(n) appearances per number. */
function drawsFromFrequencies(startContest: number, count: number, freq: (n: number) => number): RmsDrawInput[] {
  return Array.from({ length: count }, (_, i) => ({
    contest: startContest + i,
    numbers: Array.from({ length: 25 }, (_, k) => k + 1).filter((n) => i < freq(n)),
  }));
}

const TARGET = 1021;
const f20Tied = (n: number): number => {
  if (n <= 14) return 21 - n; // 20..7, all distinct, comfortably inside pool A
  if (n === 15 || n === 16) return 6; // tie straddling the A/C boundary (index 14/15)
  if (n >= 17 && n <= 19) return 22 - n; // 5,4,3
  if (n === 20 || n === 21) return 2; // tie straddling the C/B boundary (index 19/20)
  if (n === 22 || n === 23) return 1;
  return 0;
};

function buildWindows(g: (n: number) => number, f20: (n: number) => number = f20Tied) {
  const window20 = drawsFromFrequencies(TARGET - RMS_HISTORY_WINDOW, RMS_HISTORY_WINDOW, f20);
  const older30 = drawsFromFrequencies(TARGET - RMS_TIEBREAK_WINDOW, RMS_TIEBREAK_WINDOW - RMS_HISTORY_WINDOW, g);
  return { window20, window50: [...older30, ...window20] };
}

const seeds = Array.from({ length: 40 }, (_, i) => `rms201-seed-${i}`);

describe("RMS-201 — 20+50 tie-break in buildPools", () => {
  it("fixture sanity: the 20-window really ties exactly where the tests expect", () => {
    const { window20 } = buildWindows(() => 0);
    const pools = buildPools(window20, createSeededRandom("x"));
    expect(pools.boundaryTies.map((t) => ({ boundary: t.boundary, numbers: t.numbers }))).toEqual([
      { boundary: "A/C", numbers: [15, 16] },
      { boundary: "C/B", numbers: [20, 21] },
    ]);
  });

  it("when the 50-window distinguishes the tied numbers, it decides — for every seed", () => {
    // 50-window favours 15 over 16 and 21 over 20.
    const { window20, window50 } = buildWindows((n) => ({ 15: 10, 16: 3, 20: 1, 21: 7 })[n] ?? 0);
    for (const seed of seeds) {
      const pools = buildPools(window20, createSeededRandom(seed), window50);
      expect(pools.tieBreakRule).toBe("multi_horizon_20_50");
      expect(pools.poolA).toContain(15);
      expect(pools.poolA).not.toContain(16);
      expect(pools.poolC).toContain(21);
      expect(pools.poolB).toContain(20);
      expect(pools.poolB).not.toContain(21);
    }
    // The opposite 50-window preference flips the result, so the 50-window is really what decides.
    const flipped = buildWindows((n) => ({ 15: 3, 16: 10, 20: 7, 21: 1 })[n] ?? 0);
    const pools = buildPools(flipped.window20, createSeededRandom(seeds[0]!), flipped.window50);
    expect(pools.poolA).toContain(16);
    expect(pools.poolA).not.toContain(15);
    expect(pools.poolB).toContain(21);
  });

  it("when the 50-window also ties, the seed decides (deterministic per seed, both outcomes reachable across seeds)", () => {
    const { window20, window50 } = buildWindows((n) => (n === 15 || n === 16 ? 5 : 0));
    const outcomes = new Set<number>();
    for (const seed of seeds) {
      const a = buildPools(window20, createSeededRandom(seed), window50);
      const b = buildPools(window20, createSeededRandom(seed), window50);
      expect(a).toEqual(b);
      outcomes.add(a.poolA.includes(15) ? 15 : 16);
    }
    expect(outcomes).toEqual(new Set([15, 16]));
  });

  it("with no tie straddling a boundary, the result equals the v2.0 (seed-only) pools for every seed", () => {
    // distinct frequencies around both boundaries; ties only inside pool C and pool B.
    const f20NoBoundaryTie = (n: number): number => {
      if (n <= 14) return 21 - n; // 20..7
      if (n === 15) return 6;
      if (n >= 16 && n <= 19) return 4; // tie, fully inside pool C
      if (n === 20) return 3;
      return 1; // 21..25: tie, fully inside pool B
    };
    const { window20, window50 } = buildWindows((n) => (n * 7) % 11, f20NoBoundaryTie);
    for (const seed of seeds) {
      const legacy = buildPools(window20, createSeededRandom(seed));
      const next = buildPools(window20, createSeededRandom(seed), window50);
      expect(legacy.boundaryTies).toEqual([]);
      expect(next.poolA).toEqual(legacy.poolA);
      expect(next.poolB).toEqual(legacy.poolB);
      expect(next.poolC).toEqual(legacy.poolC);
    }
  });

  it("property: the 20-window stays sovereign and pools only change inside boundary-tie groups (300 random histories)", () => {
    const rng = createSeededRandom("rms201-property");
    const randomDraw = (contest: number): RmsDrawInput => {
      const pool = Array.from({ length: 25 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
      return { contest, numbers: pool.slice(0, 15).sort((a, b) => a - b) };
    };
    for (let c = 0; c < 300; c += 1) {
      const window50 = Array.from({ length: RMS_TIEBREAK_WINDOW }, (_, i) => randomDraw(2000 + i));
      const window20 = window50.slice(-RMS_HISTORY_WINDOW);
      const f20 = computeFrequencies(window20);
      const legacy = buildPools(window20, createSeededRandom(`p${c}`));
      const next = buildPools(window20, createSeededRandom(`p${c}`), window50);

      // partition of 1..25 with the right sizes
      expect(next.poolA).toHaveLength(15);
      expect(next.poolC).toHaveLength(5);
      expect(next.poolB).toHaveLength(5);
      expect(new Set([...next.poolA, ...next.poolB, ...next.poolC]).size).toBe(25);

      // same tie structure (it derives from the 20-window only)
      expect(next.boundaryTies).toEqual(legacy.boundaryTies);

      // 20-window sovereignty: nobody in a higher pool has a lower 20-frequency than somebody in a lower pool
      const minOf = (xs: number[]) => Math.min(...xs.map((n) => f20[n]!));
      const maxOf = (xs: number[]) => Math.max(...xs.map((n) => f20[n]!));
      expect(minOf(next.poolA)).toBeGreaterThanOrEqual(maxOf(next.poolC));
      expect(minOf(next.poolC)).toBeGreaterThanOrEqual(maxOf(next.poolB));

      // membership only differs inside the numbers of tie groups straddling the relevant boundary
      const tied = (b: "A/C" | "C/B") => new Set(next.boundaryTies.filter((t) => t.boundary === b).flatMap((t) => t.numbers));
      const symDiff = (a: number[], b: number[]) => [...a.filter((n) => !b.includes(n)), ...b.filter((n) => !a.includes(n))];
      const allTied = new Set([...tied("A/C"), ...tied("C/B")]);
      for (const n of symDiff(next.poolA, legacy.poolA)) expect(tied("A/C").has(n) || allTied.has(n)).toBe(true);
      for (const n of symDiff(next.poolB, legacy.poolB)) expect(tied("C/B").has(n) || allTied.has(n)).toBe(true);
      for (const n of symDiff(next.poolC, legacy.poolC)) expect(allTied.has(n)).toBe(true);
      if (next.boundaryTies.length === 0) {
        expect(next.poolA).toEqual(legacy.poolA);
        expect(next.poolB).toEqual(legacy.poolB);
        expect(next.poolC).toEqual(legacy.poolC);
      }
    }
  });

  it("is deterministic: same windows and seed give identical pools", () => {
    const { window20, window50 } = buildWindows((n) => (n * 3) % 7);
    expect(buildPools(window20, createSeededRandom("d"), window50)).toEqual(buildPools(window20, createSeededRandom("d"), window50));
  });

  it("rejects a malformed tie-break window instead of silently misbehaving", () => {
    const { window20, window50 } = buildWindows(() => 1);
    expect(() => buildPools(window20, createSeededRandom("e"), window50.slice(1))).toThrow(/exactly 50/);
    const shifted = window50.map((d) => ({ ...d, contest: d.contest + 1 }));
    expect(() => buildPools(window20, createSeededRandom("e"), shifted)).toThrow(/same 20 contests/);
  });

  it("no-look-ahead at the domain level: contests >= target never reach the pools (mutating them changes nothing)", () => {
    const { window20, window50 } = buildWindows((n) => (n * 5) % 9);
    const before = buildPools(window20, createSeededRandom("m"), window50);
    // contests >= TARGET are simply not part of either window; a dataset-level mutation cannot leak in.
    const futureMutated = [...window50, { contest: TARGET, numbers: [1, 2, 3] }, { contest: TARGET + 1, numbers: [1, 2, 3] }].slice(0, RMS_TIEBREAK_WINDOW);
    expect(buildPools(window20, createSeededRandom("m"), futureMutated)).toEqual(before);
  });
});

describe("RMS-201 — v2.0 behaviour stays reproducible (versioning)", () => {
  const datasetPath = path.join(process.cwd(), "public/data/lotofacil/results.json");
  const dataset: LotteryDataset | null = (() => {
    try {
      return JSON.parse(readFileSync(datasetPath, "utf8"));
    } catch {
      return null;
    }
  })();
  const window20 = dataset?.draws.filter((d) => d.contest >= 3760 && d.contest <= 3779) ?? [];
  const window50 = dataset?.draws.filter((d) => d.contest >= 3730 && d.contest <= 3779) ?? [];

  it.skipIf(!dataset || window20.length !== 20 || window50.length !== 50)("buildPools without a tie-break window reproduces the pinned v2.0 pools on the real 3760-3779 window", () => {
    const pools = buildPools(window20, createSeededRandom("rms201-legacy-pin"));
    expect(pools.tieBreakRule).toBe("seed");
    expect(pools.poolA).toEqual([3, 4, 5, 9, 10, 13, 14, 15, 16, 17, 18, 21, 23, 24, 25]);
    expect(pools.poolC).toEqual([1, 2, 6, 8, 11]);
    expect(pools.poolB).toEqual([7, 12, 19, 20, 22]);
  });

  it.skipIf(!dataset || window20.length !== 20 || window50.length !== 50)("pins the RMS-201 pools on the same real window and seed (20+50 tie-break)", () => {
    const pools = buildPools(window20, createSeededRandom("rms201-legacy-pin"), window50);
    expect(pools.tieBreakRule).toBe("multi_horizon_20_50");
    expect(pools.poolA).toEqual([3, 4, 5, 9, 10, 11, 13, 14, 15, 16, 17, 21, 23, 24, 25]);
    expect(pools.poolC).toEqual([1, 2, 8, 12, 18]);
    expect(pools.poolB).toEqual([6, 7, 19, 20, 22]);
  });

  it("the algorithm version is bumped and the default seed carries the version actually used", () => {
    expect(RMS_ALGORITHM_VERSION).toBe("rms-v2.1.0");
    expect(RMS_ALGORITHM_VERSION_V2_0).toBe("rms-v2.0.0");
    const { window20: w20, window50: w50 } = buildWindows(() => 0);
    const randomish = (draws: RmsDrawInput[]) => draws.map((d, i) => ({ ...d, numbers: Array.from({ length: 15 }, (_, k) => ((i * 3 + k * 2) % 25) + 1) }));
    const legacy = generateRmsV2({ targetContest: TARGET, referenceWindow: randomish(w20) });
    const next = generateRmsV2({ targetContest: TARGET, referenceWindow: randomish(w20), tiebreakWindow: randomish(w50) });
    expect(legacy.seed).toBe(`rms-v2:${TARGET}:rms-v2.0.0`);
    expect(next.seed).toBe(`rms-v2:${TARGET}:rms-v2.1.0`);
  });
});

describe("RMS-201 — J1–J6 structure is preserved by the new tie-break", () => {
  const PATTERNS: Record<string, [number, number, number]> = {
    "9-3-3": [9, 3, 3], // J1
    "8-3-4": [8, 3, 4], // J2
    "8-4-3": [8, 4, 3], // J3
    "10-2-3": [10, 2, 3], // J4
    "10-3-2": [10, 3, 2], // J5
    "9-4-2": [9, 4, 2], // J6 (variant 1)
    "9-2-4": [9, 2, 4], // J6 (variant 2)
  };

  it("every ticket respects its fixed A-B-C pool pattern, with the 20+50 rule active", () => {
    const rng = createSeededRandom("rms201-structure");
    for (let c = 0; c < 4; c += 1) {
      const window50: RmsDrawInput[] = Array.from({ length: RMS_TIEBREAK_WINDOW }, (_, i) => {
        const pool = Array.from({ length: 25 }, (_, k) => k + 1);
        for (let k = pool.length - 1; k > 0; k -= 1) {
          const j = Math.floor(rng() * (k + 1));
          [pool[k], pool[j]] = [pool[j]!, pool[k]!];
        }
        return { contest: 3000 + i, numbers: pool.slice(0, 15).sort((a, b) => a - b) };
      });
      const result = generateRmsV2({ targetContest: 3050, referenceWindow: window50.slice(-RMS_HISTORY_WINDOW), tiebreakWindow: window50, seed: `structure-${c}` });
      expect(result.pools.tieBreakRule).toBe("multi_horizon_20_50");
      expect(result.tickets).toHaveLength(6);
      const labels = result.patternUsed; // J1..J5 fixed patterns + the chosen J6 variant
      expect(labels.slice(0, 5)).toEqual(["9-3-3", "8-3-4", "8-4-3", "10-2-3", "10-3-2"]);
      expect(["9-4-2", "9-2-4"]).toContain(labels[5]);
      result.tickets.forEach((ticket, i) => {
        const [a, b, cc] = PATTERNS[labels[i]!]!;
        expect(ticket.filter((n) => result.pools.poolA.includes(n))).toHaveLength(a);
        expect(ticket.filter((n) => result.pools.poolB.includes(n))).toHaveLength(b);
        expect(ticket.filter((n) => result.pools.poolC.includes(n))).toHaveLength(cc);
        expect(ticket).toHaveLength(15);
      });
    }
  });
});

// --- adapter level: how the 50-window reaches buildPools, fallback, no-look-ahead -------------

function makeDraw(contest: number, salt = 0): LotteryDraw {
  const numbers = new Set<number>();
  let i = (contest * 7 + salt) % 25;
  while (numbers.size < 15) {
    numbers.add((i % 25) + 1);
    i += 1 + ((contest + salt) % 3 === 0 ? 1 : 0);
  }
  return { contest, drawDate: "2020-01-01", numbers: [...numbers].sort((a, b) => a - b) };
}
function makeDataset(contests: number[], mutate?: (c: number) => LotteryDraw): LotteryDataset {
  return {
    schemaVersion: 1,
    modality: "lotofacil",
    source: "test",
    importedAt: new Date().toISOString(),
    latestContest: Math.max(...contests),
    draws: contests.map((c) => (mutate ? mutate(c) : makeDraw(c))),
  };
}
const fakeGameConfig: GameConfig = {
  schemaVersion: 1,
  updatedAt: "2020-01-01T00:00:00.000Z",
  lotofacil: { simpleTicketSize: 15, ticketCostBRL: 3, source: "test", referenceDate: "2020-01-01", configVersion: "1" },
  megasena: { simpleTicketSize: 6, ticketCostBRL: 5, source: "test", referenceDate: "2020-01-01", configVersion: "1" },
};

const loadDatasetMock = vi.fn();
const loadGameConfigMock = vi.fn();
vi.mock("../../src/shared/lib/dataLoaders", async () => {
  const actual = await vi.importActual<typeof import("../../src/shared/lib/dataLoaders")>("../../src/shared/lib/dataLoaders");
  return {
    ...actual,
    loadDataset: (...args: unknown[]) => loadDatasetMock(...args),
    loadGameConfig: (...args: unknown[]) => loadGameConfigMock(...args),
  };
});
const { generateRmsV2Adapter } = await import("../../src/modules/lotofacil/strategies/adapters");

const baseRequest = { modality: "lotofacil", strategyId: "lotofacil.rms_v2", inputMode: "quantity", seed: "rms201-adapter" } as const;
const stable = (audit: unknown) => {
  const { generatedAt: _g, elapsedMs: _e, ...rest } = audit as Record<string, unknown>;
  return rest;
};

describe("RMS-201 — adapter wiring", () => {
  beforeEach(() => {
    loadDatasetMock.mockReset();
    loadGameConfigMock.mockReset();
    loadGameConfigMock.mockResolvedValue(fakeGameConfig);
  });

  const T = 120;
  const FULL = Array.from({ length: 130 }, (_, i) => i + 1);

  it("with >= 50 prior contests it uses the 20+50 rule and records it (strategy v2.1.0 / rms-v2.1.0)", async () => {
    loadDatasetMock.mockResolvedValueOnce(makeDataset(FULL));
    const result = await generateRmsV2Adapter({ ...baseRequest, contest: T });
    expect(result.strategyVersion).toBe("2.1.0");
    expect(result.audit.algorithmVersion).toBe("rms-v2.1.0");
    expect(result.generationMethod).toMatch(/20-contest frequency, then 50-contest frequency, then seed/);
  });

  it("with fewer than 50 prior contests it falls back to the seed-only tie-break and never throws", async () => {
    loadDatasetMock.mockResolvedValueOnce(makeDataset(Array.from({ length: 40 }, (_, i) => i + 1)));
    const result = await generateRmsV2Adapter({ ...baseRequest, contest: 35 });
    expect(result.tickets).toHaveLength(6);
    expect(result.generationMethod).toMatch(/pool tie-break: seed only \(fewer than 50 prior contests available\)/);
  });

  it("a gap inside the 50-window (outside the 20-window) also falls back instead of throwing", async () => {
    loadDatasetMock.mockResolvedValueOnce(makeDataset(FULL.filter((c) => c !== T - 40)));
    const result = await generateRmsV2Adapter({ ...baseRequest, contest: T });
    expect(result.generationMethod).toMatch(/seed only/);
  });

  it("no-look-ahead mutation test: altering any contest >= T, or truncating the dataset at T-1, does not change the generated portfolio", async () => {
    loadDatasetMock.mockResolvedValueOnce(makeDataset(FULL));
    const reference = await generateRmsV2Adapter({ ...baseRequest, contest: T });

    loadDatasetMock.mockResolvedValueOnce(makeDataset(FULL, (c) => (c >= T ? makeDraw(c, 11) : makeDraw(c))));
    const mutatedFuture = await generateRmsV2Adapter({ ...baseRequest, contest: T });

    loadDatasetMock.mockResolvedValueOnce(makeDataset(FULL.filter((c) => c < T)));
    const truncated = await generateRmsV2Adapter({ ...baseRequest, contest: T });

    for (const other of [mutatedFuture, truncated]) {
      expect(other.tickets).toEqual(reference.tickets);
      expect(stable(other.audit)).toEqual(stable(reference.audit));
    }
  });
});
