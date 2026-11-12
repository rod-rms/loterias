// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BACKTEST_MIN_TARGET_CONTEST, backtestFileSchema } from "../../src/shared/lib/backtestSchemas";
import { clearDatasetCache } from "../../src/shared/lib/dataLoaders";
import { generateLotofacilPortfolio } from "../../src/modules/lotofacil/strategies/adapters";
import { generateMegaSenaPortfolioRequest } from "../../src/modules/megasena/strategies/adapters";
import { LOTOFACIL_STRATEGIES } from "../../src/modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../src/modules/megasena/strategies/definitions";
import type { GeneratePortfolioRequest, LotteryDataset, Modality } from "../../src/shared/types";
import { backtestSeed, datasetView, runBacktest, serializeBacktest, timeSample, type Generator } from "../../scripts/backtest/engine";
import { validateBacktest } from "../../scripts/backtest/validate";
import { makeDataset } from "../ledger/helpers";

const SIZE = { lotofacil: { size: 15, max: 25 }, megasena: { size: 6, max: 60 } } as const;
const SHA = "a".repeat(64);
const STRATS = ["x.a", "x.b", "x.c", "x.d", "x.e"].map((id) => ({ id, version: "1.0.0" }));
const tmp = () => mkdtempSync(path.join(tmpdir(), "backtest-test-"));
const now = () => new Date("2026-11-12T12:00:00.000Z");

