import type { ReactNode } from "react";
import { funnelHalfWidth, normalQuantile, bonferroniLevel } from "../../../shared/lib/analysisStats";
import { ANALYSIS_LEVEL, FAMILY_SIZE, type BinStat, type Reference, type StrategyStats } from "../../../shared/lib/backtestAnalysis";

/** Hand-rolled SVG charts (no chart library). Text is HTML wherever possible so it stays readable at 360 px. */

import { MUTED, REF, seriesStyle } from "./format";

// ---- dot-and-whisker rows ------------------------------------------------------------------------------------------

export interface WhiskerRow {
  id: string;
  label: string;
  mean: number;
  low: number;
  high: number;
  note?: ReactNode;
}

/** One row per strategy: label and numbers in HTML, an SVG strip with the interval and the (shared) random reference. */
export function WhiskerChart({ rows, reference, referenceLabel, format, ariaLabel, includeZero = false }: {
  rows: WhiskerRow[];
  reference: number;
  referenceLabel: string;
  format: (x: number) => string;
  ariaLabel: string;
  includeZero?: boolean;
}) {
  const lo0 = Math.min(reference, ...rows.map((r) => r.low), ...(includeZero ? [0] : []));
  const hi0 = Math.max(reference, ...rows.map((r) => r.high));
  const pad = (hi0 - lo0) * 0.08 || 0.01;
  const lo = lo0 - pad;
  const hi = hi0 + pad;
  const W = 320;
  const x = (v: number) => ((v - lo) / (hi - lo)) * W;
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.id}>
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="font-medium text-brand-text">{r.label}</span>
            <span className="font-mono text-xs tabular-nums text-brand-textMuted">
              {format(r.mean)} · IC95% [{format(r.low)}; {format(r.high)}]
            </span>
          </p>
          <svg viewBox={`0 0 ${W} 22`} className="mt-1 h-[22px] w-full" role="img" aria-label={`${r.label}: ${format(r.mean)}, intervalo de ${format(r.low)} a ${format(r.high)}; referência aleatória ${format(reference)}`}>
            <line x1={0} x2={W} y1={11} y2={11} stroke={MUTED} strokeOpacity={0.2} />
            <line x1={x(reference)} x2={x(reference)} y1={1} y2={21} stroke={REF} strokeWidth={2} />
            <line x1={x(r.low)} x2={x(r.high)} y1={11} y2={11} stroke={seriesStyle(i).color} strokeWidth={3} strokeLinecap="round" />
            <line x1={x(r.low)} x2={x(r.low)} y1={6} y2={16} stroke={seriesStyle(i).color} strokeWidth={2} />
            <line x1={x(r.high)} x2={x(r.high)} y1={6} y2={16} stroke={seriesStyle(i).color} strokeWidth={2} />
            <circle cx={x(r.mean)} cy={11} r={4} fill="#101729" stroke={seriesStyle(i).color} strokeWidth={2} />
          </svg>
          {r.note && <p className="text-xs text-brand-textMuted">{r.note}</p>}
        </li>
      ))}
      <li className="flex items-center gap-2 text-xs text-brand-textMuted">
        <svg viewBox="0 0 16 12" className="h-3 w-4" aria-hidden>
          <line x1={8} x2={8} y1={0} y2={12} stroke={REF} strokeWidth={2} />
        </svg>
        Linha verde: {referenceLabel} ({format(reference)})
      </li>
    </ul>
  );
}

// ---- distribution (observed share vs exact) --------------------------------------------------------------------

