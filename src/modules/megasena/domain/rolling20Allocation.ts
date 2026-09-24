/**
 * MEGA-ROLL-001 — Rolling 20 Balanceada v2.1: proportional G2/G3 allocation
 * (spec §4, `docs/megasena/MEGASENA_ROLLING20_BALANCED_V2_1_SPEC.md`).
 *
 * Every ticket gets exactly 2 numbers from G1. For N tickets and `g2 = |G2|`:
 *
 *   targetG2Slots = floor((N * g2 / 10) + 0.5)   // round-half-up, explicit
 *   baseB  = floor(targetG2Slots / N)
 *   extraB = targetG2Slots % N
 *
 * `extraB` tickets get `baseB + 1` numbers from G2; the rest get `baseB`.
 * Each ticket's remaining slots (of its 4 non-G1 slots) come from G3.
 */
export const ROLLING20_G1_SLOTS_PER_TICKET = 2;
const NON_G1_SLOTS_PER_TICKET = 4;

export interface Rolling20TicketAllocation {
  g1Slots: number;
  g2Slots: number;
  g3Slots: number;
}

export interface Rolling20Allocation {
  targetG2Slots: number;
  baseB: number;
  extraB: number;
  perTicket: Rolling20TicketAllocation[];
}

/**
 * Round-half-up, spelled out explicitly rather than relying on `Math.round`
 * (whose behavior for `.5` inputs varies across language runtimes; JS's own
 * `Math.round` happens to already round half up for non-negative inputs —
 * verified: `Math.round(0.5) === 1`, `Math.round(2.5) === 3` — but the spec's
 * literal formula is used here regardless, so the implementation is correct
 * independent of that runtime detail).
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Computes the per-ticket group allocation for N tickets given `g2 = |G2|`.
 * `n` must be a positive integer; `g2` a non-negative integer (0..60).
 */
export function computeRolling20Allocation(n: number, g2: number): Rolling20Allocation {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n (number of tickets) must be a positive integer.");
  if (!Number.isInteger(g2) || g2 < 0) throw new RangeError("g2 (|G2|) must be a non-negative integer.");

  const targetG2Slots = roundHalfUp((n * g2) / 10);
  const baseB = Math.floor(targetG2Slots / n);
  const extraB = targetG2Slots % n;

  const perTicket: Rolling20TicketAllocation[] = Array.from({ length: n }, (_, i) => {
    const g2Slots = i < extraB ? baseB + 1 : baseB;
    return { g1Slots: ROLLING20_G1_SLOTS_PER_TICKET, g2Slots, g3Slots: NON_G1_SLOTS_PER_TICKET - g2Slots };
  });

  return { targetG2Slots, baseB, extraB, perTicket };
}
