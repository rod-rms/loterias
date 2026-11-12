/**
 * CLI of the prospective ledger (ANL-001). Run through scripts/ledger/launch.mjs (it bundles this file with esbuild so
 * the REAL strategy code, including src/shared/lib/dataLoaders.ts, runs unchanged under Node).
 *
 *   npm run ledger:run -- [--dry-run] [--now <ISO>] [--data-dir <dir>]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { strategyRegistry } from "../../src/shared/lib/strategyRegistry";
import { LOTOFACIL_STRATEGIES } from "../../src/modules/lotofacil/strategies/definitions";
import { MEGASENA_STRATEGIES } from "../../src/modules/megasena/strategies/definitions";
import { generateLotofacilPortfolio } from "../../src/modules/lotofacil/strategies/adapters";
import { generateMegaSenaPortfolioRequest } from "../../src/modules/megasena/strategies/adapters";
import type { Modality } from "../../src/shared/types";
import { runLedger, type Generator } from "./run";

const OFFICIAL = { lotofacil: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/", megasena: "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/" } as const;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dataDir = path.resolve(argValue("--data-dir") ?? "public/data");
const dryRun = process.argv.includes("--dry-run");
const nowArg = argValue("--now");
const now = nowArg ? new Date(nowArg) : new Date();
if (Number.isNaN(now.getTime())) {
  console.error(`invalid --now value: ${nowArg}`);
  process.exit(2);
}

// The strategy code loads datasets/config through fetch("/data/..."), exactly as in the browser. Serve those paths
// from the chosen data directory (the real dataLoaders module runs unchanged).
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
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

/** One short request, no retries; any failure means "unknown" and never fails the run. */
async function fetchOfficialLatest(modality: Modality): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await realFetch(OFFICIAL[modality], { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; lotoatlas-ledger)", Accept: "application/json" } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const n = Number(((await res.json()) as { numero?: unknown }).numero);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

const report = await runLedger({
  dataDir,
  now,
  dryRun,
  codeCommit: process.env.GITHUB_SHA ?? "local",
  strategiesFor: (m) => strategyRegistry.listAll().filter((s) => s.modality === m),
  generate: { lotofacil: generateLotofacilPortfolio as Generator, megasena: generateMegaSenaPortfolioRequest as Generator },
  fetchOfficialLatest,
  log: (line) => console.log(line),
});

console.log(JSON.stringify(report, null, 2));
if (process.env.GITHUB_OUTPUT && !dryRun) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_OUTPUT, `wrote=${report.wrote.length}\n`);
}
process.exit(report.modalities.some((m) => m.status === "error") ? 1 : 0);
