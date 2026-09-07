import { createSeededRandom } from "../../../shared/lib/prng";
import { generateUniformDistinctTickets } from "./random";
import type { LotofacilTicket } from "./types";

export interface UniformRandomOptions {
  numberOfTickets: number;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  seed?: string | number;
}

export interface UniformRandomResult {
  tickets: LotofacilTicket[];
  seed: string | number;
}

/** LF-05: uniform, distinct, no hidden structural filters. */
export function generateUniformRandomPortfolio(options: UniformRandomOptions): UniformRandomResult {
  const seed = options.seed ?? Date.now();
  const random = createSeededRandom(`${seed}:uniform_random`);
  const tickets = generateUniformDistinctTickets(options.numberOfTickets, random, new Set(), {
    fixedNumbers: options.fixedNumbers,
    excludedNumbers: options.excludedNumbers,
  });
  return { tickets, seed };
}
