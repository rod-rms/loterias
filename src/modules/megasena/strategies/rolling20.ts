import { createSeededRandom, randomInt, type RandomSource } from "../../../shared/lib/prng";
import { intersectionSize } from "../domain/overlap";
import { ticketKey } from "../domain/validation";
import { computeRolling20Allocation, type Rolling20Allocation } from "../domain/rolling20Allocation";
import { passesRolling20StructuralFilters, type Rolling20FilterOptions } from "../domain/rolling20Filters";
import type { Rolling20Groups } from "../domain/rolling20Grouping";
import type { MegaSenaTicket } from "../domain/types";
import type { QualityPreset } from "../../../shared/types";

/**
 * MEGA-ROLL-001 — Rolling 20 Balanceada v2.1: candidate generation + search
 * (spec §6). Builds on the already-validated grouping (§2-§3,
 * `domain/rolling20Grouping.ts`) and allocation (§4, `domain/rolling20Allocation.ts`),
 * and reuses the shared Mega-Sena domain's scoring primitives
 * (`domain/overlap.ts`'s `intersectionSize`; final F4/F5/F6/baseline via
 * `evaluateMegaSenaPortfolio` in the adapter, not here) rather than
 * duplicating them. Only the SEARCH itself — a candidate-per-pattern
 * rejection sample (§6.1) followed by a same-group swap local search — is
 * new, mirroring `strategies/diversification.ts`'s established style for
 * this codebase (seeded PRNG, lexicographic score comparator, bounded
 * hill-climb).
 *
 * Historical per-number frequency never re-enters as a score once group
 * membership is fixed by the grouping step: neither candidate generation
 * nor the local search below ever reads `frequency`/`lastOccurrenceIndex` —
 * only group membership (G1/G2/G3) and the filters/exposure/overlap
 * primitives are used, per spec §6.2.
 *
 * F4 is deliberately NOT evaluated inside the search loop (exact F4
 * enumeration is combinatorially expensive — see `domain/coverage.ts`'s
 * `DEFAULT_EXACT_F4_MAX_TICKETS`); it is computed exactly once, in the
 * adapter's final `evaluateMegaSenaPortfolio` call, matching spec §6.2's
 * "F4 apenas como desempate final" — this single deterministic hill-climb
 * produces one candidate per seed, so there is no live tie to break; F4 is
 * reported in the final metrics, never used to steer the search.
 */

export const ROLLING20_ITERATIONS_BY_PRESET: Record<QualityPreset, number> = {
  fast: 800,
  balanced: 3000,
  deep: 8000,
};

const MAX_ATTEMPTS_PER_TICKET = 500;
const MAX_PORTFOLIO_RETRIES = 20;

export class Rolling20SearchError extends Error {
  constructor(
    public code: "ROLLING20_NO_VALID_CANDIDATE" | "ROLLING20_NO_VALID_PORTFOLIO_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "Rolling20SearchError";
  }
}

export interface Rolling20SearchOptions {
  numberOfTickets: number;
  groups: Rolling20Groups;
  seed?: string | number;
  qualityPreset?: QualityPreset;
  filterOptions?: Rolling20FilterOptions;
  previousDraw?: readonly number[];
  maxIterations?: number;
}

export interface Rolling20SearchScore {
  exposureImbalance: number;
  sumIntersections: number;
  maxIntersection: number;
}

export interface Rolling20SearchResult {
  tickets: MegaSenaTicket[];
  seed: string | number;
  qualityPreset: QualityPreset;
  allocation: Rolling20Allocation;
  iterations: number;
  candidateAttempts: number;
  score: Rolling20SearchScore;
}

function pickRandomSubset(pool: readonly number[], k: number, random: RandomSource): number[] {
  if (pool.length < k) throw new RangeError(`Cannot pick ${k} distinct numbers from a pool of ${pool.length}.`);
  const indices = pool.map((_, i) => i);
  const picked: number[] = [];
  let remaining = indices.length;
  for (let i = 0; i < k; i += 1) {
    const j = randomInt(random, 0, remaining - 1);
    picked.push(pool[indices[j]!]!);
    indices[j] = indices[remaining - 1]!;
    remaining -= 1;
  }
  return picked;
}

function comb2(n: number): number {
  return (n * (n - 1)) / 2;
}

