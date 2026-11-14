import type { ProbabilityStatus } from "../types";
import { getStatusPresentation } from "../lib/statusPresentation";
import { InfoHelp } from "./InfoHelp";

const CLASS: Record<ProbabilityStatus, string> = {
  exact: "bg-emerald-950/40 text-emerald-300 border-emerald-700",
  estimated: "bg-amber-950/40 text-amber-300 border-amber-700",
  upper_bound: "bg-ink-600 text-ink-200 border-ink-500",
  lower_bound: "bg-ink-600 text-ink-200 border-ink-500",
  not_computed: "bg-ink-600 text-ink-200 border-ink-500",
};

export function MetricStatusBadge({ status }: { status: ProbabilityStatus }) {
  const presentation = getStatusPresentation(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${CLASS[status]}`}>
      {presentation.label}
      <InfoHelp title={presentation.helpTitle} body={presentation.helpBody} />
    </span>
  );
}
