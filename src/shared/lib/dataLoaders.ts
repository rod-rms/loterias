import { gameConfigSchema, lotteryDatasetSchema } from "./schemas";
import type { GameConfig, LotteryDataset, Modality } from "../types";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`.replace(/\/{2,}/g, "/"));
  if (!res.ok) throw new Error(`Failed to fetch ${path}: HTTP ${res.status}`);
  return res.json();
}

let gameConfigCache: GameConfig | null = null;

export async function loadGameConfig(): Promise<GameConfig> {
  if (gameConfigCache) return gameConfigCache;
  const raw = await fetchJson("data/config/game-config.json");
  gameConfigCache = gameConfigSchema.parse(raw);
  return gameConfigCache;
}

const datasetCache = new Map<Modality, LotteryDataset>();

export async function loadDataset(modality: Modality): Promise<LotteryDataset> {
  const cached = datasetCache.get(modality);
  if (cached) return cached;
  const raw = await fetchJson(`data/${modality}/results.json`);
  const parsed = lotteryDatasetSchema.parse(raw);
  datasetCache.set(modality, parsed as LotteryDataset);
  return parsed as LotteryDataset;
}

/** Draws strictly before `contest`, most recent last (ascending order). */
export function drawsBeforeContest(dataset: LotteryDataset, contest: number): LotteryDataset["draws"] {
  return dataset.draws.filter((d) => d.contest < contest);
}

/** The N contests immediately preceding `contest`, or null if unavailable (no look-ahead, no gaps allowed). */
export function referenceWindow(dataset: LotteryDataset, contest: number, windowSize: number): LotteryDataset["draws"] | null {
  const expectedContests: number[] = [];
  for (let c = contest - windowSize; c < contest; c += 1) expectedContests.push(c);
  const byContest = new Map(dataset.draws.map((d) => [d.contest, d] as const));
  const window: LotteryDataset["draws"] = [];
  for (const c of expectedContests) {
    const draw = byContest.get(c);
    if (!draw) return null;
    window.push(draw);
  }
  return window;
}

export function suggestNextContest(dataset: LotteryDataset): number {
  return dataset.latestContest + 1;
}
