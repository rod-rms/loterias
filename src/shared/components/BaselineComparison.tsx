import { InfoHelp } from "./InfoHelp";
import { formatPercentagePointDifference, formatProbabilityPercent } from "../utils/probabilityFormat";

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
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <caption className="sr-only">Comparação percentual entre este conjunto de jogos e jogos aleatórios equivalentes, por faixa de acerto</caption>
          <thead>
            <tr className="text-xs text-slate-500">
              <th scope="col" className="py-1 pr-2">
                Métrica
              </th>
              <th scope="col" className="py-1 pr-2">
                Seus jogos
              </th>
              <th scope="col" className="py-1 pr-2">
                Jogos aleatórios
              </th>
              <th scope="col" className="py-1">
                Diferença
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="py-1 pr-2 font-medium text-slate-700">{row.label}</td>
                <td className="py-1 pr-2">{formatProbabilityPercent(row.portfolioProbability)}</td>
                <td className="py-1 pr-2">{formatProbabilityPercent(row.baselineProbability)}</td>
                <td className="py-1">{formatPercentagePointDifference(row.absoluteDifference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
