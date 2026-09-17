import { useState } from "react";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { useGenerationWorker } from "../../shared/lib/useGenerationWorker";
import { getMetricPresentation, PRIMARY_METRIC_ORDER } from "../../shared/lib/metricPresentation";
import { MetricCard, ErrorState } from "../../shared/components";
import { formatBRL } from "../../shared/utils/currency";
import { formatDecimalPtBR } from "../../shared/utils/numberFormat";
import type { GeneratePortfolioRequest, Modality, PortfolioEnvelope, ProbabilityStatus } from "../../shared/types";

interface ComparePanelProps {
  modality: Modality;
  currentStrategyId: string;
  numberOfTickets: number;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  contest?: number;
  currentResult: PortfolioEnvelope;
}

function strategyTitle(strategyId: string): string {
  return strategyRegistry.get(strategyId)?.ux.title ?? strategyId;
}

/** Compares at most one additional strategy at a time, with identical N and restrictions. Never declares a winner. */
export function ComparePanel({ modality, currentStrategyId, numberOfTickets, fixedNumbers, excludedNumbers, contest, currentResult }: ComparePanelProps) {
  const [active, setActive] = useState(false);
  const [compareStrategyId, setCompareStrategyId] = useState("");
  const { result, error, isRunning, generate } = useGenerationWorker<PortfolioEnvelope>(modality);

  const candidates = strategyRegistry.listByModality(modality).filter((s) => {
    if (s.id === currentStrategyId) return false;
    if (s.ticketCount.mode === "fixed") return s.ticketCount.fixed === numberOfTickets;
    return numberOfTickets >= (s.ticketCount.min ?? 1) && numberOfTickets <= (s.ticketCount.max ?? Infinity);
  });

  function handleCompare() {
    if (!compareStrategyId) return;
    const request: GeneratePortfolioRequest = {
      modality,
      strategyId: compareStrategyId,
      contest,
      inputMode: "quantity",
      numberOfTickets,
      fixedNumbers,
      excludedNumbers,
    };
    generate(request);
  }

  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} className="rounded border border-brand-border px-3 py-1.5 text-sm">
        Comparar com outra opção
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <h3 className="text-sm font-semibold text-brand-text">Comparar com outra opção</h3>
      <p className="mt-1 text-xs text-brand-textMuted">
        Mesma quantidade de jogos ({numberOfTickets}) e as mesmas dezenas obrigatórias/não usadas. Só aparecem abaixo as opções compatíveis. Nenhuma é
        declarada vencedora.
      </p>
      {candidates.length === 0 ? (
        <p className="mt-2 text-sm text-amber-300">Nenhuma outra opção é compatível com {numberOfTickets} jogos e as restrições atuais.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={compareStrategyId} onChange={(e) => setCompareStrategyId(e.target.value)} className="rounded border border-brand-border px-2 py-1.5 text-sm">
            <option value="">Selecione...</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ux.title}
              </option>
            ))}
          </select>
          <button type="button" disabled={!compareStrategyId || isRunning} onClick={handleCompare} className="rounded bg-brand-action px-3 py-1.5 text-sm text-brand-actionForeground disabled:opacity-50">
            {isRunning ? "Gerando..." : "Gerar e comparar"}
          </button>
        </div>
      )}
      {error && <div className="mt-2"><ErrorState title={error.code ?? error.name} message={error.message} /></div>}
      {result && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs text-brand-textMuted">
                <th scope="col" className="py-1 pr-2">
                  Métrica
                </th>
                <th scope="col" className="py-1 pr-2">
                  {strategyTitle(currentResult.strategyId)}
                </th>
                <th scope="col" className="py-1 pr-2">
                  {strategyTitle(result.strategyId)}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-brand-border">
                <td className="py-1 pr-2 font-medium">Custo total</td>
                <td className="py-1 pr-2">{formatBRL(currentResult.costBRL)}</td>
                <td className="py-1 pr-2">{formatBRL(result.costBRL)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {[currentResult, result].map((r) => {
              const metrics = r.metrics as { probability?: Record<string, { probability: number | null; status: ProbabilityStatus }>; overlap?: { mean: number } };
              const keys = PRIMARY_METRIC_ORDER[modality];
              return (
                <div key={r.id} className="space-y-2">
                  <p className="text-xs font-semibold text-brand-textMuted">{strategyTitle(r.strategyId)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {metrics.probability &&
                      keys
                        .filter((k) => metrics.probability![k])
                        .slice(0, 4)
                        .map((key) => {
                          const presentation = getMetricPresentation(modality, key);
                          return (
                            <MetricCard
                              key={key}
                              label={presentation.label}
                              probability={metrics.probability![key]!.probability}
                              status={metrics.probability![key]!.status}
                            />
                          );
                        })}
                  </div>
                  {metrics.overlap && <p className="text-xs text-brand-textMuted">Repetição média entre jogos: {formatDecimalPtBR(metrics.overlap.mean, 2)} dezenas.</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-brand-textMuted">
            Diferenças refletem métodos distintos, não um "conjunto vencedor". Ambas as opções usam {numberOfTickets} jogos e o mesmo preço por jogo.
          </p>
        </div>
      )}
    </div>
  );
}
