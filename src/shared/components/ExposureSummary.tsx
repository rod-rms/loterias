import { NumberChip } from "./NumberChip";
import { InfoHelp } from "./InfoHelp";

export function ExposureSummary({ exposure }: { exposure: Record<number, number> }) {
  const numbers = Object.keys(exposure)
    .map(Number)
    .sort((a, b) => a - b);
  return (
    <div className="border-t border-ink-500 pt-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink-100">
        Quantas vezes cada dezena aparece
        <InfoHelp title="Quantas vezes cada dezena aparece" body="Mostra em quantos jogos do conjunto cada dezena foi utilizada." />
      </h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {numbers.map((n) => (
          <div key={n} className="flex flex-col items-center gap-0.5">
            <NumberChip value={n} size="sm" />
            <span className="text-xs text-ink-200">{exposure[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
