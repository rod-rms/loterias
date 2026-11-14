import type { CSSProperties } from "react";
import type { LotteryDataset, SavedPortfolio } from "../types";
import { InfoHelp } from "./InfoHelp";
import { estimateDrawDate, formatEstimatedDraw } from "../lib/drawSchedule";
import { formatDatePtBR } from "../utils/numberFormat";
import { formatBRL } from "../utils/currency";
import { strategyRegistry } from "../lib/strategyRegistry";
import { getCurrentBetTicketNumbers } from "../lib/betSelection";
import { findModalityById, modalityCssVars, useModalities } from "../lib/modalityRegistry";

interface SavedPortfolioCardProps {
  portfolio: SavedPortfolio;
  /** Dataset of this portfolio's modality, when already loaded; enables the draw-date line. */
  dataset?: LotteryDataset | null;
  onOpen: () => void;
  onEditBet: () => void;
  onRemoveBet: () => void;
  onDelete: () => void;
}

function DrawDateLine({ portfolio, dataset, name }: { portfolio: SavedPortfolio; dataset?: LotteryDataset | null; name: string }) {
  if (!portfolio.contest || !dataset) return null;
  const draw = dataset.draws.find((d) => d.contest === portfolio.contest);
  if (draw) return <p className="text-xs text-ink-200">Sorteio realizado em {formatDatePtBR(draw.drawDate)}</p>;
  const estimate = estimateDrawDate(portfolio.modality, portfolio.contest, dataset);
  if (!estimate) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-ink-200" data-testid="estimated-draw">
      {formatEstimatedDraw(estimate)}
      <InfoHelp
        title="Data estimada do sorteio"
        body={`Estimativa calculada pela periodicidade semanal oficial da ${name}. O calendário oficial mensal da CAIXA prevalece em feriados ou alterações de agenda: a data pode mudar.`}
      />
    </p>
  );
}

/** A saved portfolio in the list (UI-001): modality identity as a left accent from the registry, no nested boxes. */
export function SavedPortfolioCard({ portfolio, dataset, onOpen, onEditBet, onRemoveBet, onDelete }: SavedPortfolioCardProps) {
  const entry = findModalityById(useModalities(), portfolio.modality);
  const name = entry?.displayName ?? portfolio.modality;
  const strategyTitle = strategyRegistry.get(portfolio.strategyId)?.ux.title ?? portfolio.strategyId;
  const total = portfolio.tickets.length;
  const betCount = getCurrentBetTicketNumbers(portfolio).length;
  const hasBet = betCount > 0;
  const betStatus = hasBet ? `${betCount}/${total} apostados` : "Aposta não registrada";
  return (
    <div data-testid="saved-card" data-modality={portfolio.modality} style={modalityCssVars(entry) as CSSProperties} className="border-l-2 border-l-mod-accent bg-ink-700 py-3 pl-4 pr-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink-100">
            {name} · {strategyTitle}
          </p>
          <p className="text-xs text-ink-200">
            Concurso <span className="font-mono tabular-nums">{portfolio.contest ?? "—"}</span>
          </p>
          <DrawDateLine portfolio={portfolio} dataset={dataset} name={name} />
          <p className="text-xs text-ink-200">
            Carteira gerada: {total} {total === 1 ? "jogo" : "jogos"} · {formatBRL(portfolio.price.ticketCostBRL * total)}
          </p>
          {hasBet && (
            <p className="text-xs text-ink-200">
              Apostados: {betCount} {betCount === 1 ? "jogo" : "jogos"} · custo de referência {formatBRL(portfolio.price.ticketCostBRL * betCount)}
            </p>
          )}
          <p className="text-xs text-ink-300">Criada em {new Date(portfolio.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <span data-testid="bet-status" className={`rounded px-2 py-0.5 ${hasBet ? "bg-brand-success/15 text-brand-luckLight" : "bg-ink-600 text-ink-200"}`}>
            {betStatus}
          </span>
          {portfolio.checkedResult && <span className="rounded bg-ink-600 px-2 py-0.5 text-ink-200">Conferida</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={onOpen} className="rounded border border-ink-500 px-3 py-1.5 hover:bg-ink-600">
          Abrir
        </button>
        <button type="button" onClick={onEditBet} className="rounded border border-ink-500 px-3 py-1.5 hover:bg-ink-600">
          {hasBet ? "Editar jogos apostados" : "Registrar aposta"}
        </button>
        {hasBet && (
          <button type="button" onClick={onRemoveBet} className="rounded border border-ink-500 px-3 py-1.5 hover:bg-ink-600">
            Remover registro de aposta
          </button>
        )}
        <button type="button" onClick={onDelete} className="ml-auto rounded px-3 py-1.5 text-rose-300 hover:bg-rose-500/10">
          Excluir
        </button>
      </div>
    </div>
  );
}
