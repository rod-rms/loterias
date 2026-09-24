/**
 * MEGA-ROLL-001 — Rolling 20 Balanceada v2.1: structural filters (spec §5).
 *
 * Pure, testable functions. All five standard filters are shape/structure
 * filters on the combination, never predictive: pairs (2-4), sum (130-249),
 * low-half count (2-4 numbers in 01-30), 01-10 range (at most 2), and
 * consecutive blocks (at most 1 — where a block is a MAXIMAL run of two or
 * more adjacent numbers: `10-11-12-13` is one block, not two or three;
 * `10-11` and `20-21` together are two blocks, not one).
 *
 * The two ludic options (`repeatPreviousDraw`, `requireLow10`) are separate,
 * default-OFF toggles — never folded into the standard filter set, never
 * enabled unless explicitly requested.
 */

export interface Rolling20FilterOptions {
  /** Default OFF. When true, requires `ticket ∩ previousDraw != ∅`. */
  repeatPreviousDraw?: boolean;
  /** Default OFF. When true, requires 1..2 numbers in 01-10 (instead of the standard 0..2). */
  requireLow10?: boolean;
}

/**
 * Counts MAXIMAL runs of two-or-more consecutive numbers in a sorted,
 * duplicate-free list. `10-11-12-13` is ONE block (a single maximal run of
 * length 4), never counted as multiple overlapping pairs; `10-11` and
 * `20-21` are TWO separate blocks. A lone number with no adjacent neighbor
 * contributes zero blocks.
 */
export function countMaximalConsecutiveBlocks(sortedTicket: readonly number[]): number {
  let blocks = 0;
  let runLength = 1;
  for (let i = 1; i < sortedTicket.length; i += 1) {
    if (sortedTicket[i] === sortedTicket[i - 1]! + 1) {
      runLength += 1;
    } else {
      if (runLength >= 2) blocks += 1;
      runLength = 1;
    }
  }
  if (runLength >= 2) blocks += 1;
  return blocks;
}

/** Applies the five standard filters plus any enabled ludic option. `ticket` need not be pre-sorted. */
export function passesRolling20StructuralFilters(ticket: readonly number[], options: Rolling20FilterOptions = {}, previousDraw?: readonly number[]): boolean {
  const sorted = [...ticket].sort((a, b) => a - b);

  const evenCount = sorted.filter((n) => n % 2 === 0).length;
  if (evenCount < 2 || evenCount > 4) return false;

  const sum = sorted.reduce((total, n) => total + n, 0);
  if (sum < 130 || sum > 249) return false;

  const lowHalfCount = sorted.filter((n) => n >= 1 && n <= 30).length;
  if (lowHalfCount < 2 || lowHalfCount > 4) return false;

  const low10Count = sorted.filter((n) => n >= 1 && n <= 10).length;
  const low10Min = options.requireLow10 ? 1 : 0;
  if (low10Count < low10Min || low10Count > 2) return false;

  if (countMaximalConsecutiveBlocks(sorted) > 1) return false;

  if (options.repeatPreviousDraw && previousDraw && previousDraw.length > 0) {
    const previousSet = new Set(previousDraw);
    if (!sorted.some((n) => previousSet.has(n))) return false;
  }

  return true;
}
