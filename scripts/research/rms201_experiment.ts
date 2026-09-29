/**
 * RMS-201 — desempate multi-horizonte 20+50: experimento histórico exigido por DEC-017.
 *
 * NÃO é uma feature. Script de análise isolado, fora do fluxo normal — não
 * toca nenhum arquivo em src/. Reutiliza, por importação direta (leitura, não
 * modificação), as funções de produção já existentes do domínio RMS v2
 * (`buildPools`, `computeFrequencies`, `assignPoolToBucketsWithExposureMap`,
 * `targetExposureSplit`) e o PRNG compartilhado, para máxima fidelidade na
 * construção de Pool A/B/C (Versão A = comportamento atual, sem nenhuma
 * reimplementação). A Versão B (desempate pela janela de 50) e a montagem de
 * carteiras a partir das pools são escritas aqui, isoladas, documentadas e
 * revisáveis — não em src/.
 *
 * Escopo deliberadamente reduzido frente ao otimizador completo de produção:
 * usa apenas os primitivos de atribuição por padrão (quotas por pool por
 * jogo — exatamente o que a checagem estrutural §12/DEC-017 pede) e o
 * sorteio de exposição 3x4 por paridade/faixa 20-25, SEM a etapa de busca
 * local de refinamento de interseção (`localSearchRepair`, não exportada).
 * Isso não afeta a comparação de agrupamento/desempate, que é o objeto do
 * experimento — ver limitações no relatório final.
 *
 * Execução: npx tsx scripts/research/rms201_experiment.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildPools,
  computeFrequencies,
  targetExposureSplit,
  type RmsDrawInput,
} from "../../src/modules/lotofacil/domain/rms";
import { assignPoolToBucketsWithExposureMap } from "../../src/shared/lib/degreeAssignment";
import { createSeededRandom, shuffleInPlace, type RandomSource } from "../../src/shared/lib/prng";
import type { LotofacilRmsPoolSnapshot } from "../../src/modules/lotofacil/domain/types";

const LOTOFACIL_MAX = 25;
const WINDOW_20 = 20;
const WINDOW_50 = 50;

// Canonical fixed patterns, docs/lotofacil/LOTOFACIL_DOMAIN_SPEC_V1.md §9 — copied here as a
// public, stable spec table (not a reimplementation of RMS search logic).
interface Pattern {
  label: string;
  a: number;
  b: number;
  c: number;
}
const PATTERNS_BASE: Pattern[] = [
  { label: "J1 9-3-3", a: 9, b: 3, c: 3 },
  { label: "J2 8-3-4", a: 8, b: 3, c: 4 },
  { label: "J3 8-4-3", a: 8, b: 4, c: 3 },
  { label: "J4 10-2-3", a: 10, b: 2, c: 3 },
  { label: "J5 10-3-2", a: 10, b: 3, c: 2 },
];
const J6_VARIANTS: Pattern[] = [
  { label: "J6 9-4-2", a: 9, b: 4, c: 2 },
  { label: "J6 9-2-4", a: 9, b: 2, c: 4 },
];
const TARGET_EVEN_EXPOSURE4 = 3; // {5,6,7,7,8,9} parity multiset -> half of the 6 "4-exposure" numbers... see note below
const TARGET_RANGE2025_EXPOSURE4 = 3;
const isEven = (n: number) => n % 2 === 0;
const isIn2025 = (n: number) => n >= 20 && n <= 25;

interface Draw {
  contest: number;
  drawDate: string;
  numbers: number[];
}

function loadDataset(): { latestContest: number; draws: Draw[] } {
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "public/data/lotofacil/results.json"), "utf8"));
  return raw;
}

/** Strictly-before-T window of `size` contests, or null on any gap — no-look-ahead by construction. */
function windowBefore(draws: Draw[], byContest: Map<number, Draw>, targetContest: number, size: number): RmsDrawInput[] | null {
  const window: RmsDrawInput[] = [];
  for (let c = targetContest - size; c < targetContest; c += 1) {
    const d = byContest.get(c);
    if (!d) return null;
    window.push({ contest: d.contest, numbers: d.numbers });
  }
  return window;
}

/**
 * Versão B: mesmo agrupamento por frequência na janela de 20 que `buildPools`
 * usa, mas o desempate dentro de cada grupo empatado é feito PRIMEIRO pela
 * frequência na janela de 50 (descendente); um empate residual (mesma
 * frequência em 50 também) é resolvido por seed, exatamente como a Versão A
 * resolveria qualquer empate. A janela de 20 continua soberana: números com
 * frequências de 20 diferentes nunca trocam de posição relativa.
 */
