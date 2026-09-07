import {
  MEGASENA_MAX_NUMBER,
  MEGASENA_MIN_NUMBER,
  MEGASENA_TICKET_SIZE,
} from "./constants";
import type { MegaSenaTicket } from "./types";
import { ticketKey } from "./validation";

export type RandomSource = () => number;

function xmur3(text: string): () => number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(seed: string | number): RandomSource {
  const seedFactory = xmur3(String(seed));
  return mulberry32(seedFactory());
}

export function randomInt(random: RandomSource, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(random() * (maxInclusive - minInclusive + 1));
}

export function shuffleInPlace<T>(values: T[], random: RandomSource): T[] {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = randomInt(random, 0, i);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export interface RandomTicketConstraints {
  fixedNumbers?: readonly number[];
  excludedNumbers?: readonly number[];
}

export function generateUniformTicket(
  random: RandomSource,
  constraints: RandomTicketConstraints = {},
): MegaSenaTicket {
  const fixed = [...new Set(constraints.fixedNumbers ?? [])].sort((a, b) => a - b);
  const excluded = new Set(constraints.excludedNumbers ?? []);
  const pool: number[] = [];
  for (let n = MEGASENA_MIN_NUMBER; n <= MEGASENA_MAX_NUMBER; n += 1) {
    if (!excluded.has(n) && !fixed.includes(n)) pool.push(n);
  }
  shuffleInPlace(pool, random);
  return [...fixed, ...pool.slice(0, MEGASENA_TICKET_SIZE - fixed.length)].sort((a, b) => a - b);
}

export function generateUniformDistinctTickets(
  count: number,
  random: RandomSource,
  existingKeys: ReadonlySet<string> = new Set<string>(),
  constraints: RandomTicketConstraints = {},
): MegaSenaTicket[] {
  const result: MegaSenaTicket[] = [];
  const keys = new Set(existingKeys);
  const maxAttempts = Math.max(10_000, count * 10_000);
  let attempts = 0;
  while (result.length < count) {
    if (attempts >= maxAttempts) {
      throw new Error("Unable to generate enough distinct tickets under the supplied constraints.");
    }
    attempts += 1;
    const ticket = generateUniformTicket(random, constraints);
    const key = ticketKey(ticket);
    if (keys.has(key)) continue;
    keys.add(key);
    result.push(ticket);
  }
  return result;
}
