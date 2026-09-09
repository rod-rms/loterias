import type { CheckedResult, Modality } from "../types";

/**
 * Conventional result names for a hit count, by modality. These are purely
 * factual descriptions of how many numbers matched — never prize/payout
 * semantics. Below the modality's threshold, there is no special label.
 */
const MEGASENA_LABELS: Record<number, string> = {
  4: "Quadra",
  5: "Quina",
  6: "Sena",
};

const LOTOFACIL_LABELS: Record<number, string> = {
  11: "11 acertos",
  12: "12 acertos",
  13: "13 acertos",
  14: "14 acertos",
  15: "15 acertos",
};

/** Returns the conventional result label for a hit count, or null when the count is below the modality's labeled threshold. */
export function getResultLabel(modality: Modality, hits: number): string | null {
  const table = modality === "megasena" ? MEGASENA_LABELS : LOTOFACIL_LABELS;
  return table[hits] ?? null;
}

/** "1 acerto" for exactly one hit, "N acertos" otherwise — correct pt-BR singular/plural. */
export function formatHitsCount(hits: number): string {
  return hits === 1 ? "1 acerto" : `${hits} acertos`;
}

/**
 * The complete, non-duplicating user-facing descriptor for a hit count:
 * "3 acertos", "4 acertos · Quadra", "1 acerto". For Lotofácil, the
 * conventional label ("12 acertos") is textually identical to the hit-count
 * phrase itself, so it is never appended — appending it would render
 * "12 acertos · 12 acertos". Mega-Sena's labels (Quadra/Quina/Sena) are
 * genuinely distinct text, so they are appended. Always prefer this helper
 * over composing `getResultLabel` with a hit-count string by hand.
 */
export function formatHitResult(modality: Modality, hits: number): string {
  const hitsText = formatHitsCount(hits);
  if (modality === "lotofacil") return hitsText;
  const label = getResultLabel(modality, hits);
  return label ? `${hitsText} · ${label}` : hitsText;
}

export interface BestTicketsSummary {
  /** The highest hit count across all tickets (0 if there are no tickets). */
  bestHits: number;
  /** 1-based ticket numbers (J1, J2, ...) tied for the highest hit count. */
  bestTicketNumbers: number[];
  /** Conventional result label for bestHits, or null if below threshold. */
  label: string | null;
  /** Ready-to-render pt-BR sentence describing the best ticket(s), handling ties naturally. */
  sentence: string;
}

function formatTicketList(ticketNumbers: number[]): string {
  const labels = ticketNumbers.map((n) => `J${n}`);
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}`;
}

/** Summarizes the best-scoring ticket(s) in a checked result, correctly handling ties. */
export function summarizeBestTickets(modality: Modality, hitsPerTicket: number[]): BestTicketsSummary {
  if (hitsPerTicket.length === 0) {
    return { bestHits: 0, bestTicketNumbers: [], label: null, sentence: "" };
  }
  const bestHits = Math.max(...hitsPerTicket);
  const bestTicketNumbers = hitsPerTicket.reduce<number[]>((acc, hits, idx) => {
    if (hits === bestHits) acc.push(idx + 1);
    return acc;
  }, []);
  const label = getResultLabel(modality, bestHits);
  // Lotofácil's label duplicates the hit-count phrase itself (see
  // formatHitResult) — never append it as a "· label" suffix here either.
  const labelSuffix = label && modality !== "lotofacil" ? ` · ${label}` : "";
  const hitsText = formatHitsCount(bestHits);
  const list = formatTicketList(bestTicketNumbers);

  let sentence: string;
  if (bestTicketNumbers.length === 1) {
    sentence = `${list} foi o melhor jogo, com ${hitsText}${labelSuffix}.`;
  } else if (bestTicketNumbers.length === 2) {
    sentence = `${list} foram os melhores jogos, com ${hitsText} cada${labelSuffix}.`;
  } else {
    sentence = `${list} tiveram a maior pontuação, com ${hitsText} cada${labelSuffix}.`;
  }
  return { bestHits, bestTicketNumbers, label, sentence };
}

/** Convenience wrapper over summarizeBestTickets for an existing CheckedResult. */
export function summarizeCheckedResult(modality: Modality, checkedResult: CheckedResult): BestTicketsSummary {
  return summarizeBestTickets(modality, checkedResult.hitsPerTicket);
}
