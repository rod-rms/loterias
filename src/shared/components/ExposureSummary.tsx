import { NumberChip } from "./NumberChip";

export function ExposureSummary({ exposure }: { exposure: Record<number, number> }) {
  const numbers = Object.keys(exposure)
    .map(Number)
    .sort((a, b) => a - b);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="text-sm font-semibold text-slate-800">Exposição das dezenas</h4>
      <p className="mt-1 text-xs text-slate-500">Quantidade de jogos em que cada dezena aparece.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {numbers.map((n) => (
          <div key={n} className="flex flex-col items-center gap-0.5">
            <NumberChip value={n} size="sm" />
            <span className="text-[10px] text-slate-500">{exposure[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