function scoreTickets(tickets: readonly MegaSenaTicket[]): Rolling20SearchScore {
  const exposure = new Map<number, number>();
  for (const t of tickets) for (const n of t) exposure.set(n, (exposure.get(n) ?? 0) + 1);
  let exposureImbalance = 0;
  for (const count of exposure.values()) exposureImbalance += comb2(count);

  let sumIntersections = 0;
  let maxIntersection = 0;
  for (let i = 0; i < tickets.length; i += 1) {
    for (let j = i + 1; j < tickets.length; j += 1) {
      const inter = intersectionSize(tickets[i]!, tickets[j]!);
      sumIntersections += inter;
      maxIntersection = Math.max(maxIntersection, inter);
    }
  }
  return { exposureImbalance, sumIntersections, maxIntersection };
}

/** Lexicographic order: exposure imbalance, then total overlap, then max overlap (spec §6.2, items 3-5). */
function isBetter(a: Rolling20SearchScore, b: Rolling20SearchScore): boolean {
  if (a.exposureImbalance !== b.exposureImbalance) return a.exposureImbalance < b.exposureImbalance;
  if (a.sumIntersections !== b.sumIntersections) return a.sumIntersections < b.sumIntersections;
  return a.maxIntersection < b.maxIntersection;
}

/** One rejection-sampling attempt at a single ticket matching its exact group pattern, validated against filters and global uniqueness (spec §6.1). */
function sampleValidTicket(
  groups: Rolling20Groups,
  g2Slots: number,
  g3Slots: number,
  random: RandomSource,
  filterOptions: Rolling20FilterOptions,
  previousDraw: readonly number[] | undefined,
  existingKeys: ReadonlySet<string>,
): { ticket: number[]; attempts: number } | null {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_TICKET; attempt += 1) {
    const g1Pick = pickRandomSubset(groups.g1, 2, random);
    const g2Pick = g2Slots > 0 ? pickRandomSubset(groups.g2, g2Slots, random) : [];
    const g3Pick = g3Slots > 0 ? pickRandomSubset(groups.g3, g3Slots, random) : [];
    const ticket = [...g1Pick, ...g2Pick, ...g3Pick].sort((a, b) => a - b);
    if (!passesRolling20StructuralFilters(ticket, filterOptions, previousDraw)) continue;
    const key = ticketKey(ticket);
    if (existingKeys.has(key)) continue;
    return { ticket, attempts: attempt };
  }
  return null;
}

/** Builds one full N-ticket portfolio via independent per-ticket rejection sampling (§6.1). Throws `ROLLING20_NO_VALID_CANDIDATE` if any single ticket's exact pattern cannot be satisfied within budget. */
function buildInitialPortfolio(
  allocation: Rolling20Allocation,
  groups: Rolling20Groups,
  random: RandomSource,
  filterOptions: Rolling20FilterOptions,
  previousDraw: readonly number[] | undefined,
): { tickets: number[][]; candidateAttempts: number } {
  if (groups.g2.length < Math.max(...allocation.perTicket.map((t) => t.g2Slots), 0)) {
    throw new Rolling20SearchError("ROLLING20_NO_VALID_CANDIDATE", `G2 has only ${groups.g2.length} numbers, fewer than a ticket's required G2 slots.`);
  }
  if (groups.g3.length < Math.max(...allocation.perTicket.map((t) => t.g3Slots), 0)) {
    throw new Rolling20SearchError("ROLLING20_NO_VALID_CANDIDATE", `G3 has only ${groups.g3.length} numbers, fewer than a ticket's required G3 slots.`);
  }

  const tickets: number[][] = [];
  const keys = new Set<string>();
  let candidateAttempts = 0;

  for (const pattern of allocation.perTicket) {
    const sampled = sampleValidTicket(groups, pattern.g2Slots, pattern.g3Slots, random, filterOptions, previousDraw, keys);
    if (!sampled) {
      throw new Rolling20SearchError(
        "ROLLING20_NO_VALID_CANDIDATE",
        `Could not find a valid, unique ticket for pattern 2 G1 / ${pattern.g2Slots} G2 / ${pattern.g3Slots} G3 within ${MAX_ATTEMPTS_PER_TICKET} attempts.`,
      );
    }
    candidateAttempts += sampled.attempts;
    tickets.push(sampled.ticket);
    keys.add(ticketKey(sampled.ticket));
  }
  return { tickets, candidateAttempts };
}

