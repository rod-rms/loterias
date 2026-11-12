// @vitest-environment node
import { cpSync, existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runLedger, type RunOptions } from "../../scripts/ledger/run";
import { validateLedger } from "../../scripts/ledger/validate";
import { ledgerEntriesFileSchema, ledgerScoresFileSchema } from "../../src/shared/lib/ledgerSchemas";
import { fakeGenerator, fakeStrategies, makeDataset, tmpDataDir, writeData } from "./helpers";

// Lotofácil: last draw Tue 2026-11-10 (3826) -> target 3827 on Wed 11/11, cutoff 2026-11-11T23:00Z, shard 2026-11.
// Mega-Sena: last draw Tue 2026-11-10 (3084) -> target 3085 on Thu 11/12, cutoff 2026-11-12T23:00Z, shard 2026-11.
const BEFORE_CUTOFF = new Date("2026-11-11T12:00:00.000Z");
const LF_AFTER_CUTOFF = new Date("2026-11-11T23:30:00.000Z");

let dir: string;
const baseOpts = (over: Partial<RunOptions> = {}): RunOptions => ({
  dataDir: dir,
  now: BEFORE_CUTOFF,
  dryRun: false,
  codeCommit: "deadbeef",
  strategiesFor: (m) => fakeStrategies(m),
  generate: { lotofacil: fakeGenerator("lotofacil"), megasena: fakeGenerator("megasena") },
  fetchOfficialLatest: async () => null,
  ...over,
});
const readEntries = (m: "lotofacil" | "megasena") => ledgerEntriesFileSchema.parse(JSON.parse(readFileSync(path.join(dir, "ledger", m, "entries-2026-11.json"), "utf8")));
const snapshotLedger = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const root = path.join(dir, "ledger");
  if (!existsSync(root)) return out;
  for (const m of readdirSync(root)) for (const f of readdirSync(path.join(root, m))) out[`${m}/${f}`] = readFileSync(path.join(root, m, f), "utf8");
  return out;
};

beforeEach(() => {
  dir = tmpDataDir();
  writeData(dir, { lotofacil: makeDataset("lotofacil", 3826, "2026-11-10"), megasena: makeDataset("megasena", 3084, "2026-11-10") });
});

