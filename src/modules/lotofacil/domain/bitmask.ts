/**
 * 25-bit ticket/draw representation. Bit (n-1) set means number n is present.
 * 25 bits fit safely inside a 32-bit signed integer, but all bitwise
 * operations are isolated to this module; UI/adapters never touch masks.
 */
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER } from "./constants";
import type { LotofacilTicket } from "./types";

export type LotofacilMask = number;

export function numbersToMask(numbers: readonly number[]): LotofacilMask {
  let mask = 0;
  for (const n of numbers) {
    mask |= 1 << (n - 1);
  }
  return mask >>> 0;
}

export function maskToNumbers(mask: LotofacilMask): number[] {
  const numbers: number[] = [];
  for (let n = LOTOFACIL_MIN_NUMBER; n <= LOTOFACIL_MAX_NUMBER; n += 1) {
    if (mask & (1 << (n - 1))) numbers.push(n);
  }
  return numbers;
}

export function popcount(mask: number): number {
  let x = mask - ((mask >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >> 24;
}

export function intersectionCount(a: LotofacilMask, b: LotofacilMask): number {
  return popcount(a & b);
}

export function ticketToMask(ticket: LotofacilTicket): LotofacilMask {
  return numbersToMask(ticket);
}

/**
 * Enumerates every 25-bit mask with exactly `k` bits set, in increasing
 * numeric order, using Gosper's hack. Used to canonically walk all
 * C(25,15) = 3,268,760 possible Lotofacil draws exactly once.
 */
export function* enumerateCombinationMasks(totalBits: number, k: number): Generator<number> {
  if (k === 0) {
    yield 0;
    return;
  }
  const limit = 1 << totalBits;
  let x = (1 << k) - 1;
  while (x < limit) {
    yield x >>> 0;
    const c = x & -x;
    const r = x + c;
    x = (((r ^ x) >>> 2) / c) | r;
  }
}

export function enumerateAllDraws(): Generator<number> {
  return enumerateCombinationMasks(LOTOFACIL_MAX_NUMBER, 15);
}