function buildPoolsFiftyTiebreak(window20: RmsDrawInput[], window50: RmsDrawInput[], random: RandomSource): LotofacilRmsPoolSnapshot {
  const freq20 = computeFrequencies(window20);
  const freq50 = computeFrequencies(window50);
  const numbers = Array.from({ length: LOTOFACIL_MAX }, (_, i) => i + 1);

  const byFreq20 = new Map<number, number[]>();
  for (const n of numbers) {
    const f = freq20[n] ?? 0;
    if (!byFreq20.has(f)) byFreq20.set(f, []);
    byFreq20.get(f)!.push(n);
  }
  const orderedFreq20 = Array.from(byFreq20.keys()).sort((a, b) => b - a);
  const ranked: number[] = [];
  const boundaryTies: LotofacilRmsPoolSnapshot["boundaryTies"] = [];
  for (const f of orderedFreq20) {
    const group = byFreq20.get(f)!;
    // Sub-group by 50-window frequency, descending; residual ties (same f50 too) -> seeded shuffle.
    const byFreq50 = new Map<number, number[]>();
    for (const n of group) {
      const f50 = freq50[n] ?? 0;
      if (!byFreq50.has(f50)) byFreq50.set(f50, []);
      byFreq50.get(f50)!.push(n);
    }
    const orderedFreq50 = Array.from(byFreq50.keys()).sort((a, b) => b - a);
    for (const f50 of orderedFreq50) {
      const subgroup = byFreq50.get(f50)!;
      shuffleInPlace([...subgroup], random).forEach((n) => ranked.push(n));
    }
    if (group.length > 1) {
      const startIdx = ranked.length - group.length;
      const endIdx = ranked.length - 1;
      if (startIdx < 15 && endIdx >= 15) boundaryTies.push({ boundary: "A/C", frequency: f, numbers: [...group].sort((x, y) => x - y) });
      if (startIdx < 20 && endIdx >= 20) boundaryTies.push({ boundary: "C/B", frequency: f, numbers: [...group].sort((x, y) => x - y) });
    }
  }
  return {
    fromContest: window20[0]!.contest,
    toContest: window20[window20.length - 1]!.contest,
    frequencies: freq20,
    poolA: ranked.slice(0, 15).sort((x, y) => x - y),
    poolC: ranked.slice(15, 20).sort((x, y) => x - y),
    poolB: ranked.slice(20, 25).sort((x, y) => x - y),
    boundaryTies,
  };
}

/** Reimplementation of the (unexported) production glue: quota-per-pool-per-ticket assignment + parity/range-2025 exposure targets. Rejection-sampled, bounded attempts. */
function assembleTickets(pool: LotofacilRmsPoolSnapshot, seed: string, maxAttempts = 4000): { tickets: number[][]; patternUsed: string[] } | null {
  for (const variant of J6_VARIANTS) {
    const patterns = [...PATTERNS_BASE, variant];
    const random = createSeededRandom(`${seed}:${variant.label}`);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const poolDefs = [
        { letter: "A" as const, numbers: pool.poolA, quotas: patterns.map((p) => p.a) },
        { letter: "B" as const, numbers: pool.poolB, quotas: patterns.map((p) => p.b) },
        { letter: "C" as const, numbers: pool.poolC, quotas: patterns.map((p) => p.c) },
      ];
      const highSets = new Map<string, Set<number>>();
      let evenCount = 0;
      let rangeCount = 0;
      let feasible = true;
      for (const def of poolDefs) {
        const total = def.quotas.reduce((a, b) => a + b, 0);
        const { exposure4Count } = targetExposureSplit(def.numbers.length, total);
        if (exposure4Count < 0 || exposure4Count > def.numbers.length) {
          feasible = false;
          break;
        }
        const shuffled = shuffleInPlace([...def.numbers], random);
        const chosen = new Set(shuffled.slice(0, exposure4Count));
        highSets.set(def.letter, chosen);
        for (const n of chosen) {
          if (isEven(n)) evenCount += 1;
          if (isIn2025(n)) rangeCount += 1;
        }
      }
      if (!feasible) return null;
      if (evenCount !== TARGET_EVEN_EXPOSURE4 || rangeCount !== TARGET_RANGE2025_EXPOSURE4) continue;

      const games: number[][] = Array.from({ length: patterns.length }, () => []);
      let ok = true;
      for (const def of poolDefs) {
        const membership = assignPoolToBucketsWithExposureMap(def.numbers, def.quotas, highSets.get(def.letter)!, random, 4, 3);
        if (!membership) {
          ok = false;
          break;
        }
        membership.forEach((members, gi) => games[gi]!.push(...members));
      }
      if (!ok) continue;
      return { tickets: games.map((g) => [...g].sort((a, b) => a - b)), patternUsed: patterns.map((p) => p.label) };
    }
  }
  return null;
}

