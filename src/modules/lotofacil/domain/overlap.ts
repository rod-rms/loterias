import { intersectionCount, ticketToMask } from "./bitmask";
import type { ExposureDiagnostics, LotofacilPortfolio, OverlapDiagnostics } from "./types";
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER } from "./constants";

export function analyzeOverlap(tickets: LotofacilPortfolio): OverlapDiagnostics {
  const masks = tickets.map((t) => ticketToMask(t));
  const n = masks.length;
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 15 : intersectionCount(masks[i]!, masks[j]!))),
  );

  const histogram: Record<string, number> = {};
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let pairCount = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const value = matrix[i]![j]!;
      histogram[value] = (histogram[value] ?? 0) + 1;
      sum += value;
      min = Math.min(min, value);
      max = Math.max(max, value);
      pairCount += 1;
    }
  }

  return {
    matrix,
    histogram,
    pairCount,
    min: pairCount > 0 ? min : 0,
    max: pairCount > 0 ? max : 0,
    mean: pairCount > 0 ? sum / pairCount : 0,
  };
}

export function analyzeExposure(tickets: LotofacilPortfolio): ExposureDiagnostics {
  const exposure: Record<number, number> = {};
  for (let n = LOTOFACIL_MIN_NUMBER; n <= LOTOFACIL_MAX_NUMBER; n += 1) exposure[n] = 0;
  for (const ticket of tickets) {
    for (const n of ticket) exposure[n] = (exposure[n] ?? 0) + 1;
  }
  const values = Object.values(exposure);
  return {
    exposure,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
  };
}
