import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { GeneratePortfolioRequest, LotteryDataset, Modality, StrategyDefinition } from "../../src/shared/types";
import type { Generator } from "../../scripts/ledger/run";

const RULES: Record<Modality, { size: number; max: number }> = { lotofacil: { size: 15, max: 25 }, megasena: { size: 6, max: 60 } };

export function drawNumbers(modality: Modality, contest: number): number[] {
  const { size, max } = RULES[modality];
  const set: number[] = [];
  for (let i = 0; set.length < size; i += 1) {
    const n = ((contest * 7 + i * 3) % max) + 1;
    if (!set.includes(n)) set.push(n);
    if (i > 500) throw new Error("cannot build a draw");
  }
  return set.sort((a, b) => a - b);
}

/** Contiguous dataset 1..latest whose LAST draw has the given date. */
export function makeDataset(modality: Modality, latest: number, lastDrawDate: string): LotteryDataset {
  return {
    schemaVersion: 1,
    modality,
    source: "test",
    importedAt: "2026-11-01T00:00:00.000Z",
    latestContest: latest,
    draws: Array.from({ length: latest }, (_, i) => ({ contest: i + 1, drawDate: i + 1 === latest ? lastDrawDate : "2026-01-01", numbers: drawNumbers(modality, i + 1) })),
  };
}

export function writeData(dir: string, datasets: Record<Modality, LotteryDataset>): void {
  for (const m of ["lotofacil", "megasena"] as const) {
    mkdirSync(path.join(dir, m), { recursive: true });
    writeFileSync(path.join(dir, m, "results.json"), JSON.stringify(datasets[m], null, 2) + "\n", "utf8");
  }
}

export const tmpDataDir = (): string => mkdtempSync(path.join(tmpdir(), "ledger-test-"));

export function fakeStrategies(modality: Modality, n = 5): StrategyDefinition[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${modality}.s${i + 1}`, version: "1.0.0", modality }) as unknown as StrategyDefinition);
}

/** Deterministic stand-in for the real adapters: tickets depend only on (strategy, contest, seed). */
export function fakeGenerator(modality: Modality): Generator {
  const { size, max } = RULES[modality];
  return async (req: GeneratePortfolioRequest) => {
    let h = 0;
    for (const ch of `${req.strategyId}|${req.contest}|${String(req.seed)}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const tickets: number[][] = [];
    for (let t = 0; t < 6; t += 1) {
      // arithmetic progression with a step coprime to the modulus: always `size` distinct numbers
      const start = (h + t * 13) % max;
      const set = Array.from({ length: size }, (_, k) => ((start + k * 7) % max) + 1);
      tickets.push(set.sort((a, b) => a - b));
    }
    return { id: "x", modality, strategyId: req.strategyId, strategyVersion: "1.0.0", seed: req.seed ?? "", tickets, costBRL: 0, metrics: {}, audit: { algorithmVersion: "test-algo-1" }, generationMethod: "t", evaluationMethod: "t", createdAt: "" };
  };
}
