import type { LotteryDataset, SavedPortfolio } from "../types";
import { InfoHelp } from "./InfoHelp";
import { estimateDrawDate, formatEstimatedDraw } from "../lib/drawSchedule";
import { formatDatePtBR } from "../utils/numberFormat";
import { formatBRL } from "../utils/currency";
import { strategyRegistry } from "../lib/strategyRegistry";
import { getCurrentBetTicketNumbers } from "../lib/betSelection";

interface SavedPortfolioCardProps {
  portfolio: SavedPortfolio;
  /** Dataset of this portfolio's modality, when already loaded; enables the draw-date line. */
  dataset?: LotteryDataset | null;
  onOpen: () => void;
  onEditBet: () => void;
  onRemoveBet: () => void;
  onDelete: () => void;
}

const MODALITY_ACCENT = { lotofacil: "border-l-brand-teal", megasena: "border-l-brand-blue" } as const;

function DrawDateLine({ portfolio, dataset }: { portfolio: SavedPortfolio; dataset?: LotteryDataset | null }) {
  if (!portfolio.contest || !dataset) return null;
  const draw = dataset.draws.find((d) => d.contest === portfolio.contest);
  if (draw) return <p className="text-xs text-brand-textMuted">Sorteio realizado em {formatDatePtBR(draw.drawDate)}</p>;
  const estimate = estimateDrawDate(portfolio.modality, portfolio.contest, dataset);
  if (!estimate) return null;
  const name = portfolio.modality === "lotofacil" ? "Lotofácil" : "Mega-Sena";
  return (
    <p className="flex items-center gap-1 text-xs text-brand-textMuted" data-testid="estimated-draw">
      {formatEstimatedDraw(estimate)}
      <InfoHelp
        title="Data estimada do sorteio"
        body={`Estimativa calculada pela periodicidade semanal oficial da ${name}. O calendário oficial mensal da CAIXA prevalece em feriados ou alterações de agenda: a data pode mudar.`}
      />
    </p>
  );
}

export function SavedPortfolioCard({ portfolio, dataset, onOpen, onEditBet, onRemoveBet, onDelete }: SavedPortfolioCardProps) {
  const strategyTitle = strategyRegistry.get(portfolio.strategyId)?.ux.title ?? portfolio.strategyId;
  const total = portfolio.tickets.length;
  const betCount = getCurrentBetTicketNumbers(portfolio).length;
  const hasBet = betCount > 0;
  const betStatus = hasBet ? `${betCount}/${total} apostados` : "Aposta não registrada";
  return (
    <div data-testid="saved-card" data-modality={portfolio.modality} className={`rounded-lg border border-l-4 border-brand-border ${MODALITY_ACCENT[portfolio.modality]} bg-brand-surface p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-text">
            {portfolio.modality === "lotofacil" ? "Lotofácil" : "Mega-Sena"} · {strategyTitle}
          </p>
          <p className="text-xs text-brand-textMuted">Concurso {portfolio.contest ?? "—"}</p>
          <DrawDateLine portfolio={portfolio} dataset={dataset} />
          <p className="text-xs text-brand-textMuted">
            Carteira gerada: {total} {total === 1 ? "jogo" : "jogos"} · {formatBRL(portfolio.price.ticketCostBRL * total)}
          </p>
          {hasBet && (
            <p className="text-xs text-brand-textMuted">
              Apostados: {betCount} {betCount === 1 ? "jogo" : "jogos"} · custo de referência {formatBRL(portfolio.price.ticketCostBRL * betCount)}
            </p>
          )}
          <p className="text-xs text-brand-textMuted">Criada em {new Date(portfolio.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span
            data-testid="bet-status"
            className={`rounded px-2 py-0.5 ${hasBet ? "bg-emerald-950/40 text-emerald-300" : "bg-brand-surfaceElevated text-brand-textMuted"}`}
          >
            {betStatus}
          </span>
          {portfolio.checkedResult && <span className="rounded bg-brand-surfaceElevated px-2 py-0.5 text-brand-textMuted">Conferida</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={onOpen} className="rounded border border-brand-border px-3 py-1.5 hover:bg-white/5">
          Abrir
        </button>
        <button type="button" onClick={onEditBet} className="rounded border border-brand-border px-3 py-1.5 hover:bg-white/5">
          {hasBet ? "Editar jogos apostados" : "Registrar aposta"}
        </button>
        {hasBet && (
          <button type="button" onClick={onRemoveBet} className="rounded border border-brand-border px-3 py-1.5 hover:bg-white/5">
            Remover registro de aposta
          </button>
        )}
        <button type="button" onClick={onDelete} className="ml-auto rounded border border-rose-700 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10">
          Excluir
        </button>
      </div>
    </div>
  );
}
