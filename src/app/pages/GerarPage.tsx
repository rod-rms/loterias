import { useEffect, useMemo, useState } from "react";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { loadDataset, loadGameConfig, suggestNextContest } from "../../shared/lib/dataLoaders";
import { useGenerationWorker } from "../../shared/lib/useGenerationWorker";
import { savePortfolio } from "../../shared/lib/portfolioStore";
import { getMetricPresentation, PRIMARY_METRIC_ORDER } from "../../shared/lib/metricPresentation";
import {
  StrategyCard,
  QuantityBudgetInput,
  QualityPresetSelector,
  SeedInput,
  NumberCustomizer,
  InfoHelp,
  MetricCard,
  PortfolioTicketList,
  BaselineComparison,
  SimpleDiversitySummary,
  OverlapSummary,
  ExposureSummary,
  ErrorState,
  ResponsibleGamingNotice,
} from "../../shared/components";
import { formatBRL, ticketsForBudget } from "../../shared/utils/currency";
import { ComparePanel } from "./ComparePanel";
import type { GameConfig, GeneratePortfolioRequest, Modality, PortfolioEnvelope, ProbabilityStatus, QualityPreset, StrategyDefinition } from "../../shared/types";

const STAGE_LABEL: Record<string, string> = {
  preparing: "Preparando candidatos",
  optimizing: "Buscando o melhor conjunto",
  evaluating: "Calculando as chances",
  auditing: "Conferindo o conjunto",
  done: "Concluído",
  idle: "",
};

const MODALITY_LABEL: Record<Modality, string> = { lotofacil: "Lotofácil", megasena: "Mega-Sena" };

