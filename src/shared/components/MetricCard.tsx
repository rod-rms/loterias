import { MetricStatusBadge } from "./MetricStatusBadge";
import { InfoHelp } from "./InfoHelp";
import { formatOneIn, formatProbabilityPercent } from "../utils/probabilityFormat";
import type { ProbabilityStatus } from "../types";

interface MetricCardProps {
  label: string;
  probability: number | null;
  status: ProbabilityStatus;
  helpTitle?: string;
  helpBody?: string;
  testId?: string;
}

export function MetricCard({ label, probability, status, helpTitle, helpBody, testId }: MetricCardProps) {
  const oneIn = formatOneIn(probability);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          {label}
          {helpTitle && helpBody && <InfoHelp title={helpTitle} body={helpBody} />}
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900" data-testid={testId ? `${testId}-value` : undefined}>
        {formatProbabilityPercent(probability)}
      </p>
      {oneIn && <p className="text-xs text-slate-500">{oneIn}</p>}
      <div className="mt-1">
        <MetricStatusBadge status={status} />
      </div>
    </div>
  );
}
