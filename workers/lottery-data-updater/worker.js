/**
 * lottery-data-updater — Cloudflare Worker (DATA-002), CONTINGENCY updater.
 *
 * A fallback for the CAIXA/GitHub-Actions IP block: .github/workflows/data-update.yml stays the primary
 * updater and is not touched by this Worker's existence. Cloudflare IPs were NOT blocked by CAIXA when
 * tested (2026-10-02, GRU colo, Lotofácil endpoint; Mega-Sena shares the origin, not tested separately).
 *
 * Reads current datasets from raw.githubusercontent.com (no auth, no size limits, cache-busted).
 * Commits changes via GitHub Git Data API (atomic multi-file, no 1 MB limit, non-force ref update).
 * Alerts via GitHub Issues (label: data-update-failure): on failures, and on OVERDUE draws.
 *
 * Behaviour deliberately mirrors scripts/data/update-dataset.mjs + the workflow: the overdue-draw rule and
 * the alert text/12 h rule are byte-identical copies of scripts/data/overdue.mjs and
 * scripts/data/overdue-alert.cjs (the two blocks below are checked by tests/worker/lotteryDataUpdater.test.ts).
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
//
// These must match wrangler.toml's [triggers].crons exactly (checked by
// tests/worker/lotteryDataUpdater.test.ts). Same days/hours as the GitHub
// Actions schedule's final fallbacks, +15 min (see wrangler.toml for why).
const FINAL_FALLBACK_CRONS = new Set(["15 10 * * 1-6", "15 23 * * 0"]);

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
// After a ref race (another writer, typically the Actions updater, moved main between our HEAD read and
// our ref update) wait a little and re-run the whole update once from fresh state.
const RACE_RETRY_DELAY_MS = 5000;
const REQUEST_HEADERS    = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

// ---------------------------------------------------------------------------
// Overdue-draw rule and alert text (shared with the Actions updater)
// ---------------------------------------------------------------------------

// BEGIN overdue-logic (keep byte-identical in scripts/data/overdue.mjs and workers/lottery-data-updater/worker.js)
// BRT is UTC-3 (no DST since 2019), the same assumption the workflow schedule comments rely on.
const OVERDUE_BRT_UTC_OFFSET_HOURS = 3;
// TUNABLE: a draw is considered overdue once it is past the NEXT day at this hour (BRT) after its
// scheduled date. The real publication lag is not yet known (see the "latest endpoint" diagnostic
// logs this updater now writes on every run), so this is intentionally generous to avoid false alarms.
const OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR = 14;

/** Strict "DD/MM/YYYY" -> { y, m, d } for a real calendar date in 2000..2100, else null. */
function parseBrDate(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(typeof value === "string" ? value.trim() : "");
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 2000 || y > 2100) return null;
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** Instant after which a draw scheduled for `nextDrawDateBr` counts as overdue, or null if the date is missing/malformed. */
function overdueDeadline(nextDrawDateBr) {
  const parsed = parseBrDate(nextDrawDateBr);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d + 1, OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR + OVERDUE_BRT_UTC_OFFSET_HOURS, 0, 0));
}

/**
 * Decide whether the official source looks overdue. Never throws; any missing/malformed input means
 * "not overdue" (a diagnostic must never create false alarms or break the update).
 * reason: "invalid-input" | "advanced" | "no-next-draw-date" | "before-deadline" | "overdue"
 */
function evaluateOverdue({ now, nextDrawDateBr, storedLatest, officialLatest }) {
  const deadline = overdueDeadline(nextDrawDateBr);
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || !Number.isFinite(storedLatest) || !Number.isFinite(officialLatest)) {
    return { overdue: false, reason: "invalid-input", deadline };
  }
  if (officialLatest > storedLatest) return { overdue: false, reason: "advanced", deadline };
  if (!deadline) return { overdue: false, reason: "no-next-draw-date", deadline: null };
  if (now.getTime() <= deadline.getTime()) return { overdue: false, reason: "before-deadline", deadline };
  return { overdue: true, reason: "overdue", deadline };
}
// END overdue-logic

