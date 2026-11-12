import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorState, ExportMenu, InfoHelp, ResponsibleGamingNotice } from "../../shared/components";
import { loadBacktest } from "../../shared/lib/backtestLoader";
import { ANALYSIS_LEVEL, FAMILY_SIZE, METHOD_NOTES, analyzeBacktest, buildAnalysisExport, type ModalityAnalysis } from "../../shared/lib/backtestAnalysis";
import { BUILD_COMMIT, APP_VERSION } from "../../shared/lib/appVersion";
import type { Modality } from "../../shared/types";
import { DistributionChart, FunnelChart, WhiskerChart, type WhiskerRow } from "./analise/charts";
import { fmt, nf, pct, seriesStyle, strategyLabel } from "./analise/format";

const MODALITIES: { id: Modality; label: string; active: string }[] = [
  { id: "lotofacil", label: "Lotofácil", active: "bg-lotofacil-500 text-white shadow-sm" },
  { id: "megasena", label: "Mega-Sena", active: "bg-megasena-600 text-white shadow-sm" },
];

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; analysis: ModalityAnalysis };

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ChartCard({ id, title, help, n, children, table }: { id: string; title: string; help: string; n: string; children: ReactNode; table?: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-brand-border bg-brand-surface p-4" data-testid={`chart-${id}`}>
      <h3 id={`${id}-title`} className="flex items-center gap-1.5 text-base font-semibold text-brand-text">
        {title}
        <InfoHelp title={title} body={help} label={`Ajuda sobre o gráfico: ${title}`} />
      </h3>
      <p className="mt-1 text-xs text-brand-textMuted">{n}</p>
      <div className="mt-3">{children}</div>
      {table && (
        <details className="mt-3 text-xs text-brand-textMuted">
          <summary className="cursor-pointer select-none underline underline-offset-2">Ver os números</summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      )}
    </section>
  );
}

const th = "px-2 py-1 text-left font-medium";
const td = "px-2 py-1 font-mono tabular-nums";

