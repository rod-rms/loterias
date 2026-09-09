/** pt-BR decimal formatting for human-facing numbers (e.g. "8,0" instead of "8.0"). Internal numeric values are never changed by this. */
export function formatDecimalPtBR(value: number, decimals: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/**
 * Formats an ISO date-only string ("YYYY-MM-DD", as stored in draw dates) as
 * pt-BR "DD/MM/YYYY". Deliberately string-based (no Date object) to avoid
 * timezone shifts that could silently roll the date back or forward a day.
 */
export function formatDatePtBR(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Formats a set of drawn numbers as "01 · 11 · 36 · 43 · 48 · 49" — ascending, zero-padded, dot-separated. */
export function formatDrawNumbers(numbers: number[]): string {
  return [...numbers]
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"))
    .join(" · ");
}
