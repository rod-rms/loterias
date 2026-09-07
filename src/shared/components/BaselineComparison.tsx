interface BaselineRow {
  label: string;
  portfolioPercent: number | null;
  baselinePercent: number | null;
  absoluteDifference: number | null;
}

export function BaselineComparison({ kind, rows }: { kind: string; rows: BaselineRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-800">Comparação com baseline</h4>
      <p className="mt-1 text-xs text-slate-500">
        {kind === "uniform_distinct_average"
          ? "Média teórica de carteiras aleatórias equivalentes (mesmo N, sem restrições)."
          : "Controle uniforme sob as mesmas restrições explícitas (dezenas fixas/excluídas)."}
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Comparação percentual entre a carteira gerada e a baseline por faixa de acerto</caption>
          <thead>
            <tr className="text-xs text-slate-500">
              <th scope="col" className="py-1 pr-2">
                Métrica
              </th>
              <th scope="col" className="py-1 pr-2">
                Carteira
              </th>
              <th scope="col" className="py-1 pr-2">
                Baseline
              </th>
              <th scope="col" className="py-1">
                Diferença (p.p.)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="py-1 pr-2 font-medium text-slate-700">{row.label}</td>
                <td className="py-1 pr-2">{row.portfolioPercent === null ? "—" : `${row.portfolioPercent.toFixed(4)}%`}</td>
                <td className="py-1 pr-2">{row.baselinePercent === null ? "—" : `${row.baselinePercent.toFixed(4)}%`}</td>
                <td className="py-1">{row.absoluteDifference === null ? "—" : `${row.absoluteDifference >= 0 ? "+" : ""}${row.absoluteDifference.toFixed(4)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
