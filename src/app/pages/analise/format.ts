export const nf = (d: number) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = (x: number, d = 3) => nf(d).format(x);
export const pct = (x: number, d = 2) => `${nf(d).format(x * 100)}%`;

const LABELS: Record<string, string> = {
  "lotofacil.rms_v2": "RMS v2",
  "lotofacil.max_diversification": "Máxima diversificação",
  "lotofacil.max_coverage_11": "Máxima cobertura 11",
  "lotofacil.max_coverage_12": "Máxima cobertura 12",
  "lotofacil.uniform_random": "Aleatória (controle)",
  "megasena.max_f4": "Máx. F4",
  "megasena.max_f5": "Máx. F5",
  "megasena.max_diversification": "Máxima diversificação",
  "megasena.rolling_20_v2": "Rolling 20 v2",
  "megasena.uniform_random": "Aleatória (controle)",
};
export const strategyLabel = (id: string) => LABELS[id] ?? id.split(".").slice(1).join(" ");

/** Categorical palette + dash pattern so series are told apart without relying on colour alone. */
const SERIES = [
  { color: "#A07AFF", dash: undefined },
  { color: "#12C7B0", dash: undefined },
  { color: "#FFB020", dash: undefined },
  { color: "#FF7A93", dash: undefined },
  { color: "#7AB8FF", dash: "5 3" },
] as const;
export const seriesStyle = (index: number) => SERIES[index % SERIES.length]!;

export const MUTED = "#B7C0D6";
export const REF = "#66D889";

