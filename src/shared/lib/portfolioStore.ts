import { db } from "./db";
import { loteriasBackupSchema, savedPortfolioSchema } from "./schemas";
import type { BetResultAvailability, LoteriasBackup, Modality, SavedPortfolio } from "../types";
import { appendBetSelectionRevision } from "./betSelection";

/**
 * Only entry point for portfolio persistence. Components must not call
 * IndexedDB/Dexie directly.
 */

export interface PortfolioFilters {
  modality?: Modality;
  contest?: number;
  strategyId?: string;
  markedAsBet?: boolean;
  checked?: boolean;
}

/**
 * Saves a generated portfolio. The generated content is IMMUTABLE once stored:
 * if a record with the same id already exists (the same generated result saved
 * again), its tickets/strategy/seed/metrics/audit/dataset/price/notes/checkedResult
 * are kept as-is and only NEW bet-selection revisions supplied by the caller
 * are appended to the existing history. A repeated save without a bet
 * selection never erases or replaces an existing one. Importing a backup with
 * explicit overwrite is a separate path (importBackup).
 *
 * Returns the FINAL persisted record (authoritative state after any merge), so
 * callers describe what is actually stored rather than what they submitted.
 */
export async function savePortfolio(portfolio: SavedPortfolio): Promise<SavedPortfolio> {
  return db.transaction("rw", db.portfolios, async () => {
    const existing = await db.portfolios.get(portfolio.id);
    if (!existing) {
      await db.portfolios.put(portfolio);
      return portfolio;
    }
    const existingRevisions = existing.betSelection?.revisions ?? [];
    const merged = [...existingRevisions];
    for (const revision of portfolio.betSelection?.revisions ?? []) {
      const current = merged[merged.length - 1];
      const sameAsCurrent =
        current &&
        current.resultAvailability === revision.resultAvailability &&
        current.selectedTicketNumbers.length === revision.selectedTicketNumbers.length &&
        current.selectedTicketNumbers.every((n, i) => n === revision.selectedTicketNumbers[i]);
      if (!sameAsCurrent) merged.push(revision);
    }
    if (merged.length === existingRevisions.length) return existing; // idempotent: nothing new to record
    const last = merged[merged.length - 1]!;
    const updated: SavedPortfolio = {
      ...existing,
      betSelection: { schemaVersion: 1, revisions: merged },
      markedAsBet: last.selectedTicketNumbers.length > 0,
    };
    await db.portfolios.put(updated);
    return updated;
  });
}

export async function getPortfolio(id: string): Promise<SavedPortfolio | undefined> {
  return db.portfolios.get(id);
}

export async function deletePortfolio(id: string): Promise<void> {
  await db.portfolios.delete(id);
}

/**
 * Records the user's actual-bet declaration as a NEW append-only revision and
 * keeps the indexed markedAsBet aggregate in sync. Never touches tickets,
 * strategy, seed, metrics or audit. Throws on invalid ticket references.
 */
export async function setBetSelection(
  id: string,
  selectedTicketNumbers: number[],
  context: { resultAvailability: BetResultAvailability; datasetLatestContestAtRecording?: number; recordedAt?: string },
): Promise<void> {
  const portfolio = await db.portfolios.get(id);
  if (!portfolio) throw new Error("Carteira não encontrada.");
  const update = appendBetSelectionRevision(portfolio, selectedTicketNumbers, {
    recordedAt: context.recordedAt ?? new Date().toISOString(),
    resultAvailability: context.resultAvailability,
    datasetLatestContestAtRecording: context.datasetLatestContestAtRecording,
  });
  await db.portfolios.update(id, update);
}

export async function setNotes(id: string, notes: string): Promise<void> {
  await db.portfolios.update(id, { notes });
}

export async function saveCheckedResult(id: string, checkedResult: SavedPortfolio["checkedResult"]): Promise<void> {
  await db.portfolios.update(id, { checkedResult });
}

export async function listPortfolios(filters: PortfolioFilters = {}): Promise<SavedPortfolio[]> {
  let all = await db.portfolios.orderBy("createdAt").reverse().toArray();
  if (filters.modality) all = all.filter((p) => p.modality === filters.modality);
  if (filters.contest !== undefined) all = all.filter((p) => p.contest === filters.contest);
  if (filters.strategyId) all = all.filter((p) => p.strategyId === filters.strategyId);
  if (filters.markedAsBet !== undefined) all = all.filter((p) => p.markedAsBet === filters.markedAsBet);
  if (filters.checked !== undefined) all = all.filter((p) => Boolean(p.checkedResult) === filters.checked);
  return all;
}

export async function exportBackup(): Promise<LoteriasBackup> {
  const portfolios = await db.portfolios.toArray();
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    portfolios,
  };
}

export interface ImportBackupResult {
  totalInFile: number;
  imported: number;
  skippedDuplicates: number;
}

/**
 * Validates and imports a backup. Duplicate IDs are skipped by default
 * unless overwrite is requested explicitly by the caller (after preview).
 */
export async function importBackup(raw: unknown, options: { overwriteDuplicates?: boolean } = {}): Promise<ImportBackupResult> {
  const parsed = loteriasBackupSchema.parse(raw);
  const existingIds = new Set((await db.portfolios.toArray()).map((p) => p.id));
  let imported = 0;
  let skippedDuplicates = 0;
  for (const portfolio of parsed.portfolios) {
    const isDuplicate = existingIds.has(portfolio.id);
    if (isDuplicate && !options.overwriteDuplicates) {
      skippedDuplicates += 1;
      continue;
    }
    await db.portfolios.put(portfolio as SavedPortfolio);
    imported += 1;
  }
  return { totalInFile: parsed.portfolios.length, imported, skippedDuplicates };
}

export function previewBackup(raw: unknown): { valid: true; count: number } | { valid: false; error: string } {
  const result = loteriasBackupSchema.safeParse(raw);
  if (!result.success) return { valid: false, error: result.error.message };
  return { valid: true, count: result.data.portfolios.length };
}

export async function deleteAllData(): Promise<void> {
  await db.portfolios.clear();
}

export function validateSavedPortfolio(raw: unknown): SavedPortfolio {
  return savedPortfolioSchema.parse(raw) as SavedPortfolio;
}
