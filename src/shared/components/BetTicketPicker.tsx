import { NumberChip } from "./NumberChip";

interface BetTicketPickerProps {
  tickets: number[][];
  /** 1-based ticket numbers currently selected as bet. */
  selected: number[];
  onChange: (selected: number[]) => void;
}

/** Checkbox list of every generated ticket (original J numbering). Choosing here never changes the tickets themselves. */
export function BetTicketPicker({ tickets, selected, onChange }: BetTicketPickerProps) {
  const set = new Set(selected);
  function toggle(n: number) {
    const next = new Set(set);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange([...next].sort((a, b) => a - b));
  }
  return (
    <div className="space-y-2">
      <ul className="max-h-72 space-y-1 overflow-y-auto" aria-label="Jogos apostados">
        {tickets.map((ticket, idx) => {
          const n = idx + 1;
          return (
            <li key={n}>
              <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded border border-brand-border px-2 py-1.5 text-sm">
                <input type="checkbox" checked={set.has(n)} onChange={() => toggle(n)} aria-label={`J${n} apostado`} className="h-4 w-4" />
                <span className="w-8 shrink-0 text-xs font-medium text-brand-textMuted">J{n}</span>
                <span className="flex flex-wrap gap-1">
                  {ticket.map((num) => (
                    <NumberChip key={num} value={num} size="sm" />
                  ))}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-brand-textMuted" role="status">
        {selected.length} de {tickets.length} {tickets.length === 1 ? "jogo marcado" : "jogos marcados"} como {selected.length === 1 ? "apostado" : "apostados"}
      </p>
    </div>
  );
}
