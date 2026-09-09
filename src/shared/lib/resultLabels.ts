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
  const labelSuffix = label ? ` · ${label}` : "";
  const list = formatTicketList(bestTicketNumbers);

  let sentence: string;
  if (bestTicketNumbers.length === 1) {
    sentence = `${list} foi o melhor jogo, com ${bestHits} acertos${labelSuffix}.`;
  } else if (bestTicketNumbers.length === 2) {
    sentence = `${list} foram os melhores jogos, com ${bestHits} acertos cada${labelSuffix}.`;
  } else {
    sentence = `${list} tiveram a maior pontuação, com ${bestHits} acertos cada${labelSuffix}.`;
  }
  return { bestHits, bestTicketNumbers, label, sentence };
}

/** Convenience wrapper over summarizeBestTickets for an existing CheckedResult. */
export function summarizeCheckedResult(modality: Modality, checkedResult: CheckedResult): BestTicketsSummary {
  return summarizeBestTickets(modality, checkedResult.hitsPerTicket);
}
