import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InfoHelp, NumberChip, ResponsibleGamingNotice } from "../../shared/components";
import { loadDataStatus, loadDataset } from "../../shared/lib/dataLoaders";
import { estimateDrawDate, formatShortDatePtBR } from "../../shared/lib/drawSchedule";
import { sectionPath, useModalities, useModalityRegistry, modalityCssVars } from "../../shared/lib/modalityRegistry";
import { listPortfolios } from "../../shared/lib/portfolioStore";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { formatDatePtBR } from "../../shared/utils/numberFormat";
import type { DataStatus, LotteryDataset, Modality, ModalityRegistryEntry, SavedPortfolio } from "../../shared/types";

/**
 * Home (UI-001): a working dashboard, one block per enabled modality (next contest with its estimated date, last
 * result, data freshness, "Gerar jogos"), then the saved portfolios still waiting for a result. Existing data only;
 * no marketing hero.
 */

type Datasets = Partial<Record<Modality, LotteryDataset | "error">>;

function ModalityBlock({ entry, dataset, status }: { entry: ModalityRegistryEntry; dataset: LotteryDataset | "error" | undefined; status: DataStatus | null | "error" }) {
  const ds = dataset && dataset !== "error" ? dataset : null;
  const last = ds?.draws.at(-1);
  const next = ds ? ds.latestContest + 1 : null;
  const estimate = ds && next ? estimateDrawDate(entry.id, next, ds) : null;
  const st = status && status !== "error" ? (status as unknown as Record<string, { lastCheckedAt: string; latestDrawDate: string } | undefined>)[entry.id] : undefined;
  return (
    <section aria-labelledby={`home-${entry.slug}`} style={modalityCssVars(entry) as React.CSSProperties} className="col-span-12 border-t-2 border-mod-accent pt-4 lg:col-span-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`home-${entry.slug}`} className="text-lg font-semibold text-ink-100">
          {entry.displayName}
        </h2>
        <Link to={sectionPath(entry, "gerar")} aria-label={`Gerar jogos da ${entry.displayName}`} className="rounded bg-brand-action px-4 py-2 text-sm font-medium text-brand-actionForeground hover:bg-brand-actionHover">
          Gerar jogos
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-300">Próximo concurso</dt>
          <dd className="font-mono text-lg tabular-nums text-ink-100">{dataset === "error" ? "—" : next ?? "…"}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-ink-300">
            Sorteio estimado
            <InfoHelp title="Sorteio estimado" body={`Estimativa pela periodicidade semanal oficial da ${entry.displayName}. O calendário da CAIXA prevalece em feriados ou mudanças de agenda.`} />
          </dt>
          <dd className="font-mono tabular-nums text-ink-100">{estimate ? `${formatShortDatePtBR(estimate.isoDate)} · ${estimate.weekdayName} · ${estimate.approxHour}` : dataset === "error" ? "—" : "…"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-300">{last ? `Último resultado · concurso ${last.contest} · ${formatDatePtBR(last.drawDate)}` : "Último resultado"}</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {last ? last.numbers.map((n) => <NumberChip key={n} value={n} size="sm" />) : <span className="text-ink-300">{dataset === "error" ? "Dados indisponíveis." : "…"}</span>}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-300">Dados</dt>
          <dd className="text-xs text-ink-200">
            {status === null ? "verificando…" : st ? `atualizados até ${formatDatePtBR(st.latestDrawDate)} · última verificação ${new Date(st.lastCheckedAt).toLocaleString("pt-BR")}` : "situação indisponível"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PendingPortfolios({ portfolios, datasets, modalities }: { portfolios: SavedPortfolio[] | null; datasets: Datasets; modalities: ModalityRegistryEntry[] }) {
  if (portfolios === null) return null;
  const pending = portfolios.filter((p) => !p.checkedResult && p.contest !== undefined);
  const byId = new Map(modalities.map((m) => [m.id, m] as const));
  const rows = pending
    .map((p) => {
      const ds = datasets[p.modality];
      const dataset = ds && ds !== "error" ? ds : null;
      const drawn = dataset ? p.contest! <= dataset.latestContest : null;
      const estimate = dataset && !drawn ? estimateDrawDate(p.modality, p.contest!, dataset) : null;
      return { p, drawn, estimate, entry: byId.get(p.modality) };
    })
    .sort((a, b) => (a.p.contest ?? 0) - (b.p.contest ?? 0));
  const shown = rows.slice(0, 6);
  return (
    <section aria-labelledby="home-pending" className="col-span-12 border-t border-ink-500 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-pending" className="text-lg font-semibold text-ink-100">
          Jogos aguardando resultado
        </h2>
        {rows.length > 0 && (
          <Link to="/carteiras" className="text-sm text-ink-200 underline underline-offset-2 hover:text-ink-100">
            Todos os meus jogos
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-300">Nenhum jogo salvo aguarda resultado.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Jogos salvos ainda não conferidos</caption>
          <thead className="text-xs text-ink-300">
            <tr className="text-left">
              <th className="py-1 pr-3 font-medium">Modalidade</th>
              <th className="py-1 pr-3 font-medium">Concurso</th>
              <th className="py-1 pr-3 font-medium">Opção</th>
              <th className="py-1 pr-3 font-medium">Jogos</th>
              <th className="py-1 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ p, drawn, estimate, entry }) => (
              <tr key={p.id} className="border-t border-ink-500">
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: entry?.colors.accent }} />
                    {entry?.shortName ?? p.modality}
                  </span>
                </td>
                <td className="py-2 pr-3 font-mono tabular-nums">{p.contest}</td>
                <td className="py-2 pr-3">{strategyRegistry.get(p.strategyId)?.ux.title ?? p.strategyId}</td>
                <td className="py-2 pr-3 font-mono tabular-nums">{p.tickets.length}</td>
                <td className="py-2 text-ink-200">
                  {drawn === null ? "—" : drawn ? (
                    <Link to={entry ? sectionPath(entry, "carteiras") : "/carteiras"} className="underline underline-offset-2">
                      resultado disponível, conferir
                    </Link>
                  ) : estimate ? (
                    `sorteio estimado ${formatShortDatePtBR(estimate.isoDate)}`
                  ) : (
                    "aguardando sorteio"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > shown.length && <p className="mt-2 text-xs text-ink-300">Mostrando {shown.length} de {rows.length}.</p>}
    </section>
  );
}

export function Home() {
  const registry = useModalityRegistry();
  const modalities = useModalities();
  const [datasets, setDatasets] = useState<Datasets>({});
  const [status, setStatus] = useState<DataStatus | null | "error">(null);
  const [portfolios, setPortfolios] = useState<SavedPortfolio[] | null>(null);

  const ids = modalities.map((m) => m.id).join(",");
  useEffect(() => {
    let cancelled = false;
    for (const id of ids.split(",").filter(Boolean) as Modality[]) {
      loadDataset(id)
        .then((d) => !cancelled && setDatasets((prev) => ({ ...prev, [id]: d })))
        .catch(() => !cancelled && setDatasets((prev) => ({ ...prev, [id]: "error" })));
    }
    return () => {
      cancelled = true;
    };
  }, [ids]);
  useEffect(() => {
    let cancelled = false;
    loadDataStatus()
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus("error"));
    listPortfolios()
      .then((p) => !cancelled && setPortfolios(p))
      .catch(() => !cancelled && setPortfolios([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Início</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-200">
          Organize e confira seus jogos. Nenhuma opção prevê o sorteio: toda combinação válida tem a mesma chance.
        </p>
      </header>

      {registry.status === "loading" && (
        <p role="status" className="text-sm text-ink-300">
          Carregando…
        </p>
      )}

      <div className="grid grid-cols-12 gap-x-8 gap-y-8">
        {modalities.map((m) => (
          <ModalityBlock key={m.id} entry={m} dataset={datasets[m.id]} status={status} />
        ))}
        <PendingPortfolios portfolios={portfolios} datasets={datasets} modalities={modalities} />
      </div>

      <ResponsibleGamingNotice />
    </div>
  );
}
