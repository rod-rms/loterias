import type { BetResultAvailability, BetSelectionRevision, LotteryDataset, Modality, SavedPortfolio } from "../types";
import { formatHitResult, getResultLabel } from "./resultLabels";

/**
 * Pure helpers for per-ticket bet registration. A bet selection is metadata
 * ABOUT a saved portfolio: it never touches portfolio.tickets, strategy,
 * seed, metrics or audit. Ticket numbers are 1-based (J1 = 1).
 */

/** Returns an error message when the numbers cannot be a valid selection for a portfolio of `ticketCount` tickets, otherwise null. */
export function validateBetTicketNumbers(numbers: number[], ticketCount: number): string | null {
  for (let i = 0; i < numbers.length; i += 1) {
    const n = numbers[i]!;
    if (!Number.isInteger(n)) return "Número de jogo inválido.";
    if (n < 1 || n > ticketCount) return `O jogo J${n} não existe nesta carteira (1 a ${ticketCount}).`;
    if (i > 0 && n <= numbers[i - 1]!) return "Os jogos apostados devem ser únicos e em ordem crescente.";
  }
  return null;
}

/** Canonical form: unique, ascending. Does NOT validate range — use validateBetTicketNumbers for that. */
export function canonicalizeBetTicketNumbers(numbers: number[]): number[] {
  return [...new Set(numbers)].sort((a, b) => a - b);
}

/** The current (last) revision, if any. */
export function getCurrentBetRevision(portfolio: Pick<SavedPortfolio, "betSelection">): BetSelectionRevision | null {
  const revisions = portfolio.betSelection?.revisions;
  return revisions && revisions.length > 0 ? revisions[revisions.length - 1]! : null;
}

/**
 * Ticket numbers (1-based) currently declared as actually bet.
 * - betSelection present → its last revision (empty = registration removed);
 * - legacy: markedAsBet === true and no betSelection → ALL tickets;
 * - legacy: markedAsBet === false and no betSelection → none.
 */
export function getCurrentBetTicketNumbers(portfolio: Pick<SavedPortfolio, "betSelection" | "markedAsBet" | "tickets">): number[] {
  const revision = getCurrentBetRevision(portfolio);
  if (revision) return revision.selectedTicketNumbers;
  if (portfolio.betSelection) return [];
  return portfolio.markedAsBet ? portfolio.tickets.map((_, i) => i + 1) : [];
}

/** Whether the official result of `contest` was already in LotoAtlas's dataset. Describes dataset state only, not the user's real bet time. */
export function determineResultAvailability(contest: number | undefined, dataset: Pick<LotteryDataset, "latestContest" | "draws"> | null | undefined): BetResultAvailability {
  if (contest === undefined || !dataset) return "unknown";
  if (dataset.draws.some((d) => d.contest === contest)) return "after_result_in_dataset";
  if (contest > dataset.latestContest) return "before_result_in_dataset";
  return "unknown";
}

/**
 * Appends a NEW revision (history is never overwritten) and recomputes the
 * indexed aggregate flag. Returns only the fields to persist; the generated
 * portfolio itself (tickets, metrics, audit, seed, strategy) is untouched.
 */
export function appendBetSelectionRevision(
  portfolio: Pick<SavedPortfolio, "betSelection" | "tickets">,
  selectedTicketNumbers: number[],
  context: { recordedAt: string; resultAvailability: BetResultAvailability; datasetLatestContestAtRecording?: number },
): { betSelection: NonNullable<SavedPortfolio["betSelection"]>; markedAsBet: boolean } {
  const numbers = canonicalizeBetTicketNumbers(selectedTicketNumbers);
  const error = validateBetTicketNumbers(numbers, portfolio.tickets.length);
  if (error) throw new Error(error);
  const revision: BetSelectionRevision = {
    selectedTicketNumbers: numbers,
    recordedAt: context.recordedAt,
    resultAvailability: context.resultAvailability,
    ...(context.datasetLatestContestAtRecording !== undefined ? { datasetLatestContestAtRecording: context.datasetLatestContestAtRecording } : {}),
  };
  return {
    betSelection: { schemaVersion: 1, revisions: [...(portfolio.betSelection?.revisions ?? []), revision] },
    markedAsBet: numbers.length > 0,
  };
}

export interface TicketGroupBest {
  bestHits: number;
  /** 1-based ticket numbers tied for the best hit count within the group. */
  ticketNumbers: number[];
  resultText: string;
  label: string | null;
}

