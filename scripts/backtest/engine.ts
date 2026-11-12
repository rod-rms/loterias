/**
 * Offline backtest engine (ANL-002). For each past contest T it gives every strategy a dataset view that contains only
 * draws with contest < T (latestContest = T - 1), calls the SAME generation functions the UI/ledger use (registry
 * definitions + adapters; injected here), and scores the tickets against the real draw with
 * src/shared/lib/checkResult.ts. Tickets are not stored: the run is reproducible from code + seed.
 * Side effects (view switching, generation, clock, files) are injected so it is unit-testable.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkTicketsAgainstDraw } from "../../src/shared/lib/checkResult";
import {
  BACKTEST_CAVEATS,
  BACKTEST_MIN_TARGET_CONTEST,
  BACKTEST_SCHEMA_VERSION,
  BACKTEST_SEED_TEMPLATE,
  BACKTEST_TICKETS_PER_STRATEGY,
  TICKET_SIZE,
  backtestFileSchema,
  type BacktestFile,
  type BacktestRow,
} from "../../src/shared/lib/backtestSchemas";
import type { GeneratePortfolioRequest, LotteryDataset, Modality, PortfolioEnvelope } from "../../src/shared/types";

export type Generator = (request: GeneratePortfolioRequest) => Promise<PortfolioEnvelope<unknown, { algorithmVersion?: string }>>;

export interface StrategyRef {
  id: string;
  version: string;
}

export const backtestSeed = (modality: Modality, contest: number, strategyId: string, strategyVersion: string): string =>
  `backtest:${modality}:${contest}:${strategyId}:${strategyVersion}`;

/** The ONLY data a strategy sees when simulating contest `target`: draws strictly before it. */
export function datasetView(dataset: LotteryDataset, target: number): LotteryDataset {
  return { ...dataset, latestContest: target - 1, draws: dataset.draws.filter((d) => d.contest < target) };
}

export interface BacktestOptions {
  modality: Modality;
  dataset: LotteryDataset;
  datasetSha256: string;
  from: number;
  to: number;
  strategies: StrategyRef[];
  /** Makes `view` the dataset every strategy will load from now on. */
  setView: (view: LotteryDataset) => void;
  generate: Generator;
  /** Directory of the artifact: `backtest.json` (final) and `backtest.partial.json` (resume state). */
  outDir: string;
  dryRun: boolean;
  codeCommit: string;
  now: () => Date;
  chunkSize?: number;
  /** Test hook: stop after this many chunks (simulates an interruption). */
  maxChunks?: number;
  log?: (line: string) => void;
}

export interface BacktestResult {
  complete: boolean;
  rows: number;
  contestsDone: number;
  resumedFrom: number;
  wrote: string[];
}

const finalPath = (dir: string) => path.join(dir, "backtest.json");
const partialPath = (dir: string) => path.join(dir, "backtest.partial.json");

/** Deterministic id: same modality, range and dataset => same id. */
export const runIdFor = (modality: Modality, from: number, to: number, datasetSha256: string): string => `bt-${modality}-${from}-${to}-${datasetSha256.slice(0, 12)}`;

/** Header + one row per line: small and diff-friendly. */
export function serializeBacktest(file: BacktestFile): string {
  const { rows, ...head } = file;
  const headJson = JSON.stringify(head, null, 2);
  const body = rows.map((r) => `    ${JSON.stringify(r)}`).join(",\n");
  return headJson.replace(/\n}$/, `,\n  "rows": [\n${body}\n  ]\n}`) + "\n";
}

function atomicWrite(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, file);
}

interface PartialState {
  runId: string;
  startedAt: string;
  strategies: { id: string; strategyVersion: string; algorithmVersion: string }[];
  rows: BacktestRow[];
}

