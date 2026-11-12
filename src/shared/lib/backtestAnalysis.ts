/**
 * Turns a validated backtest artifact (ANL-002) into the numbers the "Análise de resultados" page displays (ANL-003,
 * increment 1). Pure: no I/O. See analysisStats.ts for the method choices. Descriptive only (DEC-013, DEC-025):
 * nothing here ranks, recommends or predicts.
 */
import { BACKTEST_TICKETS_PER_STRATEGY, type BacktestFile } from "./backtestSchemas";
import { normalQuantile, bonferroniLevel, bootstrapMeanInterval, cumulativeDifference, excludesReference, expectedMaxOfK, meanInterval, mean, type Interval } from "./analysisStats";
import { hitsDistributionFor } from "./hitsDistribution";
import type { Modality } from "../types";

export const ANALYSIS_LEVEL = 0.95;
/** Strategies compared with the random reference on the primary metric (family size for the Bonferroni adjustment). */
export const FAMILY_SIZE = 5;
/** Below this many observed events the rate interval is flagged as thin. */
export const THIN_EVENTS = 30;
/** Secondary metric thresholds (protocol §4). */
export const RATE_THRESHOLD: Record<Modality, number> = { lotofacil: 11, megasena: 3 };

export interface DistributionBin {
  label: string;
  /** Hit counts that fall in this bin. */
  hits: number[];
  /** Exact probability under a random ticket. */
  theory: number;
}

const BIN_EDGES: Record<Modality, { lowCap: number; highCap: number }> = {
  lotofacil: { lowCap: 7, highCap: 12 },
  megasena: { lowCap: 0, highCap: 3 },
};

/** Display bins: the tails are merged so every bin has a meaningful probability. */
export function distributionBins(modality: Modality): DistributionBin[] {
  const { pmf } = hitsDistributionFor(modality);
  const { lowCap, highCap } = BIN_EDGES[modality];
  const bins: DistributionBin[] = [];
  const sum = (hs: number[]) => hs.reduce((s, h) => s + pmf[h]!, 0);
  const lowHits = Array.from({ length: lowCap + 1 }, (_, h) => h);
  bins.push({ label: lowCap === 0 ? "0" : `≤ ${lowCap}`, hits: lowHits, theory: sum(lowHits) });
  for (let h = lowCap + 1; h < highCap; h += 1) bins.push({ label: String(h), hits: [h], theory: pmf[h]! });
  const highHits = Array.from({ length: pmf.length - highCap }, (_, i) => highCap + i);
  bins.push({ label: `≥ ${highCap}`, hits: highHits, theory: sum(highHits) });
  return bins;
}

export interface BinStat {
  label: string;
  theory: number;
  /** Share of tickets in this bin, as the mean of the per-contest shares. */
  share: Interval;
}

/** Prize tiers shown in the main view (Mega-Sena: quadra, quina, sena; Lotofácil: 11 to 15 points). */
export const PRIZE_LEVELS: Record<Modality, number[]> = { lotofacil: [11, 12, 13, 14, 15], megasena: [4, 5, 6] };

export interface StrategyStats {
  strategyId: string;
  strategyVersion: string;
  algorithmVersion: string;
  nContests: number;
  nTickets: number;
  /** Primary metric: mean hits per ticket, 95% t-interval over contests. */
  meanHits: Interval;
  /** Same metric at the Bonferroni-adjusted level used for the "detectable difference" marker. */
  meanHitsFamily: Interval;
  /** Position relative to the exact random mean; "none" when the family interval contains it. */
  differenceVsReference: "above" | "below" | "none";
  rate: { events: number; tickets: number; share: Interval; thin: boolean };
  bestHits: Interval;
  bins: BinStat[];
  /** Prize tickets (lay view): observed counts per level and the total at or above the first prize level. */
  prize: { levels: number[]; observed: number[]; total: number; per100: number };
  /** Average worst / mean / best ticket of the portfolio over the contests (lay view). */
  spread: { worst: number; mean: number; best: number };
  /** Cumulative (portfolio mean hits - random mean), one point per contest. */
  cumulative: number[];
}

export interface Reference {
  meanHits: number;
  ticketSd: number;
  /** sd of the mean of 6 random tickets (analytic: ticketSd / sqrt(6)). */
  portfolioSd: number;
  rateThreshold: number;
  rateTheory: number;
  bestHitsMean: number;
  /** First prize level (11 points / quadra) and its exact chance per ticket. */
  prizeLevels: number[];
  prizeChance: number;
  prizeExpectedByLevel: number[];
}

