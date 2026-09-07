import type { MegaSenaPortfolio, MegaSenaTicket, OverlapDiagnostics } from "./types";
import { assertValidPortfolio, assertValidTicket } from "./validation";

export function intersectionSize(a: MegaSenaTicket, b: MegaSenaTicket): number {
  const aa = assertValidTicket(a);
  const bb = assertValidTicket(b);
  let i = 0;
  let j = 0;
  let count = 0;
  while (i < aa.length && j < bb.length) {
    if (aa[i] === bb[j]) {
      count += 1;
      i += 1;
      j += 1;
    } else if (aa[i] < bb[j]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return count;
}

export function overlapMatrix(tickets: MegaSenaPortfolio): number[][] {
  const canonical = assertValidPortfolio(tickets);
  return canonical.map((ticket, i) =>
    canonical.map((other, j) => (i === j ? 6 : intersectionSize(ticket, other))),
  );
}

export function analyzeOverlap(tickets: MegaSenaPortfolio): OverlapDiagnostics {
  const canonical = assertValidPortfolio(tickets);
  const matrix = overlapMatrix(canonical);
  const histogram: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  const values: number[] = [];
  for (let i = 0; i < canonical.length; i += 1) {
    for (let j = i + 1; j < canonical.length; j += 1) {
      const value = matrix[i][j];
      histogram[String(value)] = (histogram[String(value)] ?? 0) + 1;
      values.push(value);
    }
  }
  const pairCount = values.length;
  const min = pairCount ? Math.min(...values) : 0;
  const max = pairCount ? Math.max(...values) : 0;
  const mean = pairCount ? values.reduce((sum, value) => sum + value, 0) / pairCount : 0;
  const allPairsAtMost1 = values.every((value) => value <= 1);
  const allPairsAtMost3 = values.every((value) => value <= 3);
  return {
    matrix,
    histogram,
    pairCount,
    min,
    max,
    mean,
    allPairsAtMost1,
    allPairsAtMost3,
    f4RegionsPairwiseDisjoint: allPairsAtMost1,
    f5RegionsPairwiseDisjoint: allPairsAtMost3,
  };
}
