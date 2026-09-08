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
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        Comparação com jogos aleatórios equivalentes
        <InfoHelp
          title="Comparação com jogos aleatórios equivalentes"
          body="Veja como este conjunto se compara, em média, a jogos aleatórios com a mesma quantidade de apostas e as mesmas restrições."
        />
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        {kind === "uniform_distinct_average"
          ? "Média teórica de jogos aleatórios equivalentes (mesma quantidade, sem restrições)."
          : "Controle uniforme sob as mesmas restrições explícitas (dezenas obrigatórias/não usadas)."}
      </p>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
            <p className="text-sm font-medium text-slate-700">{row.label}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              Seus jogos: <span className="font-medium text-slate-800">{formatProbabilityPercent(row.portfolioProbability)}</span>
              {" · "}
              Jogos aleatórios equivalentes: <span className="font-medium text-slate-800">{formatProbabilityPercent(row.baselineProbability)}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600">
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