export async function runBacktest(opts: BacktestOptions): Promise<BacktestResult> {
  const { modality, dataset, from, to } = opts;
  const log = opts.log ?? (() => undefined);
  if (from < BACKTEST_MIN_TARGET_CONTEST) throw new Error(`--from must be >= ${BACKTEST_MIN_TARGET_CONTEST} (rms_v2 needs the 50 contests before the target)`);
  if (to < from) throw new Error("--to must be >= --from");
  if (to > dataset.latestContest) throw new Error(`--to ${to} is beyond the dataset (latest ${dataset.latestContest})`);
  const byContest = new Map(dataset.draws.map((d) => [d.contest, d] as const));
  const strategies = [...opts.strategies].sort((a, b) => a.id.localeCompare(b.id));
  const runId = runIdFor(modality, from, to, opts.datasetSha256);
  const chunkSize = opts.chunkSize ?? 25;

  // Resume state (same run only).
  let state: PartialState = {
    runId,
    startedAt: opts.now().toISOString(),
    strategies: strategies.map((s) => ({ id: s.id, strategyVersion: s.version, algorithmVersion: "" })),
    rows: [],
  };
  const pFile = partialPath(opts.outDir);
  if (existsSync(pFile)) {
    const prev = JSON.parse(readFileSync(pFile, "utf8")) as PartialState;
    const key = (s: { id: string; strategyVersion: string }[]) => JSON.stringify(s.map((x) => [x.id, x.strategyVersion]));
    if (prev.runId === runId && key(prev.strategies) === key(state.strategies)) state = prev;
    else log("partial file belongs to a different run (range/dataset/strategy versions): ignored");
  }
  const done = new Set(state.rows.map((r) => r.contest));
  const resumedFrom = done.size;

  const contests: number[] = [];
  for (let c = from; c <= to; c += 1) if (!done.has(c)) contests.push(c);
  let chunks = 0;
  for (let i = 0; i < contests.length; i += chunkSize) {
    const chunk = contests.slice(i, i + chunkSize);
    const newRows: BacktestRow[] = [];
    for (const target of chunk) {
      const draw = byContest.get(target);
      if (!draw) throw new Error(`no result for contest ${target} in the dataset`);
      opts.setView(datasetView(dataset, target));
      for (const strategy of strategies) {
        const seed = backtestSeed(modality, target, strategy.id, strategy.version);
        const envelope = await opts.generate({
          modality,
          strategyId: strategy.id,
          contest: target,
          inputMode: "quantity",
          numberOfTickets: BACKTEST_TICKETS_PER_STRATEGY,
          qualityPreset: "balanced",
          seed,
        });
        if (envelope.strategyVersion !== strategy.version) throw new Error(`${strategy.id}: adapter reported version ${envelope.strategyVersion}, registry has ${strategy.version}`);
        const tickets = envelope.tickets as number[][];
        if (tickets.length !== BACKTEST_TICKETS_PER_STRATEGY || tickets.some((t) => t.length !== TICKET_SIZE[modality])) {
          throw new Error(`${strategy.id} @ ${target}: unexpected ticket shape`);
        }
        const algo = envelope.audit?.algorithmVersion ?? "unknown";
        const rec = state.strategies.find((s) => s.id === strategy.id)!;
        if (rec.algorithmVersion === "") rec.algorithmVersion = algo;
        else if (rec.algorithmVersion !== algo) {
          throw new Error(`${strategy.id} @ ${target}: algorithmVersion changed inside the window (${rec.algorithmVersion} -> ${algo}); narrow the window`);
        }
        const hits = checkTicketsAgainstDraw(tickets, { contest: draw.contest, numbers: [...draw.numbers] }).hitsPerTicket;
        newRows.push({ contest: target, strategyId: strategy.id, hitsPerTicket: hits, bestHits: Math.max(...hits) });
      }
    }
    state = { ...state, rows: [...state.rows, ...newRows] };
    if (!opts.dryRun) atomicWrite(pFile, JSON.stringify(state));
    chunks += 1;
    log(`chunk done: contests ${chunk[0]}..${chunk[chunk.length - 1]} (${state.rows.length / strategies.length}/${to - from + 1})`);
    if (opts.maxChunks !== undefined && chunks >= opts.maxChunks && i + chunkSize < contests.length) {
      return { complete: false, rows: state.rows.length, contestsDone: state.rows.length / strategies.length, resumedFrom, wrote: opts.dryRun ? [] : [pFile] };
    }
  }

  const rows = [...state.rows].sort((a, b) => a.contest - b.contest || a.strategyId.localeCompare(b.strategyId));
  const file: BacktestFile = {
    backtestSchemaVersion: BACKTEST_SCHEMA_VERSION,
    modality,
    runId,
    codeCommit: opts.codeCommit,
    generatedAt: state.startedAt,
    parameters: { ticketsPerStrategy: BACKTEST_TICKETS_PER_STRATEGY, inputMode: "quantity", qualityPreset: "balanced", seedTemplate: BACKTEST_SEED_TEMPLATE },
    strategies: state.strategies,
    range: { from, to, contestsCount: to - from + 1 },
    datasetSha256: opts.datasetSha256,
    rows,
    caveats: [...BACKTEST_CAVEATS],
  };
  backtestFileSchema.parse(file);
  const wrote: string[] = [];
  if (!opts.dryRun) {
    atomicWrite(finalPath(opts.outDir), serializeBacktest(file));
    rmSync(pFile, { force: true });
    wrote.push(finalPath(opts.outDir));
  }
  return { complete: true, rows: rows.length, contestsDone: to - from + 1, resumedFrom, wrote };
}

export interface TimingSample {
  strategyId: string;
  contests: number;
  meanMs: number;
  maxMs: number;
}

/** Timing only (no scoring, nothing written): generate for the given target contests and time each strategy. */
export async function timeSample(
  opts: Pick<BacktestOptions, "modality" | "dataset" | "strategies" | "setView" | "generate"> & { targets: number[]; clock?: () => number },
): Promise<TimingSample[]> {
  const clock = opts.clock ?? (() => performance.now());
  const strategies = [...opts.strategies].sort((a, b) => a.id.localeCompare(b.id));
  const acc = new Map(strategies.map((s) => [s.id, [] as number[]]));
  for (const target of opts.targets) {
    opts.setView(datasetView(opts.dataset, target));
    for (const s of strategies) {
      const t0 = clock();
      await opts.generate({
        modality: opts.modality,
        strategyId: s.id,
        contest: target,
        inputMode: "quantity",
        numberOfTickets: BACKTEST_TICKETS_PER_STRATEGY,
        qualityPreset: "balanced",
        seed: backtestSeed(opts.modality, target, s.id, s.version),
      });
      acc.get(s.id)!.push(clock() - t0);
    }
  }
  return strategies.map((s) => {
    const v = acc.get(s.id)!;
    return { strategyId: s.id, contests: v.length, meanMs: v.reduce((a, b) => a + b, 0) / v.length, maxMs: Math.max(...v) };
  });
}
