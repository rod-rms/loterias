interface OverlapSummaryProps {
  min: number;
  max: number;
  mean: number;
  histogram: Record<string, number>;
}

export function OverlapSummary({ min, max, mean, histogram }: OverlapSummaryProps) {
  const entries = Object.entries(histogram).sort((a, b) => Number(a[0]) - Number(b[0]));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-800">Sobreposição entre jogos</h4>
      <p className="mt-1 text-xs text-slate-500">
        Resumo: mínima {min}, média {mean.toFixed(2)}, máxima {max} dezenas em comum por par de jogos.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
        {entries.map(([value, count]) => (
          <li key={value} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
            {value} dezenas em comum: {count} par(es)
          </li>
        ))}
      </ul>
    </div>
  );
}
