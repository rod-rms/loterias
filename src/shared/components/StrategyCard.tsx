import { useState } from "react";
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
      className={`w-full rounded-xl border p-4 text-left transition ${
        selected ? "border-slate-900 bg-slate-900/[0.03] ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{strategy.ux.title}</h3>
          <StrategyBadge label={strategy.ux.badge} />
        </div>
        <p className="mt-1 text-sm text-slate-600">{strategy.ux.summary}</p>
        <p className="mt-2 text-xs text-slate-500">{quantityLabel}</p>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <InfoHelp title={strategy.ux.helpTitle} body={strategy.ux.helpBody} label={`Como funciona: ${strategy.ux.title}`} />
        <button
          type="button"
          onClick={() => setShowTechnical((v) => !v)}
          aria-expanded={showTechnical}
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
        >
          {showTechnical ? "Ocultar detalhes técnicos" : "Detalhes técnicos"}
        </button>
      </div>

      {showTechnical && (
        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
          <div>
            <dt className="inline font-medium text-slate-600">Nome técnico: </dt>
            <dd className="inline">{strategy.ux.technicalName}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-slate-600">Identificador: </dt>
            <dd className="inline font-mono">{strategy.id}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-slate-600">Versão: </dt>
            <dd className="inline">{strategy.version}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-slate-600">Evidência: </dt>
            <dd className="inline">{EVIDENCE_LABEL[strategy.evidence]}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-slate-600">Histórico: </dt>
            <dd className="inline">{strategy.requiresHistoricalDraws ? `sim (${strategy.historyWindowSize ?? "?"} concursos)` : "não"}</dd>
          </div>
          {strategy.optimizedMetrics.length > 0 && (
            <div className="col-span-2">
              <dt className="inline font-medium text-slate-600">Otimiza: </dt>
              <dd className="inline">{strategy.optimizedMetrics.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
