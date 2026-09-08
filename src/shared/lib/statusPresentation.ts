import type { ProbabilityStatus } from "../types";

export interface StatusPresentation {
  label: string;
  helpTitle: string;
  helpBody: string;
}

/** Plain-language presentation for probability metric statuses. Underlying statuses are never altered. */
const STATUS_PRESENTATION: Record<ProbabilityStatus, StatusPresentation> = {
  exact: {
    label: "Cálculo exato",
    helpTitle: "Cálculo exato",
    helpBody: "Este valor foi calculado matematicamente, sem depender de uma simulação aleatória.",
  },
  estimated: {
    label: "Estimativa",
    helpTitle: "Estimativa",
    helpBody: "Este valor foi estimado por amostragem porque calcular todo o universo seria mais pesado. O resultado pode variar ligeiramente.",
  },
  upper_bound: {
    label: "Limite superior",
    helpTitle: "Limite superior",
    helpBody: "O valor real é igual ou menor do que este número; ele marca o teto estimado para esta probabilidade.",
  },
  lower_bound: {
    label: "Limite inferior",
    helpTitle: "Limite inferior",
    helpBody: "O valor real é igual ou maior do que este número; ele marca o piso estimado para esta probabilidade.",
  },
  not_computed: {
    label: "Não calculado",
    helpTitle: "Não calculado",
    helpBody: "Este valor não foi calculado nesta geração.",
  },
};

export function getStatusPresentation(status: ProbabilityStatus): StatusPresentation {
  return STATUS_PRESENTATION[status];
}
