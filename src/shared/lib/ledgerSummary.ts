import { ledgerEntriesFileSchema } from "./ledgerSchemas";
import type { Modality } from "../types";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

export interface LedgerSummary {
  /** Distinct target contests with valid entries (count of registrations only; no scoring in this increment). */
  registeredDraws: number;
  firstGeneratedAt: string | null;
}

/** First month shard of the prospective ledger (ANL-001 started 2026-11-12). */
const FIRST_MONTH = { year: 2026, month: 11 };

/**
 * Reads the public ledger shards (public/data/ledger/{modality}/entries-YYYY-MM.json) and counts registered draws.
 * Missing months are skipped (the host may answer an unknown path with the app shell, which fails to parse as a shard).
 * Throws when an existing shard is inconsistent so the page can say it is unavailable instead of showing a wrong count.
 */
export async function loadLedgerSummary(modality: Modality, now: Date = new Date()): Promise<LedgerSummary> {
  const targets = new Set<number>();
  let first: string | null = null;
  let year = FIRST_MONTH.year;
  let month = FIRST_MONTH.month;
  // The shard is keyed by the draw's month, which can be the month after "now".
  const endIndex = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
  while (year * 12 + (month - 1) <= endIndex) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const res = await fetch(`${BASE_URL}data/ledger/${modality}/entries-${key}.json`.replace(/\/{2,}/g, "/")).catch(() => null);
    if (res?.ok) {
      let raw: unknown = null;
      try {
        raw = await res.json();
      } catch {
        raw = null;
      }
      if (raw !== null) {
        const parsed = ledgerEntriesFileSchema.safeParse(raw);
        if (!parsed.success) throw new Error("ledger shard inconsistent");
        for (const e of parsed.data.entries) {
          if (!e.valid) continue;
          targets.add(e.targetContest);
          if (first === null || e.generatedAt < first) first = e.generatedAt;
        }
      }
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { registeredDraws: targets.size, firstGeneratedAt: first };
}