// BEGIN overdue-message (keep byte-identical in scripts/data/overdue-alert.cjs and workers/lottery-data-updater/worker.js)
const OVERDUE_ISSUE_LABEL = "data-update-failure";
const OVERDUE_MARKER = "<!-- data-update-overdue -->";
const OVERDUE_MIN_NOTICE_INTERVAL_MS = 12 * 60 * 60 * 1000;
const OVERDUE_ISSUE_TITLE = "[Data] Resultado oficial possivelmente ainda não publicado";
const OVERDUE_MODALITY_NAMES = { lotofacil: "Lotofácil", megasena: "Mega-Sena" };

/** UTC ISO string -> "DD/MM/YYYY HH:MM" in BRT (UTC-3). */
function overdueFormatBrt(iso) {
  const pad = (n) => String(n).padStart(2, "0");
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return String(iso);
  const b = new Date(t.getTime() - 3 * 60 * 60 * 1000);
  return `${pad(b.getUTCDate())}/${pad(b.getUTCMonth() + 1)}/${b.getUTCFullYear()} ${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`;
}

function overdueBuildBody({ entries, runUrl, nowIso }) {
  const lines = entries.map(
    (e) =>
      `- **${OVERDUE_MODALITY_NAMES[e.modality] ?? e.modality}**: último concurso na base e na fonte oficial: ${e.officialLatest}; ` +
      `próximo sorteio informado pela fonte: ${e.nextDrawDateBr}; tolerância até ${overdueFormatBrt(e.deadlineIso)} (BRT).`,
  );
  return [
    OVERDUE_MARKER,
    "**O resultado oficial pode ainda não ter sido publicado, ou há um problema no atualizador ou na fonte.**",
    "",
    "Para a(s) modalidade(s) abaixo, a data do próximo sorteio informada pela fonte oficial já passou da margem de tolerância e o último concurso publicado continua sendo o que já estava na base:",
    "",
    ...lines,
    "",
    "Causa provável (não confirmada): o resultado oficial ainda não foi publicado, ou existe um problema no atualizador ou na fonte. O calendário oficial da CAIXA também pode ter movido o sorteio (feriado ou mudança de agenda), caso em que isto se resolve sozinho. Este aviso não afirma que houve falha da CAIXA.",
    "",
    `- Execução: ${runUrl}`,
    `- Horário (UTC): ${nowIso}`,
    "",
    "O último dataset validado foi preservado. Esta issue fecha sozinha quando os dados forem atualizados; novos avisos nela são limitados a um a cada 12 h.",
  ].join("\n");
}

/** Latest overdue-notice time (ms) among an open issue's body and comments, or null when none carries the marker. */
function overdueLastNoticeMs(issue, comments) {
  const times = comments.filter((c) => typeof c.body === "string" && c.body.includes(OVERDUE_MARKER)).map((c) => new Date(c.created_at).getTime());
  if (typeof issue.body === "string" && issue.body.includes(OVERDUE_MARKER)) times.push(new Date(issue.created_at).getTime());
  return times.length ? Math.max(...times) : null;
}

/** No more than one notice per OVERDUE_MIN_NOTICE_INTERVAL_MS on an already-open issue. */
function overdueNoticeAllowed(lastNoticeMs, nowMs) {
  return lastNoticeMs === null || nowMs - lastNoticeMs >= OVERDUE_MIN_NOTICE_INTERVAL_MS;
}
// END overdue-message

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

// `onResponse` (optional) is called with every Response right after the request completes (before status
// handling), purely so callers can log diagnostics. It never changes how the response is handled.
async function fetchJson(url, extraHeaders = {}, onResponse) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { ...REQUEST_HEADERS, ...extraHeaders },
      });
      clearTimeout(timer);
      if (onResponse) onResponse(res);
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

// A 4xx (other than 408/429) is deterministic: retrying the same request cannot change the answer
// (e.g. 422 "not a fast forward" after a ref race, 401 expired token), so it fails immediately.
function isDeterministicClientError(err) {
  const s = err && err.status;
  return Number.isInteger(s) && s >= 400 && s < 500 && s !== 408 && s !== 429;
}

