import type { StrategyDefinition } from "../../../shared/types";

const NOT_PREDICTION_DISCLAIMER = "Não prevê o próximo sorteio nem altera a probabilidade de uma combinação individual.";

export const MEGASENA_MAX_F4: StrategyDefinition = {
  id: "megasena.max_f4",
  version: "1.0.0",
  modality: "megasena",
  name: "Otimizar cobertura Quadra+",
  shortDescription: "Busca heurística que maximiza a chance de pelo menos uma Quadra ou melhor.",
  status: "active",
  evidence: "structural",
  ticketCount: { mode: "range", min: 1, max: 100 },
  supportsBudget: true,
  supportsFixedNumbers: true,
  supportsExcludedNumbers: true,
  supportsUserSeed: true,
  supportsQualityPreset: true,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: ["F4"],
  reportedMetrics: ["F4", "F5", "F6", "sobreposição", "baseline"],
  disclaimers: [NOT_PREDICTION_DISCLAIMER, "Melhor solução encontrada pelo algoritmo, sem prova de ótimo global."],
};

export const MEGASENA_MAX_F5: StrategyDefinition = {
  id: "megasena.max_f5",
  version: "1.0.0",
  modality: "megasena",
  name: "Otimizar cobertura Quina+",
  shortDescription: "Busca heurística que maximiza a chance de pelo menos uma Quina ou melhor.",
  status: "active",
  evidence: "structural",
  ticketCount: { mode: "range", min: 1, max: 100 },
  supportsBudget: true,
  supportsFixedNumbers: true,
  supportsExcludedNumbers: true,
  supportsUserSeed: true,
  supportsQualityPreset: true,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: ["F5"],
  reportedMetrics: ["F4", "F5", "F6", "sobreposição", "baseline"],
  disclaimers: [NOT_PREDICTION_DISCLAIMER, "Melhor solução encontrada pelo algoritmo, sem prova de ótimo global."],
};

export const MEGASENA_MAX_DIVERSIFICATION: StrategyDefinition = {
  id: "megasena.max_diversification",
  version: "1.0.0",
  modality: "megasena",
  name: "Diversificação de carteira",
  shortDescription: "Equilibra a exposição das 60 dezenas e reduz a sobreposição entre os jogos.",
  status: "active",
  evidence: "mathematical",
  ticketCount: { mode: "range", min: 1, max: 100 },
  supportsBudget: true,
  supportsFixedNumbers: true,
  supportsExcludedNumbers: true,
  supportsUserSeed: true,
  supportsQualityPreset: false,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: ["equilíbrio de exposição", "sobreposição"],
  reportedMetrics: ["F4", "F5", "F6", "baseline"],
  disclaimers: [NOT_PREDICTION_DISCLAIMER, "Não afirma aumento da chance de Sena."],
};

export const MEGASENA_UNIFORM_RANDOM: StrategyDefinition = {
  id: "megasena.uniform_random",
  version: "1.0.0",
  modality: "megasena",
  name: "Aleatória distinta",
  shortDescription: "Jogos gerados de forma uniforme e distinta, sem filtros estruturais ocultos.",
  status: "active",
  evidence: "baseline",
  ticketCount: { mode: "range", min: 1, max: 100 },
  supportsBudget: true,
  supportsFixedNumbers: true,
  supportsExcludedNumbers: true,
  supportsUserSeed: true,
  supportsQualityPreset: false,
  requiresHistoricalDraws: false,
  requiresTargetContest: false,
  optimizedMetrics: [],
  reportedMetrics: ["F4", "F5", "F6", "baseline"],
  disclaimers: [NOT_PREDICTION_DISCLAIMER, "Não deve ser confundida com a baseline teórica de comparação."],
};

export const MEGASENA_STRATEGIES: StrategyDefinition[] = [
  MEGASENA_MAX_F4,
  MEGASENA_MAX_F5,
  MEGASENA_MAX_DIVERSIFICATION,
  MEGASENA_UNIFORM_RANDOM,
];
