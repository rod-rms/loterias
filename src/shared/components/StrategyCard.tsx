import type { StrategyDefinition } from "../types";
import { StrategyBadge } from "./StrategyBadge";

interface StrategyCardProps {
  strategy: StrategyDefinition;
  selected: boolean;
  onSelect: () => void;
}

export function StrategyCard({ strategy, selected, onSelect }: StrategyCardProps) {
  const quantityLabel =
    strategy.ticketCount.mode === "fixed"
      ? `${strategy.ticketCount.fixed} jogos (fixo)`
      : `${strategy.ticketCount.min}–${strategy.ticketCount.max} jogos`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
        selected ? "border-slate-900 bg-slate-900/[0.03] ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-400"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{strategy.name}</h3>
        <StrategyBadge evidence={strategy.evidence} status={strategy.status} />
      </div>
      <p className="mt-1 text-sm text-slate-600">{strategy.shortDescription}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-500">
        <div>
          <dt className="inline font-medium text-slate-600">Quantidade: </dt>
          <dd className="inline">{quantityLabel}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-slate-600">Histórico: </dt>
          <dd className="inline">{strategy.requiresHistoricalDraws ? `sim (${strategy.historyWindowSize ?? "?"} concursos)` : "não"}</dd>
        </div>
      </dl>
      {strategy.optimizedMetrics.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Otimiza: </span>
          {strategy.optimizedMetrics.join(", ")}
        </p>
      )}
    </button>
  );
}
