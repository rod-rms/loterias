import { MetricStatusBadge } from "./MetricStatusBadge";
import type { ProbabilityStatus } from "../types";

interface MetricCardProps {
  label: string;
  percent: number | null;
  oneIn?: number | null;
  status: ProbabilityStatus;
}

export function MetricCard({ label, percent, oneIn, status }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <MetricStatusBadge status={status} />
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900">{percent === null ? "—" : `${percent.toFixed(4)}%`}</p>
      {oneIn !== null && oneIn !== undefined && Number.isFinite(oneIn) && <p className="text-xs text-slate-500">1 em {Math.round(oneIn).toLocaleString("pt-BR")}</p>}
    </div>
  );
}
