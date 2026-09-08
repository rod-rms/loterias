import type { ProbabilityStatus } from "../types";
import { getStatusPresentation } from "../lib/statusPresentation";
import { InfoHelp } from "./InfoHelp";

const CLASS: Record<ProbabilityStatus, string> = {
  exact: "bg-emerald-50 text-emerald-700 border-emerald-300",
  estimated: "bg-amber-50 text-amber-700 border-amber-300",
  upper_bound: "bg-slate-50 text-slate-600 border-slate-300",
  lower_bound: "bg-slate-50 text-slate-600 border-slate-300",
  not_computed: "bg-slate-50 text-slate-400 border-slate-200",
};

export function MetricStatusBadge({ status }: { status: ProbabilityStatus }) {
  const presentation = getStatusPresentation(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${CLASS[status]}`}>
      {presentation.label}
      <InfoHelp title={presentation.helpTitle} body={presentation.helpBody} />
    </span>
  );
}
