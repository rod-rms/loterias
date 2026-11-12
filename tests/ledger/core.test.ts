import { describe, expect, it } from "vitest";
import {
  CUTOFF_MARGIN_MINUTES,
  datasetHasNoGap,
  drawTimingFor,
  evaluateValidity,
  hitsPerTicket,
  ledgerSeed,
  normalizeTickets,
  scoreEntry,
  shardMonth,
  targetContestFor,
} from "../../scripts/ledger/core";
import { ledgerEntrySchema, type LedgerEntry } from "../../src/shared/lib/ledgerSchemas";
import { makeDataset } from "./helpers";

describe("ledger core — target and seed", () => {
  it("the target is always latest + 1", () => {
    expect(targetContestFor({ latestContest: 3826 })).toBe(3827);
  });

  it("the seed is deterministic and spelled exactly ledger:{modality}:{contest}:{strategyId}:{strategyVersion}", () => {
    expect(ledgerSeed("lotofacil", 3827, "lotofacil.rms_v2", "2.1.0")).toBe("ledger:lotofacil:3827:lotofacil.rms_v2:2.1.0");
    expect(ledgerSeed("megasena", 3085, "megasena.max_f4", "1.0.0")).toBe(ledgerSeed("megasena", 3085, "megasena.max_f4", "1.0.0"));
  });
});

describe("ledger core — validity cutoff in BRT", () => {
  it("weekday draw: ~21h BRT = 00:00Z next day; cutoff 60 min earlier (20h BRT = 23:00Z)", () => {
    // last draw Tue 2026-11-10 -> Lotofácil target is Wed 2026-11-11
    const ds = makeDataset("lotofacil", 3826, "2026-11-10");
    const t = drawTimingFor("lotofacil", 3827, ds)!;
    expect(t.estimatedDrawAt.toISOString()).toBe("2026-11-12T00:00:00.000Z");
    expect(t.cutoffAt.toISOString()).toBe("2026-11-11T23:00:00.000Z");
    expect(CUTOFF_MARGIN_MINUTES).toBe(60);
    const ok = (nowIso: string) => evaluateValidity({ dataset: ds, targetContest: 3827, now: new Date(nowIso), cutoffAt: t.cutoffAt });
    expect(ok("2026-11-11T22:59:59.000Z")).toEqual({ valid: true });
    expect(ok("2026-11-11T23:00:00.000Z")).toEqual({ valid: false, reason: "generated_after_cutoff" });
    expect(ok("2026-11-12T03:00:00.000Z")).toEqual({ valid: false, reason: "generated_after_cutoff" }); // a late generation is invalid
  });

  it("Sunday draw: ~11h BRT = 14:00Z; cutoff 10h BRT = 13:00Z", () => {
    // Lotofácil has no Saturday draw: after Fri 2026-11-13 the next one is Sun 2026-11-15
    const ds = makeDataset("lotofacil", 3830, "2026-11-13");
    const t = drawTimingFor("lotofacil", 3831, ds)!;
    expect(t.estimatedDrawAt.toISOString()).toBe("2026-11-15T14:00:00.000Z");
    expect(t.cutoffAt.toISOString()).toBe("2026-11-15T13:00:00.000Z");
    const v = (nowIso: string) => evaluateValidity({ dataset: ds, targetContest: 3831, now: new Date(nowIso), cutoffAt: t.cutoffAt });
    expect(v("2026-11-15T12:59:00.000Z").valid).toBe(true);
    expect(v("2026-11-15T13:01:00.000Z")).toEqual({ valid: false, reason: "generated_after_cutoff" });
    // Mega-Sena Sunday too (Thu 11/12 -> next Sun 11/15)
    const mega = makeDataset("megasena", 3084, "2026-11-12");
    expect(drawTimingFor("megasena", 3085, mega)!.estimatedDrawAt.toISOString()).toBe("2026-11-15T14:00:00.000Z");
  });

  it("the dataset must end at target-1 and have no gap, otherwise the entry is invalid", () => {
    const ds = makeDataset("lotofacil", 3826, "2026-11-10");
    const cutoffAt = new Date("2099-01-01T00:00:00Z");
    const now = new Date("2026-11-11T12:00:00Z");
    expect(evaluateValidity({ dataset: ds, targetContest: 3828, now, cutoffAt })).toEqual({ valid: false, reason: "dataset_latest_not_target_minus_1" });
    const gap = { ...ds, draws: ds.draws.filter((d) => d.contest !== 100) };
    expect(datasetHasNoGap(gap)).toBe(false);
    expect(evaluateValidity({ dataset: gap, targetContest: 3827, now, cutoffAt })).toEqual({ valid: false, reason: "dataset_has_gap" });
    expect(datasetHasNoGap(ds)).toBe(true);
  });

  it("the shard is the month of the target draw date", () => {
    expect(shardMonth(new Date("2026-11-12T00:00:00.000Z"))).toBe("2026-11");
    expect(shardMonth(new Date("2026-12-01T00:00:00.000Z"))).toBe("2026-12");
  });
});

