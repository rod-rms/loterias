import { afterEach, describe, expect, it, vi } from "vitest";
import { drawsBeforeContest, loadDataStatus, referenceWindow, suggestNextContest } from "../../src/shared/lib/dataLoaders";
import type { DataStatus, LotteryDataset } from "../../src/shared/types";

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

describe("loadDataStatus (data-source transparency metadata)", () => {
  const validStatus: DataStatus = {
    schemaVersion: 1,
    lotofacil: {
      source: "https://example.test/lotofacil",
      latestContest: 3779,
      latestDrawDate: "2026-09-03",
      lastUpdatedAt: "2026-09-07T22:38:23.130Z",
      lastCheckedAt: "2026-09-07T22:38:23.130Z",
      status: "ok",
      gapCount: 0,
    },
    megasena: {
      source: "https://example.test/megasena",
      latestContest: 3054,
      latestDrawDate: "2026-09-06",
      lastUpdatedAt: "2026-09-07T22:40:17.449Z",
      lastCheckedAt: "2026-09-07T22:40:17.449Z",
      status: "ok",
      gapCount: 0,
    },
  };

  it("loads and validates status.json, keeping lastUpdatedAt and lastCheckedAt distinct", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(validStatus) }),
    );
    const status = await loadDataStatus();
    expect(status.lotofacil.lastUpdatedAt).toBe("2026-09-07T22:38:23.130Z");
    expect(status.lotofacil.lastCheckedAt).toBe("2026-09-07T22:38:23.130Z");
    expect(status.lotofacil.lastUpdatedAt).not.toBe(status.megasena.lastUpdatedAt);
  });
});
