import type { ProbabilityStatus } from "../types";

const LABEL: Record<ProbabilityStatus, string> = {
  exact: "Exato",
  estimated: "Estimado",
  upper_bound: "Limite superior",
  lower_bound: "Limite inferior",
  not_computed: "Não calculado",
};

const CLASS: Record<ProbabilityStatus, string> = {
  exact: "bg-emerald-50 text-emerald-700 border-emerald-300",
  estimated: "bg-amber-50 text-amber-700 border-amber-300",
  upper_bound: "bg-slate-50 text-slate-600 border-slate-300",
  lower_bound: "bg-slate-50 text-slate-600 border-slate-300",
  not_computed: "bg-slate-50 text-slate-400 border-slate-200",
};

export function MetricStatusBadge({ status }: { status: ProbabilityStatus }) {
  return <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${CLASS[status]}`}>{LABEL[status]}</span>;
}
