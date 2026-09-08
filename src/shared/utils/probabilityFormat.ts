/**
 * Adaptive probability formatting so a non-zero probability never displays
 * as a visually-zero percentage (e.g. "0.0000%"). Always pt-BR formatted.
 */

const PT_BR = "pt-BR";

function decimalsForPercent(percent: number): number {
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
 * Formats the complementary "1 in X" phrasing for small probabilities.
 * Returns null when it wouldn't add useful information (probability is 0,
 * null, or already close to certain — "1 em 1" is not meaningful).
 */
export function formatOneIn(probability: number | null | undefined): string | null {
  if (probability === null || probability === undefined || Number.isNaN(probability)) return null;
  if (probability <= 0) return null;
  if (probability >= 0.99) return null;
  const oneIn = 1 / probability;
  if (!Number.isFinite(oneIn) || oneIn < 1.5) return null;
  const rounded = Math.round(oneIn);
  return `Aproximadamente 1 em ${new Intl.NumberFormat(PT_BR).format(rounded)}`;
}
