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
 *   - does not commit; the caller (human or CI workflow) commits;
 *   - logs diagnostics for the "latest" endpoint on every run (status, Date/Age/Cache-Control,
 *     numero, dataApuracao, dataProximoConcurso) and a UTC "first seen" line per new contest;
 *   - flags an OVERDUE draw (see ./overdue.mjs) without failing the run: the next-draw date in the
 *     latest payload is past its margin and the latest contest has not advanced. It is logged and,
 *     in the workflow, handed to the overdue-alert step. It does not change what is fetched.
 *
 * Also maintains public/data/status.json, a small data-source transparency
 * file distinguishing "last time we successfully verified the official
 * source" (lastCheckedAt) from "last time a new draw actually changed the
 * local dataset" (lastUpdatedAt). A modality whose check fails this run
 * keeps its previous status entry untouched — we never write a false
 * "successful" lastCheckedAt, and we never overwrite a known-good snapshot
 * with a failed/partial one.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR, evaluateOverdue } from "./overdue.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const STATUS_FILE = path.join(ROOT, "public", "data", "status.json");

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

// Set by the workflow: true for a manual run or the "final fallback"
// verification window of each draw's retry sequence, so a successful
// check with no new contest still updates lastCheckedAt. False (default)
// for "intermediate" scheduled windows, which log the attempt but leave
// the versioned status untouched when nothing changed, avoiding a
// status-only commit for every retry.
const ALLOW_CHECKED_ONLY_STATUS_WRITE = process.env.ALLOW_CHECKED_ONLY_STATUS_WRITE === "true";

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

// `onResponse` (optional) is called with every Response right after the request completes (before status
// handling), purely so callers can log diagnostics. It never changes how the response is handled.
async function fetchJson(url, onResponse) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: REQUEST_HEADERS });
      clearTimeout(timer);
      if (onResponse) onResponse(res);
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

async function loadExistingStatus() {
  if (!existsSync(STATUS_FILE)) return null;
  try {
    return JSON.parse(await readFile(STATUS_FILE, "utf8"));
  } catch {
    return null;
  }
}

function defaultModalityStatus(cfg) {
  return {
    source: cfg.endpoint,
    latestContest: 0,
    latestDrawDate: "",
    lastUpdatedAt: "",
    lastCheckedAt: "",
    status: "degraded",
    gapCount: 0,
  };
}

