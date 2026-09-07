import type {
  ExperimentalPopularityReport,
  MegaSenaPortfolio,
  MegaSenaTicket,
  TicketPopularityFeatures,
} from "./types";
import { assertValidPortfolio, assertValidTicket } from "./validation";

function adjacentPairCount(ticket: MegaSenaTicket): number {
  const sorted = assertValidTicket(ticket);
  let count = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) count += 1;
  }
  return count;
}

function longestConsecutiveRun(ticket: MegaSenaTicket): number {
  const sorted = assertValidTicket(ticket);
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function sameLastDigitPairCount(ticket: MegaSenaTicket): number {
  const counts = new Map<number, number>();
  for (const number of assertValidTicket(ticket)) {
    const digit = number % 10;
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }
  let pairs = 0;
  for (const count of counts.values()) pairs += (count * (count - 1)) / 2;
  return pairs;
}

function rangeBuckets(ticket: MegaSenaTicket): [number, number, number, number, number, number] {
  const result: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  for (const number of assertValidTicket(ticket)) {
    result[Math.floor((number - 1) / 10)] += 1;
  }
  return result;
}

export function extractPopularityFeatures(ticket: MegaSenaTicket): TicketPopularityFeatures {
  const canonical = assertValidTicket(ticket);
  const calendarNumberCount = canonical.filter((number) => number <= 31).length;
  return {
    ticket: canonical,
    calendarNumberCount,
    numbersAbove31Count: canonical.length - calendarNumberCount,
    adjacentPairCount: adjacentPairCount(canonical),
    longestConsecutiveRun: longestConsecutiveRun(canonical),
    sameLastDigitPairCount: sameLastDigitPairCount(canonical),
    rangeBucketCounts: rangeBuckets(canonical),
    allNumbersAtOrBelow31: calendarNumberCount === canonical.length,
    allNumbersAbove31: calendarNumberCount === 0,
  };
}

export function analyzeExperimentalPopularity(tickets: MegaSenaPortfolio): ExperimentalPopularityReport {
  const canonical = assertValidPortfolio(tickets);
  return {
    status: "experimental_uncalibrated",
    score: null,
    warning:
      "EXPERIMENTAL / NAO CALIBRADO PARA PROBABILIDADE REAL DE RATEIO. Features describe observable ticket patterns only; no probability-of-draw or payout-sharing claim is produced.",
    features: canonical.map(extractPopularityFeatures),
  };
}
