import { useState } from "react";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { useGenerationWorker } from "../../shared/lib/useGenerationWorker";
import { MetricCard, ErrorState } from "../../shared/components";
import { formatBRL } from "../../shared/utils/currency";
import type { GeneratePortfolioRequest, Modality, PortfolioEnvelope } from "../../shared/types";

interface ComparePanelProps {
  modality: Modality;
  currentStrategyId: string;
  numberOfTickets: number;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  contest?: number;
  currentResult: PortfolioEnvelope;
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
      <button type="button" onClick={() => setActive(true)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
        Comparar com outra estratégia
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">Comparar com outra estratégia</h3>
      <p className="mt-1 text-xs text-slate-500">
        Mesma quantidade de jogos ({numberOfTickets}) e mesmas restrições. Apenas estratégias compatíveis aparecem abaixo. Nenhuma é declarada vencedora.
      </p>
      {candidates.length === 0 ? (
        <p className="mt-2 text-sm text-amber-700">Nenhuma estratégia compatível com N={numberOfTickets} e as restrições atuais.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={compareStrategyId} onChange={(e) => setCompareStrategyId(e.target.value)} className="rounded border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">Selecione...</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" disabled={!compareStrategyId || isRunning} onClick={handleCompare} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            {isRunning ? "Gerando..." : "Gerar e comparar"}
          </button>
        </div>
      )}
      {error && <div className="mt-2"><ErrorState title={error.code ?? error.name} message={error.message} /></div>}
      {result && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th scope="col" className="py-1 pr-2">
                  Métrica
                </th>
                <th scope="col" className="py-1 pr-2">
                  {currentResult.strategyId}
                </th>
                <th scope="col" className="py-1 pr-2">
                  {result.strategyId}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="py-1 pr-2 font-medium">Custo</td>
                <td className="py-1 pr-2">{formatBRL(currentResult.costBRL)}</td>
                <td className="py-1 pr-2">{formatBRL(result.costBRL)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-1 pr-2 font-medium">Método</td>
                <td className="py-1 pr-2 text-xs">{currentResult.generationMethod}</td>
                <td className="py-1 pr-2 text-xs">{result.generationMethod}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {[currentResult, result].map((r) => {
              const metrics = r.metrics as { probability?: Record<string, { percent: number | null; oneIn?: number | null; status: import("../../shared/types").ProbabilityStatus }>; overlap?: { mean: number } };
              return (
                <div key={r.id} className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">{r.strategyId}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {metrics.probability &&
                      Object.entries(metrics.probability)
                        .slice(0, 4)
                        .map(([key, m]) => <MetricCard key={key} label={key} percent={m.percent} oneIn={m.oneIn} status={m.status} />)}
                  </div>
                  {metrics.overlap && <p className="text-xs text-slate-500">Sobreposição média: {metrics.overlap.mean.toFixed(2)}</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Diferenças refletem métodos distintos, não uma "carteira vencedora". Ambas usam N={numberOfTickets} jogos e o mesmo custo unitário.
          </p>
        </div>
      )}
    </div>
  );
}
