/**
 * Pure "overdue draw" logic shared by the dataset updater (scripts/data/update-dataset.mjs).
 * The Cloudflare Worker (workers/lottery-data-updater/worker.js) carries a byte-identical copy of
 * the block between the BEGIN/END markers below (it is a standalone file and cannot import this);
 * tests/shared/overdueDraw.test.ts fails if the two copies drift apart.
 *
 * The updater only asks CAIXA's "latest" endpoint, so "the official result is not published yet" and
 * "we are already up to date" look the same to it. CAIXA's latest payload does carry the date of the
 * next draw (`dataProximoConcurso`, "DD/MM/YYYY"). If the run happens well after that date and the
 * latest `numero` has still not advanced past what we stored, something is off (result not yet
 * published, official calendar moved the draw, or an updater/source problem) and a human should know.
 * No assumption is made about WHEN CAIXA publishes a given draw; the margin below is a tunable guess
 * that is deliberately generous.
 */

// BEGIN overdue-logic (keep byte-identical in scripts/data/overdue.mjs and workers/lottery-data-updater/worker.js)
// BRT is UTC-3 (no DST since 2019), the same assumption the workflow schedule comments rely on.
export const OVERDUE_BRT_UTC_OFFSET_HOURS = 3;
// TUNABLE: a draw is considered overdue once it is past the NEXT day at this hour (BRT) after its
// scheduled date. The real publication lag is not yet known (see the "latest endpoint" diagnostic
// logs this updater now writes on every run), so this is intentionally generous to avoid false alarms.
export const OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR = 14;

/** Strict "DD/MM/YYYY" -> { y, m, d } for a real calendar date in 2000..2100, else null. */
export function parseBrDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(typeof value === "string" ? value.trim() : "");
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 2000 || y > 2100) return null;
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** Instant after which a draw scheduled for `nextDrawDateBr` counts as overdue, or null if the date is missing/malformed. */
export function overdueDeadline(nextDrawDateBr) {
  const parsed = parseBrDate(nextDrawDateBr);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d + 1, OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR + OVERDUE_BRT_UTC_OFFSET_HOURS, 0, 0));
}

/**
 * Decide whether the official source looks overdue. Never throws; any missing/malformed input means
 * "not overdue" (a diagnostic must never create false alarms or break the update).
 * reason: "invalid-input" | "advanced" | "no-next-draw-date" | "before-deadline" | "overdue"
 */
export function evaluateOverdue({ now, nextDrawDateBr, storedLatest, officialLatest }) {
  const deadline = overdueDeadline(nextDrawDateBr);
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || !Number.isFinite(storedLatest) || !Number.isFinite(officialLatest)) {
    return { overdue: false, reason: "invalid-input", deadline };
  }
  if (officialLatest > storedLatest) return { overdue: false, reason: "advanced", deadline };
  if (!deadline) return { overdue: false, reason: "no-next-draw-date", deadline: null };
  if (now.getTime() <= deadline.getTime()) return { overdue: false, reason: "before-deadline", deadline };
  return { overdue: true, reason: "overdue", deadline };
}
// END overdue-logic