// GitHub rejects a non-force ref update whose parent is no longer the branch head with 422 "Update is not a
// fast forward": another writer committed to main between our HEAD read and our ref update.
function isRefRace(err) {
  return Boolean(err) && err.status === 422 && /fast.?forward/i.test(String(err.message));
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
        const err = new Error(`GitHub API ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`);
        err.status = res.status;
        throw err;
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === 4 || isDeterministicClientError(err)) throw err;
      await sleep(2000 * attempt);
    }
  }
}

/**
 * Read a JSON file from the repo via raw.githubusercontent.com.
 * No auth required, no 1 MB limit. A unique query string is appended on every read because
 * raw.githubusercontent.com is CDN-cached for a few minutes: without it a run shortly after another
 * writer's commit (e.g. the Actions updater) could build its files from a stale base.
 *
 * Returns null ONLY on a genuine 404 (file does not exist yet — e.g. the
 * very first run). Any other failure (5xx, network error, timeout, bad
 * JSON) is retried a few times and then THROWN — it must never be
 * silently treated as "the file doesn't exist", because that would make
 * the caller think there's no prior dataset and trigger a full historical
 * backfill against the official source, potentially overwriting a known-
 * good snapshot with an incomplete one built under transient-error cover.
 */
async function readJsonFromRepo(filePath) {
  const url = `${GITHUB_RAW_BASE}/${filePath}?cb=${Date.now()}`;
  const RAW_READ_RETRIES = 3;
  for (let attempt = 1; attempt <= RAW_READ_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "lottery-data-updater/1.0", "Cache-Control": "no-cache" },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} reading ${filePath} from raw.githubusercontent.com`);
      return await res.json();
    } catch (err) {
      if (attempt === RAW_READ_RETRIES) throw err;
      await sleep(1000 * attempt);
    }
  }
}

/**
 * Commit multiple files atomically via GitHub Git Data API.
 * Steps: HEAD ref -> base tree -> blobs -> new tree -> commit -> update ref.
 * The ref update is NOT forced: if main moved since step 1 GitHub rejects it (422), which runUpdate
 * treats as a benign ref race (see isRefRace), not as an incident.
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

  // 6. Update ref (no force)
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

// Same behaviour as scripts/data/overdue-alert.cjs: shared label, at most one notice per 12 h on an open issue.
async function openOrCommentOverdueIssue(token, triggerLabel, entries) {
  await ensureIssueLabel(token);
  const issues = await githubApi(
    token, "GET",
    `/issues?labels=${encodeURIComponent(OVERDUE_ISSUE_LABEL)}&state=open&per_page=5`
  );
  const now = new Date();
  const body = overdueBuildBody({
    entries,
    runUrl: `Cloudflare Worker lottery-data-updater (${triggerLabel})`,
    nowIso: now.toISOString(),
  });

  if (!Array.isArray(issues) || issues.length === 0) {
    await githubApi(token, "POST", "/issues", { title: OVERDUE_ISSUE_TITLE, body, labels: [OVERDUE_ISSUE_LABEL] });
    return "created";
  }
  const issue = issues[0];
  const comments = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await githubApi(token, "GET", `/issues/${issue.number}/comments?per_page=100&page=${page}`);
    if (!Array.isArray(batch)) break;
    comments.push(...batch);
    if (batch.length < 100) break;
  }
  if (!overdueNoticeAllowed(overdueLastNoticeMs(issue, comments), now.getTime())) return "skipped-recent";
  await githubApi(token, "POST", `/issues/${issue.number}/comments`, { body });
  return "commented";
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

// Diagnostic values are logged as key="value" pairs; quotes are stripped so a line stays parseable.
function logValue(value) {
  return String(value ?? "-").replace(/["\r\n]/g, "");
}

// Same line format as scripts/data/update-dataset.mjs, so Actions and Worker logs can be compared.
function logLatestResponse(modality, res) {
  console.log(
    `[${modality}] latest endpoint response: status=${res.status} date="${logValue(res.headers.get("date"))}" age="${logValue(res.headers.get("age"))}" cache-control="${logValue(res.headers.get("cache-control"))}" at=${new Date().toISOString()}`,
  );
}

async function fetchLatestPayload(modality, cfg) {
  const raw = await fetchJson(`${cfg.endpoint}/`, {}, (res) => logLatestResponse(modality, res));
  const n = Number(raw?.numero);
  if (!Number.isInteger(n) || n <= 0)
    throw new Error("could not resolve latest contest number from official source");
  console.log(
    `[${modality}] latest payload: numero=${n} dataApuracao=${logValue(raw?.dataApuracao)} dataProximoConcurso=${logValue(raw?.dataProximoConcurso)} numeroConcursoProximo=${logValue(raw?.numeroConcursoProximo)}`,
  );
  return { latestContest: n, raw };
}

// "Is the next official result overdue?" Only called when the stored snapshot is already as new as the
// official latest contest. Always logs one line; returns a report entry only when overdue. A failure in
// this diagnostic must never fail or alter the data update.
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

async function updateModality(modality, existingDataset) {
  const cfg = MODALITIES[modality];

  console.log(`[${modality}] resolving latest official contest...`);
  const { latestContest, raw: latestRaw } = await fetchLatestPayload(modality, cfg);
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

  await mapLimit(missing, CONCURRENCY, async (contest) => {
    try {
      await sleep(REQUEST_SPACING_MS);
      const raw = await fetchJson(`${cfg.endpoint}/${contest}`);
      const validated = validateDrawPayload(raw, cfg, contest);
      if (!validated.ok) { failures.push({ contest, reason: validated.reason }); return; }
      draws.set(contest, validated.draw);
      firstSeenAt.set(contest, new Date().toISOString());
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
  if (changed) {
    const seen = [...firstSeenAt.keys()].sort((a, b) => a - b);
    for (const contest of seen.slice(-5)) {
      console.log(`[${modality}] first seen: contest ${contest} (draw ${draws.get(contest)?.drawDate ?? "?"}) at ${firstSeenAt.get(contest)} (UTC)`);
    }
    if (seen.length > 5) console.log(`[${modality}] first seen: ... and ${seen.length - 5} earlier contest(s) in this run`);
  }
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

/**
 * One read -> check -> commit pass. Does NOT alert. Returns what happened so runUpdate can decide:
 *   { aborted, abortMessage }                      could not read the repo state: nothing written/checked
 *   { raced: true }                                 ref race: another writer moved main, nothing was written
 *   { results, anyCheckFailed, commitFailed, commitError, overdueEntries }
 */
async function runUpdateOnce(githubToken, triggerLabel, allowCheckedOnly) {
  // Read current snapshots from repo (parallel). readJsonFromRepo only
  // returns null for a genuine 404 — any other failure throws here. If it
  // throws, we do NOT know the current state of the repo, so we must not
  // guess "no file" and must not write anything or fetch from the official
  // source this run. Abort safely and raise an alert instead.
  let existingLotofacil, existingMegasena, existingStatus;
  try {
    [existingLotofacil, existingMegasena, existingStatus] = await Promise.all([
      readJsonFromRepo(MODALITIES.lotofacil.dataPath),
      readJsonFromRepo(MODALITIES.megasena.dataPath),
      readJsonFromRepo(STATUS_PATH),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FAILED to read current repo state — aborting without writes or source checks: ${msg}`);
    return { aborted: true, abortMessage: msg };
  }
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

  // Commit, if there's anything to commit. A failure here (expired token,
  // API error, ...) must NOT be allowed to skip the alerting step in
  // runUpdate — it has to reach the GitHub Issue just like a source-check
  // failure does. The one exception is a ref race, which is benign (see below).
  let commitFailed = false;
  let commitError = null;
  if (filesToCommit.length > 0) {
    const changedModalities = results.filter((r) => r?.changed).map((r) => r.modality);
    const commitMsg = changedModalities.length > 0
      ? `chore(data): update ${changedModalities.join(", ")} dataset\n\nTriggered by ${triggerLabel}`
      : `chore(data): update status.json\n\nTriggered by ${triggerLabel}`;
    console.log(`Committing ${filesToCommit.length} file(s): ${filesToCommit.map((f) => f.path).join(", ")}`);
    try {
      const sha = await commitFilesToGitHub(githubToken, commitMsg, filesToCommit);
      console.log(`Committed: ${sha}`);
    } catch (err) {
      if (isRefRace(err)) {
        // Another writer (typically the Actions updater, possibly with the very same contest) moved main
        // after we read HEAD. Nothing of ours was written. Not an incident: runUpdate re-checks once.
        console.warn(`Ref race: main moved during this run, nothing written (${err.message}).`);
        return { raced: true };
      }
      commitFailed = true;
      commitError = err instanceof Error ? err.message : String(err);
      console.error(`Commit to GitHub FAILED: ${commitError}`);
    }
  } else {
    console.log("Nothing to commit this run.");
  }

  const overdueEntries = results.map((r) => r?.overdue).filter(Boolean);
  return { results, anyCheckFailed, commitFailed, commitError, overdueEntries };
}

