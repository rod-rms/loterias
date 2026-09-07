import { useEffect, useMemo, useState } from "react";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { loadDataset, loadGameConfig, suggestNextContest } from "../../shared/lib/dataLoaders";
import { useGenerationWorker } from "../../shared/lib/useGenerationWorker";
import { savePortfolio } from "../../shared/lib/portfolioStore";
import {
  StrategyCard,
  QuantityBudgetInput,
  QualityPresetSelector,
  SeedInput,
  NumberSelector,
  MetricCard,
  PortfolioTicketList,
  OverlapSummary,
  ExposureSummary,
  BaselineComparison,
  ErrorState,
  ResponsibleGamingNotice,
} from "../../shared/components";
import { formatBRL } from "../../shared/utils/currency";
import type { GameConfig, GeneratePortfolioRequest, Modality, PortfolioEnvelope, ProbabilityStatus, QualityPreset, StrategyDefinition } from "../../shared/types";

const STAGE_LABEL: Record<string, string> = {
  preparing: "Preparando candidatos",
  optimizing: "Otimizando",
  evaluating: "Avaliando cobertura",
  auditing: "Auditando carteira",
  done: "Concluído",
  idle: "",
};

function metricRows(metrics: unknown, modality: Modality): { label: string; portfolioPercent: number | null; baselinePercent: number | null; absoluteDifference: number | null }[] {
  const m = metrics as Record<string, unknown>;
  const baseline = m.randomBaseline as Record<string, { portfolio: { percent: number | null }; baseline: { percent: number | null }; absolutePercentagePointDifference: number | null }> | undefined;
  if (!baseline) return [];
  const keys = modality === "lotofacil" ? (["atLeast11", "atLeast12", "atLeast13", "atLeast14", "exactly15"] as const) : (["atLeast4", "atLeast5", "sena"] as const);
  const labels: Record<string, string> = { atLeast11: "11+", atLeast12: "12+", atLeast13: "13+", atLeast14: "14+", exactly15: "15", atLeast4: "Quadra+", atLeast5: "Quina+", sena: "Sena" };
  return keys
    .filter((k) => baseline[k])
    .map((k) => ({
      label: labels[k]!,
      portfolioPercent: baseline[k]!.portfolio.percent,
      baselinePercent: baseline[k]!.baseline.percent,
      absoluteDifference: baseline[k]!.absolutePercentagePointDifference,
    }));
}

