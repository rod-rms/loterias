import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Disclosure, ErrorState, ResponsibleGamingNotice } from "../../shared/components";
import { loadBacktest } from "../../shared/lib/backtestLoader";
import { analyzeBacktest, buildAnalysisExport, type ModalityAnalysis } from "../../shared/lib/backtestAnalysis";
import { BUILD_COMMIT, APP_VERSION } from "../../shared/lib/appVersion";
import { loadDataset } from "../../shared/lib/dataLoaders";
import { loadLedgerSummary, type LedgerSummary } from "../../shared/lib/ledgerSummary";
import type { Modality } from "../../shared/types";
import { AverageChart, LedgerCard, PrizeChart, ShortAnswer, SpreadChart } from "./analise/lay";
import { TechnicalDetails } from "./analise/technical";
import { periodFromDraws, strategyLabel } from "./analise/format";

const MODALITIES: { id: Modality; label: string; active: string }[] = [
  { id: "lotofacil", label: "Lotofácil", active: "bg-lotofacil-500 text-white shadow-sm" },
  { id: "megasena", label: "Mega-Sena", active: "bg-megasena-600 text-white shadow-sm" },
];

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; analysis: ModalityAnalysis; period: ReturnType<typeof periodFromDraws> };
type LedgerState = { lotofacil: LedgerSummary | "unavailable" | null; megasena: LedgerSummary | "unavailable" | null };

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalisePage() {
  const [params, setParams] = useSearchParams();
  const modality: Modality = params.get("modalidade") === "megasena" ? "megasena" : "lotofacil";
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [ledger, setLedger] = useState<LedgerState>({ lotofacil: null, megasena: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    Promise.all([loadBacktest(modality), loadDataset(modality).catch(() => null)])
      .then(([file, dataset]) => {
        if (cancelled) return;
        setState({ status: "ready", analysis: analyzeBacktest(file), period: periodFromDraws(dataset?.draws ?? null, file.range.from, file.range.to) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Falha ao carregar os dados." });
      });
    return () => {
      cancelled = true;
    };
  }, [modality]);

  useEffect(() => {
    let cancelled = false;
    for (const m of ["lotofacil", "megasena"] as const) {
      loadLedgerSummary(m)
        .then((s) => !cancelled && setLedger((cur) => ({ ...cur, [m]: s })))
        .catch(() => !cancelled && setLedger((cur) => ({ ...cur, [m]: "unavailable" })));
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const analysis = state.status === "ready" ? state.analysis : null;
  const exportPayload = useMemo(() => (analysis ? buildAnalysisExport(analysis) : null), [analysis]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Análise de resultados</h1>
        <nav aria-label="Escolher modalidade da análise" className="flex w-fit gap-1 rounded-lg bg-brand-surfaceElevated p-1">
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
      </header>

      {state.status === "loading" && (
        <p role="status" className="text-sm text-brand-textMuted">
          Carregando…
        </p>
      )}
      {state.status === "error" && <ErrorState title="Não foi possível mostrar a análise" message={state.message} />}

      {analysis && state.status === "ready" && (
        <div className="space-y-6" data-testid="main-view">
          <ShortAnswer a={analysis} period={state.period} />
          <AverageChart a={analysis} />
          <PrizeChart a={analysis} />
          <SpreadChart a={analysis} />
          <LedgerCard ledger={ledger} />
        </div>
      )}

      <aside aria-label="Aviso sobre estes resultados" className="rounded-lg border border-brand-border bg-brand-surfaceElevated p-4 text-sm text-brand-textMuted" data-testid="analysis-disclaimer">
        <p>
          <strong className="text-brand-text">Isto descreve o passado.</strong> Os resultados não garantem nem preveem sorteios futuros e não indicam como jogar.
        </p>
        <p className="mt-2">
          O teste com sorteios passados é otimista: as estratégias foram desenhadas e ajustadas por pessoas que já conheciam esse histórico. Ele serve como triagem, não como prova.
        </p>
      </aside>

      {analysis && exportPayload && (
        <Disclosure title="Detalhes técnicos (para auditoria)">
          <TechnicalDetails
            a={analysis}
            onExportCsv={() => download(`analise-backtest-${modality}-${analysis.meta.runId}.csv`, exportPayload.csv, "text/csv;charset=utf-8")}
            onExportJson={() => download(`analise-backtest-${modality}-${analysis.meta.runId}.json`, JSON.stringify(exportPayload.json, null, 2), "application/json")}
          />
        </Disclosure>
      )}

      {analysis && (
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
      )}

      <ResponsibleGamingNotice />
    </div>
  );
}
