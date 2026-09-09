import { useEffect, useRef, useState } from "react";
import {
  listPortfolios,
  setMarkedAsBet,
  deletePortfolio,
  exportBackup,
  importBackup,
  previewBackup,
  deleteAllData,
  saveCheckedResult,
} from "../../shared/lib/portfolioStore";
import { loadDataset } from "../../shared/lib/dataLoaders";
import { checkTicketsAgainstDraw } from "../../shared/lib/checkResult";
import { formatHitResult, summarizeCheckedResult } from "../../shared/lib/resultLabels";
import { formatDrawNumbers } from "../../shared/utils/numberFormat";
import { SavedPortfolioCard, EmptyState, PortfolioTicketList, ErrorState, BackLink, InfoHelp } from "../../shared/components";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import type { Modality, SavedPortfolio } from "../../shared/types";

const MODALITY_LABEL: Record<Modality, string> = { lotofacil: "Lotofácil", megasena: "Mega-Sena" };

export function CarteirasPage({ modality }: { modality?: Modality }) {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
  const [filterModality, setFilterModality] = useState<Modality | "all">(modality ?? "all");
  const [filterBet, setFilterBet] = useState<"all" | "yes" | "no">("all");
  const [selected, setSelected] = useState<SavedPortfolio | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{ count: number; raw: unknown } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const filters: Parameters<typeof listPortfolios>[0] = {};
    if (filterModality !== "all") filters.modality = filterModality;
    if (filterBet !== "all") filters.markedAsBet = filterBet === "yes";
    setPortfolios(await listPortfolios(filters));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterModality, filterBet]);

  async function handleExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loterias-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    file
      .text()
      .then((text) => {
        const raw = JSON.parse(text);
        const preview = previewBackup(raw);
        if (!preview.valid) {
          setImportError(preview.error);
          return;
        }
        setImportPreview({ count: preview.count, raw });
      })
      .catch((err) => setImportError(String(err)));
  }

  async function confirmImport() {
    if (!importPreview) return;
    const result = await importBackup(importPreview.raw);
    setMessage(`Importado: ${result.imported} de ${result.totalInFile} (duplicados ignorados: ${result.skippedDuplicates}).`);
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    refresh();
  }

  async function handleCheck(portfolio: SavedPortfolio) {
    if (!portfolio.contest) return;
    setMessage(null);
    const dataset = await loadDataset(portfolio.modality);
    const draw = dataset.draws.find((d) => d.contest === portfolio.contest);
    if (!draw) {
      setMessage("Resultado oficial deste concurso ainda não está disponível no dataset.");
      return;
    }
    const checkedResult = checkTicketsAgainstDraw(portfolio.tickets, draw);
    await saveCheckedResult(portfolio.id, checkedResult);
    await refresh();
    // Keep the open detail view in sync immediately, instead of waiting for
    // a later re-open — `selected` is a snapshot, not a live reference into `portfolios`.
    setSelected((prev) => (prev && prev.id === portfolio.id ? { ...prev, checkedResult } : prev));
  }

  return (
    <div className="space-y-6">
      <BackLink to={modality ? `/${modality}/gerar` : "/"} label={modality ? `Voltar para ${MODALITY_LABEL[modality]}` : "Voltar ao início"} />
      <h1 className="text-2xl font-bold">Meus jogos salvos</h1>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Modalidade:{" "}
          <select value={filterModality} onChange={(e) => setFilterModality(e.target.value as Modality | "all")} className="rounded border border-slate-300 px-2 py-1">
            <option value="all">Todas</option>
            <option value="lotofacil">Lotofácil</option>
            <option value="megasena">Mega-Sena</option>
          </select>
        </label>
        <label className="text-sm">
          Apostada:{" "}
          <select value={filterBet} onChange={(e) => setFilterBet(e.target.value as "all" | "yes" | "no")} className="rounded border border-slate-300 px-2 py-1">
            <option value="all">Todas</option>
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={handleExport} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Exportar backup
          </button>
          <label className="cursor-pointer rounded border border-slate-300 px-3 py-1.5 text-sm">
            Importar backup
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => {
              if (confirm("Apagar TODOS os dados locais? Esta ação não pode ser desfeita.")) {
                deleteAllData().then(refresh);
              }
            }}
            className="rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700"
          >
            Apagar tudo
          </button>
        </div>
      </div>

      <p className="flex items-center gap-1 text-xs text-slate-500">
        Seus jogos ficam salvos somente neste navegador.
        <InfoHelp
          title="Onde seus jogos ficam salvos"
          body="Não há conta nem sincronização em nuvem: os jogos salvos existem apenas neste navegador, neste dispositivo. Outro dispositivo ou perfil de navegador não os enxerga automaticamente, e limpar os dados do site pode apagá-los. Use “Exportar backup” antes de limpar dados ou trocar de dispositivo se quiser preservá-los."
        />
      </p>

      {importError && <ErrorState title="Backup inválido" message={importError} />}
      {importPreview && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm">Este arquivo contém {importPreview.count} conjunto(s) de jogos. Confirmar importação?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={confirmImport} className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
              Confirmar
            </button>
            <button type="button" onClick={() => setImportPreview(null)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {message && <p role="status" className="text-sm text-slate-600">{message}</p>}

      {portfolios.length === 0 ? (
        <EmptyState title="Nenhum jogo salvo ainda" description="Gere um conjunto de jogos e salve para vê-lo aqui." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {portfolios.map((p) => (
            <SavedPortfolioCard
              key={p.id}
              portfolio={p}
              onOpen={() => setSelected(p)}
              onToggleBet={() => setMarkedAsBet(p.id, !p.markedAsBet).then(refresh)}
              onDelete={() => {
                if (confirm("Excluir este conjunto de jogos?")) deletePortfolio(p.id).then(refresh);
              }}
            />
          ))}
        </div>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" aria-label="Detalhes dos jogos salvos" className="rounded-xl border border-slate-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Detalhes — {strategyRegistry.get(selected.strategyId)?.ux.title ?? selected.strategyId}</h2>
            <button type="button" onClick={() => setSelected(null)} className="rounded border border-slate-300 px-2 py-1 text-sm">
              Fechar
            </button>
          </div>
          {(() => {
            const checkedResult = selected.checkedResult;
            if (!checkedResult) {
              return (
                <>
                  <PortfolioTicketList tickets={selected.tickets} />
                  <button type="button" onClick={() => handleCheck(selected)} className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm">
                    Conferir resultado
                  </button>
                </>
              );
            }
            const summary = summarizeCheckedResult(selected.modality, checkedResult);
            return (
              <>
                <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resultado oficial — Concurso {checkedResult.contest}</p>
                    <p className="mt-0.5 font-mono text-base text-slate-900">{formatDrawNumbers(checkedResult.numbers)}</p>
                  </div>
                  {summary.sentence && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Melhor resultado</p>
                      <p className="mt-0.5 text-slate-800">{summary.sentence}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">Conferido em {new Date(checkedResult.checkedAt).toLocaleString("pt-BR")}</p>
                </div>
                <PortfolioTicketList
                  tickets={selected.tickets}
                  highlightNumbers={checkedResult.numbers}
                  hitsPerTicket={checkedResult.hitsPerTicket}
                  formatHits={(hits) => formatHitResult(selected.modality, hits)}
                  bestTicketNumbers={summary.bestTicketNumbers}
                />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