/** Deterministic fake generator: tickets depend on the seed only; records the dataset view each call could see. */
function fakeGenerator(modality: Modality, seen?: { target: number; view: LotteryDataset | null }[], getView?: () => LotteryDataset | null): Generator {
  return async (req: GeneratePortfolioRequest) => {
    seen?.push({ target: req.contest!, view: getView?.() ?? null });
    const { size, max } = SIZE[modality];
    let h = 0;
    for (const ch of String(req.seed ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const tickets = Array.from({ length: 6 }, (_, j) => {
      const set = new Set<number>();
      for (let k = 0; k < size; k += 1) set.add(((h + j * 5 + k * 7) % max) + 1);
      return [...set].sort((a, b) => a - b);
    });
    return { strategyVersion: "1.0.0", tickets, audit: { algorithmVersion: "fake-1" } } as never;
  };
}

function baseOpts(modality: Modality, outDir: string, extra: Partial<Parameters<typeof runBacktest>[0]> = {}) {
  const dataset = makeDataset(modality, 120, "2026-11-10");
  let current: LotteryDataset | null = null;
  return {
    current: () => current,
    opts: {
      modality,
      dataset,
      datasetSha256: SHA,
      from: 60,
      to: 71,
      strategies: STRATS,
      setView: (v: LotteryDataset) => {
        current = v;
      },
      generate: fakeGenerator(modality),
      outDir,
      dryRun: false,
      codeCommit: "testcommit",
      now,
      chunkSize: 5,
      ...extra,
    } as Parameters<typeof runBacktest>[0],
  };
}

describe("backtest engine", () => {
  it("gives each simulated contest a view with only draws < T (latestContest = T - 1)", async () => {
    const seen: { target: number; view: LotteryDataset | null }[] = [];
    const dir = tmp();
    const { opts, current } = baseOpts("megasena", dir);
    opts.generate = fakeGenerator("megasena", seen, current);
    await runBacktest(opts);
    expect(seen).toHaveLength(12 * 5);
    for (const s of seen) {
      expect(s.view!.latestContest).toBe(s.target - 1);
      expect(Math.max(...s.view!.draws.map((d) => d.contest))).toBe(s.target - 1);
      expect(s.view!.draws.some((d) => d.contest >= s.target)).toBe(false);
    }
  });

  it("scores by hand-checked hits (Lotofácil and Mega-Sena) through checkResult", async () => {
    for (const modality of ["lotofacil", "megasena"] as const) {
      const dir = tmp();
      const { opts } = baseOpts(modality, dir, { from: 60, to: 60 });
      const draw = opts.dataset.draws.find((d) => d.contest === 60)!;
      const { size } = SIZE[modality];
      // t0 = the draw itself (all hits); t1 = none of the drawn numbers where possible; t2 = exactly 2 hits.
      const outside = Array.from({ length: SIZE[modality].max }, (_, i) => i + 1).filter((n) => !draw.numbers.includes(n));
      const t0 = [...draw.numbers];
      const t1 = (outside.length >= size ? outside.slice(0, size) : [...outside, ...draw.numbers].slice(0, size)).sort((a, b) => a - b);
      const k2 = Math.max(2, size - outside.length); // Lotofácil: at most 10 numbers lie outside a 15-number draw
      const t2 = [...draw.numbers.slice(0, k2), ...outside.slice(0, size - k2)].sort((a, b) => a - b);
      const expectedT1 = t1.filter((n) => draw.numbers.includes(n)).length;
      const gen: Generator = async () => ({ strategyVersion: "1.0.0", tickets: [t0, t1, t2, t0, t1, t2], audit: { algorithmVersion: "fake-1" } }) as never;
      await runBacktest({ ...opts, generate: gen });
      const file = backtestFileSchema.parse(JSON.parse(readFileSync(path.join(dir, "backtest.json"), "utf8")));
      expect(file.rows).toHaveLength(5);
      for (const row of file.rows) {
        expect(row.hitsPerTicket).toEqual([size, expectedT1, k2, size, expectedT1, k2]);
        expect(row.bestHits).toBe(size);
      }
    }
  });

  it("is deterministic: identical inputs give a byte-identical artifact", async () => {
    const a = tmp();
    const b = tmp();
    await runBacktest(baseOpts("lotofacil", a).opts);
    await runBacktest(baseOpts("lotofacil", b).opts);
    expect(readFileSync(path.join(a, "backtest.json"), "utf8")).toBe(readFileSync(path.join(b, "backtest.json"), "utf8"));
  });

  it("is resumable: interrupt after a chunk, resume, and the final file is identical to an uninterrupted run", async () => {
    const full = tmp();
    await runBacktest(baseOpts("megasena", full).opts);
    const dir = tmp();
    const first = await runBacktest(baseOpts("megasena", dir, { maxChunks: 1 }).opts);
    expect(first.complete).toBe(false);
    expect(first.contestsDone).toBe(5);
    expect(existsSync(path.join(dir, "backtest.partial.json"))).toBe(true);
    expect(existsSync(path.join(dir, "backtest.json"))).toBe(false);
    const calls: number[] = [];
    const resumed = baseOpts("megasena", dir);
    const inner = resumed.opts.generate;
    resumed.opts.generate = async (r) => {
      calls.push(r.contest!);
      return inner(r);
    };
    const second = await runBacktest(resumed.opts);
    expect(second.complete).toBe(true);
    expect(second.resumedFrom).toBe(5);
    expect(Math.min(...calls)).toBe(65); // contests 60..64 were not redone
    expect(readFileSync(path.join(dir, "backtest.json"), "utf8")).toBe(readFileSync(path.join(full, "backtest.json"), "utf8"));
    expect(existsSync(path.join(dir, "backtest.partial.json"))).toBe(false);
  });

  it("a partial file from a different run (other range) is ignored", async () => {
    const dir = tmp();
    await runBacktest(baseOpts("megasena", dir, { maxChunks: 1 }).opts);
    const res = await runBacktest(baseOpts("megasena", dir, { to: 75 }).opts);
    expect(res.resumedFrom).toBe(0);
    expect(res.contestsDone).toBe(16);
  });

  it("--dry-run writes nothing", async () => {
    const dir = path.join(tmp(), "never-created");
    const res = await runBacktest(baseOpts("lotofacil", dir, { dryRun: true }).opts);
    expect(res.complete).toBe(true);
    expect(res.wrote).toEqual([]);
    expect(existsSync(dir)).toBe(false);
  });

  it("refuses windows without the required history or beyond the dataset", async () => {
    await expect(runBacktest(baseOpts("lotofacil", tmp(), { from: BACKTEST_MIN_TARGET_CONTEST - 1, to: 60 }).opts)).rejects.toThrow(/--from/);
    await expect(runBacktest(baseOpts("lotofacil", tmp(), { to: 121 }).opts)).rejects.toThrow(/beyond the dataset/);
  });

  it("timeSample times each strategy and writes nothing", async () => {
    let t = 0;
    const rows = await timeSample({ ...baseOpts("lotofacil", tmp()).opts, targets: [100, 101], clock: () => (t += 10) });
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.contests === 2 && r.meanMs === 10)).toBe(true);
  });

  it("uses the documented seed", () => {
    expect(backtestSeed("megasena", 3000, "megasena.max_f4", "1.2.3")).toBe("backtest:megasena:3000:megasena.max_f4:1.2.3");
  });
});

