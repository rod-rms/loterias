import { describe, expect, it } from "vitest";
import {
  OVERDUE_BRT_UTC_OFFSET_HOURS,
  OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR,
  evaluateOverdue,
  overdueDeadline,
  parseBrDate,
} from "../../scripts/data/overdue.mjs";

/**
 * Pure overdue-draw logic used by the dataset updater (scripts/data/overdue.mjs). The updater only asks
 * CAIXA's "latest" endpoint, so "not published yet" and "up to date" look identical to it; this decides
 * when that silence is suspicious, from the next-draw date in the latest payload.
 */

const at = (iso: string) => new Date(iso);

describe("overdue draw — constants", () => {
  it("margin is the NEXT day at 14:00 BRT (BRT = UTC-3), a named tunable", () => {
    expect(OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR).toBe(14);
    expect(OVERDUE_BRT_UTC_OFFSET_HOURS).toBe(3);
  });
});

describe("parseBrDate", () => {
  it("accepts a strict DD/MM/YYYY calendar date", () => {
    expect(parseBrDate("18/10/2026")).toEqual({ y: 2026, m: 10, d: 18 });
    expect(parseBrDate(" 29/02/2028 ")).toEqual({ y: 2028, m: 2, d: 29 }); // leap day, trimmed
  });

  it.each([undefined, null, "", "garbage", "1/1/2026", "18-10-2026", "2026-10-18", "31/02/2026", "29/02/2027", "32/01/2026", "10/13/2026", "18/10/1999", "18/10/2101", 20261018, {}, []])(
    "rejects malformed or impossible input %j without throwing",
    (value) => {
      expect(parseBrDate(value)).toBeNull();
    },
  );
});

describe("overdueDeadline", () => {
  it("is the day AFTER the next draw date at 14:00 BRT = 17:00 UTC", () => {
    expect(overdueDeadline("18/10/2026")?.toISOString()).toBe("2026-10-19T17:00:00.000Z");
    expect(overdueDeadline("31/12/2026")?.toISOString()).toBe("2027-01-01T17:00:00.000Z"); // month/year rollover
  });

  it("is null for a missing or malformed date", () => {
    expect(overdueDeadline(undefined)).toBeNull();
    expect(overdueDeadline("nope")).toBeNull();
  });
});

describe("evaluateOverdue", () => {
  const base = { nextDrawDateBr: "18/10/2026", storedLatest: 3806, officialLatest: 3806 };

  it("before the margin: not overdue", () => {
    const r = evaluateOverdue({ ...base, now: at("2026-10-19T16:59:59.000Z") });
    expect(r).toMatchObject({ overdue: false, reason: "before-deadline" });
  });

  it("exactly at the margin: not yet overdue (strictly later is required)", () => {
    expect(evaluateOverdue({ ...base, now: at("2026-10-19T17:00:00.000Z") }).overdue).toBe(false);
    expect(evaluateOverdue({ ...base, now: at("2026-10-19T17:00:01.000Z") }).overdue).toBe(true);
  });

  it("after the margin with no advance: overdue", () => {
    const r = evaluateOverdue({ ...base, now: at("2026-10-19T19:00:00.000Z") });
    expect(r).toMatchObject({ overdue: true, reason: "overdue" });
    expect(r.deadline?.toISOString()).toBe("2026-10-19T17:00:00.000Z");
  });

  it("after the margin but the latest contest HAS advanced: not overdue (new data is about to be committed)", () => {
    const r = evaluateOverdue({ ...base, officialLatest: 3807, now: at("2026-10-19T19:00:00.000Z") });
    expect(r).toMatchObject({ overdue: false, reason: "advanced" });
  });

  it("an official latest OLDER than the stored one counts as 'not advanced'", () => {
    expect(evaluateOverdue({ ...base, storedLatest: 3807, officialLatest: 3806, now: at("2026-10-19T19:00:00.000Z") }).overdue).toBe(true);
  });

  it("a far-future next-draw date (holiday/calendar exception) never alerts early", () => {
    const r = evaluateOverdue({ ...base, nextDrawDateBr: "25/12/2026", now: at("2026-10-20T12:00:00.000Z") });
    expect(r).toMatchObject({ overdue: false, reason: "before-deadline" });
  });

  it.each([undefined, null, "", "garbage", "32/13/2026", "18/10/1999"])("missing/malformed next-draw date %j: no alert, no crash", (nextDrawDateBr) => {
    const r = evaluateOverdue({ ...base, nextDrawDateBr, now: at("2030-01-01T00:00:00.000Z") });
    expect(r).toMatchObject({ overdue: false, reason: "no-next-draw-date", deadline: null });
  });

  it("invalid now or non-numeric contests: no alert, no crash", () => {
    expect(evaluateOverdue({ ...base, now: new Date("not a date") }).reason).toBe("invalid-input");
    expect(evaluateOverdue({ ...base, now: at("2026-10-19T19:00:00.000Z"), storedLatest: Number.NaN }).reason).toBe("invalid-input");
    expect(evaluateOverdue({ ...base, now: at("2026-10-19T19:00:00.000Z"), officialLatest: Number.POSITIVE_INFINITY }).reason).toBe("invalid-input");
    // @ts-expect-error deliberately wrong type: must not throw
    expect(evaluateOverdue({ ...base, now: "2026-10-19" }).overdue).toBe(false);
  });

  it("replays the 2026-10-18 incident: silent at 22:01 BRT, flagged by the Monday 16:00 BRT follow-up, clean once 3807 is stored", () => {
    // The Lotofácil payload for 3806 said the next draw was 18/10/2026 (Sunday).
    const stale = { nextDrawDateBr: "18/10/2026", storedLatest: 3806, officialLatest: 3806 };
    expect(evaluateOverdue({ ...stale, now: at("2026-10-19T01:01:49.000Z") }).overdue).toBe(false); // the third scheduled run (22:01 BRT Sunday)
    expect(evaluateOverdue({ ...stale, now: at("2026-10-19T15:00:00.000Z") }).overdue).toBe(false); // Monday 12:00 BRT follow-up: still inside the margin
    expect(evaluateOverdue({ ...stale, now: at("2026-10-19T19:00:00.000Z") }).overdue).toBe(true); // Monday 16:00 BRT follow-up
    expect(evaluateOverdue({ nextDrawDateBr: "19/10/2026", storedLatest: 3807, officialLatest: 3807, now: at("2026-10-19T19:03:15.000Z") }).overdue).toBe(false); // after catch-up
  });
});