async function runUpdate(githubToken, triggerLabel, allowCheckedOnly) {
  console.log(`=== lottery-data-updater START trigger=${triggerLabel} allowCheckedOnly=${allowCheckedOnly} ===`);

  let outcome = await runUpdateOnce(githubToken, triggerLabel, allowCheckedOnly);

  if (outcome.raced) {
    // Re-run the whole pass once from fresh state: if the other writer already stored the same contests
    // this finds "already up to date" and finishes cleanly with no incident and no redundant commit.
    console.warn(`Re-checking once in ${RACE_RETRY_DELAY_MS} ms after the ref race.`);
    await sleep(RACE_RETRY_DELAY_MS);
    outcome = await runUpdateOnce(githubToken, `${triggerLabel} (retry after ref race)`, allowCheckedOnly);
    if (outcome.raced) {
      // Two races in a row: still nothing written, and now worth a human look.
      outcome = {
        results: [],
        anyCheckFailed: false,
        commitFailed: true,
        commitError: "main moved twice during this run (ref race); nothing was written",
        overdueEntries: [],
      };
    }
  }

  if (outcome.aborted) {
    await openOrCommentFailureIssue(
      githubToken,
      triggerLabel,
      `Could not read current dataset/status from raw.githubusercontent.com — aborted without any writes.\n${outcome.abortMessage}`
    ).catch((e) => console.error("Issue alert failed:", e));
    console.log(`=== lottery-data-updater END (aborted: could not read repo state) ===`);
    return { anyCheckFailed: true, aborted: true, summary: [] };
  }

  const { results, anyCheckFailed, commitFailed, commitError, overdueEntries } = outcome;
  const failed = anyCheckFailed || commitFailed;

  // Issue alerting. Same three-way rule as the Actions workflow: failure alert on failure; overdue alert when
  // a draw is overdue (the run itself is not a failure); close the shared issue ONLY on a clean, non-overdue run.
  if (failed) {
    const errorSummary = [
      ...results.filter((r) => !r?.checked).map((r) => `[${r.modality}] source check failed`),
      ...(commitFailed ? [`[commit] failed to write changes to GitHub: ${commitError}`] : []),
    ].join("\n");
    await openOrCommentFailureIssue(githubToken, triggerLabel, errorSummary)
      .catch((e) => console.error("Issue alert failed:", e));
  }
  if (overdueEntries.length > 0) {
    for (const e of overdueEntries) {
      console.warn(
        `[${e.modality}] OVERDUE: stored/official latest ${e.storedLatest}/${e.officialLatest}, next draw per source ${e.nextDrawDateBr}, past ${e.deadlineIso}. The official result may not be published yet, the official calendar may have moved the draw, or there may be an updater/source problem.`,
      );
    }
    await openOrCommentOverdueIssue(githubToken, triggerLabel, overdueEntries)
      .then((action) => console.log(`overdue alert: ${action}`))
      .catch((e) => console.error("Overdue alert failed:", e));
  }
  if (!failed && overdueEntries.length === 0) {
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
  console.log(`=== lottery-data-updater END anyCheckFailed=${anyCheckFailed} commitFailed=${commitFailed} overdue=${overdueEntries.length} ===`);
  return { anyCheckFailed: failed, summary };
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  /**
   * Cron trigger — runs on the schedules defined in wrangler.toml.
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