describe("ledger core — scoring (hand-checked)", () => {
  const entry = (modality: "lotofacil" | "megasena", tickets: number[][], valid = true): LedgerEntry => ({
    ledgerSchemaVersion: 1,
    modality,
    targetContest: 10,
    strategyId: `${modality}.s1`,
    strategyVersion: "1.0.0",
    algorithmVersion: "a",
    seed: "s",
    qualityPreset: "balanced",
    tickets,
    generatedAt: "2026-11-11T12:00:00.000Z",
    datasetLatestContest: 9,
    datasetSha256: "0".repeat(64),
    estimatedDrawAt: "2026-11-12T00:00:00.000Z",
    cutoffAt: "2026-11-11T23:00:00.000Z",
    valid,
    ...(valid ? {} : { invalidReason: "generated_after_cutoff" }),
    codeCommit: "abc",
  });
  const now = new Date("2026-11-13T00:00:00.000Z");

  it("Lotofácil: draw 1..15; tickets with 15, 11, 9, 0, 7, 12 hits", () => {
    const draw = Array.from({ length: 15 }, (_, i) => i + 1);
    const tickets = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // 15
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19], // 11
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21], // 9
      [16, 17, 18, 19, 20, 21, 22, 23, 24, 25], // 0 (only the counting rule is under test here)
      [1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23], // 7
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18], // 12
    ];
    expect(hitsPerTicket(tickets, draw)).toEqual([15, 11, 9, 0, 7, 12]);
  });

  it("scoreEntry: valid entry with its result -> hits, bestHits and a result hash; no result yet -> null; invalid -> status only", () => {
    const tickets = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21],
      [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 1, 2, 3, 4, 5].sort((a, b) => a - b),
      [1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18],
    ];
    const e = entry("lotofacil", tickets);
    const draw = { contest: 10, numbers: Array.from({ length: 15 }, (_, i) => i + 1) };
    const s = scoreEntry(e, draw, now)!;
    expect(s.hitsPerTicket).toEqual([15, 11, 9, 5, 7, 12]);
    expect(s.bestHits).toBe(15);
    expect(s.resultNumbersSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(scoreEntry(e, undefined, now)).toBeNull(); // result not in the dataset yet
    expect(scoreEntry(e, { contest: 11, numbers: draw.numbers }, now)).toBeNull(); // wrong contest
    const inv = scoreEntry(entry("lotofacil", tickets, false), draw, now)!;
    expect(inv).toMatchObject({ valid: false, invalidReason: "generated_after_cutoff" });
    expect(inv.hitsPerTicket).toBeUndefined();
  });

  it("Mega-Sena: draw 1,2,3,4,5,6; tickets with 6, 4, 3, 0, 1, 2 hits", () => {
    const tickets = [
      [1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 10, 11],
      [1, 2, 3, 20, 21, 22],
      [30, 31, 32, 33, 34, 35],
      [1, 40, 41, 42, 43, 44],
      [1, 2, 50, 51, 52, 53],
    ];
    const s = scoreEntry(entry("megasena", tickets), { contest: 10, numbers: [6, 5, 4, 3, 2, 1] }, now)!;
    expect(s.hitsPerTicket).toEqual([6, 4, 3, 0, 1, 2]);
    expect(s.bestHits).toBe(6);
    // the hash does not depend on the order the numbers come in
    expect(scoreEntry(entry("megasena", tickets), { contest: 10, numbers: [1, 2, 3, 4, 5, 6] }, now)!.resultNumbersSha256).toBe(s.resultNumbersSha256);
  });
});

describe("ledger schema", () => {
  const good = (): LedgerEntry => ({
    ledgerSchemaVersion: 1,
    modality: "megasena",
    targetContest: 3085,
    strategyId: "megasena.max_f4",
    strategyVersion: "1.0.0",
    algorithmVersion: "a",
    seed: "s",
    qualityPreset: "balanced",
    tickets: normalizeTickets([[6, 5, 4, 3, 2, 1], [7, 8, 9, 10, 11, 12], [13, 14, 15, 16, 17, 18], [19, 20, 21, 22, 23, 24], [25, 26, 27, 28, 29, 30], [31, 32, 33, 34, 35, 36]]),
    generatedAt: "2026-11-11T12:00:00.000Z",
    datasetLatestContest: 3084,
    datasetSha256: "a".repeat(64),
    estimatedDrawAt: "2026-11-13T00:00:00.000Z",
    cutoffAt: "2026-11-12T23:00:00.000Z",
    valid: true,
    codeCommit: "abc",
  });

  it("accepts a well-formed entry", () => {
    expect(ledgerEntrySchema.safeParse(good()).success).toBe(true);
  });

  it.each([
    ["not 6 tickets", (e: LedgerEntry) => { e.tickets = e.tickets.slice(0, 5); }],
    ["wrong ticket size", (e: LedgerEntry) => { e.tickets[0] = [1, 2, 3, 4, 5]; }],
    ["duplicate numbers in a ticket", (e: LedgerEntry) => { e.tickets[0] = [1, 1, 2, 3, 4, 5]; }],
    ["out-of-range number", (e: LedgerEntry) => { e.tickets[0] = [1, 2, 3, 4, 5, 61]; }],
    ["unsorted ticket", (e: LedgerEntry) => { e.tickets[0] = [6, 5, 4, 3, 2, 1]; }],
    ["duplicate ticket", (e: LedgerEntry) => { e.tickets[1] = [...e.tickets[0]!]; }],
    ["invalid entry without a reason", (e: LedgerEntry) => { e.valid = false; }],
    ["valid entry with a reason", (e: LedgerEntry) => { e.invalidReason = "x"; }],
    ["bad timestamp", (e: LedgerEntry) => { e.generatedAt = "yesterday"; }],
    ["bad hash", (e: LedgerEntry) => { e.datasetSha256 = "xyz"; }],
  ])("rejects %s", (_name, mutate) => {
    const e = good();
    mutate(e);
    expect(ledgerEntrySchema.safeParse(e).success).toBe(false);
  });
});
