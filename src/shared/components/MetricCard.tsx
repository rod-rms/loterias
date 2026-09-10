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
    <div className="rounded-lg border border-brand-border bg-brand-surface p-3" data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-textMuted">
          {label}
          {helpTitle && helpBody && <InfoHelp title={helpTitle} body={helpBody} />}
        </span>
      </div>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-brand-text" data-testid={testId ? `${testId}-value` : undefined}>
        {formatProbabilityPercent(probability)}
      </p>
      {oneIn && <p className="font-mono text-xs tabular-nums text-brand-textMuted">{oneIn}</p>}
      <div className="mt-1">
        <MetricStatusBadge status={status} />
      </div>
    </div>
  );
}
