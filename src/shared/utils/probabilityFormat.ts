/**
 * Adaptive probability formatting so a non-zero probability never displays
 * as a visually-zero percentage (e.g. "0.0000%"). Always pt-BR formatted.
 */

const PT_BR = "pt-BR";

/** Effectively-zero threshold used to tell real (if tiny) differences apart from floating-point subtraction noise. */
const EFFECTIVELY_ZERO = 1e-9;

export function decimalsForPercent(percent: number): number {
  if (percent === 0) return 0;
  const abs = Math.abs(percent);
  if (abs >= 10) return 2;
  if (abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  if (abs >= 0.0001) return 6;
  // Smaller than 0.0001%: keep adding decimals until the value stops
  // rounding to zero, so it never misleadingly reads as "0%".
  let decimals = 6;
  while (decimals <= 12 && Number(abs.toFixed(decimals)) === 0) decimals += 2;
  return Math.min(decimals, 12);
}

/** Formats a probability (0..1) as an adaptive-precision pt-BR percentage string, e.g. "55,85%" or "0,0277%". */
export function formatProbabilityPercent(probability: number | null | undefined): string {
  if (probability === null || probability === undefined || Number.isNaN(probability)) return "—";
  const percent = probability * 100;
  const decimals = decimalsForPercent(percent);
  const formatted = new Intl.NumberFormat(PT_BR, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(percent);
  return `${formatted}%`;
}

/**
 * Formats the complementary "1 in X" phrasing — useful only for probabilities
 * that are actually rare. Common/high-probability events (>= 5%) show the
 * percentage alone; "Aproximadamente 1 em 2" for a ~55% chance is not useful
 * and reads as confusing. Returns null when it wouldn't add information
 * (probability is 0, null, or >= 5%).
 */
export function formatOneIn(probability: number | null | undefined): string | null {
  if (probability === null || probability === undefined || Number.isNaN(probability)) return null;
  if (probability <= 0) return null;
  if (probability >= 0.05) return null;
  const oneIn = 1 / probability;
  if (!Number.isFinite(oneIn) || oneIn < 1.5) return null;
  const rounded = Math.round(oneIn);
  return `Aproximadamente 1 em ${new Intl.NumberFormat(PT_BR).format(rounded)}`;
}

/**
 * Formats a percentage-point difference (e.g. portfolio vs. baseline) for
 * the primary UX, hiding floating-point subtraction noise:
 * - a difference indistinguishable from zero at double precision renders
 *   "Igual" (this is also the correct, expected result for metrics like
 *   Sena/exactly-15, which are mathematically identical to their baseline
 *   for the same number of distinct tickets — never a display bug there);
 * - a real but sub-0.0001-percentage-point difference renders as
 *   "+ menos de 0,0001 p.p." / "- menos de 0,0001 p.p." instead of a long
 *   floating-point tail;
 * - larger differences use the same adaptive precision as percentages.
 * The exact numeric value remains available in technical details.
 */
export function formatPercentagePointDifference(diff: number | null | undefined): string {
  if (diff === null || diff === undefined || Number.isNaN(diff)) return "—";
  if (Math.abs(diff) < EFFECTIVELY_ZERO) return "Igual";
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "+" : "-";
  if (abs < 0.0001) return `${sign} menos de 0,0001 p.p.`;
  const decimals = decimalsForPercent(abs);
  const formatted = new Intl.NumberFormat(PT_BR, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(abs);
  return `${sign}${formatted} p.p.`;
}
