/**
 * lottery-data-updater — Cloudflare Worker (DATA-002)
 *
 * Replaces the GitHub Actions cron schedule for dataset updates.
 * Cloudflare IPs are NOT blocked by CAIXA (confirmed 2026-10-02, GRU colo).
 *
 * Reads current datasets from raw.githubusercontent.com (no auth, no size limits).
 * Commits changes via GitHub Git Data API (atomic multi-file, no 1 MB limit).
 * Alerts via GitHub Issues (label: data-update-failure).
 *
 * Required secret: GITHUB_TOKEN (fine-grained PAT, rod-rms/loterias,
 *   Contents: R/W + Issues: R/W)
 */

const GITHUB_OWNER  = "rod-rms";
const GITHUB_REPO   = "loterias";
const GITHUB_BRANCH = "main";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;
const GITHUB_API_BASE  = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

// Crons that count as "final fallback" — a successful check with no new
// contest STILL persists lastCheckedAt. Others are "intermediate" windows
// that skip the status commit when nothing changed.
const FINAL_FALLBACK_CRONS = new Set(["0 10 * * 2-6", "0 23 * * 0"]);

const ISSUE_LABEL = "data-update-failure";

const MODALITIES = {
  lotofacil: {
    ticketSize: 15,
    maxNumber: 25,
    endpoint: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil",
    dataPath: "public/data/lotofacil/results.json",
  },
  megasena: {
    ticketSize: 6,
    maxNumber: 60,
    endpoint: "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena",
    dataPath: "public/data/megasena/results.json",
  },
};

const STATUS_PATH        = "public/data/status.json";
const CONCURRENCY        = 2;
const RETRIES            = 6;
const RETRY_DELAY_MS     = 2000;
const REQUEST_TIMEOUT_MS = 10_000;
const REQUEST_SPACING_MS = 350;
const REQUEST_HEADERS    = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// ---------------------------------------------------------------------------
// Pure helpers (ported from update-dataset.mjs)
// ---------------------------------------------------------------------------

function toIsoDate(brDate) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(brDate ?? "");
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, extraHeaders = {}) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { ...REQUEST_HEADERS, ...extraHeaders },
      });
      clearTimeout(timer);
      if (res.status === 404) return null;
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : RETRY_DELAY_MS * attempt * 3;
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === RETRIES) throw err;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return null;
}

function validateDrawPayload(raw, cfg, expectedContest) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "empty payload" };
  const contest = Number(raw.numero);
  if (!Number.isInteger(contest) || contest <= 0) return { ok: false, reason: "invalid contest number" };
  if (expectedContest != null && contest !== expectedContest)
    return { ok: false, reason: `contest mismatch (expected ${expectedContest}, got ${contest})` };
  const list = Array.isArray(raw.listaDezenas) ? raw.listaDezenas : null;
  if (!list) return { ok: false, reason: "missing listaDezenas" };
  const numbers = list.map((n) => Number.parseInt(n, 10)).sort((a, b) => a - b);
  if (numbers.length !== cfg.ticketSize)
    return { ok: false, reason: `expected ${cfg.ticketSize} numbers, got ${numbers.length}` };
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) return { ok: false, reason: "duplicate numbers in draw" };
  for (const n of numbers) {
    if (!Number.isInteger(n) || n < 1 || n > cfg.maxNumber)
      return { ok: false, reason: `number ${n} out of range 1..${cfg.maxNumber}` };
  }
  const drawDate = toIsoDate(raw.dataApuracao) ?? new Date(0).toISOString().slice(0, 10);
  return { ok: true, draw: { contest, drawDate, numbers } };
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

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "lottery-data-updater/1.0",
  };
}

async function githubApi(token, method, path, body) {
  const url = `${GITHUB_API_BASE}${path}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: githubHeaders(token),
        body: body ? JSON.stringify(body) : undefined,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GitHub API ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === 4) throw err;
      await sleep(2000 * attempt);
    }
  }
}

/**
 * Read a JSON file from the repo via raw.githubusercontent.com.
 * No auth required, no 1 MB limit. Returns null if file does not exist.
 */
async function readJsonFromRepo(filePath) {
  const url = `${GITHUB_RAW_BASE}/${filePath}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "lottery-data-updater/1.0", "Cache-Control": "no-cache" },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Commit multiple files atomically via GitHub Git Data API.
 * Steps: HEAD ref -> base tree -> blobs -> new tree -> commit -> update ref.
 */