export interface ModalityAnalysis {
  modality: Modality;
  reference: Reference;
  strategies: StrategyStats[];
  bins: DistributionBin[];
  /** True when at least one strategy's family-adjusted interval excludes the random mean. */
  anyDetectable: boolean;
  /** Normal variation of chance for the average (Bonferroni-adjusted level), as a band around the exact random mean. */
  chanceBand: { low: number; high: number; level: number };
  /** Observed portfolio of the empirical random control (uniform_random) from the SAME backtest, or null. */
  control: { strategyId: string; spread: StrategyStats["spread"]; prizePer100: number } | null;
  meta: { runId: string; datasetSha256: string; codeCommit: string; generatedAt: string; range: BacktestFile["range"]; caveats: string[]; seedTemplate: string };
}

export function referenceFor(modality: Modality): Reference {
  const dist = hitsDistributionFor(modality);
  const threshold = RATE_THRESHOLD[modality];
  return {
    meanHits: dist.mean,
    ticketSd: dist.sd,
    portfolioSd: dist.sd / Math.sqrt(BACKTEST_TICKETS_PER_STRATEGY),
    rateThreshold: threshold,
    rateTheory: dist.pmf.reduce((s, p, h) => (h >= threshold ? s + p : s), 0),
    bestHitsMean: expectedMaxOfK(dist.pmf, BACKTEST_TICKETS_PER_STRATEGY),
    prizeLevels: PRIZE_LEVELS[modality],
    prizeChance: dist.pmf.reduce((sum, p, h) => (h >= PRIZE_LEVELS[modality][0]! ? sum + p : sum), 0),
    prizeExpectedByLevel: PRIZE_LEVELS[modality].map((h) => dist.pmf[h]!),
  };
}

export function analyzeBacktest(file: BacktestFile): ModalityAnalysis {
  const modality = file.modality;
  const reference = referenceFor(modality);
  const bins = distributionBins(modality);
  const familyLevel = bonferroniLevel(ANALYSIS_LEVEL, FAMILY_SIZE);
  const byStrategy = new Map<string, BacktestFile["rows"]>();
  for (const r of file.rows) (byStrategy.get(r.strategyId) ?? byStrategy.set(r.strategyId, []).get(r.strategyId)!).push(r);

  const strategies: StrategyStats[] = file.strategies.map((s) => {
    const rows = (byStrategy.get(s.id) ?? []).slice().sort((a, b) => a.contest - b.contest);
    const portfolioMeans = rows.map((r) => mean(r.hitsPerTicket));
    const rateShares = rows.map((r) => r.hitsPerTicket.filter((h) => h >= reference.rateThreshold).length / r.hitsPerTicket.length);
    const events = rows.reduce((n, r) => n + r.hitsPerTicket.filter((h) => h >= reference.rateThreshold).length, 0);
    const meanHits = meanInterval(portfolioMeans, ANALYSIS_LEVEL);
    const meanHitsFamily = meanInterval(portfolioMeans, familyLevel);
    const differenceVsReference = !excludesReference(meanHitsFamily, reference.meanHits) ? "none" : meanHitsFamily.low > reference.meanHits ? "above" : "below";
    return {
      strategyId: s.id,
      strategyVersion: s.strategyVersion,
      algorithmVersion: s.algorithmVersion,
      nContests: rows.length,
      nTickets: rows.length * BACKTEST_TICKETS_PER_STRATEGY,
      meanHits,
      meanHitsFamily,
      differenceVsReference,
      rate: {
        events,
        tickets: rows.length * BACKTEST_TICKETS_PER_STRATEGY,
        share: bootstrapMeanInterval(rateShares, `analysis:${file.runId}:${s.id}:rate`, ANALYSIS_LEVEL),
        thin: events < THIN_EVENTS,
      },
      bestHits: meanInterval(rows.map((r) => r.bestHits), ANALYSIS_LEVEL),
      prize: (() => {
        const levels = PRIZE_LEVELS[modality];
        const all = rows.flatMap((r) => r.hitsPerTicket);
        const observed = levels.map((lv) => all.filter((h) => h === lv).length);
        const total = all.filter((h) => h >= levels[0]!).length;
        return { levels, observed, total, per100: all.length ? (total / all.length) * 100 : 0 };
      })(),
      spread: {
        worst: mean(rows.map((r) => Math.min(...r.hitsPerTicket))),
        mean: mean(portfolioMeans),
        best: mean(rows.map((r) => r.bestHits)),
      },
      bins: bins.map((bin) => ({
        label: bin.label,
        theory: bin.theory,
        share: meanInterval(rows.map((r) => r.hitsPerTicket.filter((h) => bin.hits.includes(h)).length / r.hitsPerTicket.length), ANALYSIS_LEVEL),
      })),
      cumulative: cumulativeDifference(portfolioMeans, reference.meanHits),
    };
  });

  const zFam = normalQuantile(1 - (1 - familyLevel) / 2);
  const nContests = file.range.contestsCount;
  const bandHalf = (zFam * reference.portfolioSd) / Math.sqrt(nContests);
  const controlStats = strategies.find((x) => x.strategyId === `${modality}.uniform_random`);
  return {
    modality,
    reference,
    strategies,
    chanceBand: { low: reference.meanHits - bandHalf, high: reference.meanHits + bandHalf, level: familyLevel },
    control: controlStats ? { strategyId: controlStats.strategyId, spread: controlStats.spread, prizePer100: controlStats.prize.per100 } : null,
    bins,
    anyDetectable: strategies.some((s) => s.differenceVsReference !== "none"),
    meta: { runId: file.runId, datasetSha256: file.datasetSha256, codeCommit: file.codeCommit, generatedAt: file.generatedAt, range: file.range, caveats: file.caveats, seedTemplate: file.parameters.seedTemplate },
  };
}

