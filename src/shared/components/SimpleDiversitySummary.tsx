import { InfoHelp } from "./InfoHelp";

interface SimpleDiversitySummaryProps {
  overlapMean: number;
  exposureMin: number;
  exposureMax: number;
}

/** Plain-language, one-glance summary of diversity — the detailed histogram/matrix live behind "Ver análise detalhada". */
export function SimpleDiversitySummary({ overlapMean, exposureMin, exposureMax }: SimpleDiversitySummaryProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        Diversidade do conjunto
        <InfoHelp
          title="Diversidade do conjunto"
          body="Um resumo simples de quão diferentes os jogos são entre si. Menos repetição entre jogos não muda a chance individual de nenhuma dezena."
        />
      </h4>
      <p className="mt-1 text-sm text-slate-600">
        Em média, cada par de jogos compartilha <strong>{overlapMean.toFixed(1)}</strong> dezenas entre si, e cada dezena aparece entre{" "}
        <strong>{exposureMin}</strong> e <strong>{exposureMax}</strong> vezes no conjunto.
      </p>
    </div>
  );
}
