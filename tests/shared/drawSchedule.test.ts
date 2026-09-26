import { describe, expect, it } from "vitest";
import { estimateDrawDate, formatEstimatedDraw, formatShortDatePtBR } from "../../src/shared/lib/drawSchedule";
import type { LotteryDataset, Modality } from "../../src/shared/types";

function ds(modality: Modality, latestContest: number, drawDate: string): LotteryDataset {
  return { schemaVersion: 1, modality, source: "test", importedAt: "2026-09-25T00:00:00.000Z", latestContest, draws: [{ contest: latestContest, drawDate, numbers: [1, 2, 3, 4, 5, 6] }] };
}
const day = (e: ReturnType<typeof estimateDrawDate>) => e && `${e.isoDate} ${e.weekdayName} ${e.approxHour}`;

describe("estimateDrawDate — Lotofácil (every day except Saturday)", () => {
  const lf = ds("lotofacil", 100, "2026-09-25"); // Friday

  it("returns null for a contest already in the dataset (the real date must be used instead)", () => {
    expect(estimateDrawDate("lotofacil", 100, lf)).toBeNull();
    expect(estimateDrawDate("lotofacil", 99, lf)).toBeNull();
  });
  it("skips Saturday and uses the Sunday-morning slot", () => {
    expect(day(estimateDrawDate("lotofacil", 101, lf))).toBe("2026-09-27 domingo 11h");
  });
  it("weekday draws are at night (~21h)", () => {
    expect(day(estimateDrawDate("lotofacil", 102, lf))).toBe("2026-09-28 segunda-feira 21h");
  });
  it("walks across several weeks (7 and 14 draws ahead)", () => {
    expect(day(estimateDrawDate("lotofacil", 107, lf))).toBe("2026-10-04 domingo 11h");
    const far = estimateDrawDate("lotofacil", 114, lf)!;
    expect(day(far)).toBe("2026-10-12 segunda-feira 21h");
    expect(far.drawsAhead).toBe(14);
  });
  it("never lands on a Saturday", () => {
    for (let c = 101; c < 160; c += 1) expect(estimateDrawDate("lotofacil", c, lf)!.weekday).not.toBe(6);
  });
});

describe("estimateDrawDate — Mega-Sena (Tuesday, Thursday, Sunday)", () => {
  const mega = ds("megasena", 50, "2026-09-24"); // Thursday

  it("next draw after a Thursday is Sunday morning", () => {
    expect(day(estimateDrawDate("megasena", 51, mega))).toBe("2026-09-27 domingo 11h");
  });
  it("then Tuesday and Thursday at night", () => {
    expect(day(estimateDrawDate("megasena", 52, mega))).toBe("2026-09-29 terça-feira 21h");
    expect(day(estimateDrawDate("megasena", 53, mega))).toBe("2026-10-01 quinta-feira 21h");
  });
  it("crosses several weeks (10 draws ahead)", () => {
    expect(day(estimateDrawDate("megasena", 60, mega))).toBe("2026-10-18 domingo 11h");
  });
  it("only ever lands on Tue/Thu/Sun", () => {
    for (let c = 51; c < 100; c += 1) expect([0, 2, 4]).toContain(estimateDrawDate("megasena", c, mega)!.weekday);
  });
  it("handles month/year boundaries without timezone drift", () => {
    const eoy = ds("megasena", 10, "2026-12-31"); // Thursday
    expect(day(estimateDrawDate("megasena", 11, eoy))).toBe("2027-01-03 domingo 11h");
  });
});

describe("formatting", () => {
  it("formats the short date and the full label", () => {
    expect(formatShortDatePtBR("2026-09-28")).toBe("28/09/26");
    const e = estimateDrawDate("lotofacil", 101, ds("lotofacil", 100, "2026-09-25"))!;
    expect(formatEstimatedDraw(e)).toBe("Sorteio estimado: 27/09/26 · domingo · 11h");
  });
});
