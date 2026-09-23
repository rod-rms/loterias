import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LotteryDataset, LotteryDraw, GameConfig } from "../../src/shared/types";

/**
 * MEGA-ROLL-001 — adapter-level integration tests for the wired strategy
 * (`megasena.rolling_20_v2`): no-look-ahead (mirroring the Lotofácil RMS
 * suite's pattern, `tests/lotofacil/noLookAhead.test.ts`), structured error
 * codes, and the audit snapshot (spec §7). Uses a small synthetic in-memory
 * dataset instead of the real ~3000-draw fixture, so this stays fast; the
 * real dataset's grouping fixture is covered separately by the oracle test.
 */
function makeDraw(contest: number): LotteryDraw {
  const numbers = new Set<number>();
  let i = (contest * 11) % 60;
  while (numbers.size < 6) {
    numbers.add((i % 60) + 1);
    i += 7;
  }
  return { contest, drawDate: "2020-01-01", numbers: [...numbers].sort((a, b) => a - b) };
}

function makeDataset(contests: number[]): LotteryDataset {
  const draws = contests.map(makeDraw);
  return {
    schemaVersion: 1,
    modality: "megasena",
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

const { generateRolling20Adapter, MegaSenaGenerationError } = await import("../../src/modules/megasena/strategies/adapters");
const { generateMegaSenaPortfolioRequest } = await import("../../src/modules/megasena/strategies/adapters");
const { referenceWindow } = await import("../../src/shared/lib/dataLoaders");

const TARGET_CONTEST = 35;
const FULL_RANGE = Array.from({ length: 40 }, (_, i) => i + 1); // contests 1..40

beforeEach(() => {
  loadDatasetMock.mockReset();
  loadGameConfigMock.mockReset();
  loadGameConfigMock.mockResolvedValue(fakeGameConfig);
});

describe("Rolling 20 Balanceada — no-look-ahead (adapter level)", () => {
  it("the reference window for target T is exactly the 20 contests immediately before T", () => {
    const dataset = makeDataset(FULL_RANGE);
    const window = referenceWindow(dataset, TARGET_CONTEST, 20)!;
    expect(window).not.toBeNull();
    const contests = window.map((d) => d.contest).sort((a, b) => a - b);
    expect(contests).toEqual(Array.from({ length: 20 }, (_, i) => 15 + i));
    expect(Math.max(...contests)).toBe(TARGET_CONTEST - 1);
  });

  it("generating for a historical contest with the full dataset equals generating with a dataset physically truncated at T-1", async () => {
    const fullDataset = makeDataset(FULL_RANGE);
    const truncatedDataset = makeDataset(FULL_RANGE.filter((c) => c < TARGET_CONTEST));

    loadDatasetMock.mockResolvedValueOnce(fullDataset);
    const withFull = await generateRolling20Adapter({
      modality: "megasena",
      strategyId: "megasena.rolling_20_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      numberOfTickets: 6,
      seed: "no-look-ahead-seed",
    });

    loadDatasetMock.mockResolvedValueOnce(truncatedDataset);
    const withTruncated = await generateRolling20Adapter({
      modality: "megasena",
      strategyId: "megasena.rolling_20_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      numberOfTickets: 6,
      seed: "no-look-ahead-seed",
    });

    expect(withTruncated.tickets).toEqual(withFull.tickets);
  });

  it("mutating draws after the target contest does not change the generated portfolio", async () => {
    const originalDataset = makeDataset(FULL_RANGE);
    loadDatasetMock.mockResolvedValueOnce(originalDataset);
    const baseline = await generateRolling20Adapter({
      modality: "megasena",
      strategyId: "megasena.rolling_20_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      numberOfTickets: 6,
      seed: "future-mutation-seed",
    });

    const mutatedDataset: LotteryDataset = {
      ...originalDataset,
      draws: originalDataset.draws.map((d) => (d.contest > TARGET_CONTEST ? { ...d, numbers: [1, 2, 3, 4, 5, 6] } : d)),
    };
    loadDatasetMock.mockResolvedValueOnce(mutatedDataset);
    const afterMutation = await generateRolling20Adapter({
      modality: "megasena",
      strategyId: "megasena.rolling_20_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      numberOfTickets: 6,
      seed: "future-mutation-seed",
    });

    expect(afterMutation.tickets).toEqual(baseline.tickets);
  });

  it("blocks generation (ROLLING20_INCOMPLETE_HISTORY_WINDOW) instead of silently shrinking the window when a required contest is missing", async () => {
    const gappyDataset = makeDataset(FULL_RANGE.filter((c) => c !== 20)); // remove one contest from the required 15..34 window
    loadDatasetMock.mockResolvedValueOnce(gappyDataset);

    await expect(
      generateRolling20Adapter({
        modality: "megasena",
        strategyId: "megasena.rolling_20_v2",
        contest: TARGET_CONTEST,
        inputMode: "quantity",
        numberOfTickets: 6,
        seed: "gap-seed",
      }),
    ).rejects.toMatchObject({ code: "ROLLING20_INCOMPLETE_HISTORY_WINDOW" });
  });
});

describe("Rolling 20 Balanceada — target contest validation", () => {
  it("rejects a missing target contest with ROLLING20_INVALID_TARGET_CONTEST", async () => {
    await expect(
      generateRolling20Adapter({ modality: "megasena", strategyId: "megasena.rolling_20_v2", inputMode: "quantity", numberOfTickets: 6 }),
    ).rejects.toMatchObject({ code: "ROLLING20_INVALID_TARGET_CONTEST" });
  });

  it("rejects a non-positive target contest with ROLLING20_INVALID_TARGET_CONTEST", async () => {
    await expect(
      generateRolling20Adapter({ modality: "megasena", strategyId: "megasena.rolling_20_v2", contest: -5, inputMode: "quantity", numberOfTickets: 6 }),
    ).rejects.toMatchObject({ code: "ROLLING20_INVALID_TARGET_CONTEST" });
  });

  it("errors are instances of MegaSenaGenerationError (same class pattern as every other Mega-Sena strategy)", async () => {
    await expect(
      generateRolling20Adapter({ modality: "megasena", strategyId: "megasena.rolling_20_v2", inputMode: "quantity", numberOfTickets: 6 }),
    ).rejects.toBeInstanceOf(MegaSenaGenerationError);
  });
});

describe("Rolling 20 Balanceada — audit snapshot (spec §7) and dispatch", () => {
  it("the audit snapshot records grouping window, groups, tie-break rule, allocation, filters and seed", async () => {
    const dataset = makeDataset(FULL_RANGE);
    loadDatasetMock.mockResolvedValueOnce(dataset);
    const result = await generateRolling20Adapter({
      modality: "megasena",
      strategyId: "megasena.rolling_20_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      numberOfTickets: 6,
      seed: "audit-seed",
    });
    const snapshot = (result.audit as { strategySnapshot?: Record<string, unknown> }).strategySnapshot!;
    expect(snapshot).toBeDefined();
    expect(snapshot.targetContest).toBe(TARGET_CONTEST);
    expect(snapshot.windowFirstContest).toBe(TARGET_CONTEST - 20);
    expect(snapshot.windowLastContest).toBe(TARGET_CONTEST - 1);
    expect(snapshot.groups).toMatchObject({ g1: expect.any(Array), g2: expect.any(Array), g3: expect.any(Array) });
    expect((snapshot.groups as { g1: number[] }).g1).toHaveLength(20);
    expect(snapshot.tieBreakRule).toMatch(/frequency/i);
    expect(snapshot.allocation).toBeDefined();
    expect(snapshot.filtersActive).toEqual({ repeatPreviousDraw: false, requireLow10: false });
    expect(snapshot.seed).toBe("audit-seed");
    expect(result.tickets).toHaveLength(6);
    expect(result.tickets.every((t) => t.length === 6)).toBe(true);
  });

  it("is reachable through the generic Mega-Sena dispatch (generateMegaSenaPortfolioRequest), not only directly", async () => {
    const dataset = makeDataset(FULL_RANGE);
    loadDatasetMock.mockResolvedValueOnce(dataset);
    const result = await generateMegaSenaPortfolioRequest({
      modality: "megasena",
      strategyId: "megasena.rolling_20_v2",
      contest: TARGET_CONTEST,
      inputMode: "quantity",
      numberOfTickets: 6,
      seed: "dispatch-seed",
    });
    expect(result.strategyId).toBe("megasena.rolling_20_v2");
    expect(result.tickets).toHaveLength(6);
  });
});
