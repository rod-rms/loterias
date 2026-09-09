import { describe, expect, it } from "vitest";
import { validateTargetContest, isTargetContestAllowed } from "../../src/shared/lib/targetContest";
import type { LotteryDataset } from "../../src/shared/types";

function dataset(latestContest: number, contests: number[]): LotteryDataset {
  return {
    schemaVersion: 1,
    modality: "megasena",
    source: "test",
    importedAt: new Date().toISOString(),
    latestContest,
    draws: contests.map((contest) => ({ contest, drawDate: "2026-01-01", numbers: [1, 2, 3, 4, 5, 6] })),
  };
}

describe("validateTargetContest", () => {
  const ds = dataset(3055, Array.from({ length: 3055 }, (_, i) => i + 1));

  it("accepts latestContest + 1 (the normal forward case)", () => {
    const result = validateTargetContest(3056, ds);
    expect(result.status).toBe("ok_next");
    expect(isTargetContestAllowed(result)).toBe(true);
  });

  it("accepts an existing historical contest", () => {
    const result = validateTargetContest(3055, ds);
    expect(result.status).toBe("ok_historical");
    expect(isTargetContestAllowed(result)).toBe(true);
    if (result.status === "ok_historical") {
      expect(result.draw.contest).toBe(3055);
    }
  });

  it("blocks a contest further than latestContest + 1, with dynamic latest/next values in the message", () => {
    const result = validateTargetContest(4090, ds);
    expect(result.status).toBe("blocked_future");
    expect(isTargetContestAllowed(result)).toBe(false);
    if (result.status === "blocked_future") {
      expect(result.message).toContain("3055");
      expect(result.message).toContain("3056");
    }
  });

  it("blocks a contest below latestContest that is missing from the dataset (a gap)", () => {
    const gappy = dataset(3055, [1, 2, 3, 4, 6]); // missing contest 5
    const result = validateTargetContest(5, gappy);
    expect(result.status).toBe("blocked_gap");
    expect(isTargetContestAllowed(result)).toBe(false);
  });

  it("rejects zero", () => {
    expect(validateTargetContest(0, ds).status).toBe("blocked_invalid");
  });

  it("rejects negative numbers", () => {
    expect(validateTargetContest(-5, ds).status).toBe("blocked_invalid");
  });

  it("rejects decimals", () => {
    expect(validateTargetContest(10.5, ds).status).toBe("blocked_invalid");
  });

  it("rejects NaN", () => {
    expect(validateTargetContest(Number.NaN, ds).status).toBe("blocked_invalid");
  });
});