export type BetComparisonRelation = "non_bet_higher" | "bet_higher" | "equal";

export interface BetSelectionResultSummary {
  /** False when no ticket is currently declared as bet — standard full-portfolio checking only. */
  hasSelection: boolean;
  betTicketNumbers: number[];
  nonBetTicketNumbers: number[];
  allBet: boolean;
  bestOverall: TicketGroupBest | null;
  bestBet: TicketGroupBest | null;
  bestNonBet: TicketGroupBest | null;
  /** Whether every ticket tied for the overall best was NOT bet. */
  overallBestWasNotBet: boolean;
  relation: BetComparisonRelation | null;
  /** Best non-bet hits minus best bet hits (null when either group is empty). */
  hitsDifference: number | null;
}

function bestOf(modality: Modality, hitsPerTicket: number[], candidates: number[]): TicketGroupBest | null {
  const valid = candidates.filter((n) => n >= 1 && n <= hitsPerTicket.length);
  if (valid.length === 0) return null;
  const bestHits = Math.max(...valid.map((n) => hitsPerTicket[n - 1]!));
  return {
    bestHits,
    ticketNumbers: valid.filter((n) => hitsPerTicket[n - 1] === bestHits),
    resultText: formatHitResult(modality, bestHits),
    label: getResultLabel(modality, bestHits),
  };
}

/** Structured, purely descriptive comparison derived ONLY from checkedResult.hitsPerTicket + the bet selection. */
export function summarizeBetSelectionResult(modality: Modality, hitsPerTicket: number[], betTicketNumbers: number[]): BetSelectionResultSummary {
  const all = hitsPerTicket.map((_, i) => i + 1);
  const betSet = new Set(betTicketNumbers.filter((n) => n >= 1 && n <= hitsPerTicket.length));
  const bet = all.filter((n) => betSet.has(n));
  const nonBet = all.filter((n) => !betSet.has(n));
  const bestOverall = bestOf(modality, hitsPerTicket, all);
  const bestBet = bestOf(modality, hitsPerTicket, bet);
  const bestNonBet = bestOf(modality, hitsPerTicket, nonBet);
  let relation: BetComparisonRelation | null = null;
  let hitsDifference: number | null = null;
  if (bestBet && bestNonBet) {
    hitsDifference = bestNonBet.bestHits - bestBet.bestHits;
    relation = hitsDifference > 0 ? "non_bet_higher" : hitsDifference < 0 ? "bet_higher" : "equal";
  }
  return {
    hasSelection: bet.length > 0,
    betTicketNumbers: bet,
    nonBetTicketNumbers: nonBet,
    allBet: bet.length > 0 && nonBet.length === 0,
    bestOverall,
    bestBet,
    bestNonBet,
    overallBestWasNotBet: Boolean(bestOverall) && bet.length > 0 && bestOverall!.ticketNumbers.every((n) => !betSet.has(n)),
    relation,
    hitsDifference,
  };
}

function ticketList(numbers: number[]): string {
  const labels = numbers.map((n) => `J${n}`);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}`;
}

export function formatTicketGroupBest(group: TicketGroupBest): string {
  return `${ticketList(group.ticketNumbers)} · ${group.resultText}`;
}

/** Factual, non-evaluative sentence for the bet vs non-bet comparison; empty when no comparison applies. */
export function describeBetComparison(summary: BetSelectionResultSummary): string {
  if (!summary.bestBet || !summary.bestNonBet || summary.relation === null) return "";
  const nonBetSubject = summary.bestNonBet.ticketNumbers.length === 1 ? ticketList(summary.bestNonBet.ticketNumbers) : `Os jogos ${ticketList(summary.bestNonBet.ticketNumbers)}`;
  const plural = summary.bestNonBet.ticketNumbers.length > 1;
  if (summary.relation === "non_bet_higher") {
    const diff = summary.hitsDifference!;
    return `${nonBetSubject} ${plural ? "não foram marcados" : "não foi marcado"} como ${plural ? "apostados" : "apostado"} e ${plural ? "tiveram" : "teve"} ${diff === 1 ? "1 acerto" : `${diff} acertos`} a mais que o melhor jogo apostado.`;
  }
  if (summary.relation === "equal") {
    return `O melhor jogo não apostado teve o mesmo número de acertos que o melhor jogo apostado (${summary.bestBet.resultText}).`;
  }
  return "Nenhum jogo não apostado superou o melhor jogo apostado.";
}
