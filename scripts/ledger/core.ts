/**
 * Pure, I/O-free logic of the prospective ledger (ANL-001, DEC-026,
 * docs/analysis/PROSPECTIVE_LEDGER_PROTOCOL.md). No filesystem, no network, no clock reads:
 * everything time-dependent receives `now` explicitly so it is unit-testable.
 */
import { createHash } from "node:crypto";
import { estimateDrawDate } from "../../src/shared/lib/drawSchedule";
import type { LotteryDataset, Modality } from "../../src/shared/types";
import type { LedgerEntry, LedgerScore } from "../../src/shared/lib/ledgerSchemas";

/** Safety margin before the estimated draw time (protocol §3). */
export const CUTOFF_MARGIN_MINUTES = 60;
/** BRT is UTC-3 with no DST since 2019 (same assumption as the workflow schedule comments). */
const BRT_UTC_OFFSET_HOURS = 3;

export const sha256Hex = (text: string): string => createHash("sha256").update(text).digest("hex");

/** Deterministic seed (protocol §2). */
export function ledgerSeed(modality: Modality, contest: number, strategyId: string, strategyVersion: string): string {
  return `ledger:${modality}:${contest}:${strategyId}:${strategyVersion}`;
}

/** The next contest to be drawn according to the dataset. Never a contest that already has a result. */
export function targetContestFor(dataset: Pick<LotteryDataset, "latestContest">): number {
  return dataset.latestContest + 1;
}

/** True when the dataset is contiguous 1..latestContest and ends at latestContest (no gap, target not in it). */
export function datasetHasNoGap(dataset: Pick<LotteryDataset, "latestContest" | "draws">): boolean {
  const { draws, latestContest } = dataset;
  if (draws.length !== latestContest) return false;
  return draws.at(-1)?.contest === latestContest && draws.every((d, i) => d.contest === i + 1);
}

export interface DrawTiming {
  estimatedDrawAt: Date;
  cutoffAt: Date;
}

/** Estimated draw instant (UTC) and the validity cutoff: weekday ~21h BRT, Sunday ~11h BRT, minus 60 minutes. Null if no estimate exists. */
export function drawTimingFor(modality: Modality, targetContest: number, dataset: LotteryDataset): DrawTiming | null {
  const estimate = estimateDrawDate(modality, targetContest, dataset);
  if (!estimate) return null;
  const [y, m, d] = estimate.isoDate.split("-").map(Number) as [number, number, number];
  const hourBrt = estimate.weekday === 0 ? 11 : 21;
  const estimatedDrawAt = new Date(Date.UTC(y, m - 1, d, hourBrt + BRT_UTC_OFFSET_HOURS, 0, 0));
  return { estimatedDrawAt, cutoffAt: new Date(estimatedDrawAt.getTime() - CUTOFF_MARGIN_MINUTES * 60_000) };
}

/** Shard key: month of the target draw date, "YYYY-MM" (UTC date of the estimated draw instant). */
export function shardMonth(estimatedDrawAt: Date): string {
  return estimatedDrawAt.toISOString().slice(0, 7);
}

export type Validity = { valid: true } | { valid: false; reason: string };

/**
 * Protocol §3. `liveGuardPublished` is whether the best-effort live check showed the target as already published;
 * in that case no entry is created at all (the caller decides), so it is not a validity input here.
 */
export function evaluateValidity(args: { dataset: LotteryDataset; targetContest: number; now: Date; cutoffAt: Date }): Validity {
  const { dataset, targetContest, now, cutoffAt } = args;
  if (dataset.latestContest !== targetContest - 1) return { valid: false, reason: "dataset_latest_not_target_minus_1" };
  if (!datasetHasNoGap(dataset)) return { valid: false, reason: "dataset_has_gap" };
  if (now.getTime() >= cutoffAt.getTime()) return { valid: false, reason: "generated_after_cutoff" };
  return { valid: true };
}

export function normalizeTickets(tickets: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  return tickets.map((t) => [...t].sort((a, b) => a - b));
}

export interface EntryInput {
  modality: Modality;
  targetContest: number;
  strategyId: string;
  strategyVersion: string;
  algorithmVersion: string;
  seed: string;
  tickets: ReadonlyArray<ReadonlyArray<number>>;
  now: Date;
  dataset: LotteryDataset;
  datasetSha256: string;
  timing: DrawTiming;
  validity: Validity;
  codeCommit: string;
}

export function buildEntry(i: EntryInput): LedgerEntry {
  const entry: LedgerEntry = {
    ledgerSchemaVersion: 1,
    modality: i.modality,
    targetContest: i.targetContest,
    strategyId: i.strategyId,
    strategyVersion: i.strategyVersion,
    algorithmVersion: i.algorithmVersion,
    seed: i.seed,
    qualityPreset: "balanced",
    tickets: normalizeTickets(i.tickets),
    generatedAt: i.now.toISOString(),
    datasetLatestContest: i.dataset.latestContest,
    datasetSha256: i.datasetSha256,
    estimatedDrawAt: i.timing.estimatedDrawAt.toISOString(),
    cutoffAt: i.timing.cutoffAt.toISOString(),
    valid: i.validity.valid,
    codeCommit: i.codeCommit,
  };
  if (!i.validity.valid) entry.invalidReason = i.validity.reason;
  return entry;
}

export const entryKey = (e: Pick<LedgerEntry, "modality" | "targetContest" | "strategyId">): string => `${e.modality}:${e.targetContest}:${e.strategyId}`;

export const resultNumbersSha256 = (numbers: ReadonlyArray<number>): string => sha256Hex([...numbers].sort((a, b) => a - b).join(","));

/** Hits per ticket against an official draw (same rule as src/shared/lib/checkResult.ts, kept pure and without a clock). */
export function hitsPerTicket(tickets: ReadonlyArray<ReadonlyArray<number>>, drawNumbers: ReadonlyArray<number>): number[] {
  const set = new Set(drawNumbers);
  return tickets.map((t) => t.filter((n) => set.has(n)).length);
}

/**
 * Score for one entry, or null when it cannot be scored yet (valid entry whose result is not in the dataset).
 * Invalid entries get a status-only record (never hits), as the protocol asks.
 */
export function scoreEntry(entry: LedgerEntry, draw: { contest: number; numbers: number[] } | undefined, now: Date): LedgerScore | null {
  const base = { targetContest: entry.targetContest, strategyId: entry.strategyId, strategyVersion: entry.strategyVersion, scoredAt: now.toISOString() };
  if (!entry.valid) return { ...base, valid: false, invalidReason: entry.invalidReason };
  if (!draw || draw.contest !== entry.targetContest) return null;
  const hits = hitsPerTicket(entry.tickets, draw.numbers);
  return { ...base, valid: true, hitsPerTicket: hits, bestHits: Math.max(...hits), resultNumbersSha256: resultNumbersSha256(draw.numbers) };
}

/** Does a score already exist for this entry? (target + strategy + version.) */
export const scoreKey = (s: Pick<LedgerScore, "targetContest" | "strategyId" | "strategyVersion">): string => `${s.targetContest}:${s.strategyId}:${s.strategyVersion}`;
