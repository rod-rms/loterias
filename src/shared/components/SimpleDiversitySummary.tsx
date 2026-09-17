import { InfoHelp } from "./InfoHelp";
import { formatDecimalPtBR } from "../utils/numberFormat";

interface SimpleDiversitySummaryProps {
  overlapMean: number;
  exposureMin: number;
  exposureMax: number;
}

/** Plain-language, one-glance summary of diversity — the detailed histogram/matrix live behind "Ver análise detalhada". */
export function SimpleDiversitySummary({ overlapMean, exposureMin, exposureMax }: SimpleDiversitySummaryProps) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
        Diversidade do conjunto
        <InfoHelp
          title="Diversidade do conjunto"
          body="Um resumo simples de quão diferentes os jogos são entre si. Menos repetição entre jogos não muda a chance individual de nenhuma dezena."
        />
      </h4>
      <p className="mt-1 text-sm text-brand-textMuted">
        Em média, cada par de jogos compartilha <strong>{formatDecimalPtBR(overlapMean, 1)}</strong> dezenas entre si, e cada dezena aparece entre{" "}
        <strong>{exposureMin}</strong> e <strong>{exposureMax}</strong> vezes no conjunto.
      </p>
    </div>
  );
}
