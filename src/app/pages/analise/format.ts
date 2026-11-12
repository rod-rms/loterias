export const nf = (d: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = (x: number, d = 3) => nf(d).format(x);
export const pct = (x: number, d = 2) => `${nf(d).format(x * 100)}%`;
/** Lay rounding: one decimal ("9,0"). */
export const one = (x: number) => nf(1).format(x);
/** Counts: whole numbers from 10, one decimal from 1, two decimals below 1. */
export const countLabel = (x: number) => (x >= 10 ? nf(0).format(x) : x >= 1 ? nf(1).format(x) : nf(2).format(x));

/** "2026-11-11" -> "11/11/2026". */
export function dateBr(iso: string | undefined | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** User-facing strategy names, identical to the ones the generator shows (kept in sync by a test against the registry definitions). */
export const STRATEGY_NAMES: Record<string, string> = {
  "lotofacil.rms_v2": "RMS v2",
  "lotofacil.max_diversification": "Diversificação de carteira",
  "lotofacil.max_coverage_11": "Otimizar cobertura 11+",
  "lotofacil.max_coverage_12": "Otimizar cobertura 12+",
  "lotofacil.uniform_random": "Aleatória distinta",
  "megasena.max_f4": "Otimizar cobertura Quadra+",
  "megasena.max_f5": "Otimizar cobertura Quina+",
  "megasena.max_diversification": "Diversificação de carteira",
  "megasena.rolling_20_v2": "Rolling 20 Balanceada",
  "megasena.uniform_random": "Aleatória distinta",
};
export const strategyLabel = (id: string) => STRATEGY_NAMES[id] ?? id.split(".").slice(1).join(" ");

/** Technical-section categorical palette (the lay view uses one neutral colour + the "acaso" colour). */
const SERIES = [
  { color: "#A07AFF", dash: undefined },
  { color: "#12C7B0", dash: undefined },
  { color: "#FFB020", dash: undefined },
  { color: "#FF7A93", dash: undefined },
  { color: "#7AB8FF", dash: "5 3" },
] as const;
export const seriesStyle = (index: number) => SERIES[index % SERIES.length]!;

export const MUTED = "#B7C0D6";
/** The one distinct colour: chance ("acaso"). */
export const CHANCE = "#66D889";
export const REF = CHANCE;
/** The one neutral colour for strategies in the lay view. */
export const NEUTRAL = "#E6EBF7";

export interface Period {
  firstDate: string | null;
  lastDate: string | null;
}

export function roundedRange(values: number[], digits = 1): string {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const a = nf(digits).format(lo);
  const b = nf(digits).format(hi);
  return a === b ? a : `entre ${a} e ${b}`;
}

export const periodFromDraws = (draws: { contest: number; drawDate: string }[] | null, from: number, to: number): Period => ({
  firstDate: dateBr(draws?.find((d) => d.contest === from)?.drawDate),
  lastDate: dateBr(draws?.find((d) => d.contest === to)?.drawDate),
});