async function commitFilesToGitHub(token, commitMessage, files) {
  // 1. HEAD SHA
  const refData   = await githubApi(token, "GET", `/git/ref/heads/${GITHUB_BRANCH}`);
  const headSha   = refData.object.sha;

  // 2. Base tree SHA
  const commitData  = await githubApi(token, "GET", `/git/commits/${headSha}`);
  const baseTreeSha = commitData.tree.sha;

  // 3. Blobs
  const treeItems = await Promise.all(
    files.map(async ({ path: filePath, content }) => {
      const blob = await githubApi(token, "POST", "/git/blobs", {
        content: btoa(unescape(encodeURIComponent(content))),
        encoding: "base64",
      });
      return { path: filePath, mode: "100644", type: "blob", sha: blob.sha };
    })
  );

  // 4. New tree
  const newTree = await githubApi(token, "POST", "/git/trees", {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // 5. New commit
  const newCommit = await githubApi(token, "POST", "/git/commits", {
    message: commitMessage,
    tree: newTree.sha,
    parents: [headSha],
  });

  // 6. Update ref
  await githubApi(token, "PATCH", `/git/refs/heads/${GITHUB_BRANCH}`, {
    sha: newCommit.sha,
  });

  return newCommit.sha;
}

// ---------------------------------------------------------------------------
// GitHub Issues alerting
// ---------------------------------------------------------------------------

async function ensureIssueLabel(token) {
  try {
    await githubApi(token, "GET", `/labels/${encodeURIComponent(ISSUE_LABEL)}`);
  } catch {
    await githubApi(token, "POST", "/labels", {
      name: ISSUE_LABEL,
      color: "d93f0b",
      description: "Automated alert: lottery dataset update failed",
    }).catch(() => {});
  }
}

async function openOrCommentFailureIssue(token, triggerLabel, errorSummary) {
  await ensureIssueLabel(token);
  const issues = await githubApi(
    token, "GET",
    `/issues?labels=${encodeURIComponent(ISSUE_LABEL)}&state=open&per_page=5`
  ).catch(() => []);

  const timestamp = new Date().toISOString();
  const body = `**Trigger:** \`${triggerLabel}\`\n**Time:** ${timestamp}\n\n\`\`\`\n${errorSummary}\n\`\`\``;

  if (Array.isArray(issues) && issues.length > 0) {
    await githubApi(token, "POST", `/issues/${issues[0].number}/comments`, { body }).catch(() => {});
  } else {
    await githubApi(token, "POST", "/issues", {
      title: `[DATA] Dataset update failed — ${timestamp.slice(0, 10)}`,
      body,
      labels: [ISSUE_LABEL],
    }).catch(() => {});
  }
}

async function closeIncidentIfOpen(token) {
  const issues = await githubApi(
    token, "GET",
    `/issues?labels=${encodeURIComponent(ISSUE_LABEL)}&state=open&per_page=5`
  ).catch(() => []);
  if (!Array.isArray(issues) || issues.length === 0) return;
  for (const issue of issues) {
    await githubApi(token, "PATCH", `/issues/${issue.number}`, {
      state: "closed",
      state_reason: "completed",
    }).catch(() => {});
    await githubApi(token, "POST", `/issues/${issue.number}/comments`, {
      body: `Resolved at ${new Date().toISOString()} — dataset updated successfully.`,
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Core update logic (adapted — no filesystem, returns objects)
// ---------------------------------------------------------------------------

async function updateModality(modality, existingDataset) {
  const cfg = MODALITIES[modality];

  console.log(`[${modality}] resolving latest official contest...`);
  const rawLatest    = await fetchJson(`${cfg.endpoint}/`);
  const latestContest = Number(rawLatest?.numero);
  if (!Number.isInteger(latestContest) || latestContest <= 0)
    throw new Error("could not resolve latest contest number from official source");
  console.log(`[${modality}] official latest: ${latestContest}`);

  const draws = new Map();
  if (existingDataset?.draws) {
    for (const d of existingDataset.draws) draws.set(d.contest, d);
  }

  const haveLatest = existingDataset?.latestContest ?? 0;
  if (haveLatest >= latestContest && draws.size >= latestContest) {
    console.log(`[${modality}] already up to date (contest ${haveLatest}).`);
    const finalDraws = [...draws.values()].sort((a, b) => a.contest - b.contest);
    return {
      modality, checked: true, changed: false,
      latestContest, latestDrawDate: finalDraws.at(-1)?.drawDate ?? "",
      failures: [], gaps: [], dataset: null,
    };
  }

  const missing = [];
  for (let c = 1; c <= latestContest; c++) {
    if (!draws.has(c)) missing.push(c);
  }
  console.log(`[${modality}] fetching ${missing.length} missing contest(s)...`);

  const failures = [];
  let fetchedCount = 0;

  await mapLimit(missing, CONCURRENCY, async (contest) => {
    try {
      await sleep(REQUEST_SPACING_MS);
      const raw = await fetchJson(`${cfg.endpoint}/${contest}`);
      const validated = validateDrawPayload(raw, cfg, contest);
      if (!validated.ok) { failures.push({ contest, reason: validated.reason }); return; }
      draws.set(contest, validated.draw);
      fetchedCount++;
    } catch (err) {
      failures.push({ contest, reason: err instanceof Error ? err.message : String(err) });
    }
  });

  const changed    = fetchedCount > 0;
  const finalDraws = [...draws.values()].sort((a, b) => a.contest - b.contest);
  const gaps       = [];
  for (let c = 1; c <= (finalDraws.at(-1)?.contest ?? 0); c++) {
    if (!draws.has(c)) gaps.push(c);
  }
  console.log(`[${modality}] done. stored: ${finalDraws.length}, new: ${fetchedCount}, failures: ${failures.length}, gaps: ${gaps.length}`);
  if (failures.length) console.warn(`[${modality}] failures:`, JSON.stringify(failures.slice(0, 5)));

  const dataset = changed ? {
    schemaVersion: 1,
    modality,
    source: cfg.endpoint,
    importedAt: new Date().toISOString(),
    latestContest: finalDraws.at(-1)?.contest ?? 0,
    draws: finalDraws,
  } : null;

  return {
    modality, checked: true, changed,
    latestContest: finalDraws.at(-1)?.contest ?? 0,
    latestDrawDate: finalDraws.at(-1)?.drawDate ?? "",
    failures, gaps, dataset,
  };
}

function buildStatusJson(results, existingStatus, allowCheckedOnly) {
  const nowIso  = new Date().toISOString();
  const merged  = { schemaVersion: 1 };

  for (const [modality, cfg] of Object.entries(MODALITIES)) {
    const previous = existingStatus?.[modality] ?? defaultModalityStatus(cfg);
    const result   = results.find((r) => r?.modality === modality);

    if (!result || !result.checked) { merged[modality] = previous; continue; }

    if (!result.changed && !allowCheckedOnly) {
      console.log(`[${modality}] intermediate window, nothing changed — not persisting lastCheckedAt`);
      merged[modality] = previous;
      continue;
    }

    merged[modality] = {
      source:         cfg.endpoint,
      latestContest:  result.latestContest,
      latestDrawDate: result.latestDrawDate || previous.latestDrawDate,
      lastUpdatedAt:  result.changed ? nowIso : (previous.lastUpdatedAt || nowIso),
      lastCheckedAt:  nowIso,
      status:         result.gaps.length === 0 ? "ok" : "degraded",
      gapCount:       result.gaps.length,
    };
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function runUpdate(githubToken, triggerLabel, allowCheckedOnly) {
  console.log(`=== lottery-data-updater START trigger=${triggerLabel} allowCheckedOnly=${allowCheckedOnly} ===`);

  // Read current snapshots from repo (parallel)
  const [existingLotofacil, existingMegasena, existingStatus] = await Promise.all([
    readJsonFromRepo(MODALITIES.lotofacil.dataPath),
    readJsonFromRepo(MODALITIES.megasena.dataPath),
    readJsonFromRepo(STATUS_PATH),
  ]);
  const existingDatasets = { lotofacil: existingLotofacil, megasena: existingMegasena };

  const results = [];
  let anyCheckFailed = false;

  for (const modality of Object.keys(MODALITIES)) {
    try {
      results.push(await updateModality(modality, existingDatasets[modality]));
    } catch (err) {
      anyCheckFailed = true;
      console.error(`[${modality}] FAILED: ${err instanceof Error ? err.message : String(err)}`);
      results.push({ modality, checked: false });
    }
  }

  // Build new status.json
  const newStatus = buildStatusJson(results, existingStatus, allowCheckedOnly);

  // Collect files that need committing
  const filesToCommit = [];
  for (const [modality, cfg] of Object.entries(MODALITIES)) {
    const result = results.find((r) => r?.modality === modality);
    if (result?.changed && result.dataset) {
      filesToCommit.push({ path: cfg.dataPath, content: JSON.stringify(result.dataset, null, 2) + "\n" });
    }
  }
  const statusChanged = JSON.stringify(newStatus) !== JSON.stringify(existingStatus);
  if (statusChanged) {
    filesToCommit.push({ path: STATUS_PATH, content: JSON.stringify(newStatus, null, 2) + "\n" });
  }

  if (filesToCommit.length > 0) {
    const changedModalities = results.filter((r) => r?.changed).map((r) => r.modality);
    const commitMsg = changedModalities.length > 0
      ? `chore(data): update ${changedModalities.join(", ")} dataset [skip ci]\n\nTriggered by ${triggerLabel}`
      : `chore(data): update status.json [skip ci]\n\nTriggered by ${triggerLabel}`;
    console.log(`Committing ${filesToCommit.length} file(s): ${filesToCommit.map((f) => f.path).join(", ")}`);
    const sha = await commitFilesToGitHub(githubToken, commitMsg, filesToCommit);
    console.log(`Committed: ${sha}`);
  } else {
    console.log("Nothing to commit this run.");
  }

  // Issue alerting
  if (anyCheckFailed) {
    const errorSummary = results
      .filter((r) => !r?.checked)
      .map((r) => `[${r.modality}] source check failed`)
      .join("\n");
    await openOrCommentFailureIssue(githubToken, triggerLabel, errorSummary)
      .catch((e) => console.error("Issue alert failed:", e));
  } else {
    await closeIncidentIfOpen(githubToken)
      .catch((e) => console.error("Issue close failed:", e));
  }

  const summary = results.map((r) => ({
    modality:      r.modality,
    checked:       r.checked,
    changed:       r.changed ?? false,
    latestContest: r.latestContest ?? null,
    failures:      r.failures?.length ?? 0,
    gaps:          r.gaps?.length ?? 0,
  }));
  console.log("Summary:", JSON.stringify(summary, null, 2));
  console.log(`=== lottery-data-updater END anyCheckFailed=${anyCheckFailed} ===`);
  return { anyCheckFailed, summary };
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  /**
   * Cron trigger — runs on the three schedules defined in wrangler.toml.
   */
  async scheduled(event, env, ctx) {
    const cronExpr       = event.cron;
    const allowCheckedOnly = FINAL_FALLBACK_CRONS.has(cronExpr);
    ctx.waitUntil(runUpdate(env.GITHUB_TOKEN, `cron:${cronExpr}`, allowCheckedOnly));
  },

  /**
   * HTTP fetch handler — used only for health check or manual trigger.
   * GET /         -> { worker, version, status }
   * GET /trigger  -> triggers a full update run (requires Authorization: Bearer <GITHUB_TOKEN>)
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/trigger" && request.method === "GET") {
      const auth = request.headers.get("Authorization");
      if (!auth || auth !== `Bearer ${env.GITHUB_TOKEN}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      ctx.waitUntil(runUpdate(env.GITHUB_TOKEN, "manual-http", true));
      return new Response(JSON.stringify({ status: "triggered", time: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ worker: "lottery-data-updater", version: "1.0", status: "ok" }),
      { headers: { "Content-Type": "application/json" } }
    );
  },
};