// Diagnostic values are logged as key="value" pairs; quotes are stripped so a line stays parseable.
function logValue(value) {
  return String(value ?? "-").replace(/["\r\n]/g, "");
}

// Logged on every attempt to the "latest" endpoint (no cookies or tokens): lets the real publication
// time and any caching on the path to GitHub's runners be measured from a few weeks of logs.
function logLatestResponse(modality, res) {
  console.log(
    `[${modality}] latest endpoint response: status=${res.status} date="${logValue(res.headers.get("date"))}" age="${logValue(res.headers.get("age"))}" cache-control="${logValue(res.headers.get("cache-control"))}" at=${new Date().toISOString()}`,
  );
}

async function fetchLatestPayload(modality, cfg) {
  const raw = await fetchJson(`${cfg.endpoint}/`, (res) => logLatestResponse(modality, res));
  const n = Number(raw?.numero);
  if (!Number.isInteger(n) || n <= 0) throw new Error("could not resolve latest contest number from official source");
  console.log(
    `[${modality}] latest payload: numero=${n} dataApuracao=${logValue(raw?.dataApuracao)} dataProximoConcurso=${logValue(raw?.dataProximoConcurso)} numeroConcursoProximo=${logValue(raw?.numeroConcursoProximo)}`,
  );
  return { latestContest: n, raw };
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

/**
 * "Is the next official result overdue?" (see ./overdue.mjs). Only called when the stored snapshot is
 * already as new as the official latest contest. Always logs one diagnostic line; returns a report
 * entry only when overdue. A failure in this diagnostic must never fail or alter the data update.
 */
function checkOverdue(modality, latestRaw, storedLatest, officialLatest) {
  try {
    const now = new Date();
    const nextDrawDateBr = latestRaw?.dataProximoConcurso;
    const verdict = evaluateOverdue({ now, nextDrawDateBr, storedLatest, officialLatest });
    console.log(
      `[${modality}] overdue check: ${verdict.reason} (nextDraw=${logValue(nextDrawDateBr)} deadline=${verdict.deadline ? verdict.deadline.toISOString() : "-"} margin=next-day ${OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR}:00 BRT storedLatest=${storedLatest} officialLatest=${officialLatest})`,
    );
    if (!verdict.overdue) return null;
    return {
      modality,
      storedLatest,
      officialLatest,
      nextDrawDateBr: String(nextDrawDateBr),
      deadlineIso: verdict.deadline.toISOString(),
      nowIso: now.toISOString(),
    };
  } catch (err) {
    console.warn(`[${modality}] overdue check skipped (diagnostic only): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Performs the official-source check and (if needed) backfill for one
 * modality. Never throws for per-contest fetch/validation problems — those
 * are reported as failures/gaps. Only throws when the initial "what is the
 * latest official contest" check itself fails, since that means we could
 * not verify the source at all this run.
 */
async function updateModality(modality) {
  const cfg = MODALITIES[modality];
  if (!cfg) throw new Error(`unknown modality: ${modality}`);

  console.log(`[${modality}] resolving latest official contest...`);
  const { latestContest, raw: latestRaw } = await fetchLatestPayload(modality, cfg);
  console.log(`[${modality}] official latest contest: ${latestContest}`);

  const existing = await loadExistingDataset(modality, cfg);
  const draws = new Map();
  if (existing?.draws) {
    for (const d of existing.draws) draws.set(d.contest, d);
  }

  const haveLatest = existing?.latestContest ?? 0;
  if (haveLatest >= latestContest && draws.size >= latestContest) {
    console.log(`[${modality}] snapshot already up to date (contest ${haveLatest}). No changes.`);
    const finalDraws = Array.from(draws.values()).sort((a, b) => a.contest - b.contest);
    return {
      modality,
      checked: true,
      changed: false,
      latestContest,
      latestDrawDate: finalDraws.at(-1)?.drawDate ?? "",
      failures: [],
      gaps: [],
      overdue: checkOverdue(modality, latestRaw, haveLatest, latestContest),
    };
  }

  const missing = [];
  for (let c = 1; c <= latestContest; c++) {
    if (!draws.has(c)) missing.push(c);
  }
  console.log(`[${modality}] fetching ${missing.length} missing contest(s)...`);

  const failures = [];
  let fetchedCount = 0;
  // UTC time each newly stored contest was first seen by this run (diagnostic: measures real publication lag).
  const firstSeenAt = new Map();

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
      firstSeenAt.set(contest, new Date().toISOString());
      fetchedCount++;
      if (fetchedCount % SAVE_EVERY === 0) {
        await persistProgress();
        console.log(`[${modality}] progress: ${fetchedCount}/${missing.length} fetched, snapshot saved`);
      }
    } catch (err) {
      failures.push({ contest, reason: err instanceof Error ? err.message : String(err) });
    }
  });

  const changed = fetchedCount > 0;
  if (changed) await persistProgress();
  if (changed) {
    const seen = Array.from(firstSeenAt.keys()).sort((a, b) => a - b);
    for (const contest of seen.slice(-5)) {
      console.log(`[${modality}] first seen: contest ${contest} (draw ${draws.get(contest)?.drawDate ?? "?"}) at ${firstSeenAt.get(contest)} (UTC)`);
    }
    if (seen.length > 5) console.log(`[${modality}] first seen: ... and ${seen.length - 5} earlier contest(s) in this run`);
  }

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

  return {
    modality,
    checked: true,
    changed,
    latestContest: finalDraws.at(-1)?.contest ?? 0,
    latestDrawDate: finalDraws.at(-1)?.drawDate ?? "",
    failures,
    gaps,
  };
}

async function updateStatusFile(results) {
  const existingStatus = (await loadExistingStatus()) ?? { schemaVersion: 1 };
  const nowIso = new Date().toISOString();
  const merged = { schemaVersion: 1 };

  for (const modality of Object.keys(MODALITIES)) {
    const cfg = MODALITIES[modality];
    const previous = existingStatus[modality] ?? defaultModalityStatus(cfg);
    const result = results.find((r) => r?.modality === modality);

    if (!result || !result.checked) {
      // The check failed (or was skipped) this run: never write a false
      // "successful" lastCheckedAt, and never touch the rest of the entry.
      merged[modality] = previous;
      continue;
    }

    if (!result.changed && !ALLOW_CHECKED_ONLY_STATUS_WRITE) {
      // A successful check with nothing new, on an "intermediate" retry
      // window (see the workflow's multiple post-draw verification
      // windows): log it, but don't create a status-only commit for it —
      // only the final fallback window (or a manual run) persists a
      // checked-but-unchanged lastCheckedAt, to keep Git history readable.
      console.log(`[${modality}] check succeeded, nothing new (intermediate window: not persisting lastCheckedAt this run)`);
      merged[modality] = previous;
      continue;
    }

    merged[modality] = {
      source: cfg.endpoint,
      latestContest: result.latestContest,
      latestDrawDate: result.latestDrawDate || previous.latestDrawDate,
      lastUpdatedAt: result.changed ? nowIso : previous.lastUpdatedAt || nowIso,
      lastCheckedAt: nowIso,
      status: result.gaps.length === 0 ? "ok" : "degraded",
      gapCount: result.gaps.length,
    };
  }

  await atomicWrite(STATUS_FILE, merged);
  return merged;
}

/**
 * Overdue draws never fail the run (the dataset is intact; the exit code is unchanged). They are logged,
 * and, when running in the workflow (OVERDUE_REPORT_PATH + GITHUB_OUTPUT set), handed to the alert step.
 */
async function reportOverdue(entries) {
  if (entries.length === 0) return;
  for (const e of entries) {
    console.warn(
      `[${e.modality}] OVERDUE: stored/official latest ${e.storedLatest}/${e.officialLatest}, next draw per source ${e.nextDrawDateBr}, past ${e.deadlineIso}. The official result may not be published yet, the official calendar may have moved the draw, or there may be an updater/source problem.`,
    );
  }
  const reportPath = process.env.OVERDUE_REPORT_PATH;
  if (reportPath && process.env.GITHUB_OUTPUT) {
    await writeFile(reportPath, JSON.stringify(entries, null, 2), "utf8");
    appendFileSync(process.env.GITHUB_OUTPUT, "overdue=true\n");
  }
}

async function main() {
  const arg = process.argv[2] ?? "all";
  const targets = arg === "all" ? Object.keys(MODALITIES) : [arg];
  const results = [];
  let anyCheckFailed = false;

  for (const modality of targets) {
    try {
      results.push(await updateModality(modality));
    } catch (err) {
      anyCheckFailed = true;
      console.error(`[${modality}] FAILED to verify the official source this run: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`[${modality}] preserving the last known-good dataset and status; not writing a false successful check.`);
      results.push({ modality, checked: false });
    }
  }

  await updateStatusFile(results);
  await reportOverdue(results.map((r) => r.overdue).filter(Boolean));

  console.log(
    "\nSummary:",
    JSON.stringify(
      results.map((r) => ({ modality: r.modality, checked: r.checked, changed: r.changed ?? false, latestContest: r.latestContest ?? null, failures: r.failures?.length ?? 0, gaps: r.gaps?.length ?? 0 })),
      null,
      2,
    ),
  );
  process.exit(anyCheckFailed ? 1 : 0);
}

main().catch((err) => {
  console.error("Dataset update failed:", err);
  process.exit(1);
});