describe("backtest validator", () => {
  async function good(): Promise<{ root: string; file: Record<string, unknown> }> {
    const root = tmp();
    await runBacktest(baseOpts("lotofacil", path.join(root, "lotofacil")).opts);
    return { root, file: JSON.parse(readFileSync(path.join(root, "lotofacil", "backtest.json"), "utf8")) };
  }
  const rewrite = (root: string, file: unknown) => writeFileSync(path.join(root, "lotofacil", "backtest.json"), JSON.stringify(file));

  it("accepts a valid artifact, and an empty root", async () => {
    const { root } = await good();
    expect(validateBacktest(root)).toMatchObject({ ok: true, checked: ["lotofacil/backtest.json"] });
    expect(validateBacktest(tmp())).toMatchObject({ ok: true, checked: [] });
  });

  it.each([
    ["a missing row", (f: { rows: unknown[] }) => f.rows.splice(7, 1)],
    ["a duplicated row", (f: { rows: unknown[] }) => f.rows.push(f.rows[0])],
    ["more hits than the ticket size", (f: { rows: { hitsPerTicket: number[] }[] }) => (f.rows[0]!.hitsPerTicket[0] = 16)],
    ["a wrong bestHits", (f: { rows: { bestHits: number }[] }) => (f.rows[0]!.bestHits += 1)],
    ["a gap in the contests", (f: { rows: { contest: number }[]; range: { contestsCount: number } }) => {
      f.rows = f.rows.filter((r) => r.contest !== 65);
    }],
    ["a row of an unknown strategy", (f: { rows: { strategyId: string }[] }) => (f.rows[0]!.strategyId = "x.zzz")],
    ["a wrong contestsCount", (f: { range: { contestsCount: number } }) => (f.range.contestsCount = 3)],
  ])("rejects %s", async (_name, mutate) => {
    const { root, file } = await good();
    (mutate as (f: unknown) => void)(file);
    rewrite(root, file);
    expect(validateBacktest(root).ok).toBe(false);
  });

  it("serializes to a compact one-row-per-line file that still parses", async () => {
    const { file } = await good();
    const text = serializeBacktest(file as never);
    expect(text.split("\n").filter((l) => l.includes('"hitsPerTicket"'))).toHaveLength(60);
    expect(() => JSON.parse(text)).not.toThrow();
  });
});

describe("no-look-ahead with the REAL strategy code (mutation test)", () => {
  const config = readFileSync(path.join(process.cwd(), "public/data/config/game-config.json"), "utf8");
  const real = (m: Modality): LotteryDataset => {
    const d = JSON.parse(readFileSync(path.join(process.cwd(), `public/data/${m}/results.json`), "utf8")) as LotteryDataset;
    return { ...d, latestContest: 200, draws: d.draws.slice(0, 200) };
  };
  const realFetch = globalThis.fetch;
  let served = "";
  let servedModality: Modality = "lotofacil";
  beforeEach(() => {
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === "/data/config/game-config.json") return new Response(config);
      if (url === `/data/${servedModality}/results.json`) return new Response(served);
      return new Response("nf", { status: 404 });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    clearDatasetCache();
  });

  /** Runs the engine with the real adapters and returns the tickets every strategy produced, per contest. */
  async function ticketsFor(modality: Modality, source: LotteryDataset, ids: string[]): Promise<Record<string, number[][]>> {
    servedModality = modality;
    const all = modality === "lotofacil" ? LOTOFACIL_STRATEGIES : MEGASENA_STRATEGIES;
    const strategies = all.filter((s) => ids.includes(s.id)).map((s) => ({ id: s.id, version: s.version }));
    const adapter = (modality === "lotofacil" ? generateLotofacilPortfolio : generateMegaSenaPortfolioRequest) as Generator;
    const out: Record<string, number[][]> = {};
    const dir = tmp();
    await runBacktest({
      modality,
      dataset: source,
      datasetSha256: SHA,
      from: 120,
      to: 120,
      strategies,
      setView: (v) => {
        served = JSON.stringify(v);
        clearDatasetCache();
      },
      generate: async (req) => {
        const env = await adapter(req);
        out[`${req.contest}:${req.strategyId}`] = env.tickets as number[][];
        return env;
      },
      outDir: dir,
      dryRun: false,
      codeCommit: "t",
      now,
    });
    return out;
  }

  it.each([
    ["lotofacil", ["lotofacil.rms_v2", "lotofacil.max_diversification", "lotofacil.uniform_random"]],
    ["megasena", ["megasena.rolling_20_v2", "megasena.max_diversification", "megasena.uniform_random"]],
  ] as const)("%s: mutating or deleting every draw >= T leaves the generated tickets byte-identical", async (modality, ids) => {
    const source = real(modality);
    const baseline = await ticketsFor(modality, source, [...ids]);
    expect(Object.keys(baseline)).toHaveLength(ids.length);

    // Rewrite the results of the scored contests (120) with a different valid draw and delete every later draw
    // (121..200): everything at or after T changes, nothing before it.
    const other = Array.from({ length: SIZE[modality].size }, (_, i) => i + 1);
    const mutated: LotteryDataset = {
      ...source,
      latestContest: 120,
      draws: source.draws.filter((d) => d.contest <= 120).map((d) => (d.contest >= 120 ? { ...d, numbers: other } : d)),
    };
    const afterMutation = await ticketsFor(modality, mutated, [...ids]);
    expect(JSON.stringify(afterMutation)).toBe(JSON.stringify(baseline));

    // Deleting the history that is not strictly before T must not matter either: truncate the source at T.
    const view = datasetView(source, 120);
    expect(view.latestContest).toBe(119);
    expect(view.draws.every((d) => d.contest < 120)).toBe(true);
  }, 30_000);
});
