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

export function StrategyCard({ strategy, selected, onSelect }: StrategyCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const quantityLabel =
    strategy.ticketCount.mode === "fixed"
      ? `${strategy.ticketCount.fixed} jogos fixos`
      : `${strategy.ticketCount.min}–${strategy.ticketCount.max} jogos`;

  return (
    <div
      data-testid={`strategy-card-${strategy.id}`}
      className={`w-full rounded-xl border p-4 text-left transition ${
        selected ? "border-brand-action bg-brand-action/[0.03] ring-1 ring-brand-focus" : "border-brand-border bg-brand-surface hover:border-brand-borderStrong"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-brand-text">{strategy.ux.title}</h3>
          <StrategyBadge label={strategy.ux.badge} />
        </div>
        <p className="mt-1 text-sm text-brand-textMuted">{strategy.ux.summary}</p>
        <p className="mt-2 text-xs text-brand-textMuted">{quantityLabel}</p>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-4">
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
        <button
          type="button"
          onClick={() => setShowTechnical((v) => !v)}
          aria-expanded={showTechnical}
          className="text-xs font-medium text-brand-textMuted underline-offset-2 hover:text-brand-text hover:underline"
        >
          {showTechnical ? "Ocultar detalhes técnicos" : "Detalhes técnicos"}
        </button>
      </div>

      {showTechnical && (
        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-brand-border pt-2 text-xs text-brand-textMuted">
          <div>
            <dt className="inline font-medium text-brand-textMuted">Nome técnico: </dt>
            <dd className="inline">{strategy.ux.technicalName}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-brand-textMuted">Identificador: </dt>
            <dd className="inline font-mono">{strategy.id}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-brand-textMuted">Versão: </dt>
            <dd className="inline">{strategy.version}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-brand-textMuted">Evidência: </dt>
            <dd className="inline">{EVIDENCE_LABEL[strategy.evidence]}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-brand-textMuted">Histórico: </dt>
            <dd className="inline">{strategy.requiresHistoricalDraws ? `sim (${strategy.historyWindowSize ?? "?"} concursos)` : "não"}</dd>
          </div>
          {strategy.optimizedMetrics.length > 0 && (
            <div className="col-span-2">
              <dt className="inline font-medium text-brand-textMuted">Otimiza: </dt>
              <dd className="inline">{strategy.optimizedMetrics.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
