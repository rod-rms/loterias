import { useState } from "react";
import { NumberChip } from "./NumberChip";

interface PortfolioTicketListProps {
  tickets: number[][];
  pageSize?: number;
  highlightNumbers?: number[];
  onCopyTicket?: (ticket: number[]) => void;
  /** Hit count per ticket, same order/length as `tickets` — shown as "3 acertos" next to each ticket when provided. */
  hitsPerTicket?: number[];
  /** Conventional result label for a hit count (e.g. "Quadra"), or null when below the labeled threshold. */
  resultLabelFor?: (hits: number) => string | null;
  /** 1-based ticket numbers (J1, J2, ...) tied for the highest hit count, visually marked "Melhor". */
  bestTicketNumbers?: number[];
}

export function PortfolioTicketList({ tickets, pageSize = 10, highlightNumbers, onCopyTicket, hitsPerTicket, resultLabelFor, bestTicketNumbers }: PortfolioTicketListProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const start = page * pageSize;
  const visible = tickets.slice(start, start + pageSize);
  const highlightSet = new Set(highlightNumbers ?? []);
  const bestSet = new Set(bestTicketNumbers ?? []);

  return (
    <div>
      <ul className="space-y-2" aria-label={`Lista de ${tickets.length} jogos`}>
        {visible.map((ticket, idx) => {
          const ticketNumber = start + idx + 1;
          const hits = hitsPerTicket?.[start + idx];
          const label = hits !== undefined ? resultLabelFor?.(hits) ?? null : null;
          const isBest = bestSet.has(ticketNumber);
          return (
            <li key={start + idx} className={`flex flex-wrap items-center gap-2 rounded-lg border p-2.5 ${isBest ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
              <span className="w-12 shrink-0 text-xs font-medium text-slate-500">J{ticketNumber}</span>
              <div className="flex flex-wrap gap-1">
                {ticket.map((n) => (
                  <NumberChip key={n} value={n} variant={highlightSet.has(n) ? "hit" : "default"} size="sm" />
                ))}
              </div>
              {hits !== undefined && (
                <span className="text-xs font-medium text-slate-600">
                  {hits} {hits === 1 ? "acerto" : "acertos"}
                  {label ? ` · ${label}` : ""}
                </span>
              )}
              {isBest && (
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white" data-testid={`best-ticket-badge-J${ticketNumber}`}>
                  Melhor
                </span>
              )}
              {onCopyTicket && (
                <button
                  type="button"
                  onClick={() => onCopyTicket(ticket)}
                  className="ml-auto rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Copiar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span aria-live="polite">
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
