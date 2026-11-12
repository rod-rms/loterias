/**
 * CLI of the offline backtest (ANL-002). Run through scripts/ledger/launch.mjs (`backtest` entry), which bundles this
 * file with esbuild so the REAL strategy code runs unchanged under Node.
 *
 *   npm run backtest -- --modality lotofacil|megasena [--from N --to M] [--dry-run] [--sample] [--data-dir D] [--out-dir D]
 *
 * Default window: the last 1000 contests (never before contest 51). The window actually used is written to the artifact.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { clearDatasetCache } from "../../src/shared/lib/dataLoaders";
import { lotteryDatasetSchema } from "../../src/shared/lib/schemas";
import { strategyRegistry } from "../../src/shared/lib/strategyRegistry";
import { LOTOFACIL_STRATEGIES } from "../../src/modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../src/modules/megasena/strategies/definitions";
import { generateLotofacilPortfolio } from "../../src/modules/lotofacil/strategies/adapters";
import { generateMegaSenaPortfolioRequest } from "../../src/modules/megasena/strategies/adapters";
import { BACKTEST_MIN_TARGET_CONTEST } from "../../src/shared/lib/backtestSchemas";
import type { LotteryDataset, Modality } from "../../src/shared/types";
import { sha256Hex } from "../ledger/core";
import { runBacktest, timeSample, type Generator } from "./engine";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const modality = argValue("--modality") as Modality | undefined;
if (modality !== "lotofacil" && modality !== "megasena") {
  console.error("usage: npm run backtest -- --modality lotofacil|megasena [--from N --to M] [--dry-run] [--sample]");
  process.exit(2);
}
const dataDir = path.resolve(argValue("--data-dir") ?? "public/data");
const outDir = path.resolve(argValue("--out-dir") ?? path.join("public/data/backtest", modality));
const dryRun = process.argv.includes("--dry-run");
const sample = process.argv.includes("--sample");

const text = readFileSync(path.join(dataDir, modality, "results.json"), "utf8");
const dataset = lotteryDatasetSchema.parse(JSON.parse(text)) as LotteryDataset;
const datasetSha256 = sha256Hex(text);

// The strategy code loads datasets/config through fetch("/data/..."), as in the browser. Serve the config from the
// data directory and the modality's results from the CURRENT NO-LOOK-AHEAD VIEW (draws < target only).
let viewJson = text;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === `/data/${modality}/results.json`) return new Response(viewJson, { status: 200, headers: { "content-type": "application/json" } });
  if (url.startsWith("/data/")) {
    try {
      return new Response(readFileSync(path.join(dataDir, url.slice("/data/".length)), "utf8"), { status: 200, headers: { "content-type": "application/json" } });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
  return realFetch(input, init);
}) as typeof fetch;

for (const s of [...LOTOFACIL_STRATEGIES, ...MEGASENA_STRATEGIES]) strategyRegistry.register(s);
const strategies = strategyRegistry.listAll().filter((s) => s.modality === modality).map((s) => ({ id: s.id, version: s.version }));
const generate = (modality === "lotofacil" ? generateLotofacilPortfolio : generateMegaSenaPortfolioRequest) as Generator;
const setView = (view: LotteryDataset) => {
  viewJson = JSON.stringify(view);
  clearDatasetCache();
};

if (sample) {
  const targets = Array.from({ length: 20 }, (_, i) => dataset.latestContest - 19 + i);
  const t0 = performance.now();
  const rows = await timeSample({ modality, dataset, strategies, setView, generate, targets });
  console.log(`timing sample: ${targets.length} contests (${targets[0]}..${targets.at(-1)}), total ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  for (const r of rows) console.log(`  ${r.strategyId}: mean ${r.meanMs.toFixed(1)} ms, max ${r.maxMs.toFixed(1)} ms`);
  console.log(`  all strategies per contest: ${rows.reduce((a, r) => a + r.meanMs, 0).toFixed(1)} ms`);
  process.exit(0);
}

const to = Number(argValue("--to") ?? dataset.latestContest);
const from = Number(argValue("--from") ?? Math.max(BACKTEST_MIN_TARGET_CONTEST, to - 999));
if (!Number.isInteger(from) || !Number.isInteger(to)) {
  console.error("--from/--to must be integers");
  process.exit(2);
}
const started = performance.now();
const result = await runBacktest({
  modality,
  dataset,
  datasetSha256,
  from,
  to,
  strategies,
  setView,
  generate,
  outDir,
  dryRun,
  codeCommit: process.env.GITHUB_SHA ?? process.env.BACKTEST_CODE_COMMIT ?? "local",
  now: () => new Date(),
  log: (line) => console.log(line),
});
console.log(JSON.stringify({ modality, from, to, ...result, seconds: Math.round((performance.now() - started) / 1000), dryRun }, null, 2));