/** Every non-empty subset of the ticket's numbers belonging to `groupNumbers`. */
function membersInGroup(ticket: readonly number[], groupNumbers: readonly number[]): number[] {
  const set = new Set(groupNumbers);
  return ticket.filter((n) => set.has(n));
}

export function generateRolling20Portfolio(options: Rolling20SearchOptions): Rolling20SearchResult {
  const n = options.numberOfTickets;
  if (!Number.isInteger(n) || n < 1) throw new RangeError("numberOfTickets must be a positive integer.");
  const seed = options.seed ?? Date.now();
  const qualityPreset: QualityPreset = options.qualityPreset ?? "balanced";
  const filterOptions = options.filterOptions ?? {};
  const allocation = computeRolling20Allocation(n, options.groups.g2.length);

  const random = createSeededRandom(`${seed}:megasena-rolling20`);

  let built: { tickets: number[][]; candidateAttempts: number } | null = null;
  let lastError: Rolling20SearchError | null = null;
  let totalCandidateAttempts = 0;
  for (let retry = 0; retry < MAX_PORTFOLIO_RETRIES && !built; retry += 1) {
    try {
      built = buildInitialPortfolio(allocation, options.groups, random, filterOptions, options.previousDraw);
      totalCandidateAttempts += built.candidateAttempts;
    } catch (error) {
      if (error instanceof Rolling20SearchError) {
        lastError = error;
        totalCandidateAttempts += MAX_ATTEMPTS_PER_TICKET;
        continue;
      }
      throw error;
    }
  }
  if (!built) {
    throw new Rolling20SearchError(
      "ROLLING20_NO_VALID_PORTFOLIO_FOUND",
      lastError?.message ?? `Could not build a valid ${n}-ticket portfolio within ${MAX_PORTFOLIO_RETRIES} attempts.`,
    );
  }

  let tickets: number[][] = built.tickets;
  let bestScore = scoreTickets(tickets as MegaSenaTicket[]);
  const maxIterations = options.maxIterations ?? ROLLING20_ITERATIONS_BY_PRESET[qualityPreset];

  let iterations = 0;
  for (; iterations < maxIterations; iterations += 1) {
    const i = randomInt(random, 0, n - 1);
    const j = randomInt(random, 0, n - 1);
    if (i === j) continue;
    const groupChoice = randomInt(random, 0, 2);
    const groupPool = groupChoice === 0 ? options.groups.g1 : groupChoice === 1 ? options.groups.g2 : options.groups.g3;
    if (groupPool.length === 0) continue;

    const membersI = membersInGroup(tickets[i]!, groupPool);
    const membersJ = membersInGroup(tickets[j]!, groupPool);
    const onlyI = membersI.filter((x) => !membersJ.includes(x));
    const onlyJ = membersJ.filter((x) => !membersI.includes(x));
    if (onlyI.length === 0 || onlyJ.length === 0) continue;
    const x = onlyI[randomInt(random, 0, onlyI.length - 1)]!;
    const y = onlyJ[randomInt(random, 0, onlyJ.length - 1)]!;

    const candidateI = tickets[i]!.map((v) => (v === x ? y : v)).sort((a, b) => a - b);
    const candidateJ = tickets[j]!.map((v) => (v === y ? x : v)).sort((a, b) => a - b);

    if (!passesRolling20StructuralFilters(candidateI, filterOptions, options.previousDraw)) continue;
    if (!passesRolling20StructuralFilters(candidateJ, filterOptions, options.previousDraw)) continue;

    const otherKeys = new Set(tickets.map((t, idx) => (idx === i || idx === j ? null : ticketKey(t))).filter((k): k is string => k !== null));
    const keyI = ticketKey(candidateI);
    const keyJ = ticketKey(candidateJ);
    if (keyI === keyJ || otherKeys.has(keyI) || otherKeys.has(keyJ)) continue;

    const candidateTickets = tickets.map((t, idx) => (idx === i ? candidateI : idx === j ? candidateJ : t));
    const candidateScore = scoreTickets(candidateTickets as MegaSenaTicket[]);
    if (isBetter(candidateScore, bestScore)) {
      tickets = candidateTickets;
      bestScore = candidateScore;
    }
  }

  return {
    tickets: tickets.map((t) => Object.freeze([...t])) as MegaSenaTicket[],
    seed,
    qualityPreset,
    allocation,
    iterations,
    candidateAttempts: totalCandidateAttempts,
    score: bestScore,
  };
}
