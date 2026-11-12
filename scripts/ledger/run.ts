/**
 * Prospective ledger runner (ANL-001, DEC-026). `runLedger` is the whole job: generate the next contest's entries
 * for every strategy of each modality (idempotent), then score unscored valid entries whose result is now known.
 * All side effects are injected (data directory, clock, live guard, generator) so it is unit-testable; the CLI
 * (cli.ts) wires the real ones. Strategies are always called through the SAME functions the generation workers
 * call (registry definitions + adapters): nothing is copied or reimplemented here.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { lotteryDatasetSchema } from "../../src/shared/lib/schemas";
import {
  ledgerEntriesFileSchema,
  ledgerEntrySchema,
  ledgerScoresFileSchema,
  type LedgerEntriesFile,
  type LedgerEntry,
  type LedgerScoresFile,
} from "../../src/shared/lib/ledgerSchemas";
import type { GeneratePortfolioRequest, LotteryDataset, Modality, PortfolioEnvelope, StrategyDefinition } from "../../src/shared/types";
import { buildEntry, datasetHasNoGap, drawTimingFor, entryKey, evaluateValidity, ledgerSeed, scoreEntry, scoreKey, sha256Hex, shardMonth, targetContestFor } from "./core";

export const MODALITIES: Modality[] = ["lotofacil", "megasena"];
export const STRATEGIES_PER_MODALITY = 5;
export const TICKETS_PER_ENTRY = 6;

export type Generator = (request: GeneratePortfolioRequest) => Promise<PortfolioEnvelope<unknown, { algorithmVersion?: string }>>;

export interface RunOptions {
  /** Directory that contains `lotofacil/results.json`, `megasena/results.json` (default `public/data`). */
  dataDir: string;
  /** Ledger root (default `<dataDir>/ledger`). */
  ledgerDir?: string;
  now: Date;
  dryRun: boolean;
  codeCommit: string;
  strategiesFor: (modality: Modality) => StrategyDefinition[];
  generate: Record<Modality, Generator>;
  /** Best-effort live guard: latest contest the official source reports, or null if unknown. Must never throw. */
  fetchOfficialLatest: (modality: Modality) => Promise<number | null>;
  log?: (line: string) => void;
}

export interface ModalityReport {
  modality: Modality;
  targetContest: number;
  status: "generated" | "nothing-to-do" | "skipped-already-published" | "skipped-target-has-result" | "error";
  created: string[];
  invalid: string[];
  skippedExisting: string[];
  errors: string[];
}

export interface RunReport {
  modalities: ModalityReport[];
  scored: number;
  wrote: string[];
  dryRun: boolean;
}

const entriesPath = (ledgerDir: string, modality: Modality, month: string) => path.join(ledgerDir, modality, `entries-${month}.json`);
const scoresPath = (ledgerDir: string, modality: Modality, month: string) => path.join(ledgerDir, modality, `scores-${month}.json`);

function atomicWrite(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  renameSync(tmp, file);
}

function readShard<T>(file: string, parse: (raw: unknown) => T): T | null {
  if (!existsSync(file)) return null;
  return parse(JSON.parse(readFileSync(file, "utf8")));
}

/** Every entries shard of a modality, parsed (a malformed shard throws: the ledger must never be silently ignored). */
export function readAllEntries(ledgerDir: string, modality: Modality): { month: string; file: LedgerEntriesFile }[] {
  const dir = path.join(ledgerDir, modality);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^entries-(\d{4}-\d{2})\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ month: m[1]!, file: ledgerEntriesFileSchema.parse(JSON.parse(readFileSync(path.join(dir, m[0]), "utf8"))) }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function loadDatasetFile(dataDir: string, modality: Modality): { dataset: LotteryDataset; sha256: string } {
  const text = readFileSync(path.join(dataDir, modality, "results.json"), "utf8");
  return { dataset: lotteryDatasetSchema.parse(JSON.parse(text)) as LotteryDataset, sha256: sha256Hex(text) };
}

