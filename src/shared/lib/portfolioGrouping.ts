import type { SavedPortfolio } from "../types";

export interface PortfolioDayGroup {
  /** Local calendar day, "YYYY-MM-DD". */
  dayKey: string;
  label: string;
  portfolios: SavedPortfolio[];
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Hoje", "Ontem" or the full pt-BR date ("25 de setembro de 2026"), relative to `now` (local time). */
export function friendlyDayLabel(dayKey: string, now: Date = new Date()): string {
  if (dayKey === localDayKey(now)) return "Hoje";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey === localDayKey(yesterday)) return "Ontem";
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y!, m! - 1, d!));
}

/** Groups by the local calendar day of `createdAt`, preserving the input order (callers pass newest-first). */
export function groupPortfoliosByDay(portfolios: readonly SavedPortfolio[], now: Date = new Date()): PortfolioDayGroup[] {
  const groups: PortfolioDayGroup[] = [];
  const byKey = new Map<string, PortfolioDayGroup>();
  for (const p of portfolios) {
    const key = localDayKey(new Date(p.createdAt));
    let group = byKey.get(key);
    if (!group) {
      group = { dayKey: key, label: friendlyDayLabel(key, now), portfolios: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.portfolios.push(p);
  }
  return groups;
}