describe("ledger runner — generation", () => {
  it("creates 5 strategies x 6 tickets per modality for latest+1, valid, with the full audit trail", async () => {
    const report = await runLedger(baseOpts());
    expect(report.modalities.map((m) => [m.modality, m.targetContest, m.created.length])).toEqual([["lotofacil", 3827, 5], ["megasena", 3085, 5]]);
    for (const [modality, target, latest] of [["lotofacil", 3827, 3826], ["megasena", 3085, 3084]] as const) {
      const { entries } = readEntries(modality);
      expect(entries).toHaveLength(5);
      for (const e of entries) {
        expect(e).toMatchObject({ modality, targetContest: target, datasetLatestContest: latest, valid: true, qualityPreset: "balanced", codeCommit: "deadbeef", algorithmVersion: "test-algo-1" });
        expect(e.tickets).toHaveLength(6);
        expect(e.seed).toBe(`ledger:${modality}:${target}:${e.strategyId}:${e.strategyVersion}`);
        expect(Date.parse(e.generatedAt)).toBeLessThan(Date.parse(e.cutoffAt));
        expect(e.datasetSha256).toMatch(/^[0-9a-f]{64}$/);
      }
    }
    expect(validateLedger({ ledgerDir: path.join(dir, "ledger") }).errors).toEqual([]);
  });

  it("is idempotent: a second run writes nothing and the files stay byte-identical", async () => {
    await runLedger(baseOpts());
    const before = snapshotLedger();
    const second = await runLedger(baseOpts({ now: new Date("2026-11-11T13:00:00.000Z") }));
    expect(second.wrote).toEqual([]);
    expect(second.modalities.every((m) => m.created.length === 0 && m.skippedExisting.length === 5)).toBe(true);
    expect(snapshotLedger()).toEqual(before);
  });

  it("never generates for a contest that already has a result (target present in the data)", async () => {
    // an inconsistent dataset whose draws already contain latest+1
    const ds = makeDataset("lotofacil", 3827, "2026-11-11");
    writeData(dir, { lotofacil: { ...ds, latestContest: 3826 }, megasena: makeDataset("megasena", 3084, "2026-11-10") });
    const report = await runLedger(baseOpts());
    expect(report.modalities[0]!.status).toBe("skipped-target-has-result");
    expect(existsSync(path.join(dir, "ledger", "lotofacil"))).toBe(false);
    expect(report.modalities[1]!.created).toHaveLength(5);
  });

  it("the live guard: an official source already at the target means no entry at all; a failing guard never fails the run", async () => {
    const guarded = await runLedger(baseOpts({ fetchOfficialLatest: async (m) => (m === "lotofacil" ? 3827 : null) }));
    expect(guarded.modalities[0]!.status).toBe("skipped-already-published");
    expect(existsSync(path.join(dir, "ledger", "lotofacil"))).toBe(false);
    expect(guarded.modalities[1]!.created).toHaveLength(5);

    const throwing = await runLedger(baseOpts({ dryRun: true, fetchOfficialLatest: async () => { throw new Error("network down"); } }));
    expect(throwing.modalities[0]!.status).toBe("generated"); // Lotofácil was skipped before, now generated in the dry run
    expect(throwing.modalities[0]!.created).toHaveLength(5);
  });

  it("a late generation (after the BRT cutoff) is stored as invalid with a reason, never as valid", async () => {
    const report = await runLedger(baseOpts({ now: LF_AFTER_CUTOFF }));
    const lf = readEntries("lotofacil").entries;
    expect(lf).toHaveLength(5);
    expect(lf.every((e) => !e.valid && e.invalidReason === "generated_after_cutoff")).toBe(true);
    expect(report.modalities[0]!.created).toEqual([]);
    expect(report.modalities[0]!.invalid).toHaveLength(5);
    expect(readEntries("megasena").entries.every((e) => e.valid)).toBe(true); // Mega cutoff is a day later
  });

  it("--dry-run reports but writes nothing", async () => {
    const lines: string[] = [];
    const report = await runLedger(baseOpts({ dryRun: true, log: (l) => lines.push(l) }));
    expect(report.dryRun).toBe(true);
    expect(report.wrote).toEqual([]);
    expect(existsSync(path.join(dir, "ledger"))).toBe(false);
    expect(lines.some((l) => l.includes("[dry-run] would write"))).toBe(true);
    expect(report.modalities.map((m) => m.created.length)).toEqual([5, 5]);
  });

  it("fails clearly (no partial garbage) when the registry does not provide exactly 5 strategies", async () => {
    const report = await runLedger(baseOpts({ strategiesFor: (m) => fakeStrategies(m, 4) }));
    expect(report.modalities.every((m) => m.status === "error")).toBe(true);
    expect(existsSync(path.join(dir, "ledger"))).toBe(false);
  });

  it("a strategy that throws is reported, the other four are still stored, and the next run fills only the missing one", async () => {
    const lf = fakeGenerator("lotofacil");
    let fail = true;
    const flaky = async (r: Parameters<typeof lf>[0]) => {
      if (fail && r.strategyId === "lotofacil.s3") throw new Error("boom");
      return lf(r);
    };
    const first = await runLedger(baseOpts({ generate: { lotofacil: flaky, megasena: fakeGenerator("megasena") } }));
    expect(first.modalities[0]!.status).toBe("error");
    expect(first.modalities[0]!.errors[0]).toContain("lotofacil.s3: boom");
    expect(readEntries("lotofacil").entries).toHaveLength(4);
    fail = false;
    const second = await runLedger(baseOpts({ generate: { lotofacil: flaky, megasena: fakeGenerator("megasena") } }));
    expect(second.modalities[0]!.created).toEqual(["lotofacil.s3"]);
    expect(readEntries("lotofacil").entries).toHaveLength(5);
  });
});

