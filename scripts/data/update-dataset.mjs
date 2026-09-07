#!/usr/bin/env node
/**
 * Cross-platform lottery dataset updater.
 *
 * Usage:
 *   node scripts/data/update-dataset.mjs lotofacil
 *   node scripts/data/update-dataset.mjs megasena
 *   node scripts/data/update-dataset.mjs all
 *
 * Behaviour (per docs/global/DATA_AND_PERSISTENCE_V1.md and
 * 00_START_HERE_CLAUDE_CODE.md section 20):
 *   - reads current snapshot if present;
 *   - queries the official CAIXA endpoint for missing contests only;
 *   - validates every draw (schema, modality, range, distinct numbers, count);
 *   - canonicalizes (ascending numbers, ascending contest order);
 *   - never duplicates a contest;
 *   - detects gaps and reports them without failing the whole run;
 *   - writes atomically (temp file + rename) only after validation;
 *   - never destroys a previously valid snapshot on failure;
 *   - does not commit; the caller (human or CI workflow) commits.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const MODALITIES = {
  lotofacil: {
    ticketSize: 15,
    maxNumber: 25,
    endpoint: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil",
    outFile: path.join(ROOT, "public", "data", "lotofacil", "results.json"),
  },
  megasena: {
    ticketSize: 6,
    maxNumber: 60,
    endpoint: "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena",
    outFile: path.join(ROOT, "public", "data", "megasena", "results.json"),
  },
};

const CONCURRENCY = 2;
const RETRIES = 6;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 10_000;
const SAVE_EVERY = 200;
const REQUEST_SPACING_MS = 350;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

function toIsoDate(brDate) {
  // "DD/MM/YYYY" -> "YYYY-MM-DD"
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(brDate ?? "");
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: REQUEST_HEADERS });
      clearTimeout(timer);
      if (res.status === 404) return null;
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : RETRY_DELAY_MS * attempt * 3;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function validateDrawPayload(raw, cfg, expectedContest) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "empty payload" };
  const contest = Number(raw.numero);
  if (!Number.isInteger(contest) || contest <= 0) return { ok: false, reason: "invalid contest number" };
  if (expectedContest != null && contest !== expectedContest) {
    return { ok: false, reason: `contest mismatch (expected ${expectedContest}, got ${contest})` };
  }
  const list = Array.isArray(raw.listaDezenas) ? raw.listaDezenas : null;
  if (!list) return { ok: false, reason: "missing listaDezenas" };
  const numbers = list.map((n) => Number.parseInt(n, 10)).sort((a, b) => a - b);
  if (numbers.length !== cfg.ticketSize) return { ok: false, reason: `expected ${cfg.ticketSize} numbers, got ${numbers.length}` };
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) return { ok: false, reason: "duplicate numbers in draw" };
  for (const n of numbers) {
    if (!Number.isInteger(n) || n < 1 || n > cfg.maxNumber) {
      return { ok: false, reason: `number ${n} out of range 1..${cfg.maxNumber}` };
    }
  }
  const drawDate = toIsoDate(raw.dataApuracao) ?? new Date(0).toISOString().slice(0, 10);
  return { ok: true, draw: { contest, drawDate, numbers } };
}

async function loadExistingDataset(modality, cfg) {
  if (!existsSync(cfg.outFile)) return null;
  try {
    const raw = JSON.parse(await readFile(cfg.outFile, "utf8"));
    if (raw.modality !== modality) return null;
    return raw;
  } catch {
    return null;
  }
}

async function fetchLatestContestNumber(cfg) {
  const raw = await fetchJson(`${cfg.endpoint}/`);
  const n = Number(raw?.numero);
  if (!Number.isInteger(n) || n <= 0) throw new Error("could not resolve latest contest number from official source");
  return n;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function atomicWrite(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, filePath);
}

async function updateModality(modality) {
  const cfg = MODALITIES[modality];
  if (!cfg) throw new Error(`unknown modality: ${modality}`);

  console.log(`[${modality}] resolving latest official contest...`);
  const latestContest = await fetchLatestContestNumber(cfg);
  console.log(`[${modality}] official latest contest: ${latestContest}`);

  const existing = await loadExistingDataset(modality, cfg);
  const draws = new Map();
  if (existing?.draws) {
    for (const d of existing.draws) draws.set(d.contest, d);
  }

  const haveLatest = existing?.latestContest ?? 0;
  if (haveLatest >= latestContest && draws.size >= latestContest) {
    console.log(`[${modality}] snapshot already up to date (contest ${haveLatest}). No changes.`);
    return { modality, changed: false, latestContest };
  }

  const missing = [];
  for (let c = 1; c <= latestContest; c++) {
    if (!draws.has(c)) missing.push(c);
  }
  console.log(`[${modality}] fetching ${missing.length} missing contest(s)...`);

  const failures = [];
  let fetchedCount = 0;

  const persistProgress = async () => {
    const sortedDraws = Array.from(draws.values()).sort((a, b) => a.contest - b.contest);
    const dataset = {
      schemaVersion: 1,
      modality,
      source: cfg.endpoint,
      importedAt: new Date().toISOString(),
      latestContest: sortedDraws.length ? sortedDraws[sortedDraws.length - 1].contest : 0,
      draws: sortedDraws,
    };
    await atomicWrite(cfg.outFile, dataset);
  };

  await mapLimit(missing, CONCURRENCY, async (contest) => {
    try {
      await sleep(REQUEST_SPACING_MS);
      const raw = await fetchJson(`${cfg.endpoint}/${contest}`);
      const validated = validateDrawPayload(raw, cfg, contest);
      if (!validated.ok) {
        failures.push({ contest, reason: validated.reason });
        return;
      }
      draws.set(contest, validated.draw);
      fetchedCount++;
      if (fetchedCount % SAVE_EVERY === 0) {
        await persistProgress();
        console.log(`[${modality}] progress: ${fetchedCount}/${missing.length} fetched, snapshot saved`);
      }
    } catch (err) {
      failures.push({ contest, reason: err instanceof Error ? err.message : String(err) });
    }
  });

  await persistProgress();

  const finalDraws = Array.from(draws.values()).sort((a, b) => a.contest - b.contest);
  const gaps = [];
  for (let c = 1; c <= (finalDraws.at(-1)?.contest ?? 0); c++) {
    if (!draws.has(c)) gaps.push(c);
  }

  console.log(`[${modality}] done. total draws stored: ${finalDraws.length}`);
  if (failures.length) {
    console.warn(`[${modality}] WARNING: ${failures.length} contest(s) failed to fetch/validate.`);
    for (const f of failures.slice(0, 20)) console.warn(`  - contest ${f.contest}: ${f.reason}`);
    if (failures.length > 20) console.warn(`  ... and ${failures.length - 20} more`);
  }
  if (gaps.length) {
    console.warn(`[${modality}] WARNING: dataset has ${gaps.length} gap(s) below the latest stored contest.`);
  }

  return { modality, changed: true, latestContest: finalDraws.at(-1)?.contest ?? 0, failures, gaps };
}

async function main() {
  const arg = process.argv[2] ?? "all";
  const targets = arg === "all" ? Object.keys(MODALITIES) : [arg];
  const results = [];
  for (const modality of targets) {
    results.push(await updateModality(modality));
  }
  const anyHardFailure = results.some((r) => r == null);
  console.log("\nSummary:", JSON.stringify(results.map((r) => ({ modality: r.modality, changed: r.changed, latestContest: r.latestContest, failures: r.failures?.length ?? 0, gaps: r.gaps?.length ?? 0 })), null, 2));
  process.exit(anyHardFailure ? 1 : 0);
}

main().catch((err) => {
  console.error("Dataset update failed:", err);
  process.exit(1);
});