export function AnalisePage() {
  const [params, setParams] = useSearchParams();
  const modality: Modality = params.get("modalidade") === "megasena" ? "megasena" : "lotofacil";
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [distStrategy, setDistStrategy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setDistStrategy(null);
    loadBacktest(modality)
      .then((file) => {
        if (!cancelled) setState({ status: "ready", analysis: analyzeBacktest(file) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Falha ao carregar os dados." });
      });
    return () => {
      cancelled = true;
    };
  }, [modality]);

  const analysis = state.status === "ready" ? state.analysis : null;
  const exportPayload = useMemo(() => (analysis ? buildAnalysisExport(analysis) : null), [analysis]);
  const thr = analysis?.reference.rateThreshold ?? (modality === "lotofacil" ? 11 : 3);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Análise de resultados</h1>
        <p className="max-w-2xl text-brand-textMuted">
          Desempenho observado das estratégias em sorteios passados, simulado pelo mesmo código do aplicativo, sempre comparado com o que se espera de jogos aleatórios.
        </p>
      </header>

      <aside aria-label="Aviso sobre estes resultados" className="rounded-lg border border-brand-border bg-brand-surfaceElevated p-4 text-sm text-brand-textMuted" data-testid="analysis-disclaimer">
        <p>
          <strong className="text-brand-text">Resultados descritivos.</strong> Mostram o que aconteceu em sorteios passados; não garantem nem preveem sorteios futuros e não indicam
          como jogar.
        </p>
        <p className="mt-2">
          <strong className="text-brand-text">Sobre este teste histórico (backtest).</strong> As estratégias foram desenhadas e ajustadas por pessoas que já conheciam este histórico.
          &quot;Sem look-ahead&quot; protege os dados de cada sorteio simulado, não as escolhas de desenho. Por isso o teste tende a ser otimista para as estratégias desenhadas e serve como
          triagem, não como evidência. A fonte sem esse viés é o registro prospectivo (jogos gerados antes de cada sorteio), que ainda está em formação e não aparece nesta etapa.
        </p>
      </aside>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Escolher modalidade da análise" className="flex gap-1 rounded-lg bg-brand-surfaceElevated p-1">
          {MODALITIES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={modality === m.id}
              onClick={() => setParams({ modalidade: m.id }, { replace: true })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${modality === m.id ? m.active : "text-brand-textMuted hover:text-brand-text"}`}
            >
              {m.label}
            </button>
          ))}
        </nav>
        {exportPayload && analysis && (
          <ExportMenu
            onExportCsv={() => download(`analise-backtest-${modality}-${analysis.meta.runId}.csv`, exportPayload.csv, "text/csv;charset=utf-8")}
            onExportJson={() => download(`analise-backtest-${modality}-${analysis.meta.runId}.json`, JSON.stringify(exportPayload.json, null, 2), "application/json")}
          />
        )}
      </div>

      {state.status === "loading" && (
        <p role="status" className="text-sm text-brand-textMuted">
          Carregando o teste histórico…
        </p>
      )}
      {state.status === "error" && <ErrorState title="Não foi possível mostrar a análise" message={state.message} />}

      {analysis && (
        <>
          <section aria-label="Resumo" className="rounded-xl border border-brand-border bg-brand-surface p-4" data-testid="analysis-summary">
            <p className="text-sm text-brand-textMuted">
              Período simulado: concursos <strong className="text-brand-text">{analysis.meta.range.from}</strong> a <strong className="text-brand-text">{analysis.meta.range.to}</strong> (
              {analysis.meta.range.contestsCount} concursos, {analysis.meta.range.contestsCount * 6} jogos por estratégia).
            </p>
            {analysis.anyDetectable ? (
              <ul className="mt-2 space-y-1 text-sm text-brand-text" data-testid="analysis-detectable">
                {analysis.strategies
                  .filter((s) => s.differenceVsReference !== "none")
                  .map((s) => (
                    <li key={s.strategyId}>
                      {strategyLabel(s.strategyId)}: no período, o intervalo ajustado ficou {s.differenceVsReference === "above" ? "acima" : "abaixo"} da média aleatória (desempenho observado; triagem, não evidência).
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm font-medium text-brand-text" data-testid="analysis-no-difference">
                Nenhuma diferença detectável em relação à referência aleatória neste período, para nenhuma das {analysis.strategies.length} estratégias.
              </p>
            )}
            <p className="mt-2 text-xs text-brand-textMuted">
              Intervalos agrupados por concurso (a unidade independente). Marcador de diferença só quando o intervalo ajustado para {FAMILY_SIZE} comparações (Bonferroni,{" "}
              {pct(1 - (1 - ANALYSIS_LEVEL) / FAMILY_SIZE, 0)}) exclui a referência aleatória exata.
            </p>
          </section>

          <ChartCard
            id="distribuicao"
            title="Distribuição de acertos por jogo vs. teoria exata"
            n={`n = ${analysis.strategies[0]?.nContests} concursos · ${analysis.strategies[0]?.nTickets} jogos por estratégia`}
            help={`O que mede: a proporção de jogos que fez cada número de acertos. Como ler: as barras são o observado, com a linha branca de intervalo 95% (agrupado por concurso); o losango verde é a probabilidade teórica exata de um jogo aleatório. Barras próximas dos losangos indicam que o desempenho observado é parecido com o de jogos aleatórios. O que não afirma: nada sobre sorteios futuros nem que uma faixa de acertos seja mais provável adiante.`}
            table={
              <table className="w-full">
                <caption className="sr-only">Distribuição de acertos: observado e teórico</caption>
                <thead>
                  <tr>
                    <th className={th}>Faixa</th>
                    <th className={th}>Observado</th>
                    <th className={th}>IC 95%</th>
                    <th className={th}>Teórico</th>
                  </tr>
                </thead>
                <tbody>
                  {(analysis.strategies.find((s) => s.strategyId === (distStrategy ?? analysis.strategies[0]!.strategyId)) ?? analysis.strategies[0]!).bins.map((b) => (
                    <tr key={b.label}>
                      <td className={td}>{b.label}</td>
                      <td className={td}>{pct(b.share.mean, 3)}</td>
                      <td className={td}>
                        {pct(b.share.low, 3)} – {pct(b.share.high, 3)}
                      </td>
                      <td className={td}>{pct(b.theory, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            {(() => {
              const selectedId = distStrategy ?? analysis.strategies[0]!.strategyId;
              const idx = Math.max(0, analysis.strategies.findIndex((s) => s.strategyId === selectedId));
              const sel = analysis.strategies[idx]!;
              return (
                <>
                  <fieldset className="mb-3">
                    <legend className="mb-1 text-xs text-brand-textMuted">Estratégia exibida</legend>
                    <div className="flex flex-wrap gap-2">
                      {analysis.strategies.map((s, i) => (
                        <label key={s.strategyId} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 text-xs has-[:checked]:bg-white/10">
                          <input type="radio" name={`dist-${modality}`} className="accent-brand-action" checked={s.strategyId === sel.strategyId} onChange={() => setDistStrategy(s.strategyId)} />
                          <span style={{ color: seriesStyle(i).color }} aria-hidden>
                            ●
                          </span>
                          {strategyLabel(s.strategyId)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <DistributionChart bins={sel.bins} color={seriesStyle(idx).color} ariaLabel={`Distribuição de acertos de ${strategyLabel(sel.strategyId)} comparada com a teoria exata`} />
                  <p className="mt-1 text-xs text-brand-textMuted">Barras: observado (com IC 95%). Losango verde: teoria exata de um jogo aleatório.</p>
                </>
              );
            })()}
          </ChartCard>

          <ChartCard
            id="media"
            title="Média de acertos por jogo"
            n={`n = ${analysis.strategies[0]?.nContests} concursos (unidade: média dos 6 jogos de cada concurso) · referência aleatória exata: ${fmt(analysis.reference.meanHits)}`}
            help="O que mede: o número médio de acertos por jogo em cada estratégia, no período. Como ler: o ponto é a média e o traço é o intervalo de 95% agrupado por concurso; a linha verde é a média de jogos aleatórios (valor exato). Se o traço cobre a linha, a diferença está dentro da variação esperada pelo acaso. O que não afirma: não ordena estratégias nem diz o que acontecerá nos próximos sorteios."
            table={
              <table className="w-full">
                <caption className="sr-only">Média de acertos por jogo</caption>
                <thead>
                  <tr>
                    <th className={th}>Estratégia</th>
                    <th className={th}>Média</th>
                    <th className={th}>IC 95%</th>
                    <th className={th}>IC ajustado 99%</th>
                    <th className={th}>Vs. referência</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.strategies.map((s) => (
                    <tr key={s.strategyId}>
                      <td className={td}>{strategyLabel(s.strategyId)}</td>
                      <td className={td}>{fmt(s.meanHits.mean)}</td>
                      <td className={td}>
                        {fmt(s.meanHits.low)} – {fmt(s.meanHits.high)}
                      </td>
                      <td className={td}>
                        {fmt(s.meanHitsFamily.low)} – {fmt(s.meanHitsFamily.high)}
                      </td>
                      <td className={td}>{s.differenceVsReference === "none" ? "sem diferença detectável" : s.differenceVsReference === "above" ? "acima" : "abaixo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <WhiskerChart
              ariaLabel="Média de acertos por jogo com intervalo de 95%"
              rows={analysis.strategies.map<WhiskerRow>((s) => ({
                id: s.strategyId,
                label: strategyLabel(s.strategyId),
                mean: s.meanHits.mean,
                low: s.meanHits.low,
                high: s.meanHits.high,
                note: s.differenceVsReference === "none" ? "Sem diferença detectável." : `Intervalo ajustado ${s.differenceVsReference === "above" ? "acima" : "abaixo"} da referência aleatória.`,
              }))}
              reference={analysis.reference.meanHits}
              referenceLabel="média de jogos aleatórios (exata)"
              format={(v) => fmt(v)}
            />
          </ChartCard>

          <ChartCard
            id="taxa"
            title={`Proporção de jogos com ${thr} ou mais acertos`}
            n={`n = ${analysis.strategies[0]?.nContests} concursos · ${analysis.strategies[0]?.nTickets} jogos por estratégia · referência aleatória exata: ${pct(analysis.reference.rateTheory)}`}
            help={`O que mede: em que fração dos jogos houve ${thr} acertos ou mais. Como ler: o ponto é a taxa observada e o traço é o intervalo de 95% (bootstrap por concurso); a linha verde é a taxa teórica exata de jogos aleatórios. Em eventos raros, poucos acertos mudam muito a taxa: quando há poucos eventos o gráfico avisa que a amostra é fina. O que não afirma: nada sobre sorteios futuros.`}
            table={
              <table className="w-full">
                <caption className="sr-only">Proporção de jogos acima do limiar</caption>
                <thead>
                  <tr>
                    <th className={th}>Estratégia</th>
                    <th className={th}>Eventos</th>
                    <th className={th}>Taxa</th>
                    <th className={th}>IC 95%</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.strategies.map((s) => (
                    <tr key={s.strategyId}>
                      <td className={td}>{strategyLabel(s.strategyId)}</td>
                      <td className={td}>
                        {s.rate.events}/{s.rate.tickets}
                      </td>
                      <td className={td}>{pct(s.rate.share.mean, 3)}</td>
                      <td className={td}>
                        {pct(s.rate.share.low, 3)} – {pct(s.rate.share.high, 3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <WhiskerChart
              ariaLabel={`Proporção de jogos com ${thr} ou mais acertos, com intervalo de 95%`}
              rows={analysis.strategies.map<WhiskerRow>((s) => ({
                id: s.strategyId,
                label: strategyLabel(s.strategyId),
                mean: s.rate.share.mean,
                low: s.rate.share.low,
                high: s.rate.share.high,
                note: (
                  <>
                    {s.rate.events} eventos em {s.rate.tickets} jogos
                    {s.rate.thin && <strong className="ml-1 text-amber-300"> · amostra fina (menos de 30 eventos): o intervalo é largo e instável</strong>}
                  </>
                ),
              }))}
              reference={analysis.reference.rateTheory}
              referenceLabel="taxa de jogos aleatórios (exata)"
              format={(v) => pct(v)}
              includeZero
            />
          </ChartCard>

          <ChartCard
            id="melhor-jogo"
            title="Melhor jogo de cada carteira"
            n={`n = ${analysis.strategies[0]?.nContests} concursos · referência aleatória (6 jogos independentes): ${fmt(analysis.reference.bestHitsMean)} acertos em média`}
            help="O que mede: em cada concurso, o maior número de acertos entre os 6 jogos da carteira, e a média disso no período. Como ler: o ponto é a média, o traço é o intervalo de 95% por concurso e a linha verde é o valor esperado para 6 jogos aleatórios. O que não afirma: o melhor jogo de um concurso passado não indica jogos melhores no futuro; a referência trata os 6 jogos aleatórios como independentes (diferença desprezível)."
            table={
              <table className="w-full">
                <caption className="sr-only">Melhor jogo da carteira por concurso, média</caption>
                <thead>
                  <tr>
                    <th className={th}>Estratégia</th>
                    <th className={th}>Média do melhor jogo</th>
                    <th className={th}>IC 95%</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.strategies.map((s) => (
                    <tr key={s.strategyId}>
                      <td className={td}>{strategyLabel(s.strategyId)}</td>
                      <td className={td}>{fmt(s.bestHits.mean)}</td>
                      <td className={td}>
                        {fmt(s.bestHits.low)} – {fmt(s.bestHits.high)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <WhiskerChart
              ariaLabel="Média do melhor jogo de cada carteira, com intervalo de 95%"
              rows={analysis.strategies.map<WhiskerRow>((s) => ({ id: s.strategyId, label: strategyLabel(s.strategyId), mean: s.bestHits.mean, low: s.bestHits.low, high: s.bestHits.high }))}
              reference={analysis.reference.bestHitsMean}
              referenceLabel="valor esperado para 6 jogos aleatórios"
              format={(v) => fmt(v)}
            />
          </ChartCard>

          <ChartCard
            id="acumulada"
            title="Diferença acumulada em relação ao esperado"
            n={`n = ${analysis.strategies[0]?.nContests} concursos · soma, concurso a concurso, de (média de acertos da carteira − ${fmt(analysis.reference.meanHits)})`}
            help="O que mede: o quanto cada estratégia se afastou, somando os concursos em ordem, do total que jogos aleatórios dariam. Como ler: a linha verde horizontal é o esperado (zero). A faixa verde clara é a variação esperada só pelo acaso (95%) e a tracejada é a faixa mais larga, ajustada para 5 comparações. Linhas dentro da faixa são compatíveis com o acaso; subir ou descer sem sair da faixa não é diferença. O que não afirma: é um retrato descritivo, não um teste sequencial, e não indica o que virá."
            table={
              <table className="w-full">
                <caption className="sr-only">Diferença acumulada final</caption>
                <thead>
                  <tr>
                    <th className={th}>Estratégia</th>
                    <th className={th}>Diferença acumulada final</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.strategies.map((s) => (
                    <tr key={s.strategyId}>
                      <td className={td}>{strategyLabel(s.strategyId)}</td>
                      <td className={td}>{nf(2).format(s.cumulative.at(-1) ?? 0)} acertos por jogo somados</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <FunnelChart strategies={analysis.strategies} reference={analysis.reference} ariaLabel="Diferença acumulada de acertos em relação ao esperado, dentro da faixa de variação do acaso" />
            <ul className="mt-2 grid gap-1 text-xs text-brand-textMuted sm:grid-cols-2">
              {analysis.strategies.map((s, i) => (
                <li key={s.strategyId} className="flex items-center gap-2">
                  <svg viewBox="0 0 24 8" className="h-2 w-6 shrink-0" aria-hidden>
                    <line x1={0} x2={24} y1={4} y2={4} stroke={seriesStyle(i).color} strokeWidth={3} strokeDasharray={seriesStyle(i).dash} />
                  </svg>
                  {strategyLabel(s.strategyId)}: {nf(2).format(s.cumulative.at(-1) ?? 0)}
                </li>
              ))}
            </ul>
          </ChartCard>

          <section aria-label="Método" className="rounded-xl border border-brand-border bg-brand-surface p-4">
            <h3 className="text-base font-semibold text-brand-text">Método</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-brand-textMuted">
              {METHOD_NOTES.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>

          <footer aria-label="Metadados de auditoria" className="rounded-lg border border-brand-border bg-brand-surfaceElevated p-3 text-xs text-brand-textMuted" data-testid="audit-footer">
            <p className="font-medium text-brand-text">Metadados de auditoria</p>
            <dl className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-[auto_1fr]">
              <dt>Execução (runId)</dt>
              <dd className="break-all font-mono">{analysis.meta.runId}</dd>
              <dt>SHA-256 do arquivo de resultados</dt>
              <dd className="break-all font-mono">{analysis.meta.datasetSha256}</dd>
              <dt>Período</dt>
              <dd className="font-mono">
                {analysis.meta.range.from}–{analysis.meta.range.to} ({analysis.meta.range.contestsCount} concursos)
              </dd>
              <dt>Gerado em</dt>
              <dd className="font-mono">{analysis.meta.generatedAt}</dd>
              <dt>Commit do código do teste</dt>
              <dd className="break-all font-mono">{analysis.meta.codeCommit}</dd>
              <dt>Versões das estratégias</dt>
              <dd className="font-mono">{analysis.strategies.map((s) => `${strategyLabel(s.strategyId)} ${s.strategyVersion}`).join(" · ")}</dd>
              <dt>Esta página</dt>
              <dd className="font-mono" data-testid="build-commit">
                v{APP_VERSION} · build {BUILD_COMMIT}
              </dd>
            </dl>
          </footer>
        </>
      )}

      <ResponsibleGamingNotice />
    </div>
  );
}
