import type { CheckedResult } from "../types";

/** Computes hits per ticket and builds a CheckedResult snapshot against an official draw. */
export function checkTicketsAgainstDraw(tickets: number[][], draw: { contest: number; numbers: number[] }): CheckedResult {
  const drawSet = new Set(draw.numbers);
  const hitsPerTicket = tickets.map((t) => t.filter((n) => drawSet.has(n)).length);
  return {
    contest: draw.contest,
    numbers: draw.numbers,
    checkedAt: new Date().toISOString(),
    hitsPerTicket,
  };
}

export function highestScore(checkedResult: CheckedResult): number {
  return checkedResult.hitsPerTicket.length ? Math.max(...checkedResult.hitsPerTicket) : 0;
}
