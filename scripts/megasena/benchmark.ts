// @ts-nocheck
import { performance } from "node:perf_hooks";
import {
  analyzeOverlap,
  evaluateF4,
  evaluateF5,
  generateMegaSenaPortfolio,
  uniformDistinctPortfolioAverageProbability,
  validateMegaSenaPortfolio,
} from "../../src/modules/megasena/domain";
import { createSeededRandom, generateUniformDistinctTickets } from "../../src/modules/megasena/domain/random";

function measure(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

const sizes = [1, 7, 10, 25, 50, 100];
const rows = [];
for (const n of sizes) {
  const random = createSeededRandom(`bench-${n}`);
  const tickets = generateUniformDistinctTickets(n, random);
  const validationMs = measure(() => validateMegaSenaPortfolio(tickets));
  const overlapMs = measure(() => analyzeOverlap(tickets));
  const f4Ms = measure(() => evaluateF4(tickets, { estimationSamples: 10_000, seed: `bench-f4-${n}` }));
  const f5Ms = measure(() => evaluateF5(tickets, { estimationSamples: 10_000, seed: `bench-f5-${n}` }));
  const baselineMs = measure(() => {
    uniformDistinctPortfolioAverageProbability(n, 4);
    uniformDistinctPortfolioAverageProbability(n, 5);
    uniformDistinctPortfolioAverageProbability(n, 6);
  });
  const optimizationMs = measure(() => generateMegaSenaPortfolio({
    numberOfTickets: n,
    ticketCostBRL: 6,
    objective: "quina_or_better",
    popularityMode: "off",
    seed: `bench-opt-${n}`,
    maxIterations: n <= 10 ? 8 : 3,
    candidatePoolSize: n <= 10 ? 12 : 6,
    evaluationSamples: 5_000,
  }));
  rows.push({ n, validationMs, overlapMs, f4Ms, f5Ms, baselineMs, optimizationMs });
}
console.log(JSON.stringify({
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  notes: [
    "F4 evaluation uses exact union up to the configured domain threshold (25 tickets) and deterministic Monte Carlo above it.",
    "F5 evaluation is exact for these sizes.",
    "Optimization benchmark uses quina_or_better with deliberately small iteration/candidate budgets to measure interactive-scale behavior.",
    "Times are single-run local observations, not service-level guarantees."
  ],
  rows
}, null, 2));
