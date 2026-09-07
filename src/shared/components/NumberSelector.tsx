interface NumberSelectorProps {
  maxNumber: number;
  fixedNumbers: number[];
  excludedNumbers: number[];
  onToggleFixed: (n: number) => void;
  onToggleExcluded: (n: number) => void;
  disabled?: boolean;
}

/** Accessible visual picker where a number can be fixed, excluded, or neither (never both). */
export function NumberSelector({ maxNumber, fixedNumbers, excludedNumbers, onToggleFixed, onToggleExcluded, disabled }: NumberSelectorProps) {
  const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10" role="group" aria-label="Seleção de dezenas fixas e excluídas">
        {numbers.map((n) => {
          const isFixed = fixedNumbers.includes(n);
          const isExcluded = excludedNumbers.includes(n);
          const state = isFixed ? "fixa" : isExcluded ? "excluída" : "neutra";
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-pressed={isFixed || isExcluded}
              aria-label={`Dezena ${String(n).padStart(2, "0")}, estado ${state}. Clique para fixar, clique novamente para excluir, clique de novo para limpar.`}
              onClick={() => {
                if (isFixed) {
                  onToggleFixed(n);
                  onToggleExcluded(n);
                } else if (isExcluded) {
                  onToggleExcluded(n);
                } else {
                  onToggleFixed(n);
                }
              }}
              className={`h-9 rounded-md border font-mono text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-40 ${
                isFixed
                  ? "border-amber-500 bg-amber-100 text-amber-900"
                  : isExcluded
                    ? "border-rose-300 bg-rose-50 text-rose-600 line-through"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
              }`}
            >
              {String(n).padStart(2, "0")}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Toque uma vez para marcar como fixa (âmbar), duas vezes para excluir (vermelho riscado), três vezes para limpar. Uma dezena nunca fica fixa e excluída ao mesmo tempo.
      </p>
    </div>
  );
}
