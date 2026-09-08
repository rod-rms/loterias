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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">
            {portfolio.modality === "lotofacil" ? "Lotofácil" : "Mega-Sena"} · {strategyTitle}
          </p>
          <p className="text-xs text-slate-500">
            Concurso {portfolio.contest ?? "—"} · {portfolio.tickets.length} jogo(s) · {formatBRL(portfolio.price.ticketCostBRL * portfolio.tickets.length)}
          </p>
          <p className="text-xs text-slate-400">Criada em {new Date(portfolio.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {portfolio.markedAsBet && <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">Apostada</span>}
          {portfolio.checkedResult && <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">Conferida</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={onOpen} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          Abrir
        </button>
        <button type="button" onClick={onToggleBet} className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
          {portfolio.markedAsBet ? "Desmarcar apostada" : "Marcar como apostada"}
        </button>
        <button type="button" onClick={onDelete} className="ml-auto rounded border border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50">
          Excluir
        </button>
      </div>
    </div>
  );
}
