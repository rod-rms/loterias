import type { LotteryDataset, Modality } from "../types";

/**
 * Estimated draw date for a contest that is NOT in the local dataset yet.
 *
 * Uses the official CAIXA weekly cadence (cross-checked against
 * docs/global/DATA_AND_PERSISTENCE_V1.md §5.1 and the recent dataset):
 *   - Lotofácil: every day EXCEPT Saturday (Sunday through Friday);
 *   - Mega-Sena: Tuesday, Thursday and Sunday only.
 * Weekday draws are at night (~21h BRT); Sunday draws are in the morning (~11h BRT).
 *
 * It is only an ESTIMATE: holidays and schedule changes (e.g. special draws)
 * are not modeled, so callers must always label the result "estimado".
 * Date arithmetic is done on calendar dates in UTC-noon, so no timezone can
 * shift the day.
 */
const DRAW_WEEKDAYS: Record<Modality, ReadonlySet<number>> = {
  lotofacil: new Set([0, 1, 2, 3, 4, 5]), // 0 = Sunday ... 6 = Saturday (no Saturday draw)
  megasena: new Set([0, 2, 4]),
};

const WEEKDAY_NAME_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export interface EstimatedDrawDate {
  /** ISO calendar date "YYYY-MM-DD". */
  isoDate: string;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  weekdayName: string;
  /** "11h" on Sundays, "21h" otherwise. */
  approxHour: string;
  /** How many official draws were walked forward from the latest dataset draw. */
  drawsAhead: number;
}

function parseIsoNoonUtc(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns null when `targetContest <= dataset.latestContest` (a real date exists in the dataset) or when the dataset has no usable last draw date. */
export function estimateDrawDate(modality: Modality, targetContest: number, dataset: LotteryDataset): EstimatedDrawDate | null {
  if (!Number.isInteger(targetContest) || targetContest <= dataset.latestContest) return null;
  const lastDraw = dataset.draws.at(-1);
  const cursor = lastDraw ? parseIsoNoonUtc(lastDraw.drawDate) : null;
  if (!cursor) return null;

  const drawsAhead = targetContest - dataset.latestContest;
  let remaining = drawsAhead;
  const drawDays = DRAW_WEEKDAYS[modality];
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (drawDays.has(cursor.getUTCDay())) remaining -= 1;
  }
  const weekday = cursor.getUTCDay();
  return { isoDate: toIso(cursor), weekday, weekdayName: WEEKDAY_NAME_PT[weekday]!, approxHour: weekday === 0 ? "11h" : "21h", drawsAhead };
}

/** "28/09/26" from "2026-09-28". */
export function formatShortDatePtBR(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  return m ? `${m[3]}/${m[2]}/${m[1]!.slice(2)}` : isoDate;
}

/** "Sorteio estimado: 28/09/26 · domingo · 11h" */
export function formatEstimatedDraw(estimate: EstimatedDrawDate): string {
  return `Sorteio estimado: ${formatShortDatePtBR(estimate.isoDate)} · ${estimate.weekdayName} · ${estimate.approxHour}`;
}
