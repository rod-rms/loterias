import { createSeededRandom, shuffleInPlace, type RandomSource } from "../../../shared/lib/prng";
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER, LOTOFACIL_TICKET_SIZE } from "./constants";
import { ticketKey } from "./validation";
import type { LotofacilTicket } from "./types";

export type { RandomSource };
export { createSeededRandom };

export interface RandomTicketConstraints {
  fixedNumbers?: readonly number[];
  excludedNumbers?: readonly number[];
}

export function generateUniformTicket(random: RandomSource, constraints: RandomTicketConstraints = {}): LotofacilTicket {
  const fixed = [...new Set(constraints.fixedNumbers ?? [])].sort((a, b) => a - b);
  const excluded = new Set(constraints.excludedNumbers ?? []);
  const pool: number[] = [];
  for (let n = LOTOFACIL_MIN_NUMBER; n <= LOTOFACIL_MAX_NUMBER; n += 1) {
    if (!excluded.has(n) && !fixed.includes(n)) pool.push(n);
  }
  shuffleInPlace(pool, random);
  return [...fixed, ...pool.slice(0, LOTOFACIL_TICKET_SIZE - fixed.length)].sort((a, b) => a - b);
}

export function generateUniformDistinctTickets(
  count: number,
  random: RandomSource,
  existingKeys: ReadonlySet<string> = new Set<string>(),
  constraints: RandomTicketConstraints = {},
): LotofacilTicket[] {
  const result: LotofacilTicket[] = [];
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
