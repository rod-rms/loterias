import { createSeededRandom, randomInt } from "../../../shared/lib/prng";
import { assignPoolToBuckets } from "../../../shared/lib/degreeAssignment";
import {
  MEGASENA_MAX_NUMBER,
  MEGASENA_MIN_NUMBER,
  MEGASENA_TICKET_SIZE,
} from "../domain/constants";
import type { MegaSenaTicket } from "../domain/types";

export interface MegaDiversificationOptions {
  numberOfTickets: number;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  seed?: string | number;
  maxIterations?: number;
}

export interface MegaDiversificationResult {
  tickets: MegaSenaTicket[];
  seed: string | number;
  iterations: number;
  score: { exposureImbalance: number; sumIntersections: number; maxIntersection: number };
}

function comb2(n: number): number {
  return (n * (n - 1)) / 2;
}

function intersectionCount(a: readonly number[], b: readonly number[]): number {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).length;
}

function scoreAssignment(tickets: number[][]): { exposureImbalance: number; sumIntersections: number; maxIntersection: number } {
  const exposure = new Map<number, number>();
  for (const t of tickets) for (const n of t) exposure.set(n, (exposure.get(n) ?? 0) + 1);
  let exposureImbalance = 0;
  for (const count of exposure.values()) exposureImbalance += comb2(count);

  let sumIntersections = 0;
  let maxIntersection = 0;
  for (let i = 0; i < tickets.length; i += 1) {
    for (let j = i + 1; j < tickets.length; j += 1) {
      const inter = intersectionCount(tickets[i]!, tickets[j]!);
      sumIntersections += inter;
      maxIntersection = Math.max(maxIntersection, inter);
    }
  }
  return { exposureImbalance, sumIntersections, maxIntersection };
}

function isBetter(a: ReturnType<typeof scoreAssignment>, b: ReturnType<typeof scoreAssignment>): boolean {
  if (a.exposureImbalance !== b.exposureImbalance) return a.exposureImbalance < b.exposureImbalance;
  if (a.sumIntersections !== b.sumIntersections) return a.sumIntersections < b.sumIntersections;
  return a.maxIntersection < b.maxIntersection;
}

/**
 * MS-03: balances exposure of the 60 numbers across N tickets, minimizes
 * redundancy, and uses F4 only as a final deterministic tie-break — never as
 * the primary search objective. Does not modify the canonical Mega-Sena
 * domain functions; it only composes them.
 */
export function generateMegaMaxDiversification(options: MegaDiversificationOptions): MegaDiversificationResult {
  const n = options.numberOfTickets;
  if (n < 1) throw new RangeError("numberOfTickets must be at least 1");
  const seed = options.seed ?? Date.now();
  const fixed = [...new Set(options.fixedNumbers ?? [])].sort((a, b) => a - b);
  const excluded = new Set(options.excludedNumbers ?? []);
  const freePool: number[] = [];
  for (let num = MEGASENA_MIN_NUMBER; num <= MEGASENA_MAX_NUMBER; num += 1) {
    if (!excluded.has(num) && !fixed.includes(num)) freePool.push(num);
  }
  const slotsPerTicket = MEGASENA_TICKET_SIZE - fixed.length;
  if (slotsPerTicket < 0) throw new RangeError("Too many fixed numbers for ticket size.");
  if (freePool.length < slotsPerTicket) throw new RangeError("Not enough remaining numbers to fill a ticket under fixed/excluded constraints.");

  const totalSlots = slotsPerTicket * n;
  const q = Math.floor(totalSlots / freePool.length);
  const r = totalSlots - freePool.length * q;

  const random = createSeededRandom(`${seed}:megasena-diversification`);
  const quotas = Array.from({ length: n }, () => slotsPerTicket);

  let initialAssignment: number[][] | null = null;
  let guard = 0;
  while (!initialAssignment && guard < 200) {
    initialAssignment = assignPoolToBuckets(freePool, quotas, r, random, q + 1, q);
    guard += 1;
  }
  if (!initialAssignment) throw new Error("Unable to construct a balanced diversification portfolio under the supplied constraints.");
  let assignment: number[][] = initialAssignment;

  let tickets = assignment.map((members) => [...fixed, ...members].sort((a, b) => a - b));
  let bestScore = scoreAssignment(tickets);

  const maxIterations = options.maxIterations ?? 3000;
  let iterations = 0;
  for (; iterations < maxIterations; iterations += 1) {
    const i = randomInt(random, 0, n - 1);
    const j = randomInt(random, 0, n - 1);
    if (i === j) continue;
    const membersI = assignment[i]!;
    const membersJ = assignment[j]!;
    const onlyI = membersI.filter((x) => !membersJ.includes(x));
    const onlyJ = membersJ.filter((x) => !membersI.includes(x));
    if (onlyI.length === 0 || onlyJ.length === 0) continue;
    const x = onlyI[randomInt(random, 0, onlyI.length - 1)]!;
    const y = onlyJ[randomInt(random, 0, onlyJ.length - 1)]!;

    const candidateAssignment: number[][] = assignment.map((m, idx) => (idx === i ? m.filter((v) => v !== x).concat(y) : idx === j ? m.filter((v) => v !== y).concat(x) : m));
    const candidateTickets = candidateAssignment.map((members) => [...fixed, ...members].sort((a, b) => a - b));
    const candidateScore = scoreAssignment(candidateTickets);

    if (isBetter(candidateScore, bestScore)) {
      assignment = candidateAssignment;
      tickets = candidateTickets;
      bestScore = candidateScore;
    }
  }

  return {
    tickets: tickets.map((t) => Object.freeze(t)) as MegaSenaTicket[],
    seed,
    iterations,
    score: bestScore,
  };
}
