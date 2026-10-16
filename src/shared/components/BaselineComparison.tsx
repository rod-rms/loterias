import { InfoHelp } from "./InfoHelp";
import { formatComparisonSentence, formatProbabilityPercent } from "../utils/probabilityFormat";

interface BaselineRow {
  label: string;
  portfolioProbability: number | null;
  baselineProbability: number | null;
  absoluteDifference: number | null;
}

export function BaselineComparison({ kind, rows }: { kind: string; rows: BaselineRow[] }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
        Comparação com jogos aleatórios equivalentes
        <InfoHelp
          title="Comparação com jogos aleatórios equivalentes"
          body="Veja como este conjunto se compara, em média, a jogos aleatórios com a mesma quantidade de apostas e as mesmas restrições."
        />
      </h4>
      <p className="mt-1 text-xs text-brand-textMuted">
        {kind === "uniform_distinct_average"
          ? "Média teórica de jogos aleatórios equivalentes (mesma quantidade, sem restrições)."
          : "Controle uniforme sob as mesmas restrições explícitas (dezenas obrigatórias/não usadas)."}
      </p>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="border-t border-brand-border pt-3 first:border-t-0 first:pt-0">
            <p className="text-xs font-medium text-brand-textMuted">{row.label}</p>
            <p className="mt-1 text-xs text-brand-textMuted">
              Jogos aleatórios equivalentes:{" "}
              <span className="font-mono text-lg font-semibold tabular-nums text-brand-text">{formatProbabilityPercent(row.baselineProbability)}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-brand-textMuted">
              {formatComparisonSentence(row.absoluteDifference)}
              {row.label === rows[0]?.label && (
                <InfoHelp
                  title="Pontos percentuais"
                  body="É a diferença simples entre duas porcentagens (por exemplo, de 48,91% para 55,86% são quase 7 pontos percentuais), não uma variação relativa."
                />
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
