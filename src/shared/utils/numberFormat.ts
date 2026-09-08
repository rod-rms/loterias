/** pt-BR decimal formatting for human-facing numbers (e.g. "8,0" instead of "8.0"). Internal numeric values are never changed by this. */
export function formatDecimalPtBR(value: number, decimals: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
