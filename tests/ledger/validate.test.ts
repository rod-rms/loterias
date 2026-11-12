// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateLedger } from "../../scripts/ledger/validate";
import type { LedgerEntry } from "../../src/shared/lib/ledgerSchemas";

const entry = (strategyId: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ledgerSchemaVersion: 1,
  modality: "megasena",
  targetContest: 3085,
  strategyId,
  strategyVersion: "1.0.0",
  algorithmVersion: "a",
  seed: `ledger:megasena:3085:${strategyId}:1.0.0`,
  qualityPreset: "balanced",
  tickets: [[1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12], [13, 14, 15, 16, 17, 18], [19, 20, 21, 22, 23, 24], [25, 26, 27, 28, 29, 30], [31, 32, 33, 34, 35, 36]],
  generatedAt: "2026-11-11T12:00:00.000Z",
  datasetLatestContest: 3084,
  datasetSha256: "a".repeat(64),
  estimatedDrawAt: "2026-11-13T00:00:00.000Z",
  cutoffAt: "2026-11-12T23:00:00.000Z",
  valid: true,
  codeCommit: "abc",
  ...over,
});

function ledgerWith(entries: LedgerEntry[], extra: Record<string, unknown> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "ledger-val-"));
  mkdirSync(path.join(dir, "megasena"), { recursive: true });
  const file = { ledgerSchemaVersion: 1, modality: "megasena", month: "2026-11", entries, ...extra };
  writeFileSync(path.join(dir, "megasena", "entries-2026-11.json"), JSON.stringify(file, null, 2) + "\n");
  return { dir, text: JSON.stringify(file, null, 2) + "\n" };
}

describe("ledger:validate", () => {
  it("accepts a clean ledger and reports the counts", () => {
    const { dir } = ledgerWith([entry("megasena.a"), entry("megasena.b")]);
    expect(validateLedger({ ledgerDir: dir })).toMatchObject({ errors: [], entries: 2 });
  });

  it("flags schema problems (malformed ticket) and duplicates of (modality, target, strategy)", () => {
    const bad = entry("megasena.a");
    bad.tickets[0] = [1, 2, 3];
    expect(validateLedger({ ledgerDir: ledgerWith([bad]).dir }).errors.join("\n")).toMatch(/ticket must have 6 numbers/);
    const dup = ledgerWith([entry("megasena.a"), entry("megasena.a")]);
    expect(validateLedger({ ledgerDir: dup.dir }).errors.join("\n")).toMatch(/duplicate entry megasena:3085:megasena\.a/);
  });

  it("flags inconsistent validity (valid entry generated after its cutoff / dataset not at target-1)", () => {
    const late = ledgerWith([entry("megasena.a", { generatedAt: "2026-11-12T23:30:00.000Z" })]);
    expect(validateLedger({ ledgerDir: late.dir }).errors.join("\n")).toMatch(/at\/after its cutoff/);
    const stale = ledgerWith([entry("megasena.a", { datasetLatestContest: 3080 })]);
    expect(validateLedger({ ledgerDir: stale.dir }).errors.join("\n")).toMatch(/datasetLatestContest 3080 != target-1/);
  });

  it("append-only: adding entries passes; editing, reordering or removing an existing one fails", () => {
    const base = ledgerWith([entry("megasena.a"), entry("megasena.b")]);
    const asBase = (rel: string) => (rel.endsWith("megasena/entries-2026-11.json") ? base.text : null);

    const appended = ledgerWith([entry("megasena.a"), entry("megasena.b"), entry("megasena.c")]);
    expect(validateLedger({ ledgerDir: appended.dir, readBase: asBase }).errors).toEqual([]);

    const edited = entry("megasena.a");
    edited.tickets[0] = [2, 3, 4, 5, 6, 7];
    expect(validateLedger({ ledgerDir: ledgerWith([edited, entry("megasena.b")]).dir, readBase: asBase }).errors.join("\n")).toMatch(/entry #0 .* was modified or reordered/);

    expect(validateLedger({ ledgerDir: ledgerWith([entry("megasena.b"), entry("megasena.a")]).dir, readBase: asBase }).errors.join("\n")).toMatch(/modified or reordered/);

    expect(validateLedger({ ledgerDir: ledgerWith([entry("megasena.a")]).dir, readBase: asBase }).errors.join("\n")).toMatch(/entries were removed \(2 -> 1\)/);
  });

  it("a new shard (absent at the base) and a missing baseline are not errors", () => {
    const { dir } = ledgerWith([entry("megasena.a")]);
    expect(validateLedger({ ledgerDir: dir, readBase: () => null }).errors).toEqual([]);
    const r = validateLedger({ ledgerDir: dir });
    expect(r.errors).toEqual([]);
    expect(r.notes.join(" ")).toMatch(/append-only check skipped/);
  });

  it("flags scores that do not match an entry, and leftover temp files", () => {
    const { dir } = ledgerWith([entry("megasena.a")]);
    writeFileSync(
      path.join(dir, "megasena", "scores-2026-11.json"),
      JSON.stringify({ ledgerSchemaVersion: 1, modality: "megasena", month: "2026-11", scores: [{ targetContest: 9999, strategyId: "megasena.zzz", strategyVersion: "1.0.0", valid: true, hitsPerTicket: [0, 0, 0, 0, 0, 0], bestHits: 0, scoredAt: "2026-11-14T00:00:00.000Z", resultNumbersSha256: "b".repeat(64) }] }),
    );
    writeFileSync(path.join(dir, "megasena", "entries-2026-11.json.tmp-123"), "{}");
    const errors = validateLedger({ ledgerDir: dir }).errors.join("\n");
    expect(errors).toMatch(/has no matching entry/);
    expect(errors).toMatch(/leftover temporary file/);
  });
});
