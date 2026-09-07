import { db } from "./db";
import { loteriasBackupSchema, savedPortfolioSchema } from "./schemas";
import type { LoteriasBackup, Modality, SavedPortfolio } from "../types";

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

export async function savePortfolio(portfolio: SavedPortfolio): Promise<void> {
  await db.portfolios.put(portfolio);
}

export async function getPortfolio(id: string): Promise<SavedPortfolio | undefined> {
  return db.portfolios.get(id);
}

export async function deletePortfolio(id: string): Promise<void> {
  await db.portfolios.delete(id);
}

export async function setMarkedAsBet(id: string, markedAsBet: boolean): Promise<void> {
  await db.portfolios.update(id, { markedAsBet });
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