export async function runLedger(opts: RunOptions): Promise<RunReport> {
  const log = opts.log ?? (() => undefined);
  const ledgerDir = opts.ledgerDir ?? path.join(opts.dataDir, "ledger");
  const report: RunReport = { modalities: [], scored: 0, wrote: [], dryRun: opts.dryRun };
  const entryAdditions = new Map<string, LedgerEntriesFile>(); // file path -> new content

  for (const modality of MODALITIES) {
    const { dataset, sha256 } = loadDatasetFile(opts.dataDir, modality);
    const target = targetContestFor(dataset);
    const mr: ModalityReport = { modality, targetContest: target, status: "nothing-to-do", created: [], invalid: [], skippedExisting: [], errors: [] };
    report.modalities.push(mr);

    // Never generate for a contest that already has a result, and never backfill.
    if (dataset.draws.some((d) => d.contest === target)) {
      mr.status = "skipped-target-has-result";
      log(`[${modality}] target ${target} already has a result in the dataset: nothing generated`);
      continue;
    }
    // Best-effort live guard (never fails the run).
    const official = await opts.fetchOfficialLatest(modality).catch(() => null);
    if (official !== null && official >= target) {
      mr.status = "skipped-already-published";
      log(`[${modality}] official source already reports contest ${official} >= target ${target}: no entry created`);
      continue;
    }
    const timing = drawTimingFor(modality, target, dataset);
    if (!timing) {
      mr.status = "error";
      mr.errors.push("no draw-time estimate available for the target");
      continue;
    }

    const strategies = opts.strategiesFor(modality);
    if (strategies.length !== STRATEGIES_PER_MODALITY) {
      mr.status = "error";
      mr.errors.push(`expected ${STRATEGIES_PER_MODALITY} strategies in the registry, found ${strategies.length}`);
      continue;
    }

    const month = shardMonth(timing.estimatedDrawAt);
    const file = entriesPath(ledgerDir, modality, month);
    const all = readAllEntries(ledgerDir, modality);
    const existingKeys = new Set(all.flatMap((s) => s.file.entries.map(entryKey)));
    const shard: LedgerEntriesFile = entryAdditions.get(file) ?? all.find((s) => s.month === month)?.file ?? { ledgerSchemaVersion: 1, modality, month, entries: [] };
    const next: LedgerEntry[] = [...shard.entries];

    for (const strategy of strategies) {
      const key = entryKey({ modality, targetContest: target, strategyId: strategy.id });
      if (existingKeys.has(key)) {
        mr.skippedExisting.push(strategy.id);
        continue;
      }
      try {
        const seed = ledgerSeed(modality, target, strategy.id, strategy.version);
        const envelope = await opts.generate[modality]({
          modality,
          strategyId: strategy.id,
          contest: target,
          inputMode: "quantity",
          numberOfTickets: TICKETS_PER_ENTRY,
          qualityPreset: "balanced",
          seed,
        });
        const validity = evaluateValidity({ dataset, targetContest: target, now: opts.now, cutoffAt: timing.cutoffAt });
        const entry = buildEntry({
          modality,
          targetContest: target,
          strategyId: strategy.id,
          strategyVersion: envelope.strategyVersion,
          algorithmVersion: envelope.audit?.algorithmVersion ?? "unknown",
          seed,
          tickets: envelope.tickets,
          now: opts.now,
          dataset,
          datasetSha256: sha256,
          timing,
          validity,
          codeCommit: opts.codeCommit,
        });
        // Validate exactly what would be stored (6 distinct sorted tickets, right size/range...).
        ledgerEntrySchema.parse(entry);
        next.push(entry);
        if (validity.valid) mr.created.push(strategy.id);
        else mr.invalid.push(`${strategy.id} (${validity.reason})`);
      } catch (err) {
        mr.errors.push(`${strategy.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (next.length > shard.entries.length) {
      entryAdditions.set(file, { ...shard, entries: next });
      mr.status = "generated";
    }
    if (mr.errors.length > 0) mr.status = "error";
    if (!datasetHasNoGap(dataset)) log(`[${modality}] WARNING: dataset has a gap; entries are stored as invalid`);
    log(`[${modality}] target ${target}: created ${mr.created.length} valid, ${mr.invalid.length} invalid, ${mr.skippedExisting.length} already existed, ${mr.errors.length} errors`);
  }

  // Scoring pass over every stored entry (including those created above, in memory for dry runs).
  const scoreAdditions = new Map<string, LedgerScoresFile>();
  for (const modality of MODALITIES) {
    const { dataset } = loadDatasetFile(opts.dataDir, modality);
    const byContest = new Map(dataset.draws.map((d) => [d.contest, d] as const));
    const shards = new Map<string, LedgerEntry[]>();
    for (const s of readAllEntries(ledgerDir, modality)) shards.set(s.month, [...s.file.entries]);
    for (const content of entryAdditions.values()) if (content.modality === modality) shards.set(content.month, content.entries);

    for (const [month, entries] of shards) {
      const sFile = scoresPath(ledgerDir, modality, month);
      const current = scoreAdditions.get(sFile) ?? readShard(sFile, (raw) => ledgerScoresFileSchema.parse(raw)) ?? { ledgerSchemaVersion: 1 as const, modality, month, scores: [] };
      const have = new Set(current.scores.map(scoreKey));
      const added = [...current.scores];
      for (const e of entries) {
        if (have.has(scoreKey(e))) continue;
        const draw = byContest.get(e.targetContest);
        const score = scoreEntry(e, draw ? { contest: draw.contest, numbers: [...draw.numbers] } : undefined, opts.now);
        if (score) {
          added.push(score);
          // Invalid entries are recorded once (status only); count only real scorings.
          if (score.valid) report.scored += 1;
        }
      }
      if (added.length > current.scores.length) scoreAdditions.set(sFile, { ...current, scores: added });
    }
  }

  if (!opts.dryRun) {
    for (const [file, content] of entryAdditions) {
      atomicWrite(file, content);
      report.wrote.push(path.relative(process.cwd(), file));
    }
    for (const [file, content] of scoreAdditions) {
      atomicWrite(file, content);
      report.wrote.push(path.relative(process.cwd(), file));
    }
  } else {
    for (const file of [...entryAdditions.keys(), ...scoreAdditions.keys()]) log(`[dry-run] would write ${path.relative(process.cwd(), file)}`);
  }
  return report;
}