describe("ledger runner — append-only and scoring", () => {
  it("existing entries stay byte-identical when new entries are appended for the next draw", async () => {
    await runLedger(baseOpts());
    const lfBefore = readFileSync(path.join(dir, "ledger", "lotofacil", "entries-2026-11.json"), "utf8");
    const firstEntries = readEntries("lotofacil").entries;
    // the draw happens and the next target appears
    writeData(dir, { lotofacil: makeDataset("lotofacil", 3827, "2026-11-11"), megasena: makeDataset("megasena", 3084, "2026-11-10") });
    await runLedger(baseOpts({ now: new Date("2026-11-12T12:00:00.000Z") }));
    const after = readEntries("lotofacil").entries;
    expect(after).toHaveLength(10);
    expect(after.slice(0, 5)).toEqual(firstEntries); // untouched, same order
    const afterText = readFileSync(path.join(dir, "ledger", "lotofacil", "entries-2026-11.json"), "utf8");
    // the previous text is a prefix of the new one up to the end of the old entries array (append only)
    const cut = lfBefore.lastIndexOf("\n  ]");
    expect(afterText.startsWith(lfBefore.slice(0, cut))).toBe(true);
    expect(validateLedger({ ledgerDir: path.join(dir, "ledger"), readBase: (rel) => (rel.endsWith("lotofacil/entries-2026-11.json") ? lfBefore : null) }).errors).toEqual([]);
  });

  it("scores valid entries once their result is in the dataset (and only then); invalid ones get a status record", async () => {
    await runLedger(baseOpts()); // valid 3827 / 3085 entries
    await runLedger(baseOpts({ now: LF_AFTER_CUTOFF, strategiesFor: (m) => fakeStrategies(m, 5) })); // idempotent, nothing new
    expect(existsSync(path.join(dir, "ledger", "lotofacil", "scores-2026-11.json"))).toBe(false); // nothing to score yet

    writeData(dir, { lotofacil: makeDataset("lotofacil", 3827, "2026-11-11"), megasena: makeDataset("megasena", 3084, "2026-11-10") });
    const report = await runLedger(baseOpts({ now: new Date("2026-11-12T12:00:00.000Z") }));
    expect(report.scored).toBe(5); // only Lotofácil 3827 has a result
    const scores = ledgerScoresFileSchema.parse(JSON.parse(readFileSync(path.join(dir, "ledger", "lotofacil", "scores-2026-11.json"), "utf8")));
    const s3827 = scores.scores.filter((s) => s.targetContest === 3827);
    expect(s3827).toHaveLength(5);
    const draw = makeDataset("lotofacil", 3827, "2026-11-11").draws.at(-1)!.numbers;
    const entry = readEntries("lotofacil").entries.find((e) => e.targetContest === 3827 && e.strategyId === "lotofacil.s1")!;
    const expectedHits = entry.tickets.map((t) => t.filter((n) => draw.includes(n)).length);
    expect(s3827.find((s) => s.strategyId === "lotofacil.s1")!.hitsPerTicket).toEqual(expectedHits);
    expect(existsSync(path.join(dir, "ledger", "megasena", "scores-2026-11.json"))).toBe(false); // Mega 3085 still unscored

    // running again does not re-score or duplicate
    const again = await runLedger(baseOpts({ now: new Date("2026-11-12T13:00:00.000Z") }));
    expect(again.scored).toBe(0);
    expect(validateLedger({ ledgerDir: path.join(dir, "ledger") }).errors).toEqual([]);
  });

  it("an invalid (late) entry is recorded once with status only and never scored", async () => {
    await runLedger(baseOpts({ now: LF_AFTER_CUTOFF }));
    writeData(dir, { lotofacil: makeDataset("lotofacil", 3827, "2026-11-11"), megasena: makeDataset("megasena", 3084, "2026-11-10") });
    const report = await runLedger(baseOpts({ now: new Date("2026-11-12T12:00:00.000Z") }));
    expect(report.scored).toBe(0);
    const scores = ledgerScoresFileSchema.parse(JSON.parse(readFileSync(path.join(dir, "ledger", "lotofacil", "scores-2026-11.json"), "utf8")));
    const rec = scores.scores.filter((s) => s.targetContest === 3827);
    expect(rec).toHaveLength(5);
    expect(rec.every((s) => !s.valid && s.hitsPerTicket === undefined && s.invalidReason === "generated_after_cutoff")).toBe(true);
  });
});

describe("ledger runner — runs on a copy of data in a temp directory", () => {
  it("does not touch the source data directory (only <dataDir>/ledger is ever written)", async () => {
    const copy = tmpDataDir();
    cpSync(dir, copy, { recursive: true });
    const beforeFiles = readFileSync(path.join(copy, "lotofacil", "results.json"), "utf8");
    await runLedger(baseOpts({ dataDir: copy }));
    expect(readFileSync(path.join(copy, "lotofacil", "results.json"), "utf8")).toBe(beforeFiles);
    expect(readdirSync(copy).sort()).toEqual(["ledger", "lotofacil", "megasena"]);
    expect(existsSync(path.join(dir, "ledger"))).toBe(false);
  });
});
