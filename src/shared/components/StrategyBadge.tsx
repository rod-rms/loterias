import type { StrategyEvidence, StrategyStatus } from "../types";

const EVIDENCE_LABEL: Record<StrategyEvidence, string> = {
  baseline: "Baseline",
  mathematical: "Matemática",
  structural: "Estrutural",
  experimental: "Experimental",
};

const STATUS_LABEL: Record<StrategyStatus, string> = {
  active: "Ativa",
  experimental: "Experimental",
  research: "Pesquisa",
};

export function StrategyBadge({ evidence, status }: { evidence: StrategyEvidence; status: StrategyStatus }) {
  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
        {EVIDENCE_LABEL[evidence]}
      </span>
      {status !== "active" && (
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
          {STATUS_LABEL[status]}
        </span>
      )}
    </span>
  );
}
