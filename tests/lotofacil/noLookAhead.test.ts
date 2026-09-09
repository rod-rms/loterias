import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LotteryDataset, LotteryDraw, GameConfig } from "../../src/shared/types";

/**
 * Release-blocking no-look-ahead regression suite (v1.1.1). Proves that
 * historical simulation for RMS v2 — the one Lotofácil strategy that reads
 * historical draws — can never be influenced by the target contest itself
 * or by any later contest, at the domain/adapter boundary (not just
 * visually). Uses a small synthetic in-memory dataset instead of the real
 * ~3800-draw fixture, so these tests stay fast and fully deterministic.
 */

function makeDraw(contest: number): LotteryDraw {
  const numbers = new Set<number>();
  let i = (contest * 7) % 25;
  while (numbers.size < 15) {
    numbers.add((i % 25) + 1);
    i += 1;
  }
  return { contest, drawDate: "2020-01-01", numbers: [...numbers].sort((a, b) => a - b) };
}

function makeDataset(contests: number[]): LotteryDataset {
  const draws = contests.map(makeDraw);
  return {
    schemaVersion: 1,
    modality: "lotofacil",
    source: "test",
    importedAt: new Date().toISOString(),
    latestContest: Math.max(...contests),
    draws,
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

const { generateRmsV2Adapter, LotofacilGenerationError } = await import("../../src/modules/lotofacil/strategies/adapters");
const { referenceWindow } = await import("../../src/shared/lib/dataLoaders");

const TARGET_CONTEST = 35;
const FULL_RANGE = Array.from({ length: 40 }, (_, i) => i + 1); // contests 1..40

/** Strips the two fields that legitimately vary run-to-run (wall-clock timestamp, elapsed time) so audit metadata can otherwise be compared for exact equality. */
function stableAudit(audit: unknown): unknown {
  const { generatedAt: _generatedAt, elapsedMs: _elapsedMs, ...rest } = audit as Record<string, unknown>;
  return rest;
}

beforeEach(() => {
  loadDatasetMock.mockReset();
  loadGameConfigMock.mockReset();
  loadGameConfigMock.mockResolvedValue(fakeGameConfig);
});

describe("no-look-ahead — historical dataset slicing", () => {
  it("A) every draw in the RMS reference window for target T satisfies contest < T", () => {
    const dataset = makeDataset(FULL_RANGE);
    const window = referenceWindow(dataset, TARGET_CONTEST, 20)!;
    expect(window).not.toBeNull();
    expect(window.length).toBe(20);
    for (const draw of window) {
      expect(draw.contest).toBeLessThan(TARGET_CONTEST);
    }
  });

  it("the RMS window is exactly the 20 contests immediately before T (15..34), no more, no less", () => {
    const dataset = makeDataset(FULL_RANGE);
    const window = referenceWindow(dataset, TARGET_CONTEST, 20)!;
    const contests = window.map((d) => d.contest).sort((a, b) => a - b);
    expect(contests).toEqual(Array.from({ length: 20 }, (_, i) => 15 + i));
    expect(Math.max(...contests)).toBe(TARGET_CONTEST - 1);
  });
});

describe("no-look-ahead — truncated-dataset equivalence", () => {
  it("B) generating for historical contest T with the full dataset equals generating with a dataset physically truncated at T - 1", async () => {
    const fullDataset = makeDataset(FULL_RANGE);
    const truncatedDataset = makeDataset(FULL_RANGE.filter((c) => c < TARGET_CONTEST));

    loadDatasetMock.mockResolvedValueOnce(fullDataset);
    const resultWithFullDataset = await generateRmsV2Adapter({
      modality: "lotofacil",
      strategyId: "lotofacil.rms_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      seed: "no-look-ahead-test-seed",
    });

    loadDatasetMock.mockResolvedValueOnce(truncatedDataset);
    const resultWithTruncatedDataset = await generateRmsV2Adapter({
      modality: "lotofacil",
      strategyId: "lotofacil.rms_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      seed: "no-look-ahead-test-seed",
    });

    expect(resultWithTruncatedDataset.tickets).toEqual(resultWithFullDataset.tickets);
    expect(stableAudit(resultWithTruncatedDataset.audit)).toEqual(stableAudit(resultWithFullDataset.audit));
  });
});

describe("no-look-ahead — future-data mutation", () => {
  it("C) mutating draws after target T does not change the historical generation output", async () => {
    const originalDataset = makeDataset(FULL_RANGE);

    loadDatasetMock.mockResolvedValueOnce(originalDataset);
    const baseline = await generateRmsV2Adapter({
      modality: "lotofacil",
      strategyId: "lotofacil.rms_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      seed: "future-mutation-test-seed",
    });

    const mutatedDataset: LotteryDataset = {
      ...originalDataset,
      draws: originalDataset.draws.map((d) => (d.contest > TARGET_CONTEST ? { ...d, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] } : d)),
    };
    // Sanity check: the mutation actually changed something after T.
    expect(mutatedDataset.draws.find((d) => d.contest === TARGET_CONTEST + 1)?.numbers).not.toEqual(
      originalDataset.draws.find((d) => d.contest === TARGET_CONTEST + 1)?.numbers,
    );

    loadDatasetMock.mockResolvedValueOnce(mutatedDataset);
    const afterMutation = await generateRmsV2Adapter({
      modality: "lotofacil",
      strategyId: "lotofacil.rms_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      seed: "future-mutation-test-seed",
    });

    expect(afterMutation.tickets).toEqual(baseline.tickets);
    expect(stableAudit(afterMutation.audit)).toEqual(stableAudit(baseline.audit));
  });
});

describe("no-look-ahead — insufficient history is blocked safely", () => {
  it("blocks generation instead of silently reducing the window or using later contests, when the required window has a gap", async () => {
    const gappyDataset = makeDataset(FULL_RANGE.filter((c) => c !== 20)); // remove one contest from the required 15..34 window
    loadDatasetMock.mockResolvedValueOnce(gappyDataset);

    await expect(
      generateRmsV2Adapter({
        modality: "lotofacil",
        strategyId: "lotofacil.rms_v2",
        contest: TARGET_CONTEST,
        inputMode: "quantity",
        seed: "gap-test-seed",
      }),
    ).rejects.toThrow(LotofacilGenerationError);
  });

  it("never falls back to the latest available history when the exact window is incomplete", async () => {
    // Only contests up to 30 are available (window needs 15..34) — even though
    // plenty of earlier history exists, the adapter must not substitute it.
    const shortDataset = makeDataset(Array.from({ length: 30 }, (_, i) => i + 1));
    loadDatasetMock.mockResolvedValueOnce(shortDataset);

    await expect(
      generateRmsV2Adapter({
        modality: "lotofacil",
        strategyId: "lotofacil.rms_v2",
        contest: TARGET_CONTEST,
        inputMode: "quantity",
        seed: "short-history-test-seed",
      }),
    ).rejects.toMatchObject({ code: "RMS_INSUFFICIENT_HISTORY" });
  });
});

describe("next-contest behavior remains correct", () => {
  it("for nextContest = latestContest + 1, the available history up to latestContest is used normally (no accidental truncation)", async () => {
    const dataset = makeDataset(FULL_RANGE); // latestContest = 40
    const nextContest = dataset.latestContest + 1; // 41
    loadDatasetMock.mockResolvedValueOnce(dataset);

    const result = await generateRmsV2Adapter({
      modality: "lotofacil",
      strategyId: "lotofacil.rms_v2",
      contest: nextContest,
      inputMode: "quantity",
      seed: "next-contest-test-seed",
    });

    expect(result.tickets.length).toBe(6);
    const window = referenceWindow(dataset, nextContest, 20)!;
    const contests = window.map((d) => d.contest).sort((a, b) => a - b);
    // The window must include the latest available contest (40), not stop short of it.
    expect(Math.max(...contests)).toBe(dataset.latestContest);
  });
});
