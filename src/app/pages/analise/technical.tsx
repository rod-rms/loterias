import { useState } from "react";
import { ExportMenu, InfoHelp } from "../../../shared/components";
import { ANALYSIS_LEVEL, FAMILY_SIZE, METHOD_NOTES, type ModalityAnalysis } from "../../../shared/lib/backtestAnalysis";
import { DistributionChart, FunnelChart } from "./charts";
import { fmt, nf, pct, seriesStyle, strategyLabel } from "./format";

/** "Detalhes técnicos (para auditoria)": technical vocabulary is allowed only here. Rendered only when the disclosure is open. */

const th = "px-2 py-1 text-left font-medium";
const td = "px-2 py-1 font-mono tabular-nums";

function Block({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
        {title}
        <InfoHelp title={title} body={help} label={`Ajuda sobre: ${title}`} />
      </h3>
      {children}
    </section>
  );
}

export function TechnicalDetails({ a, onExportCsv, onExportJson }: { a: ModalityAnalysis; onExportCsv: () => void; onExportJson: () => void }) {
  const [selected, setSelected] = useState<string>(a.strategies[0]!.strategyId);
  const idx = Math.max(0, a.strategies.findIndex((s) => s.strategyId === selected));
  const sel = a.strategies[idx]!;
  const n = a.strategies[0]!.nContests;
  const thr = a.reference.rateThreshold;
  return (
    <div className="space-y-6 text-xs text-brand-textMuted" data-testid="technical-details">
      <p>
        Unidade independente: o concurso (média dos 6 jogos da carteira). Intervalos de {pct(ANALYSIS_LEVEL, 0)} agrupados por concurso; marcador de diferença só com o intervalo ajustado por Bonferroni para {FAMILY_SIZE} comparações ({pct(a.chanceBand.level, 0)}) excluindo
        a média aleatória exata. n = {n} concursos.
      </p>

      <Block
        title="Distribuição de acertos vs. distribuição hipergeométrica exata"
        help="Proporção de jogos em cada faixa de acertos, com intervalo de 95% por concurso, contra a probabilidade teórica exata (losango verde). Não prevê sorteios futuros."
      >
        <fieldset>
          <legend className="mb-1">Estratégia exibida</legend>
          <div className="flex flex-wrap gap-2">
            {a.strategies.map((s, i) => (
              <label key={s.strategyId} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 has-[:checked]:bg-white/10">
                <input type="radio" name={`dist-${a.modality}`} className="accent-brand-action" checked={s.strategyId === sel.strategyId} onChange={() => setSelected(s.strategyId)} />
                <span style={{ color: seriesStyle(i).color }} aria-hidden>
                  ●
                </span>
                {strategyLabel(s.strategyId)}
              </label>
            ))}
          </div>
        </fieldset>
        <DistributionChart bins={sel.bins} color={seriesStyle(idx).color} ariaLabel={`Distribuição de acertos de ${strategyLabel(sel.strategyId)} comparada com a teoria exata`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Faixa</th>
                <th className={th}>Observado</th>
                <th className={th}>IC 95%</th>
                <th className={th}>Teórico</th>
              </tr>
            </thead>
            <tbody>
              {sel.bins.map((b) => (
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
        </div>
      </Block>

      <Block
        title="Tabela de intervalos"
        help="Média de acertos, taxa de jogos com o limiar de acertos e média do melhor jogo, com intervalos. Médias: t de Student; taxa: bootstrap semeado de concursos. Não prevê sorteios futuros."
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Intervalos por estratégia</caption>
            <thead>
              <tr>
                <th className={th}>Estratégia</th>
                <th className={th}>Média</th>
                <th className={th}>IC 95%</th>
                <th className={th}>IC ajustado {pct(a.chanceBand.level, 0)}</th>
                <th className={th}>Vs. referência</th>
                <th className={th}>≥ {thr}: eventos</th>
                <th className={th}>≥ {thr}: taxa (IC 95%)</th>
                <th className={th}>Melhor jogo (IC 95%)</th>
              </tr>
            </thead>
            <tbody>
              {a.strategies.map((s) => (
                <tr key={s.strategyId}>
                  <td className={td}>{s.strategyId}</td>
                  <td className={td}>{fmt(s.meanHits.mean)}</td>
                  <td className={td}>
                    {fmt(s.meanHits.low)} – {fmt(s.meanHits.high)}
                  </td>
                  <td className={td}>
                    {fmt(s.meanHitsFamily.low)} – {fmt(s.meanHitsFamily.high)}
                  </td>
                  <td className={td}>{s.differenceVsReference === "none" ? "sem diferença detectável" : s.differenceVsReference === "above" ? "acima" : "abaixo"}</td>
                  <td className={td}>
                    {s.rate.events}/{s.rate.tickets}
                    {s.rate.thin ? " (amostra fina)" : ""}
                  </td>
                  <td className={td}>
                    {pct(s.rate.share.mean, 3)} ({pct(s.rate.share.low, 3)} – {pct(s.rate.share.high, 3)})
                  </td>
                  <td className={td}>
                    {fmt(s.bestHits.mean)} ({fmt(s.bestHits.low)} – {fmt(s.bestHits.high)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Referência aleatória exata: média {fmt(a.reference.meanHits)}; taxa de {thr}+ acertos {pct(a.reference.rateTheory, 4)}; melhor de 6 jogos independentes {fmt(a.reference.bestHitsMean)}.</p>
      </Block>

      <Block
        title="Diferença acumulada dentro do funil de variação"
        help="Soma, concurso a concurso, de (média da carteira − média aleatória). Faixa clara: 95%; tracejada: ajustada para 5 comparações. É descritivo, não um teste sequencial."
      >
        <FunnelChart strategies={a.strategies} reference={a.reference} ariaLabel="Diferença acumulada de acertos em relação ao esperado, dentro da faixa de variação do acaso" />
        <ul className="grid gap-1 sm:grid-cols-2">
          {a.strategies.map((s, i) => (
            <li key={s.strategyId} className="flex items-center gap-2">
              <svg viewBox="0 0 24 8" className="h-2 w-6 shrink-0" aria-hidden>
                <line x1={0} x2={24} y1={4} y2={4} stroke={seriesStyle(i).color} strokeWidth={3} strokeDasharray={seriesStyle(i).dash} />
              </svg>
              {strategyLabel(s.strategyId)}: {nf(2).format(s.cumulative.at(-1) ?? 0)}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Método" help="Como os números foram calculados. Não prevê sorteios futuros.">
        <ul className="list-disc space-y-1 pl-5">
          {METHOD_NOTES.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </Block>

      <Block title="Exportar" help="Baixa exatamente os números desta análise, com metadados de auditoria.">
        <ExportMenu onExportCsv={onExportCsv} onExportJson={onExportJson} />
      </Block>
    </div>
  );
}
