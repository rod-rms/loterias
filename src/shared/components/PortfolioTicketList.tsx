import { useState } from "react";
import { NumberChip } from "./NumberChip";

interface PortfolioTicketListProps {
  tickets: number[][];
  pageSize?: number;
  highlightNumbers?: number[];
  onCopyTicket?: (ticket: number[]) => void;
  /** Hit count per ticket, same order/length as `tickets` — shown next to each ticket when provided. */
  hitsPerTicket?: number[];
  /** Full, non-duplicating descriptor for a hit count (e.g. "4 acertos · Quadra", "1 acerto", "12 acertos") — see formatHitResult. */
  formatHits?: (hits: number) => string;
  /** 1-based ticket numbers (J1, J2, ...) tied for the highest hit count, visually marked "Melhor". */
  bestTicketNumbers?: number[];
  /** Generic per-ticket status badge keyed by ORIGINAL 1-based ticket number (J numbering is preserved across pagination). */
  ticketBadges?: Record<number, { label: string; tone?: "neutral" | "muted" }>;
}

/** Generated games read like a ticket: one divided row per game, J number in a narrow column, numbers as chips (UI-001). */
export function PortfolioTicketList({ tickets, pageSize = 10, highlightNumbers, onCopyTicket, hitsPerTicket, formatHits, bestTicketNumbers, ticketBadges }: PortfolioTicketListProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const start = page * pageSize;
  const visible = tickets.slice(start, start + pageSize);
  const highlightSet = new Set(highlightNumbers ?? []);
  const bestSet = new Set(bestTicketNumbers ?? []);

  return (
    <div>
      <ul className="divide-y divide-ink-500 border-y border-ink-500" aria-label={`Lista de ${tickets.length} jogos`}>
        {visible.map((ticket, idx) => {
          const ticketNumber = start + idx + 1;
          const hits = hitsPerTicket?.[start + idx];
          const isBest = bestSet.has(ticketNumber);
          return (
            <li key={start + idx} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${isBest ? "bg-brand-success/10" : ""}`}>
              <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-ink-300">J{ticketNumber}</span>
              <div className="flex flex-wrap gap-1">
                {ticket.map((n) => (
                  <NumberChip key={n} value={n} variant={highlightSet.has(n) ? "hit" : "default"} size="sm" />
                ))}
              </div>
              {hits !== undefined && <span className="text-xs text-ink-200">{formatHits ? formatHits(hits) : `${hits} ${hits === 1 ? "acerto" : "acertos"}`}</span>}
              {ticketBadges?.[ticketNumber] && (
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${ticketBadges[ticketNumber]!.tone === "muted" ? "bg-ink-800 text-ink-300" : "bg-ink-600 text-ink-100"}`}
                  data-testid={`ticket-badge-J${ticketNumber}`}
                >
                  {ticketBadges[ticketNumber]!.label}
                </span>
              )}
              {isBest && (
                <span className="rounded bg-brand-success px-1.5 py-0.5 text-xs font-medium text-ink-950" data-testid={`best-ticket-badge-J${ticketNumber}`}>
                  Melhor
                </span>
              )}
              {onCopyTicket && (
                <button type="button" onClick={() => onCopyTicket(ticket)} className="ml-auto rounded px-2 py-1 text-xs text-ink-200 hover:bg-ink-600 hover:text-ink-100">
                  Copiar
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded border border-ink-500 px-2 py-1 disabled:opacity-40">
            Anterior
          </button>
          <span aria-live="polite">
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded border border-ink-500 px-2 py-1 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
