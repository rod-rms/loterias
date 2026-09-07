import { afterEach, describe, expect, it, vi } from "vitest";
import { drawsBeforeContest, referenceWindow, suggestNextContest } from "../../src/shared/lib/dataLoaders";
import type { LotteryDataset } from "../../src/shared/types";

function dataset(latestContest: number, contests: number[]): LotteryDataset {
  return {
    schemaVersion: 1,
    modality: "lotofacil",
    source: "test",
    importedAt: new Date().toISOString(),
    latestContest,
    draws: contests.map((contest) => ({ contest, drawDate: "2026-01-01", numbers: Array.from({ length: 15 }, (_, i) => i + 1) })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dataLoaders (pure helpers)", () => {
  it("suggests the next contest as latestContest + 1", () => {
    expect(suggestNextContest(dataset(100, [98, 99, 100]))).toBe(101);
  });

  it("returns draws strictly before a given contest", () => {
    const d = dataset(105, [100, 101, 102, 103, 104]);
    const before = drawsBeforeContest(d, 103);
    expect(before.map((x) => x.contest)).toEqual([100, 101, 102]);
  });

  it("returns null when the reference window has any gap (RMS must never generate with an incomplete window)", () => {
    const d = dataset(30, [1, 2, 3, 5, 6]); // missing contest 4
    expect(referenceWindow(d, 6, 5)).toBeNull();
  });

  it("returns the exact window when contiguous and complete", () => {
    const d = dataset(30, [1, 2, 3, 4, 5]);
    const window = referenceWindow(d, 6, 5);
    expect(window?.map((x) => x.contest)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never includes the target contest itself in the window (no look-ahead)", () => {
    const d = dataset(30, [1, 2, 3, 4, 5, 6]);
    const window = referenceWindow(d, 6, 5)!;
    expect(window.map((x) => x.contest)).not.toContain(6);
  });
});
