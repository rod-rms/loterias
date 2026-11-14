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

/** One metric as a stat (label, tabular value, status), separated by a hairline instead of a box (UI-001). */
export function MetricCard({ label, probability, status, helpTitle, helpBody, testId }: MetricCardProps) {
  const oneIn = formatOneIn(probability);
  return (
    <div className="border-l border-ink-500 pl-3" data-testid={testId}>
      <span className="inline-flex items-center gap-1 text-xs text-ink-300">
        {label}
        {helpTitle && helpBody && <InfoHelp title={helpTitle} body={helpBody} />}
      </span>
      <p className="mt-1 font-mono text-lg tabular-nums text-ink-100" data-testid={testId ? `${testId}-value` : undefined}>
        {formatProbabilityPercent(probability)}
      </p>
      {oneIn && <p className="font-mono text-xs tabular-nums text-ink-300">{oneIn}</p>}
      <div className="mt-1">
        <MetricStatusBadge status={status} />
      </div>
    </div>
  );
}