export function GerarPage({ modality }: { modality: Modality }) {
  const strategies = useMemo(() => strategyRegistry.listByModality(modality), [modality]);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [suggestedContest, setSuggestedContest] = useState<number | null>(null);

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(strategies[0]?.id ?? "");
  const [inputMode, setInputMode] = useState<"quantity" | "budget">("quantity");
  const [numberOfTickets, setNumberOfTickets] = useState(6);
  const [budgetBRL, setBudgetBRL] = useState(50);
  const [contest, setContest] = useState<number | "">("");
  const [fixedNumbers, setFixedNumbers] = useState<number[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const [seed, setSeed] = useState("");
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("balanced");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const strategy: StrategyDefinition | undefined = strategyRegistry.get(selectedStrategyId);
  const { stage, result, error, isRunning, generate, reset } = useGenerationWorker<PortfolioEnvelope>(modality);

  useEffect(() => {
    loadGameConfig().then(setConfig).catch(() => undefined);
    loadDataset(modality)
      .then((d) => setSuggestedContest(suggestNextContest(d)))
      .catch(() => undefined);
  }, [modality]);

  useEffect(() => {
    if (strategy?.ticketCount.mode === "fixed") setNumberOfTickets(strategy.ticketCount.fixed ?? 6);
  }, [strategy]);

  const maxNumber = modality === "lotofacil" ? 25 : 60;
  const gameConfig = config?.[modality];

  function buildRequest(newSeed?: string): GeneratePortfolioRequest {
    return {
      modality,
      strategyId: selectedStrategyId,
      contest: contest === "" ? undefined : contest,
      inputMode: strategy?.ticketCount.mode === "fixed" ? "quantity" : inputMode,
      numberOfTickets: strategy?.ticketCount.mode === "fixed" ? strategy.ticketCount.fixed : numberOfTickets,
      budgetBRL: inputMode === "budget" ? budgetBRL : undefined,
      seed: newSeed ?? (seed || undefined),
      fixedNumbers: strategy?.supportsFixedNumbers ? fixedNumbers : undefined,
      excludedNumbers: strategy?.supportsExcludedNumbers ? excludedNumbers : undefined,
      qualityPreset: strategy?.supportsQualityPreset ? qualityPreset : undefined,
    };
  }

  function handleGenerate(newSeed?: string) {
    setValidationError(null);
    setSavedMessage(null);
    if (!strategy) return;
    if (strategy.requiresTargetContest && contest === "") {
      setValidationError("Esta estratégia exige um concurso-alvo.");
      return;
    }
    const overlap = fixedNumbers.filter((n) => excludedNumbers.includes(n));
    if (overlap.length > 0) {
      setValidationError(`Números não podem estar fixos e excluídos ao mesmo tempo: ${overlap.join(", ")}`);
      return;
    }
    generate(buildRequest(newSeed));
  }

  async function handleSave() {
    if (!result || !gameConfig) return;
    await savePortfolio({
      schemaVersion: 1,
      id: result.id,
      modality,
      contest: result.contest,
      strategyId: result.strategyId,
      strategyVersion: result.strategyVersion,
      engineVersion: result.strategyVersion,
      createdAt: result.createdAt,
      price: { ticketCostBRL: gameConfig.ticketCostBRL, referenceDate: gameConfig.referenceDate, source: gameConfig.source },
      seed: result.seed,
      parameters: buildRequest(),
      tickets: result.tickets,
      metrics: result.metrics,
      audit: result.audit,
      markedAsBet: false,
    });
    setSavedMessage("Carteira salva em Minhas carteiras.");
  }

  function copyAll() {
    if (!result) return;
    const text = result.tickets.map((t) => t.map((n) => String(n).padStart(2, "0")).join(", ")).join("\n");
    navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  function downloadCsv() {
    if (!result) return;
    const csv = result.tickets.map((t) => t.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modality}-${result.strategyId}-${result.seed}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modality}-${result.strategyId}-${result.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = result ? metricRows(result.metrics, modality) : [];
  const metrics = result?.metrics as Record<string, unknown> | undefined;
  const probability = metrics?.probability as Record<string, { percent: number | null; oneIn?: number | null; status: ProbabilityStatus }> | undefined;
  const overlap = metrics?.overlap as { min: number; max: number; mean: number; histogram: Record<string, number> } | undefined;
  const exposure = metrics?.exposure as { exposure: Record<number, number> } | undefined;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Gerar carteira — {modality === "lotofacil" ? "Lotofácil" : "Mega-Sena"}</h1>

      <section aria-labelledby="step-strategy">
        <h2 id="step-strategy" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. Estratégia
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {strategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} selected={s.id === selectedStrategyId} onSelect={() => setSelectedStrategyId(s.id)} />
          ))}
        </div>
      </section>

      {strategy && gameConfig && (
        <>
          <section aria-labelledby="step-quantity">
            <h2 id="step-quantity" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              2. Quantidade / orçamento
            </h2>
            <QuantityBudgetInput
              strategy={strategy}
              inputMode={inputMode}
              onInputModeChange={setInputMode}
              numberOfTickets={numberOfTickets}
              onNumberOfTicketsChange={setNumberOfTickets}
              budgetBRL={budgetBRL}
              onBudgetChange={setBudgetBRL}
              ticketCostBRL={gameConfig.ticketCostBRL}
            />
          </section>

          <section aria-labelledby="step-contest">
            <h2 id="step-contest" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              3. Concurso
            </h2>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Concurso-alvo {strategy.requiresTargetContest ? "(obrigatório)" : "(apenas contexto)"}
              </span>
              <input
                type="number"
                value={contest}
                placeholder={suggestedContest ? String(suggestedContest) : ""}
                onChange={(e) => setContest(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-40 rounded-md border border-slate-300 px-2 py-1.5"
              />
            </label>
            {strategy.requiresHistoricalDraws && (
              <p className="mt-1 text-xs text-slate-500">
                Esta estratégia exige os {strategy.historyWindowSize} concursos imediatamente anteriores ao concurso-alvo disponíveis no dataset.
              </p>
            )}
          </section>

          {(strategy.supportsFixedNumbers || strategy.supportsExcludedNumbers || strategy.supportsUserSeed || strategy.supportsQualityPreset) && (
            <section aria-labelledby="step-advanced">
              <h2 id="step-advanced" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                4. Opções avançadas
              </h2>
              <div className="space-y-4">
                {(strategy.supportsFixedNumbers || strategy.supportsExcludedNumbers) && (
                  <NumberSelector
                    maxNumber={maxNumber}
                    fixedNumbers={fixedNumbers}
                    excludedNumbers={excludedNumbers}
                    onToggleFixed={(n) => setFixedNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))}
                    onToggleExcluded={(n) => setExcludedNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))}
                  />
                )}
                {strategy.supportsUserSeed && <SeedInput value={seed} onChange={setSeed} />}
                {strategy.supportsQualityPreset && <QualityPresetSelector value={qualityPreset} onChange={setQualityPreset} />}
              </div>
            </section>
          )}

          <section aria-labelledby="step-summary" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="step-summary" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              5. Resumo
            </h2>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">Modalidade</dt>
                <dd className="font-medium">{modality === "lotofacil" ? "Lotofácil" : "Mega-Sena"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Estratégia</dt>
                <dd className="font-medium">{strategy.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Concurso</dt>
                <dd className="font-medium">{contest || suggestedContest || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Restrições</dt>
                <dd className="font-medium">{fixedNumbers.length + excludedNumbers.length > 0 ? `${fixedNumbers.length} fixas, ${excludedNumbers.length} excluídas` : "nenhuma"}</dd>
              </div>
            </dl>
            {validationError && <div className="mt-3"><ErrorState title="Não é possível gerar" message={validationError} /></div>}
            {error && <div className="mt-3"><ErrorState title={error.code ?? error.name} message={error.message} /></div>}
            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleGenerate()}
              className="mt-4 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isRunning ? STAGE_LABEL[stage] ?? "Gerando..." : "Gerar carteira"}
            </button>
            {isRunning && (
              <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-600">
                {STAGE_LABEL[stage]}…
              </p>
            )}
          </section>
        </>
      )}

      {result && (
        <section aria-labelledby="step-result" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 id="step-result" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Resultado
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Jogos</dt>
              <dd className="font-medium">{result.tickets.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Custo</dt>
              <dd className="font-medium">{formatBRL(result.costBRL)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Seed</dt>
              <dd className="font-mono text-xs">{String(result.seed)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Método</dt>
              <dd className="text-xs">{result.generationMethod}</dd>
            </div>
          </dl>

          {probability && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {Object.entries(probability).map(([key, m]) => (
                <MetricCard key={key} label={key} percent={m.percent} oneIn={m.oneIn} status={m.status} />
              ))}
            </div>
          )}

          {overlap && <OverlapSummary min={overlap.min} max={overlap.max} mean={overlap.mean} histogram={overlap.histogram} />}
          {exposure && <ExposureSummary exposure={exposure.exposure} />}
          {rows.length > 0 && <BaselineComparison kind={(metrics?.randomBaseline as { kind: string })?.kind ?? ""} rows={rows} />}

          <PortfolioTicketList tickets={result.tickets} onCopyTicket={(t) => navigator.clipboard?.writeText(t.join(", "))} />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyAll} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Copiar todos
            </button>
            <button type="button" onClick={downloadCsv} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Exportar CSV
            </button>
            <button type="button" onClick={downloadJson} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Exportar JSON
            </button>
            <button type="button" onClick={handleSave} className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
              Salvar carteira
            </button>
            <button type="button" onClick={() => handleGenerate()} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Nova variação
            </button>
            <button type="button" onClick={() => handleGenerate(String(result.seed))} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Reproduzir carteira
            </button>
            <button type="button" onClick={reset} className="ml-auto rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-500">
              Limpar resultado
            </button>
          </div>
          {savedMessage && <p role="status" className="text-sm text-emerald-700">{savedMessage}</p>}
        </section>
      )}

      <ResponsibleGamingNotice compact />
    </div>
  );
}
