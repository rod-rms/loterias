/** Plain-language badge (e.g. "Mais diversidade", "6 jogos fixos"). Technical evidence classification lives in "Detalhes técnicos" only. */
export function StrategyBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-brand-border bg-brand-surfaceElevated px-2 py-0.5 text-[11px] font-medium text-brand-textMuted">
      {label}
    </span>
  );
}
