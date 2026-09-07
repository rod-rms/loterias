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
import { checkTicketsAgainstDraw, highestScore } from "../../shared/lib/checkResult";
import { SavedPortfolioCard, EmptyState, PortfolioTicketList, ErrorState } from "../../shared/components";
import type { Modality, SavedPortfolio } from "../../shared/types";

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
    const dataset = await loadDataset(portfolio.modality);
    const draw = dataset.draws.find((d) => d.contest === portfolio.contest);
    if (!draw) {
      setMessage("Resultado oficial deste concurso ainda não está disponível no dataset.");
      return;
    }
    const checkedResult = checkTicketsAgainstDraw(portfolio.tickets, draw);
    await saveCheckedResult(portfolio.id, checkedResult);
    refresh();
    setMessage(`Conferido: maior pontuação ${highestScore(checkedResult)} acertos.`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Minhas carteiras</h1>

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

      {importError && <ErrorState title="Backup inválido" message={importError} />}
      {importPreview && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm">Este arquivo contém {importPreview.count} carteira(s). Confirmar importação?</p>
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
        <EmptyState title="Nenhuma carteira salva" description="Gere uma carteira e salve para vê-la aqui." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {portfolios.map((p) => (
            <SavedPortfolioCard
              key={p.id}
              portfolio={p}
              onOpen={() => setSelected(p)}
              onToggleBet={() => setMarkedAsBet(p.id, !p.markedAsBet).then(refresh)}
              onDelete={() => {
                if (confirm("Excluir esta carteira?")) deletePortfolio(p.id).then(refresh);
              }}
            />
          ))}
        </div>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" aria-label="Detalhes da carteira" className="rounded-xl border border-slate-300 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Detalhes — {selected.strategyId}</h2>
            <button type="button" onClick={() => setSelected(null)} className="rounded border border-slate-300 px-2 py-1 text-sm">
              Fechar
            </button>
          </div>
          <PortfolioTicketList
            tickets={selected.tickets}
            highlightNumbers={selected.checkedResult?.numbers}
          />
          {selected.checkedResult ? (
            <p className="mt-2 text-sm text-slate-600">
              Conferido para o concurso {selected.checkedResult.contest}: maior pontuação {highestScore(selected.checkedResult)} acertos.
            </p>
          ) : (
            <button type="button" onClick={() => handleCheck(selected)} className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm">
              Conferir resultado
            </button>
          )}
        </div>
      )}
    </div>
  );
}
