import type { Modality } from "../types";

/**
 * Exact hypergeometric distribution of the number of hits of ONE simple ticket against one official draw
 * (ANL-002). Pure and exact (integer binomials, no simulation). Descriptive reference only: it says how hits are
 * distributed under pure chance, never anything about a future draw (DEC-013, DEC-025).
 */

export interface HitsGame {
  /** Numbers in the universe (25 / 60). */
  universe: number;
  /** Numbers drawn (15 / 6). */
  drawn: number;
  /** Numbers on a simple ticket (15 / 6). */
  ticketSize: number;
}

export const HITS_GAMES: Record<Modality, HitsGame> = {
  lotofacil: { universe: 25, drawn: 15, ticketSize: 15 },
  megasena: { universe: 60, drawn: 6, ticketSize: 6 },
};

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= Math.min(k, n - k); i += 1) r = (r * (n - i + 1)) / i;
  return Math.round(r);
}

export interface HitsDistribution {
  /** pmf[h] = P(exactly h hits), h = 0..ticketSize. */
  pmf: number[];
  mean: number;
  sd: number;
}

export function hitsDistribution(game: HitsGame): HitsDistribution {
  const { universe, drawn, ticketSize } = game;
  const total = choose(universe, drawn);
  const pmf = Array.from({ length: ticketSize + 1 }, (_, h) => (choose(ticketSize, h) * choose(universe - ticketSize, drawn - h)) / total);
  const mean = pmf.reduce((s, p, h) => s + p * h, 0);
  const variance = pmf.reduce((s, p, h) => s + p * (h - mean) ** 2, 0);
  return { pmf, mean, sd: Math.sqrt(variance) };
}

export const hitsDistributionFor = (modality: Modality): HitsDistribution => hitsDistribution(HITS_GAMES[modality]);

/** P(hits >= threshold) for one ticket. */
export function probAtLeast(dist: HitsDistribution, threshold: number): number {
  return dist.pmf.reduce((s, p, h) => (h >= threshold ? s + p : s), 0);
}
