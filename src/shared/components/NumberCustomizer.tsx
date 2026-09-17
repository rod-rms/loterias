import { useState } from "react";
import { InfoHelp } from "./InfoHelp";
import { NumberChip } from "./NumberChip";

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
 * Off by default ("Quero personalizar" starts unchecked, so nothing here
 * looks pre-selected). When turned on, two independent sections are shown
 * at the same time — "devem aparecer em todos os jogos" and "não quero
 * usar" — each with its own number grid and summary, so the user isn't
 * forced into a single active mode. A number still can never belong to
 * both lists: a chip already claimed by the other section is disabled in
 * its own section's grid.
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
  const [enabled, setEnabled] = useState(fixedNumbers.length > 0 || excludedNumbers.length > 0);
  const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-brand-text">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-brand-border"
        />
        Quer personalizar suas dezenas?
        <span className="rounded-full bg-brand-surfaceElevated px-2 py-0.5 text-[11px] font-normal text-brand-textMuted">Opcional</span>
      </label>

      {enabled && (
        <div className="space-y-5">
          <NumberSection
            title="Dezenas que devem aparecer em todos os jogos"
            variant="fixed"
            numbers={numbers}
            pad={pad}
            selected={fixedNumbers}
            blockedBy={excludedNumbers}
            onToggle={onToggleFixed}
            onClear={onClearFixed}
            disabled={disabled}
            emptyLabel="nenhuma"
            help={{ title: "Dezenas obrigatórias", body: "As dezenas selecionadas aqui aparecerão em todos os jogos gerados." }}
          />
          <NumberSection
            title="Dezenas que não quero usar"
            variant="excluded"
            numbers={numbers}
            pad={pad}
            selected={excludedNumbers}
            blockedBy={fixedNumbers}
            onToggle={onToggleExcluded}
            onClear={onClearExcluded}
            disabled={disabled}
            emptyLabel="nenhuma"
            help={{ title: "Dezenas não usadas", body: "As dezenas selecionadas aqui não aparecerão em nenhum dos jogos gerados." }}
          />
        </div>
      )}
    </div>
  );
}

function NumberSection({
  title,
  variant,
  numbers,
  pad,
  selected,
  blockedBy,
  onToggle,
  onClear,
  disabled,
  emptyLabel,
  help,
}: {
  title: string;
  variant: "fixed" | "excluded";
  numbers: number[];
  pad: (n: number) => string;
  selected: number[];
  blockedBy: number[];
  onToggle: (n: number) => void;
  onClear: () => void;
  disabled?: boolean;
  emptyLabel: string;
  help: { title: string; body: string };
}) {
  const activeStyle =
    variant === "fixed" ? "border-amber-500 bg-amber-900/50 text-amber-200" : "border-rose-700 bg-rose-950/40 text-rose-300 line-through";
  const chipVariant = variant;
  const statusWord = variant === "fixed" ? "obrigatória" : "não usar";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <h4 className="text-sm font-medium text-brand-text">{title}</h4>
        <InfoHelp title={help.title} body={help.body} />
      </div>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10" role="group" aria-label={title}>
        {numbers.map((n) => {
          const isSelected = selected.includes(n);
          const isBlocked = blockedBy.includes(n);
          return (
            <button
              key={n}
              type="button"
              disabled={disabled || isBlocked}
              aria-pressed={isSelected}
              aria-label={`Dezena ${pad(n)}${isSelected ? `, ${statusWord}` : ""}`}
              onClick={() => onToggle(n)}
              className={`h-9 rounded-md border font-mono text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus disabled:opacity-30 ${
                isSelected ? activeStyle : "border-brand-border bg-brand-surface text-brand-text hover:border-brand-borderStrong"
              }`}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {selected.length === 0 ? (
          <span className="text-brand-textMuted">{emptyLabel}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {[...selected].sort((a, b) => a - b).map((n) => (
              <NumberChip key={n} value={n} variant={chipVariant} size="sm" />
            ))}
          </div>
        )}
        {selected.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs font-medium text-brand-textMuted underline-offset-2 hover:underline">
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
