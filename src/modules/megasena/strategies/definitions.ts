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
  ux: {
    title: "Priorizar Quadra ou mais",
    summary: "Organiza os jogos para cobrir mais cenários em que pelo menos um deles faria Quadra, Quina ou Sena.",
    badge: "Busca otimizada",
    helpTitle: "Como funciona Priorizar Quadra ou mais",
    helpBody:
      "O algoritmo testa diferentes conjuntos de jogos e procura aquele que cobre mais resultados possíveis com Quadra ou mais. A busca é heurística: encontra boas soluções, mas não garante o melhor conjunto matematicamente possível.",
    technicalName: "Otimizar cobertura Quadra+",
  },
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
  ux: {
    title: "Priorizar Quina ou mais",
    summary: "Organiza os jogos para cobrir mais cenários em que pelo menos um deles faria Quina ou Sena.",
    badge: "Busca otimizada",
    helpTitle: "Como funciona Priorizar Quina ou mais",
    helpBody:
      "O algoritmo procura ampliar a cobertura de resultados com Quina ou mais. A busca é heurística e não prevê o próximo sorteio.",
    technicalName: "Otimizar cobertura Quina+",
  },
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
  ux: {
    title: "Variar mais os jogos",
    summary: "Cria jogos mais diferentes entre si e reduz a repetição de dezenas entre eles.",
    badge: "Mais diversidade",
    helpTitle: "Como funciona Variar mais os jogos",
    helpBody:
      "Busca reduzir repetições entre os jogos e equilibrar quantas vezes cada dezena aparece. Isso aumenta a diversidade do conjunto, não a probabilidade individual de uma dezena ser sorteada, nem a chance de Sena.",
    technicalName: "Diversificação de carteira",
  },
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
  ux: {
    title: "Gerar jogos aleatórios",
    summary: "Gera jogos diferentes entre si sem aplicar filtros ou padrões.",
    badge: "Sem filtros",
    helpTitle: "Como funciona Gerar jogos aleatórios",
    helpBody:
      "Cada combinação válida é gerada de forma uniforme. Esta opção é útil como referência neutra e não deve ser confundida com a média teórica usada nas comparações.",
    technicalName: "Aleatória distinta",
  },
};

export const MEGASENA_STRATEGIES: StrategyDefinition[] = [
  MEGASENA_MAX_F4,
  MEGASENA_MAX_F5,
  MEGASENA_MAX_DIVERSIFICATION,
  MEGASENA_UNIFORM_RANDOM,
];
