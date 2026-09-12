import type { SavedPortfolio } from "../types";
import { formatBRL } from "../utils/currency";
import { strategyRegistry } from "../lib/strategyRegistry";

interface SavedPortfolioCardProps {
  portfolio: SavedPortfolio;
  onOpen: () => void;
  onToggleBet: () => void;
  onDelete: () => void;
}

export function SavedPortfolioCard({ portfolio, onOpen, onToggleBet, onDelete }: SavedPortfolioCardProps) {
  const strategyTitle = strategyRegistry.get(portfolio.strategyId)?.ux.title ?? portfolio.strategyId;
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-text">
            {portfolio.modality === "lotofacil" ? "Lotofácil" : "Mega-Sena"} · {strategyTitle}
          </p>
          <p className="text-xs text-brand-textMuted">
            Concurso {portfolio.contest ?? "—"} · {portfolio.tickets.length} jogo(s) · {formatBRL(portfolio.price.ticketCostBRL * portfolio.tickets.length)}
          </p>
          <p className="text-xs text-brand-textMuted">Criada em {new Date(portfolio.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {portfolio.markedAsBet && <span className="rounded bg-emerald-950/40 px-2 py-0.5 text-emerald-300">Apostada</span>}
          {portfolio.checkedResult && <span className="rounded bg-brand-surfaceElevated px-2 py-0.5 text-brand-textMuted">Conferida</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={onOpen} className="rounded border border-brand-border px-3 py-1.5 hover:bg-white/5">
          Abrir
        </button>
        <button type="button" onClick={onToggleBet} className="rounded border border-brand-border px-3 py-1.5 hover:bg-white/5">
          {portfolio.markedAsBet ? "Desmarcar apostada" : "Marcar como apostada"}
        </button>
        <button type="button" onClick={onDelete} className="ml-auto rounded border border-rose-700 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10">
          Excluir
        </button>
      </div>
    </div>
  );
}