function countHits(ticket: number[], draw: number[]): number {
  const set = new Set(draw);
  return ticket.filter((n) => set.has(n)).length;
}

function poolOverlapCount(a: number[], b: number[]): number {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).length;
}

interface TargetResult {
  contest: number;
  hasBoundaryTie: boolean;
  poolsA: LotofacilRmsPoolSnapshot;
  poolsB: LotofacilRmsPoolSnapshot;
  poolsR: LotofacilRmsPoolSnapshot;
  ticketsA: number[][] | null;
  ticketsB: number[][] | null;
  ticketsR: number[][] | null;
  hitsA: number[];
  hitsB: number[];
  hitsR: number[];
}

function main() {
  const dataset = loadDataset();
  const byContest = new Map(dataset.draws.map((d) => [d.contest, d] as const));
  const firstTarget = dataset.draws[0]!.contest + WINDOW_50 + 1; // needs 50 prior contests to exist
  const lastTarget = dataset.latestContest;

  // Sampling criterion (documented BEFORE running, not chosen after seeing results):
  // systematic sample, every 10th valid target contest across the full available
  // history, from the first contest with a full 50-window to the latest contest.
  // This spans both eras and both "known tie" and "no tie" situations without
  // cherry-picking either.
  const SAMPLE_STRIDE = 10;
  const targets: number[] = [];
  for (let t = firstTarget; t <= lastTarget; t += SAMPLE_STRIDE) targets.push(t);

  const results: TargetResult[] = [];
  let skippedNoRealDraw = 0;

  for (const T of targets) {
    const window20 = windowBefore(dataset.draws, byContest, T, WINDOW_20);
    const window50 = windowBefore(dataset.draws, byContest, T, WINDOW_50);
    const realDraw = byContest.get(T);
    if (!window20 || !window50 || !realDraw) {
      skippedNoRealDraw += 1;
      continue;
    }

    const poolsA = buildPools(window20, createSeededRandom(`rms201-exp:${T}:A`));
    const poolsB = buildPoolsFiftyTiebreak(window20, window50, createSeededRandom(`rms201-exp:${T}:B`));
    const poolsR = buildPools(window20, createSeededRandom(`rms201-exp:${T}:R`)); // independent random resolution, NOT the 50-window

    const hasBoundaryTie = poolsA.boundaryTies.length > 0;

    const asmA = assembleTickets(poolsA, `rms201-exp:${T}:A`);
    const asmB = assembleTickets(poolsB, `rms201-exp:${T}:B`);
    const asmR = assembleTickets(poolsR, `rms201-exp:${T}:R`);

    const hitsA = asmA ? asmA.tickets.map((t) => countHits(t, realDraw.numbers)) : [];
    const hitsB = asmB ? asmB.tickets.map((t) => countHits(t, realDraw.numbers)) : [];
    const hitsR = asmR ? asmR.tickets.map((t) => countHits(t, realDraw.numbers)) : [];

    results.push({
      contest: T,
      hasBoundaryTie,
      poolsA,
      poolsB,
      poolsR,
      ticketsA: asmA?.tickets ?? null,
      ticketsB: asmB?.tickets ?? null,
      ticketsR: asmR?.tickets ?? null,
      hitsA,
      hitsB,
      hitsR,
    });
  }

  // ---- Metric 1: hit distribution 11-15 ----
  function distribution(all: number[][]): Record<number, number> {
    const flat = all.flat();
    const dist: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
    for (const h of flat) if (h >= 11 && h <= 15) dist[h] = (dist[h] ?? 0) + 1;
    return dist;
  }
  const distA = distribution(results.map((r) => r.hitsA));
  const distB = distribution(results.map((r) => r.hitsB));
  const distR = distribution(results.map((r) => r.hitsR));
  const totalTicketsA = results.reduce((s, r) => s + r.hitsA.length, 0);
  const totalTicketsB = results.reduce((s, r) => s + r.hitsB.length, 0);
  const totalTicketsR = results.reduce((s, r) => s + r.hitsR.length, 0);

  // ---- Metric 2: best ticket per carteira, and whether it changes between A and B ----
  let sameBestCount = 0;
  let comparableBestCount = 0;
  const bestChangedExamples: { contest: number; bestA: number; bestB: number }[] = [];
  for (const r of results) {
    if (r.hitsA.length === 0 || r.hitsB.length === 0) continue;
    comparableBestCount += 1;
    const bestA = Math.max(...r.hitsA);
    const bestB = Math.max(...r.hitsB);
    if (bestA === bestB) sameBestCount += 1;
    else if (bestChangedExamples.length < 10) bestChangedExamples.push({ contest: r.contest, bestA, bestB });
  }

  // ---- Metric 3: structural pattern check ----
  let structuralOkA = 0;
  let structuralOkB = 0;
  let structuralCheckedA = 0;
  let structuralCheckedB = 0;
  function checkStructure(tickets: number[][] | null, pool: LotofacilRmsPoolSnapshot, patterns: Pattern[]): boolean {
    if (!tickets) return false;
    const setA = new Set(pool.poolA);
    const setB = new Set(pool.poolB);
    const setC = new Set(pool.poolC);
    return tickets.every((t, i) => {
      const p = patterns[i]!;
      const a = t.filter((n) => setA.has(n)).length;
      const b = t.filter((n) => setB.has(n)).length;
      const c = t.filter((n) => setC.has(n)).length;
      return a === p.a && b === p.b && c === p.c && t.length === 15;
    });
  }
  for (const r of results) {
    if (r.ticketsA) {
      structuralCheckedA += 1;
      // J1-J5 pool-count patterns are unambiguous; J6 has two variants (9-4-2 / 9-2-4)
      // that share the same "a" quota, so disambiguate on "b" (4 vs 2), which differs.
      const j6 = r.ticketsA[5]!;
      const b6 = j6.filter((n) => r.poolsA.poolB.includes(n)).length;
      const variant = J6_VARIANTS.find((v) => v.b === b6) ?? J6_VARIANTS[0]!;
      if (checkStructure(r.ticketsA, r.poolsA, [...PATTERNS_BASE, variant])) structuralOkA += 1;
    }
    if (r.ticketsB) {
      structuralCheckedB += 1;
      const j6 = r.ticketsB[5]!;
      const b6 = j6.filter((n) => r.poolsB.poolB.includes(n)).length;
      const variant = J6_VARIANTS.find((v) => v.b === b6) ?? J6_VARIANTS[0]!;
      if (checkStructure(r.ticketsB, r.poolsB, [...PATTERNS_BASE, variant])) structuralOkB += 1;
    }
  }

  // ---- Metric 4: pool stability (how much of A/B/C composition changes between A and B) ----
  let sumOverlapA = 0;
  let sumOverlapB = 0;
  let sumOverlapC = 0;
  for (const r of results) {
    sumOverlapA += poolOverlapCount(r.poolsA.poolA, r.poolsB.poolA);
    sumOverlapB += poolOverlapCount(r.poolsA.poolB, r.poolsB.poolB);
    sumOverlapC += poolOverlapCount(r.poolsA.poolC, r.poolsB.poolC);
  }
  const n = results.length;

  // ---- Metric 5: boundary tie rate ----
  const tieCount = results.filter((r) => r.hasBoundaryTie).length;
  const acTieCount = results.filter((r) => r.poolsA.boundaryTies.some((b) => b.boundary === "A/C")).length;
  const cbTieCount = results.filter((r) => r.poolsA.boundaryTies.some((b) => b.boundary === "C/B")).length;

  // ---- Metric 6: baseline aleatório (A vs Random, for context) ----
  const distDiffAB = { 11: distB[11]! - distA[11]!, 12: distB[12]! - distA[12]!, 13: distB[13]! - distA[13]!, 14: distB[14]! - distA[14]!, 15: distB[15]! - distA[15]! };
  const distDiffAR = { 11: distR[11]! - distA[11]!, 12: distR[12]! - distA[12]!, 13: distR[13]! - distA[13]!, 14: distR[14]! - distA[14]!, 15: distR[15]! - distA[15]! };

  const out = {
    dataset: { source: "public/data/lotofacil/results.json", firstContest: dataset.draws[0]!.contest, latestContest: dataset.latestContest },
    sample: { firstTarget, lastTarget, stride: SAMPLE_STRIDE, requested: targets.length, usable: results.length, skipped: skippedNoRealDraw },
    metric1_hitDistribution: { A: distA, B: distB, R: distR, totalTicketsA, totalTicketsB, totalTicketsR },
    metric2_bestTicketChange: { comparableBestCount, sameBestCount, changedCount: comparableBestCount - sameBestCount, examples: bestChangedExamples },
    metric3_structuralCheck: { structuralCheckedA, structuralOkA, structuralCheckedB, structuralOkB },
    metric4_poolStability: {
      n,
      meanRetainedA: n ? sumOverlapA / n : null,
      meanRetainedB: n ? sumOverlapB / n : null,
      meanRetainedC: n ? sumOverlapC / n : null,
      poolSizes: { A: 15, B: 5, C: 5 },
    },
    metric5_boundaryTieRate: { n, tieAnyRate: n ? tieCount / n : null, acTieRate: n ? acTieCount / n : null, cbTieRate: n ? cbTieCount / n : null },
    metric6_vsRandomBaseline: { distDiffAB, distDiffAR },
  };
  writeFileSync(path.join(process.cwd(), "scripts/research/rms201_experiment_output.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main();
