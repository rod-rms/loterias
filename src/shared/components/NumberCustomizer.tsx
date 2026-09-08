import { useState } from "react";
import { InfoHelp } from "./InfoHelp";
import { NumberChip } from "./NumberChip";

type Mode = "fixed" | "excluded";

interface NumberCustomizerProps {
  maxNumber: number;
  fixedNumbers: number[];
  excludedNumbers: number[];
  onToggleFixed: (n: number) => void;
  onToggleExcluded: (n: number) => void;
  onClearFixed: () => void;
  onClearExcluded: () => void;
  disabled?: boolean;
}

/**
 * Explicit-mode number customization: the user picks a mode ("Incluir
 * obrigatoriamente" or "Não usar"), then taps number chips to add/remove
 * them from that list. Replaces the old 3-click cycle (fixed -> excluded ->
 * clear), which required the user to remember an implicit state machine.
 * A number can never be both fixed and excluded: chips belonging to the
 * other list are visibly disabled while a mode is active.
 */
export function NumberCustomizer({
  maxNumber,
  fixedNumbers,
  excludedNumbers,
  onToggleFixed,
  onToggleExcluded,
  onClearFixed,
  onClearExcluded,
  disabled,
}: NumberCustomizerProps) {
  const [mode, setMode] = useState<Mode>("fixed");
  const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-3">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          Quer personalizar suas dezenas?
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500">Opcional</span>
        </h3>
      </div>

      <div role="radiogroup" aria-label="Modo de personalização de dezenas" className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-1">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "fixed"}
            disabled={disabled}
            onClick={() => setMode("fixed")}
            className={`rounded px-2 py-1.5 text-sm ${
              mode === "fixed" ? "bg-amber-50 text-amber-900" : "bg-transparent text-slate-700"
            } disabled:opacity-40`}
          >
            Incluir obrigatoriamente
          </button>
          <InfoHelp title="Incluir obrigatoriamente" body="As dezenas selecionadas aparecerão em todos os jogos gerados." />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-1">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "excluded"}
            disabled={disabled}
            onClick={() => setMode("excluded")}
            className={`rounded px-2 py-1.5 text-sm ${
              mode === "excluded" ? "bg-rose-50 text-rose-800" : "bg-transparent text-slate-700"
            } disabled:opacity-40`}
          >
            Não usar
          </button>
          <InfoHelp title="Não usar" body="As dezenas selecionadas não aparecerão em nenhum dos jogos gerados." />
        </span>
      </div>

      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10" role="group" aria-label="Seleção de dezenas">
        {numbers.map((n) => {
          const isFixed = fixedNumbers.includes(n);
          const isExcluded = excludedNumbers.includes(n);
          const blockedByOtherMode = mode === "fixed" ? isExcluded : isFixed;
          const selectedInCurrentMode = mode === "fixed" ? isFixed : isExcluded;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled || blockedByOtherMode}
              aria-pressed={selectedInCurrentMode}
              aria-label={`Dezena ${pad(n)}${isFixed ? ", obrigatória" : isExcluded ? ", não usar" : ""}`}
              onClick={() => (mode === "fixed" ? onToggleFixed(n) : onToggleExcluded(n))}
              className={`h-9 rounded-md border font-mono text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-30 ${
                isFixed
                  ? "border-amber-500 bg-amber-100 text-amber-900"
                  : isExcluded
                    ? "border-rose-300 bg-rose-50 text-rose-600 line-through"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
              }`}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-700">Obrigatórias:</span>
          {fixedNumbers.length === 0 ? (
            <span className="text-slate-400">nenhuma</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {[...fixedNumbers].sort((a, b) => a - b).map((n) => (
                <NumberChip key={n} value={n} variant="fixed" size="sm" />
              ))}
            </div>
          )}
          {fixedNumbers.length > 0 && (
            <button type="button" onClick={onClearFixed} className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline">
              Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-700">Não usar:</span>
          {excludedNumbers.length === 0 ? (
            <span className="text-slate-400">nenhuma</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {[...excludedNumbers].sort((a, b) => a - b).map((n) => (
                <NumberChip key={n} value={n} variant="excluded" size="sm" />
              ))}
            </div>
          )}
          {excludedNumbers.length > 0 && (
            <button type="button" onClick={onClearExcluded} className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline">
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
