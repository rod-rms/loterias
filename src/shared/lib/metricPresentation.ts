import type { Modality } from "../types";

export interface MetricPresentation {
  label: string;
  helpTitle: string;
  helpBody: string;
}

/**
 * Presentation mapping layer: translates internal probability metric keys
 * (atLeast11, sena, noPrize, ...) into plain Brazilian Portuguese. UI code
 * must never render an internal object key directly to the user.
 */
const LOTOFACIL_METRIC_LABELS: Record<string, MetricPresentation> = {
  atLeast11: {
    label: "Chance de 11 acertos ou mais",
    helpTitle: "Chance de 11 acertos ou mais",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto obter 11 ou mais acertos no sorteio.",
  },
  atLeast12: {
    label: "Chance de 12 acertos ou mais",
    helpTitle: "Chance de 12 acertos ou mais",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto obter 12 ou mais acertos no sorteio.",
  },
  atLeast13: {
    label: "Chance de 13 acertos ou mais",
    helpTitle: "Chance de 13 acertos ou mais",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto obter 13 ou mais acertos no sorteio.",
  },
  atLeast14: {
    label: "Chance de 14 acertos ou mais",
    helpTitle: "Chance de 14 acertos ou mais",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto obter 14 ou mais acertos no sorteio.",
  },
  exactly15: {
    label: "Chance de 15 acertos",
    helpTitle: "Chance de 15 acertos",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto acertar as 15 dezenas sorteadas.",
  },
  noAtLeast11: {
    label: "Chance de não chegar a 11 acertos",
    helpTitle: "Chance de não chegar a 11 acertos",
    helpBody: "Probabilidade de nenhum jogo deste conjunto alcançar 11 acertos ou mais.",
  },
};

const MEGASENA_METRIC_LABELS: Record<string, MetricPresentation> = {
  atLeast4: {
    label: "Chance de Quadra ou mais",
    helpTitle: "Chance de Quadra ou mais",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto obter 4, 5 ou 6 acertos.",
  },
  atLeast5: {
    label: "Chance de Quina ou mais",
    helpTitle: "Chance de Quina ou mais",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto obter 5 ou 6 acertos.",
  },
  sena: {
    label: "Chance de Sena",
    helpTitle: "Chance de Sena",
    helpBody: "Probabilidade de pelo menos um dos jogos deste conjunto acertar as 6 dezenas sorteadas.",
  },
  noPrize: {
    label: "Chance de nenhum prêmio",
    helpTitle: "Chance de nenhum prêmio",
    helpBody: "Probabilidade de nenhum jogo deste conjunto alcançar Quadra, Quina ou Sena.",
  },
};

export function getMetricPresentation(modality: Modality, key: string): MetricPresentation {
  const table = modality === "lotofacil" ? LOTOFACIL_METRIC_LABELS : MEGASENA_METRIC_LABELS;
  return (
    table[key] ?? {
      label: key,
      helpTitle: key,
      helpBody: "Probabilidade calculada para este conjunto de jogos.",
    }
  );
}

/** Order in which to render the primary metrics for the default result view (not the "ver análise detalhada" view). */
export const PRIMARY_METRIC_ORDER: Record<Modality, string[]> = {
  lotofacil: ["atLeast11", "atLeast12", "atLeast13", "atLeast14", "exactly15"],
  megasena: ["atLeast4", "atLeast5", "sena"],
};
