import { useState } from "react";
import { NumberChip } from "./NumberChip";

interface PortfolioTicketListProps {
  tickets: number[][];
  pageSize?: number;
  highlightNumbers?: number[];
  onCopyTicket?: (ticket: number[]) => void;
}

export function PortfolioTicketList({ tickets, pageSize = 10, highlightNumbers, onCopyTicket }: PortfolioTicketListProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const start = page * pageSize;
  const visible = tickets.slice(start, start + pageSize);
  const highlightSet = new Set(highlightNumbers ?? []);

  return (
    <div>
      <ul className="space-y-2" aria-label={`Lista de ${tickets.length} jogos`}>
        {visible.map((ticket, idx) => (
          <li key={start + idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
            <span className="w-12 shrink-0 text-xs font-medium text-slate-500">J{start + idx + 1}</span>
            <div className="flex flex-wrap gap-1">
              {ticket.map((n) => (
                <NumberChip key={n} value={n} variant={highlightSet.has(n) ? "hit" : "default"} size="sm" />
              ))}
            </div>
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
        ))}
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
