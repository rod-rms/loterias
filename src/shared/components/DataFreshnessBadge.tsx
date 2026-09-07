export function DataFreshnessBadge({ latestContest }: { latestContest: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-600">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {latestContest === null ? "Carregando dados..." : `Dados atualizados até o concurso ${latestContest}`}
    </span>
  );
}
