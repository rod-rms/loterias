import { funnelHalfWidth, normalQuantile, bonferroniLevel } from "../../../shared/lib/analysisStats";
import { ANALYSIS_LEVEL, FAMILY_SIZE, type BinStat, type Reference, type StrategyStats } from "../../../shared/lib/backtestAnalysis";

/** Hand-rolled SVG charts (no chart library). Text is HTML wherever possible so it stays readable at 360 px. */

import { MUTED, REF, seriesStyle } from "./format";

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
