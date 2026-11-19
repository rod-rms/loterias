import { useState } from "react";
import { CircleHelp } from "lucide-react";
import type { StrategyDefinition } from "../types";
import { StrategyBadge } from "./StrategyBadge";
import { InfoHelp } from "./InfoHelp";

interface StrategyCardProps {
  strategy: StrategyDefinition;
  selected: boolean;
  onSelect: () => void;
}

const EVIDENCE_LABEL: Record<StrategyDefinition["evidence"], string> = {
  baseline: "Baseline",
  mathematical: "Matemática",
  structural: "Estrutural",
  experimental: "Experimental",
};

/**
 * One strategy option (UI-001): a divided row with a radio-like marker instead of a boxed card. Selection is neutral
 * (ink), not violet: violet is reserved for the primary action. Keeps the "Como funciona?" help and the technical details.
 */
export function StrategyCard({ strategy, selected, onSelect }: StrategyCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const quantityLabel = strategy.ticketCount.mode === "fixed" ? `${strategy.ticketCount.fixed} jogos fixos` : `${strategy.ticketCount.min}–${strategy.ticketCount.max} jogos`;

  return (
    <div data-testid={`strategy-card-${strategy.id}`} className={`border-b border-ink-500 py-3 ${selected ? "bg-ink-700/60" : ""}`}>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="flex w-full items-start gap-3 rounded px-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus">
        <span aria-hidden className={`mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-ink-100" : "border-ink-400"}`}>
          {selected && <span className="h-2 w-2 rounded-full bg-ink-100" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-medium text-ink-100">{strategy.ux.title}</h3>
            <StrategyBadge label={strategy.ux.badge} />
          </div>
          <p className="mt-0.5 text-sm text-ink-200">{strategy.ux.summary}</p>
          <p className="mt-1 font-mono text-xs tabular-nums text-ink-300">{quantityLabel}</p>
        </div>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-4 pl-9">
        <InfoHelp
          title={strategy.ux.helpTitle}
          body={strategy.ux.helpBody}
          triggerContent={
            <span className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline">
              Como funciona?
              <CircleHelp aria-hidden className="h-3.5 w-3.5" />
            </span>
          }
        />
        <button type="button" onClick={() => setShowTechnical((v) => !v)} aria-expanded={showTechnical} className="text-xs font-medium text-ink-200 underline-offset-2 hover:text-ink-100 hover:underline">
          {showTechnical ? "Ocultar detalhes técnicos" : "Detalhes técnicos"}
        </button>
      </div>

      {showTechnical && (
        <dl className="mt-3 grid grid-cols-1 gap-x-2 gap-y-1 border-t border-ink-500 pl-9 pt-2 text-xs text-ink-200 [overflow-wrap:anywhere] sm:grid-cols-2">
          <div>
            <dt className="inline font-medium text-ink-200">Nome técnico: </dt>
            <dd className="inline">{strategy.ux.technicalName}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-ink-200">Identificador: </dt>
            <dd className="inline font-mono">{strategy.id}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-ink-200">Versão: </dt>
            <dd className="inline">{strategy.version}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-ink-200">Evidência: </dt>
            <dd className="inline">{EVIDENCE_LABEL[strategy.evidence]}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-ink-200">Histórico: </dt>
            <dd className="inline">{strategy.requiresHistoricalDraws ? `sim (${strategy.historyWindowSize ?? "?"} concursos)` : "não"}</dd>
          </div>
          {strategy.optimizedMetrics.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="inline font-medium text-ink-200">Otimiza: </dt>
              <dd className="inline">{strategy.optimizedMetrics.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