export function DistributionChart({ bins, color, ariaLabel }: { bins: BinStat[]; color: string; ariaLabel: string }) {
  const W = 340;
  const H = 190;
  const left = 8;
  const bottom = 24;
  const top = 8;
  const plotW = W - left - 4;
  const plotH = H - bottom - top;
  const maxV = Math.max(...bins.map((b) => Math.max(b.theory, b.share.high)), 0.0001) * 1.1;
  const slot = plotW / bins.length;
  const barW = slot * 0.5;
  const y = (v: number) => top + plotH - (v / maxV) * plotH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <line x1={left} x2={W - 4} y1={top + plotH} y2={top + plotH} stroke={MUTED} strokeOpacity={0.5} />
      {bins.map((b, i) => {
        const cx = left + slot * i + slot / 2;
        return (
          <g key={b.label}>
            <rect x={cx - barW / 2} y={y(b.share.mean)} width={barW} height={top + plotH - y(b.share.mean)} fill={color} fillOpacity={0.75} />
            <line x1={cx} x2={cx} y1={y(b.share.high)} y2={y(b.share.low)} stroke="#FFFFFF" strokeWidth={1.5} />
            <line x1={cx - 3} x2={cx + 3} y1={y(b.share.high)} y2={y(b.share.high)} stroke="#FFFFFF" strokeWidth={1.5} />
            <line x1={cx - 3} x2={cx + 3} y1={y(b.share.low)} y2={y(b.share.low)} stroke="#FFFFFF" strokeWidth={1.5} />
            <polygon points={`${cx},${y(b.theory) - 5} ${cx + 5},${y(b.theory)} ${cx},${y(b.theory) + 5} ${cx - 5},${y(b.theory)}`} fill={REF} stroke="#101729" strokeWidth={1} />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={MUTED}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- cumulative difference inside a variation funnel -------------------------------------------------------------

export function FunnelChart({ strategies, reference, ariaLabel }: { strategies: StrategyStats[]; reference: Reference; ariaLabel: string }) {
  const n = Math.max(...strategies.map((s) => s.cumulative.length));
  const z95 = normalQuantile(1 - (1 - ANALYSIS_LEVEL) / 2);
  const zFam = normalQuantile(1 - (1 - bonferroniLevel(ANALYSIS_LEVEL, FAMILY_SIZE)) / 2);
  const sd = reference.portfolioSd;
  const W = 340;
  const H = 230;
  const left = 4;
  const right = 4;
  const top = 8;
  const bottom = 22;
  const half = Math.max(funnelHalfWidth(n, sd, zFam), ...strategies.flatMap((s) => s.cumulative.map(Math.abs))) * 1.05;
  const x = (k: number) => left + ((k - 0) / n) * (W - left - right);
  const y = (v: number) => top + (H - top - bottom) / 2 - (v / half) * ((H - top - bottom) / 2);
  const band = (z: number) => {
    const ks = Array.from({ length: 41 }, (_, i) => Math.max(1, Math.round((i / 40) * n)));
    const upper = ks.map((k) => `${x(k).toFixed(1)},${y(funnelHalfWidth(k, sd, z)).toFixed(1)}`);
    const lower = ks.map((k) => `${x(k).toFixed(1)},${y(-funnelHalfWidth(k, sd, z)).toFixed(1)}`).reverse();
    return [`${x(0)},${y(0)}`, ...upper, ...lower].join(" ");
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <polygon points={band(zFam)} fill={REF} fillOpacity={0.07} stroke={REF} strokeOpacity={0.35} strokeDasharray="2 3" />
      <polygon points={band(z95)} fill={REF} fillOpacity={0.14} stroke={REF} strokeOpacity={0.6} />
      <line x1={left} x2={W - right} y1={y(0)} y2={y(0)} stroke={REF} strokeWidth={1.5} />
      {strategies.map((s, i) => (
        <polyline
          key={s.strategyId}
          fill="none"
          stroke={seriesStyle(i).color}
          strokeWidth={1.8}
          strokeDasharray={seriesStyle(i).dash}
          points={s.cumulative.map((v, k) => `${x(k + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
        />
      ))}
      <text x={left} y={H - 6} fontSize={11} fill={MUTED}>
        1
      </text>
      <text x={W - right} y={H - 6} fontSize={11} fill={MUTED} textAnchor="end">
        {n} concursos
      </text>
    </svg>
  );
}
