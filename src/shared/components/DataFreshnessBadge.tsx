export function DataFreshnessBadge({ label, latestContest }: { label: string; latestContest: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-surfaceElevated px-2.5 py-1 text-xs text-brand-textMuted">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-success" />
      {latestContest === null ? (
        `${label} · carregando dados...`
      ) : (
        <>
          {label} · dados até o concurso <span className="font-mono tabular-nums">{latestContest}</span>
        </>
      )}
    </span>
  );
}