function metricRows(metrics: unknown, modality: Modality): { label: string; portfolioProbability: number | null; baselineProbability: number | null; absoluteDifference: number | null }[] {
  const m = metrics as Record<string, unknown>;
  const baseline = m.randomBaseline as
    | Record<string, { portfolio: { probability: number | null }; baseline: { probability: number | null }; absolutePercentagePointDifference: number | null }>
    | undefined;
  if (!baseline) return [];
  const keys = PRIMARY_METRIC_ORDER[modality];
  return keys
    .filter((k) => baseline[k])
    .map((k) => ({
      label: getMetricPresentation(modality, k).label,
      portfolioProbability: baseline[k]!.portfolio.probability,
      baselineProbability: baseline[k]!.baseline.probability,
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
  const [contestTouched, setContestTouched] = useState(false);
  const [fixedNumbers, setFixedNumbers] = useState<number[]>([]);
  const [excludedNumbers, setExcludedNumbers] = useState<number[]>([]);
  const [seed, setSeed] = useState("");
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
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

  // Prefill the suggested next contest instead of only showing it as a placeholder.
  useEffect(() => {
    if (!contestTouched && contest === "" && suggestedContest !== null) {
      setContest(suggestedContest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedContest]);

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
      setValidationError("Esta opção exige o concurso em que você pretende jogar.");
      return;
    }
    const overlap = fixedNumbers.filter((n) => excludedNumbers.includes(n));
    if (overlap.length > 0) {
      setValidationError(`Uma dezena não pode estar em "Incluir obrigatoriamente" e em "Não usar" ao mesmo tempo: ${overlap.join(", ")}`);
      return;
    }
    if (strategy.ticketCount.mode === "range") {
      const max = strategy.ticketCount.max ?? Infinity;
      const min = strategy.ticketCount.min ?? 1;
      const effectiveN = inputMode === "budget" && gameConfig ? ticketsForBudget(budgetBRL, gameConfig.ticketCostBRL) : numberOfTickets;
      if (effectiveN > max) {
        setValidationError(
          inputMode === "budget"
            ? `O valor informado resulta em ${effectiveN} jogos, acima do limite de ${max} para esta opção. Reduza o valor ou informe a quantidade diretamente.`
            : `Quantidade acima do limite desta opção (${max}).`,
        );
        return;
      }
      if (effectiveN < min) {
        setValidationError(`Quantidade abaixo do mínimo desta opção (${min}).`);
        return;
      }
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
    setSavedMessage("Estes jogos foram salvos em Meus jogos salvos.");
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
  const probability = metrics?.probability as Record<string, { probability: number | null; status: ProbabilityStatus }> | undefined;
  const overlap = metrics?.overlap as { min: number; max: number; mean: number; histogram: Record<string, number> } | undefined;
  const exposure = metrics?.exposure as { exposure: Record<number, number> } | undefined;
  const primaryKeys = PRIMARY_METRIC_ORDER[modality];

  const effectiveN = strategy?.ticketCount.mode === "fixed" ? strategy.ticketCount.fixed ?? 0 : inputMode === "budget" && gameConfig ? ticketsForBudget(budgetBRL, gameConfig.ticketCostBRL) : numberOfTickets;
  const summarySentence =
    strategy && gameConfig
      ? `Você vai gerar ${effectiveN} ${effectiveN === 1 ? "jogo" : "jogos"} da ${MODALITY_LABEL[modality]}${
          contest !== "" ? ` para o concurso ${contest}` : ""
        } usando ${strategy.ux.title}. Custo total: ${formatBRL(effectiveN * gameConfig.ticketCostBRL)}.`
      : "";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Gerar jogos da {MODALITY_LABEL[modality]}</h1>

      <section aria-labelledby="step-strategy">
        <h2 id="step-strategy" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          1. O que você quer priorizar?
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
              2. Quantos jogos você quer gerar?
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

          <section aria-labelledby="step-contest" className="space-y-5">
            <h2 id="step-contest" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              3. Concurso e personalização
            </h2>

            <div>
              <label className="block text-sm">
                <span className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
                  Concurso em que você pretende jogar
                  <InfoHelp
                    title="Concurso em que você pretende jogar"
                    body="Usamos este número para identificar e salvar seus jogos. Algumas opções, como a Carteira equilibrada (RMS), também usam os concursos anteriores como referência para montar o conjunto."
                  />
                </span>
                <input
                  type="number"
                  aria-label="Concurso em que você pretende jogar"
                  value={contest}
                  placeholder={suggestedContest ? String(suggestedContest) : ""}
                  onChange={(e) => {
                    setContestTouched(true);
                    setContest(e.target.value === "" ? "" : Number(e.target.value));
                  }}
                  className="w-40 rounded-md border border-slate-300 px-2 py-1.5"
                />
              </label>
              {strategy.requiresTargetContest ? (
                <p className="mt-1 text-xs font-medium text-amber-700">Obrigatório para esta opção.</p>
              ) : null}
              {strategy.requiresHistoricalDraws && (
                <p className="mt-1 text-xs text-slate-500">
                  Esta opção usa os {strategy.historyWindowSize} concursos imediatamente anteriores como referência para montar o conjunto.
                </p>
              )}
            </div>

            {(strategy.supportsFixedNumbers || strategy.supportsExcludedNumbers) && (
              <NumberCustomizer
                maxNumber={maxNumber}
                fixedNumbers={fixedNumbers}
                excludedNumbers={excludedNumbers}
                onToggleFixed={(n) => setFixedNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))}
                onToggleExcluded={(n) => setExcludedNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))}
                onClearFixed={() => setFixedNumbers([])}
                onClearExcluded={() => setExcludedNumbers([])}
              />
            )}

            {(strategy.supportsUserSeed || strategy.supportsQualityPreset) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  aria-expanded={showAdvanced}
                  className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                >
                  {showAdvanced ? "Ocultar configurações avançadas" : "Configurações avançadas"}
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    {strategy.supportsUserSeed && <SeedInput value={seed} onChange={setSeed} />}
                    {strategy.supportsQualityPreset && <QualityPresetSelector value={qualityPreset} onChange={setQualityPreset} />}
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="step-summary" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="step-summary" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              4. Revisar e gerar
            </h2>
            <p className="text-base text-slate-800">{summarySentence}</p>
            {(fixedNumbers.length > 0 || excludedNumbers.length > 0) && (
              <p className="mt-1 text-sm text-slate-500">
                {fixedNumbers.length > 0 && `Obrigatórias: ${[...fixedNumbers].sort((a, b) => a - b).map((n) => String(n).padStart(2, "0")).join(", ")}. `}
                {excludedNumbers.length > 0 && `Não usar: ${[...excludedNumbers].sort((a, b) => a - b).map((n) => String(n).padStart(2, "0")).join(", ")}.`}
              </p>
            )}
            {validationError && <div className="mt-3"><ErrorState title="Não é possível gerar" message={validationError} /></div>}
            {error && <div className="mt-3"><ErrorState title={error.code ?? error.name} message={error.message} /></div>}
            <button
              type="button"
              disabled={isRunning}
              onClick={() => handleGenerate()}
              className="mt-4 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isRunning ? STAGE_LABEL[stage] ?? "Gerando..." : "Gerar jogos"}
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
          <h2 id="step-result" className="text-xl font-bold text-slate-900">
            Seus jogos estão prontos
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Quantidade de jogos</dt>
              <dd className="text-lg font-semibold">{result.tickets.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Custo total</dt>
              <dd className="text-lg font-semibold">{formatBRL(result.costBRL)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Opção usada</dt>
              <dd className="font-medium">{strategyRegistry.get(result.strategyId)?.ux.title ?? result.strategyId}</dd>
            </div>
            {result.contest !== undefined && (
              <div>
                <dt className="text-xs text-slate-500">Concurso</dt>
                <dd className="font-medium">{result.contest}</dd>
              </div>
            )}
          </dl>

          {probability && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {primaryKeys
                .filter((k) => probability[k])
                .map((key) => {
                  const presentation = getMetricPresentation(modality, key);
                  return (
                    <MetricCard
                      key={key}
                      testId={`metric-${key}`}
                      label={presentation.label}
                      probability={probability[key]!.probability}
                      status={probability[key]!.status}
                      helpTitle={presentation.helpTitle}
                      helpBody={presentation.helpBody}
                    />
                  );
                })}
            </div>
          )}

          <PortfolioTicketList tickets={result.tickets} onCopyTicket={(t) => navigator.clipboard?.writeText(t.join(", "))} />

          {rows.length > 0 && <BaselineComparison kind={(metrics?.randomBaseline as { kind: string })?.kind ?? ""} rows={rows} />}

          {overlap && exposure && (
            <SimpleDiversitySummary overlapMean={overlap.mean} exposureMin={exposure.exposure ? Math.min(...Object.values(exposure.exposure)) : 0} exposureMax={exposure.exposure ? Math.max(...Object.values(exposure.exposure)) : 0} />
          )}

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
              Salvar estes jogos
            </button>
            <button type="button" onClick={() => handleGenerate()} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Gerar outra opção
            </button>
            <button type="button" onClick={() => handleGenerate(String(result.seed))} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Gerar novamente este mesmo conjunto
            </button>
            <button type="button" onClick={reset} className="ml-auto rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-500">
              Limpar resultado
            </button>
          </div>
          {savedMessage && <p role="status" className="text-sm text-emerald-700">{savedMessage}</p>}

          <div className="space-y-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowDetailedAnalysis((v) => !v)}
              aria-expanded={showDetailedAnalysis}
              className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              {showDetailedAnalysis ? "Ocultar análise detalhada" : "Ver análise detalhada"}
            </button>
            {showDetailedAnalysis && (
              <div className="space-y-3">
                {overlap && <OverlapSummary min={overlap.min} max={overlap.max} mean={overlap.mean} histogram={overlap.histogram} />}
                {exposure && <ExposureSummary exposure={exposure.exposure} />}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTechnicalDetails((v) => !v)}
              aria-expanded={showTechnicalDetails}
              className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              {showTechnicalDetails ? "Ocultar detalhes técnicos do resultado" : "Detalhes técnicos do resultado"}
            </button>
            {showTechnicalDetails && (
              <dl className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-700">Estratégia (nome técnico)</dt>
                  <dd>{strategyRegistry.get(result.strategyId)?.ux.technicalName ?? result.strategyId}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Identificador / versão</dt>
                  <dd className="font-mono">
                    {result.strategyId} · v{result.strategyVersion}
                  </dd>
                </div>
                <div className="break-all">
                  <dt className="font-medium text-slate-700">Seed</dt>
                  <dd className="font-mono">{String(result.seed)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Método de geração</dt>
                  <dd>{result.generationMethod}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Método de avaliação</dt>
                  <dd>{result.evaluationMethod}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-slate-700">Metadados de auditoria</dt>
                  <dd className="overflow-x-auto whitespace-pre-wrap break-all font-mono">{JSON.stringify(result.audit, null, 2)}</dd>
                </div>
              </dl>
            )}
          </div>

          <ComparePanel
            modality={modality}
            currentStrategyId={result.strategyId}
            numberOfTickets={result.tickets.length}
            fixedNumbers={fixedNumbers.length ? fixedNumbers : undefined}
            excludedNumbers={excludedNumbers.length ? excludedNumbers : undefined}
            contest={result.contest}
            currentResult={result}
          />
        </section>
      )}

      <ResponsibleGamingNotice compact />
    </div>
  );
}