// ---- export (exactly what is displayed) ---------------------------------------------------------------------------

export const METHOD_NOTES = [
  "Unidade independente: o concurso (a média de acertos dos 6 jogos da carteira). Os 6 jogos de uma carteira compartilham o mesmo sorteio e são correlacionados.",
  "Médias: intervalo t de 95% sobre os concursos. Taxas: bootstrap percentílico semeado (2000 reamostras de concursos), 95%.",
  "Marcador de diferença: só aparece se o intervalo ajustado por Bonferroni (5 comparações, 99%) excluir a média aleatória exata.",
  "Referência aleatória: distribuição hipergeométrica exata. Funil: ±z·σ·√k com σ = σ_jogo/√6 (analítico).",
];

const f = (x: number, d = 4) => x.toFixed(d);

export function buildAnalysisExport(a: ModalityAnalysis): { json: unknown; csv: string } {
  const json = {
    modality: a.modality,
    runId: a.meta.runId,
    datasetSha256: a.meta.datasetSha256,
    codeCommit: a.meta.codeCommit,
    generatedAt: a.meta.generatedAt,
    range: a.meta.range,
    method: METHOD_NOTES,
    caveats: a.meta.caveats,
    reference: a.reference,
    strategies: a.strategies.map((s) => ({
      strategyId: s.strategyId,
      strategyVersion: s.strategyVersion,
      nContests: s.nContests,
      nTickets: s.nTickets,
      meanHits: s.meanHits,
      meanHitsFamilyAdjusted: s.meanHitsFamily,
      differenceVsReference: s.differenceVsReference,
      rate: s.rate,
      bestHits: s.bestHits,
      distribution: s.bins,
      cumulativeDifferenceFinal: s.cumulative.at(-1) ?? 0,
    })),
  };
  const lines: string[] = [];
  lines.push(`# modalidade;${a.modality}`, `# runId;${a.meta.runId}`, `# datasetSha256;${a.meta.datasetSha256}`, `# codeCommit;${a.meta.codeCommit}`, `# gerado_em;${a.meta.generatedAt}`, `# concursos;${a.meta.range.from}-${a.meta.range.to}`);
  for (const m of METHOD_NOTES) lines.push(`# metodo;${m}`);
  for (const c of a.meta.caveats) lines.push(`# aviso;${c}`);
  lines.push(`# referencia_media_acertos;${f(a.reference.meanHits)}`, `# referencia_taxa_ge_${a.reference.rateThreshold};${f(a.reference.rateTheory, 6)}`, `# referencia_melhor_jogo_medio;${f(a.reference.bestHitsMean)}`);
  lines.push("estrategia;versao;n_concursos;n_jogos;media_acertos;ic95_baixo;ic95_alto;ic_ajustado99_baixo;ic_ajustado99_alto;diferenca_vs_referencia;eventos_limiar;taxa_limiar;taxa_ic95_baixo;taxa_ic95_alto;amostra_fina;melhor_jogo_medio;melhor_ic95_baixo;melhor_ic95_alto;diferenca_acumulada_final");
  for (const s of a.strategies) {
    lines.push(
      [s.strategyId, s.strategyVersion, s.nContests, s.nTickets, f(s.meanHits.mean), f(s.meanHits.low), f(s.meanHits.high), f(s.meanHitsFamily.low), f(s.meanHitsFamily.high), s.differenceVsReference, s.rate.events, f(s.rate.share.mean, 6), f(s.rate.share.low, 6), f(s.rate.share.high, 6), s.rate.thin ? "sim" : "nao", f(s.bestHits.mean), f(s.bestHits.low), f(s.bestHits.high), f(s.cumulative.at(-1) ?? 0)].join(";"),
    );
  }
  lines.push("", "estrategia;faixa_acertos;proporcao_observada;ic95_baixo;ic95_alto;proporcao_teorica_exata");
  for (const s of a.strategies) for (const b of s.bins) lines.push([s.strategyId, b.label, f(b.share.mean, 6), f(b.share.low, 6), f(b.share.high, 6), f(b.theory, 6)].join(";"));
  return { json, csv: lines.join("\n") + "\n" };
}
