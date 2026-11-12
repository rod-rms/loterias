import type { ReactNode } from "react";
import { InfoHelp } from "../../../shared/components";
import { binomialRange, normalQuantile } from "../../../shared/lib/analysisStats";
import type { ModalityAnalysis } from "../../../shared/lib/backtestAnalysis";
import type { LedgerSummary } from "../../../shared/lib/ledgerSummary";
import type { Modality } from "../../../shared/types";
import { CHANCE, MUTED, NEUTRAL, countLabel, dateBr, fmt, nf, roundedRange, strategyLabel, type Period } from "./format";

/** Lay-reader view of the backtest (sections 1-6 of the page). Simple wording; technical vocabulary lives only in the technical disclosure. */

const UNIT: Record<Modality, { plural: string; singular: string }> = {
  lotofacil: { plural: "pontos", singular: "ponto" },
  megasena: { plural: "acertos", singular: "acerto" },
};

function Card({ id, title, help, children }: { id: string; title: string; help: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-brand-border bg-brand-surface p-4" data-testid={`chart-${id}`}>
      <h2 id={`${id}-title`} className="flex items-center gap-1.5 text-base font-semibold text-brand-text">
        {title}
        <InfoHelp title={title} body={help} label={`Ajuda sobre: ${title}`} />
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Badge({ kind }: { kind: "none" | "above" | "below" }) {
  const text = kind === "none" ? "Igual ao acaso" : kind === "above" ? "Acima do acaso" : "Abaixo do acaso";
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${kind === "none" ? "bg-white/10 text-brand-textMuted" : "bg-amber-400/20 text-amber-200"}`}>{text}</span>
  );
}

/** A horizontal strip on a FIXED axis: optional light band (chance variation), chance line and marks. */
function Strip({ lo, hi, band, line, children, label }: { lo: number; hi: number; band?: { low: number; high: number } | null; line?: number | null; children?: ReactNode; label: string }) {
  const W = 320;
  const x = (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * W;
  return (
    <svg viewBox={`0 0 ${W} 24`} className="h-6 w-full" role="img" aria-label={label}>
      <line x1={0} x2={W} y1={12} y2={12} stroke={MUTED} strokeOpacity={0.25} />
      {band && <rect x={x(band.low)} y={2} width={Math.max(2, x(band.high) - x(band.low))} height={20} fill={CHANCE} fillOpacity={0.2} />}
      {line != null && <line x1={x(line)} x2={x(line)} y1={1} y2={23} stroke={CHANCE} strokeWidth={2} />}
      {children}
    </svg>
  );
}
// `Strip` children are SVG fragments built by callers with the same x scale.
const scaleFor = (lo: number, hi: number) => (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 320;

function AxisLabels({ lo, hi, mid, format }: { lo: number; hi: number; mid?: number; format: (v: number) => string }) {
  return (
    <div className="flex justify-between text-[11px] text-brand-textMuted" aria-hidden>
      <span>{format(lo)}</span>
      {mid !== undefined && <span>{format(mid)}</span>}
      <span>{format(hi)}</span>
    </div>
  );
}

function ChanceLegend({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-2 text-xs text-brand-textMuted">
      <svg viewBox="0 0 22 12" className="mt-0.5 h-3 w-5 shrink-0" aria-hidden>
        <rect x={0} y={0} width={22} height={12} fill={CHANCE} fillOpacity={0.2} />
        <line x1={11} x2={11} y1={0} y2={12} stroke={CHANCE} strokeWidth={2} />
      </svg>
      <span>{children}</span>
    </p>
  );
}

// ---- 2. Resposta curta -----------------------------------------------------------------------------------------------

export function ShortAnswer({ a, period }: { a: ModalityAnalysis; period: Period }) {
  const unit = UNIT[a.modality];
  const n = a.meta.range.contestsCount;
  const when = period.firstDate && period.lastDate ? ` (de ${period.firstDate} a ${period.lastDate})` : ` (concursos ${a.meta.range.from} a ${a.meta.range.to})`;
  const means = a.strategies.map((s) => s.meanHits.mean);
  const tickets = a.strategies[0]?.nTickets ?? 0;
  const totals = a.strategies.map((s) => s.prize.total);
  const expectedPrize = tickets * a.reference.prizeChance;
  const prizeName = a.modality === "lotofacil" ? "Jogos premiados (11 pontos ou mais)" : "Jogos com quadra ou mais";
  const detectable = a.strategies.filter((s) => s.differenceVsReference !== "none");
  return (
    <section aria-label="Resposta curta" className="rounded-xl border border-brand-borderStrong bg-brand-surfaceElevated p-4" data-testid="short-answer">
      <h2 className="text-lg font-bold text-brand-text">Resposta curta</h2>
      {detectable.length === 0 ? (
        <>
          <p className="mt-2 text-brand-text">
            Em {n} sorteios passados{when}, todas as estratégias fizeram em média {roundedRange(means, 3)} {unit.plural} por jogo; ao acaso, {fmt(a.reference.meanHits, 3)}.{" "}
            <strong>Nenhuma estratégia aumenta a chance de ganhar.</strong> O que elas mudam é como os seus 6 jogos se distribuem.
          </p>
        </>
      ) : (
        <p className="mt-2 text-brand-text">
          Em {n} sorteios passados{when}, a média de {unit.plural} por jogo de {detectable.map((s) => strategyLabel(s.strategyId)).join(", ")} ficou{" "}
          {detectable.every((s) => s.differenceVsReference === "above") ? "acima" : detectable.every((s) => s.differenceVsReference === "below") ? "abaixo" : "fora"} da variação normal do acaso. É uma
          descrição do passado, que não indica o que vai acontecer, e as demais ficaram iguais ao acaso.
        </p>
      )}
      <p className="mt-2 text-sm text-brand-textMuted">
        {prizeName}: de {nf(0).format(Math.min(...totals))} a {nf(0).format(Math.max(...totals))} em {nf(0).format(tickets)} jogos por estratégia; ao acaso, esperam-se cerca de{" "}
        {countLabel(expectedPrize)}.{a.modality === "megasena" ? " Prêmios assim são raros demais neste período para comparar estratégias." : ""}
      </p>
    </section>
  );
}

// ---- 3. Chart A: average points per ticket -------------------------------------------------------------------------

const AXIS_A: Record<Modality, { lo: number; hi: number; mid: number }> = { lotofacil: { lo: 8, hi: 10, mid: 9 }, megasena: { lo: 0, hi: 1.2, mid: 0.6 } };

export function AverageChart({ a }: { a: ModalityAnalysis }) {
  const unit = UNIT[a.modality];
  const ax = AXIS_A[a.modality];
  const x = scaleFor(ax.lo, ax.hi);
  return (
    <Card
      id="media"
      title={`${a.modality === "lotofacil" ? "Pontos" : "Acertos"} por jogo, em média`}
      help={`Mostra quantos ${unit.plural}, em média, cada estratégia fez por jogo nos sorteios passados. A faixa verde é a variação normal do acaso: um ponto dentro dela é igual ao acaso. Isso não quer dizer que o resultado se repetirá nos próximos sorteios.`}
    >
      <ul className="space-y-3">
        {a.strategies.map((s) => (
          <li key={s.strategyId}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 font-medium text-brand-text">{strategyLabel(s.strategyId)}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-base font-semibold tabular-nums">{fmt(s.meanHits.mean, 3)}</span>
                <Badge kind={s.differenceVsReference} />
              </span>
            </div>
            <Strip lo={ax.lo} hi={ax.hi} band={a.chanceBand} line={a.reference.meanHits} label={`${strategyLabel(s.strategyId)}: média de ${fmt(s.meanHits.mean, 3)} ${unit.plural} por jogo; acaso ${fmt(a.reference.meanHits, 3)}`}>
              <circle cx={x(s.meanHits.mean)} cy={12} r={5} fill={NEUTRAL} stroke="#101729" strokeWidth={1.5} />
            </Strip>
          </li>
        ))}
      </ul>
      <AxisLabels lo={ax.lo} mid={ax.mid} hi={ax.hi} format={(v) => nf(v % 1 === 0 ? 0 : 1).format(v)} />
      <ChanceLegend>
        Linha verde: acaso ({fmt(a.reference.meanHits, 3)}). Faixa verde clara: variação normal do acaso para {a.meta.range.contestsCount} sorteios. A escala é fixa, para o ruído não parecer diferença.
      </ChanceLegend>
    </Card>
  );
}

// ---- 4. Chart B: prizes ----------------------------------------------------------------------------------------------

const PRIZE_NAMES: Record<number, string> = { 4: "Quadra", 5: "Quina", 6: "Sena" };
const levelName = (m: Modality, lv: number) => (m === "megasena" ? PRIZE_NAMES[lv]! : `${lv}`);

export function PrizeChart({ a }: { a: ModalityAnalysis }) {
  const tickets = a.strategies[0]?.nTickets ?? 0;
  const lf = a.modality === "lotofacil";
  const expectedTotal = tickets * a.reference.prizeChance;
  const chancePer100 = a.reference.prizeChance * 100;
  const z = normalQuantile(1 - (1 - a.chanceBand.level) / 2);
  const half = z * Math.sqrt((a.reference.prizeChance * (1 - a.reference.prizeChance)) / Math.max(1, tickets)) * 100;
  const ranges = a.reference.prizeExpectedByLevel.map((p) => binomialRange(tickets, p, a.chanceBand.level));
  const hiAxis = 20;
  const x = scaleFor(0, hiAxis);
  return (
    <Card
      id="premios"
      title="A cada 100 jogos, quantos foram premiados?"
      help={
        lf
          ? "Mostra quantos jogos fizeram 11 pontos ou mais (os que dão prêmio) e quantos se esperariam por puro acaso. Compare o ponto com a linha verde. Não indica prêmios nos próximos sorteios."
          : "Mostra quantos jogos fizeram quadra, quina ou sena e quantos se esperariam por puro acaso. Os números são pequenos demais para comparar estratégias. Não indica prêmios nos próximos sorteios."
      }
    >
      {lf ? (
        <>
          <ul className="space-y-3">
            {a.strategies.map((s) => (
              <li key={s.strategyId}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-brand-text">{strategyLabel(s.strategyId)}</span>
                  <span className="font-mono text-base font-semibold tabular-nums">{fmt(s.prize.per100, 3)} <span className="text-xs font-normal text-brand-textMuted">em 100</span></span>
                </div>
                <Strip lo={0} hi={hiAxis} band={{ low: chancePer100 - half, high: chancePer100 + half }} line={chancePer100} label={`${strategyLabel(s.strategyId)}: ${fmt(s.prize.per100, 3)} jogos premiados a cada 100; acaso ${fmt(chancePer100, 3)}`}>
                  <circle cx={x(s.prize.per100)} cy={12} r={5} fill={NEUTRAL} stroke="#101729" strokeWidth={1.5} />
                </Strip>
              </li>
            ))}
          </ul>
          <AxisLabels lo={0} mid={10} hi={hiAxis} format={(v) => String(v)} />
          <ChanceLegend>
            Linha verde: acaso ({fmt(chancePer100, 3)} a cada 100, ou seja, cerca de {countLabel(expectedTotal)} em {nf(0).format(tickets)} jogos). Faixa verde clara: variação normal do acaso.
          </ChanceLegend>
        </>
      ) : (
        <p className="text-sm text-brand-text">
          Prêmios assim são raros: ao acaso, esperam-se cerca de {countLabel(expectedTotal)} jogos com quadra ou mais em {nf(0).format(tickets)}. Por isso este período é pequeno demais para comparar estratégias por prêmios.
        </p>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <caption className="mb-1 text-left text-brand-textMuted">
            <span className="inline-flex items-center gap-1">
              Quantidade de jogos por {lf ? "pontos" : "prêmio"}, em {nf(0).format(tickets)} jogos por estratégia
              <InfoHelp title="Faixa normal do acaso" body="Contagens dentro da faixa normal do acaso são o que o acaso sozinho produz." label="Ajuda sobre a faixa normal do acaso na tabela" />
            </span>
          </caption>
          <thead>
            <tr className="text-brand-textMuted">
              <th className="px-2 py-1 text-left font-medium">Estratégia</th>
              {a.reference.prizeLevels.map((lv) => (
                <th key={lv} className="px-2 py-1 text-right font-medium">
                  {levelName(a.modality, lv)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="font-medium" style={{ color: CHANCE }} data-testid="chance-row">
              <td className="px-2 py-1">Ao acaso: esperado (normal: de A a B)</td>
              {a.reference.prizeExpectedByLevel.map((p, i) => (
                <td key={i} className="px-2 py-1 text-right font-mono tabular-nums">
                  {countLabel(p * tickets)}{" "}
                  <span className="block whitespace-nowrap text-[11px] font-normal">
                    {ranges[i]!.low}–{ranges[i]!.high}
                  </span>
                </td>
              ))}
            </tr>
            {a.strategies.map((s) => (
              <tr key={s.strategyId} className="border-t border-brand-border">
                <td className="px-2 py-1">{strategyLabel(s.strategyId)}</td>
                {s.prize.observed.map((c, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono tabular-nums">
                    {c}
                    {(c < ranges[i]!.low || c > ranges[i]!.high) && (
                      <span className="block text-[11px] font-normal text-amber-200">{c > ranges[i]!.high ? "acima" : "abaixo"}<span className="sr-only"> da variação normal do acaso</span></span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---- 5. Chart C: worst and best ticket ------------------------------------------------------------------------------

const AXIS_C: Record<Modality, { lo: number; hi: number; mid: number }> = { lotofacil: { lo: 6, hi: 12, mid: 9 }, megasena: { lo: 0, hi: 2, mid: 1 } };

export function SpreadChart({ a }: { a: ModalityAnalysis }) {
  const ax = AXIS_C[a.modality];
  const x = scaleFor(ax.lo, ax.hi);
  const ref = a.control?.spread ?? null;
  return (
    <Card
      id="melhor-pior"
      title="O que a estratégia muda: o melhor e o pior jogo da carteira"
      help="Cada traço vai do pior ao melhor jogo da carteira de 6 jogos, em média, e a marca vertical indica a média. A faixa verde é a de uma carteira feita ao acaso neste mesmo teste. Um melhor jogo mais alto não significa chance maior de ganhar."
    >
      <ul className="space-y-3">
        {a.strategies.map((s) => (
          <li key={s.strategyId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
              <span className="font-medium text-brand-text">{strategyLabel(s.strategyId)}</span>
              <span className="font-mono text-xs tabular-nums text-brand-textMuted">
                pior {fmt(s.spread.worst, 3)} · média {fmt(s.spread.mean, 3)} · melhor {fmt(s.spread.best, 3)}
              </span>
            </div>
            <Strip lo={ax.lo} hi={ax.hi} band={ref ? { low: ref.worst, high: ref.best } : null} label={`${strategyLabel(s.strategyId)}: pior jogo ${fmt(s.spread.worst, 3)}, melhor jogo ${fmt(s.spread.best, 3)}, média ${fmt(s.spread.mean, 3)}`}>
              <line x1={x(s.spread.worst)} x2={x(s.spread.best)} y1={12} y2={12} stroke={NEUTRAL} strokeWidth={4} strokeLinecap="round" />
              <line x1={x(s.spread.mean)} x2={x(s.spread.mean)} y1={4} y2={20} stroke="#101729" strokeWidth={3} />
              <line x1={x(s.spread.mean)} x2={x(s.spread.mean)} y1={5} y2={19} stroke="#FFFFFF" strokeWidth={1.5} />
            </Strip>
          </li>
        ))}
      </ul>
      <AxisLabels lo={ax.lo} mid={ax.mid} hi={ax.hi} format={(v) => nf(v % 1 === 0 ? 0 : 1).format(v)} />
      {ref && (
        <ChanceLegend>
          Faixa verde: uma carteira feita ao acaso neste mesmo teste (pior {fmt(ref.worst, 3)}, melhor {fmt(ref.best, 3)}).
        </ChanceLegend>
      )}
      <p className="mt-2 text-sm text-brand-textMuted">
        Diversificar espalha os resultados para os dois lados: o melhor jogo da carteira pode ficar um pouco mais alto e o pior um pouco mais baixo. A média quase não muda.
      </p>
    </Card>
  );
}

// ---- 6. Prospective test -----------------------------------------------------------------------------------------------

/** Registered draws after which a first reading is planned (about 30). A progress marker only; no promise about the reading. */
const LEDGER_READING_TARGET = 30;

export function LedgerCard({ ledger }: { ledger: { lotofacil: LedgerSummary | "unavailable" | null; megasena: LedgerSummary | "unavailable" | null } }) {
  const line = (label: string, s: LedgerSummary | "unavailable" | null, reading: string) => {
    const n = s !== null && s !== "unavailable" ? s.registeredDraws : null;
    return (
      <li key={label}>
        <p>
          <strong className="text-brand-text">{label}:</strong>{" "}
          {s === null ? "carregando…" : n === null ? "contagem indisponível agora" : `${n} de ${LEDGER_READING_TARGET} sorteios registrados`}
        </p>
        {n !== null && (
          <div role="progressbar" aria-label={`Sorteios registrados da ${label}`} aria-valuemin={0} aria-valuemax={LEDGER_READING_TARGET} aria-valuenow={Math.min(n, LEDGER_READING_TARGET)} className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-actionText" style={{ width: `${Math.min(100, (n / LEDGER_READING_TARGET) * 100)}%` }} />
          </div>
        )}
        <p className="mt-1 text-xs">Primeira leitura: {reading}.</p>
      </li>
    );
  };
  const first = [ledger.lotofacil, ledger.megasena].flatMap((s) => (s && s !== "unavailable" && s.firstGeneratedAt ? [s.firstGeneratedAt] : [])).sort()[0];
  return (
    <section aria-label="Teste de verdade em andamento" className="rounded-xl border border-brand-border bg-brand-surface p-4" data-testid="ledger-card">
      <h2 className="text-base font-semibold text-brand-text">Teste de verdade em andamento</h2>
      <p className="mt-2 text-sm text-brand-textMuted">
        {dateBr(first) ? `Desde ${dateBr(first)}` : "Desde 12/11/2026"}, o app registra os jogos de cada estratégia antes de cada sorteio. Só depois do resultado eles são conferidos. É o único teste que não depende de ter olhado o passado.
      </p>
      <ul className="mt-2 space-y-3 text-sm text-brand-textMuted">
        {line("Lotofácil", ledger.lotofacil, "por volta do fim de dezembro de 2026 (cerca de 30 sorteios)")}
        {line("Mega-Sena", ledger.megasena, "por volta do fim de janeiro de 2027 (cerca de 30 sorteios)")}
      </ul>
      <p className="mt-2 text-sm text-brand-textMuted">
        O teste com sorteios passados, mostrado acima, é otimista: as estratégias foram desenhadas conhecendo esse histórico. Ele serve para dar uma ideia inicial, não como prova.
      </p>
    </section>
  );
}
