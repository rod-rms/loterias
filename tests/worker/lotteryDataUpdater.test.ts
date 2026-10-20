// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the Cloudflare Worker contingency updater (workers/lottery-data-updater/worker.js). The Worker is a
 * standalone ES module; it is imported through a file URL and exercised end to end against a mocked CAIXA, a
 * mocked raw.githubusercontent.com / GitHub API, and a fake clock. Nothing here touches the network.
 */

const ROOT = process.cwd();
const WORKER_DIR = path.join(ROOT, "workers/lottery-data-updater");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

type Modality = "lotofacil" | "megasena";
interface Worker {
  scheduled(event: { cron: string }, env: { GITHUB_TOKEN: string }, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void>;
  fetch(request: Request, env: { GITHUB_TOKEN: string }, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response>;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: Worker = undefined as any;

// ---------------------------------------------------------------------------------------------------------
// Static checks: crons in sync, shared blocks byte-identical, scope
// ---------------------------------------------------------------------------------------------------------

function block(src: string, name: string): string[] {
  const lines = src.split("\n");
  const a = lines.findIndex((l) => l.startsWith(`// BEGIN ${name}`));
  const b = lines.findIndex((l) => l.startsWith(`// END ${name}`));
  expect(a, `BEGIN ${name} marker`).toBeGreaterThanOrEqual(0);
  expect(b, `END ${name} marker`).toBeGreaterThan(a);
  return lines.slice(a, b + 1);
}

describe("worker — static consistency", () => {
  const workerSrc = read("workers/lottery-data-updater/worker.js");
  const toml = read("workers/lottery-data-updater/wrangler.toml");
  const tomlCrons = [...toml.slice(toml.indexOf("[triggers]")).matchAll(/^\s*"([^"]+)",/gm)].map((m) => m[1]!);

  it("wrangler.toml lists exactly the four crons (within the Free plan's 5 per account) and FINAL_FALLBACK_CRONS is a subset", () => {
    expect(tomlCrons).toEqual(["0 2 * * 1-6", "15 10 * * 1-6", "15 15,19 * * 1", "15 23 * * 0"]);
    expect(tomlCrons.length).toBeLessThanOrEqual(5);
    const finalSet = [...workerSrc.match(/FINAL_FALLBACK_CRONS = new Set\(\[([^\]]+)\]\)/)![1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
    expect(finalSet).toEqual(["15 10 * * 1-6", "15 23 * * 0"]);
    for (const c of finalSet) expect(tomlCrons).toContain(c);
  });

  it("covers UTC Monday: Sunday night, and Monday daytime follow-ups, with no Sunday-publication-time assumption in the text", () => {
    expect(tomlCrons).toContain("0 2 * * 1-6"); // 02:00Z Monday = Sunday 23:00 BRT
    expect(tomlCrons).toContain("15 15,19 * * 1");
    for (const text of [toml, workerSrc, read("workers/lottery-data-updater/README.md")]) {
      expect(text).not.toMatch(/Sunday from 11:00|domingo às 11|Sunday-morning (draw|sequence)/i);
    }
  });

  it("the overdue-draw rule is a byte-identical copy of scripts/data/overdue.mjs (modulo the export keyword)", () => {
    const fromScript = block(read("scripts/data/overdue.mjs"), "overdue-logic").map((l) => l.replace(/^export /, ""));
    expect(block(workerSrc, "overdue-logic")).toEqual(fromScript);
  });

  it("the overdue alert text and 12 h rule are a byte-identical copy of scripts/data/overdue-alert.cjs", () => {
    expect(block(workerSrc, "overdue-message")).toEqual(block(read("scripts/data/overdue-alert.cjs"), "overdue-message"));
  });

  it("commit messages carry no [skip ci] (it can also suppress the Cloudflare Pages deploy that publishes the data)", () => {
    expect(workerSrc).not.toMatch(/skip ci/i);
  });

  it("contains no token-like secret", () => {
    for (const f of ["worker.js", "wrangler.toml"]) {
      expect(read(`workers/lottery-data-updater/${f}`)).not.toMatch(/github_pat_[A-Za-z0-9_]{10,}|ghp_[A-Za-z0-9]{10,}|gho_[A-Za-z0-9]{10,}/);
    }
    expect(WORKER_DIR).toContain("workers");
  });
});

// ---------------------------------------------------------------------------------------------------------
// Simulated world
// ---------------------------------------------------------------------------------------------------------

const MOD: Record<Modality, { size: number; max: number }> = { lotofacil: { size: 15, max: 25 }, megasena: { size: 6, max: 60 } };
const RAW = "https://raw.githubusercontent.com/rod-rms/loterias/main/";
const API = "https://api.github.com/repos/rod-rms/loterias";
const CAIXA = "https://servicebus2.caixa.gov.br/portaldeloterias/api/";

function numbersFor(m: Modality, contest: number): string[] {
  const { size, max } = MOD[m];
  return Array.from({ length: size }, (_, i) => String(((contest * 7 + i * 3) % max) + 1)).map((s) => s.padStart(2, "0"));
}
function draw(m: Modality, contest: number) {
  const uniq = [...new Set(numbersFor(m, contest))];
  let n = 1;
  while (uniq.length < MOD[m].size) {
    const s = String(n++).padStart(2, "0");
    if (!uniq.includes(s)) uniq.push(s);
  }
  return { contest, drawDate: "2026-10-01", numbers: uniq.map(Number).sort((a, b) => a - b) };
}
function dataset(m: Modality, latest: number) {
  return { schemaVersion: 1, modality: m, source: `${CAIXA}${m}`, importedAt: "2026-10-01T00:00:00.000Z", latestContest: latest, draws: Array.from({ length: latest }, (_, i) => draw(m, i + 1)) };
}
function statusFor(lf: number, ms: number) {
  const e = (m: Modality, n: number) => ({ source: `${CAIXA}${m}`, latestContest: n, latestDrawDate: "2026-10-01", lastUpdatedAt: "2026-10-01T00:00:00.000Z", lastCheckedAt: "2026-10-01T00:00:00.000Z", status: "ok", gapCount: 0 });
  return { schemaVersion: 1, lotofacil: e("lotofacil", lf), megasena: e("megasena", ms) };
}

interface World {
  files: Record<string, unknown>;
  caixaLatest: Record<Modality, { numero: number; dataApuracao: string; dataProximoConcurso?: string }>;
  caixaStatus: number; // HTTP status of the "latest" endpoint (200 = ok)
  issues: Array<{ number: number; title: string; body: string; state: "open" | "closed"; created_at: string; comments: Array<{ body: string; created_at: string }> }>;
  patchRef: Array<"ok" | "race" | number>; // scripted outcomes of the ref update; empty = "ok"
  onRefPatch?: (attempt: number) => void; // lets a test simulate the OTHER writer's commit landing
  calls: { method: string; url: string; body?: unknown }[];
  blobs: Record<string, string>;
  commits: { message: string; files: Record<string, string> }[];
  refPatchAttempts: number;
  rawUrls: string[];
}

function newWorld(): World {
  return {
    files: {
      "public/data/lotofacil/results.json": dataset("lotofacil", 5),
      "public/data/megasena/results.json": dataset("megasena", 5),
      "public/data/status.json": statusFor(5, 5),
    },
    caixaLatest: {
      lotofacil: { numero: 5, dataApuracao: "18/10/2026", dataProximoConcurso: "19/10/2026" },
      megasena: { numero: 5, dataApuracao: "18/10/2026", dataProximoConcurso: "20/10/2026" },
    },
    caixaStatus: 200,
    issues: [],
    patchRef: [],
    calls: [],
    blobs: {},
    commits: [],
    refPatchAttempts: 0,
    rawUrls: [],
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function installFetch(w: World) {
  let blobN = 0;
  let pendingTree: Record<string, string> = {};
  let pendingMessage = "";
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    w.calls.push({ method, url, body });

    if (url.startsWith(RAW)) {
      w.rawUrls.push(url);
      const p = url.slice(RAW.length).split("?")[0]!;
      return p in w.files ? json(w.files[p]) : new Response("nf", { status: 404 });
    }
    if (url.startsWith(CAIXA)) {
      const rest = url.slice(CAIXA.length);
      const [m, c] = rest.split("/") as [Modality, string | undefined];
      if (!c) return w.caixaStatus === 200 ? json({ ...w.caixaLatest[m], dataApuracao: w.caixaLatest[m].dataApuracao }) : new Response("blocked", { status: w.caixaStatus });
      const n = Number(c);
      const d = draw(m, n);
      return json({ numero: n, dataApuracao: "19/10/2026", listaDezenas: d.numbers.map((x) => String(x).padStart(2, "0")) });
    }
    if (url.startsWith(API)) {
      const p = url.slice(API.length);
      if (method === "GET" && p.startsWith("/git/ref/heads/main")) return json({ object: { sha: "head-1" } });
      if (method === "GET" && p.startsWith("/git/commits/")) return json({ tree: { sha: "tree-1" } });
      if (method === "POST" && p === "/git/blobs") {
        const id = `blob-${++blobN}`;
        const b = body as { content: string; encoding: string };
        w.blobs[id] = b.encoding === "base64" ? Buffer.from(b.content, "base64").toString("utf8") : b.content;
        return json({ sha: id }, 201);
      }
      if (method === "POST" && p === "/git/trees") {
        pendingTree = {};
        for (const it of (body as { tree: { path: string; sha: string }[] }).tree) pendingTree[it.path] = w.blobs[it.sha]!;
        return json({ sha: "tree-2" }, 201);
      }
      if (method === "POST" && p === "/git/commits") {
        pendingMessage = (body as { message: string }).message;
        return json({ sha: "commit-2" }, 201);
      }
      if (method === "PATCH" && p.startsWith("/git/refs/heads/main")) {
        w.refPatchAttempts++;
        w.onRefPatch?.(w.refPatchAttempts);
        const outcome = w.patchRef.shift() ?? "ok";
        if (outcome === "race") return json({ message: "Update is not a fast forward" }, 422);
        if (typeof outcome === "number") return json({ message: "boom" }, outcome);
        w.commits.push({ message: pendingMessage, files: pendingTree });
        for (const [fp, content] of Object.entries(pendingTree)) w.files[fp] = JSON.parse(content);
        return json({ ref: "refs/heads/main" });
      }
      if (p.startsWith("/labels/")) return json({ name: "data-update-failure" });
      if (method === "GET" && p.startsWith("/issues?")) return json(w.issues.filter((i) => i.state === "open").map((i) => ({ number: i.number, body: i.body, created_at: i.created_at, title: i.title })));
      if (method === "POST" && p === "/issues") {
        const b = body as { title: string; body: string };
        w.issues.push({ number: w.issues.length + 1, title: b.title, body: b.body, state: "open", created_at: new Date().toISOString(), comments: [] });
        return json({ number: w.issues.length }, 201);
      }
      const cm = /^\/issues\/(\d+)\/comments/.exec(p);
      if (cm) {
        const issue = w.issues.find((i) => i.number === Number(cm[1]))!;
        if (method === "GET") return json(issue.comments);
        issue.comments.push({ body: (body as { body: string }).body, created_at: new Date().toISOString() });
        return json({}, 201);
      }
      const im = /^\/issues\/(\d+)$/.exec(p);
      if (im && method === "PATCH") {
        w.issues.find((i) => i.number === Number(im[1]))!.state = (body as { state: "closed" }).state;
        return json({});
      }
    }
    throw new Error(`unexpected request: ${method} ${url}`);
  });
}

async function run(cron: string): Promise<void> {
  const pending: Promise<unknown>[] = [];
  await worker.scheduled({ cron }, { GITHUB_TOKEN: "test-token" }, { waitUntil: (p) => void pending.push(p) });
  const all = Promise.all(pending);
  let done = false;
  void all.finally(() => (done = true));
  for (let i = 0; i < 400 && !done; i++) await vi.advanceTimersByTimeAsync(2000);
  await all;
}

const INTERMEDIATE = "0 2 * * 1-6";
const FINAL = "15 10 * * 1-6";
const openIssues = (w: World) => w.issues.filter((i) => i.state === "open");

describe("worker — behaviour against a simulated CAIXA, GitHub and clock", () => {
  let w: World;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date("2026-10-19T12:00:00.000Z")); // before every overdue deadline in the default world
    w = newWorld();
    installFetch(w);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    if (!worker) worker = (await import(/* @vite-ignore */ pathToFileURL(path.join(WORKER_DIR, "worker.js")).href)).default;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("up to date on an intermediate cron: no commit, no issue, reads are cache-busted", async () => {
    await run(INTERMEDIATE);
    expect(w.commits).toHaveLength(0);
    expect(w.issues).toHaveLength(0);
    expect(w.rawUrls.length).toBeGreaterThanOrEqual(3);
    for (const u of w.rawUrls) expect(u).toMatch(/\?cb=\d+$/);
  });

  it("up to date on a final-fallback cron: persists lastCheckedAt in a status-only commit", async () => {
    await run(FINAL);
    expect(w.commits).toHaveLength(1);
    expect(Object.keys(w.commits[0]!.files)).toEqual(["public/data/status.json"]);
    expect(w.commits[0]!.message).toMatch(/^chore\(data\): update status\.json\n\nTriggered by cron:15 10 \* \* 1-6$/);
  });

  it("a new contest is committed with the right content and message (no [skip ci]), and closes an open incident", async () => {
    w.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "20/10/2026" };
    w.issues.push({ number: 1, title: "old", body: "failure", state: "open", created_at: "2026-10-19T00:00:00.000Z", comments: [] });
    await run(INTERMEDIATE);
    expect(w.commits).toHaveLength(1);
    const c = w.commits[0]!;
    expect(c.message).toBe("chore(data): update lotofacil dataset\n\nTriggered by cron:0 2 * * 1-6");
    expect(c.message).not.toMatch(/skip ci/i);
    const ds = JSON.parse(c.files["public/data/lotofacil/results.json"]!);
    expect(ds.latestContest).toBe(6);
    expect(ds.draws).toHaveLength(6);
    expect(ds.draws.at(-1)).toEqual({ ...draw("lotofacil", 6), drawDate: "2026-10-19" }); // dataApuracao 19/10/2026 from the mocked payload
    expect(JSON.parse(c.files["public/data/status.json"]!).lotofacil.latestContest).toBe(6);
    expect(w.issues[0]!.state).toBe("closed"); // recovery closes the shared issue
  });

  it("requests only the latest endpoint and the missing contest, never contest n+1", async () => {
    w.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "20/10/2026" };
    await run(INTERMEDIATE);
    const caixa = w.calls.filter((c) => c.url.startsWith(CAIXA)).map((c) => c.url.slice(CAIXA.length));
    expect(caixa.sort()).toEqual(["lotofacil/", "lotofacil/6", "megasena/"]);
  });

  describe("ref race with another writer (e.g. the Actions updater)", () => {
    it("a 422 'not a fast forward' is NOT an incident: one PATCH (not retried), no issue, and the re-check finds the other writer's data already there", async () => {
      w.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "20/10/2026" };
      w.patchRef = ["race"];
      // The other writer's commit lands right when our ref update is rejected: the repo now already has contest 6.
      w.onRefPatch = (attempt) => {
        if (attempt === 1) {
          w.files["public/data/lotofacil/results.json"] = dataset("lotofacil", 6);
          w.files["public/data/status.json"] = statusFor(6, 5);
        }
      };
      await run(INTERMEDIATE);
      expect(w.refPatchAttempts).toBe(1); // the 422 was not retried 4 times
      expect(w.commits).toHaveLength(0); // nothing redundant committed
      expect(w.issues).toHaveLength(0); // and no false incident
    });

    it("if main moves again on the retry, it is reported once with a clear message", async () => {
      w.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "20/10/2026" };
      w.patchRef = ["race", "race"];
      await run(INTERMEDIATE);
      expect(w.commits).toHaveLength(0);
      expect(openIssues(w)).toHaveLength(1);
      expect(w.issues[0]!.body).toMatch(/main moved twice/);
    });
  });

  it("a non-race commit error (500) is retried and then raised as an incident; a 401 is not retried", async () => {
    w.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "20/10/2026" };
    w.patchRef = [500, 500, 500, 500];
    await run(INTERMEDIATE);
    expect(w.refPatchAttempts).toBe(4);
    expect(openIssues(w)).toHaveLength(1);
    expect(w.issues[0]!.body).toMatch(/\[commit\] failed to write changes to GitHub/);

    const w2 = newWorld();
    w2.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "20/10/2026" };
    w2.patchRef = [401];
    installFetch(w2);
    await run(INTERMEDIATE);
    expect(w2.refPatchAttempts).toBe(1); // deterministic 4xx: no pointless retries
  });

  it("CAIXA answering 403 to the Worker too: no write, status untouched, one failure issue", async () => {
    w.caixaStatus = 403;
    await run(FINAL);
    expect(w.commits).toHaveLength(0);
    expect(openIssues(w)).toHaveLength(1);
    expect(w.issues[0]!.title).toMatch(/^\[DATA\] Dataset update failed/);
    expect(w.issues[0]!.body).toMatch(/\[lotofacil\] source check failed/);
    expect(w.issues[0]!.body).toMatch(/\[megasena\] source check failed/);
    expect((w.files["public/data/status.json"] as { lotofacil: { lastCheckedAt: string } }).lotofacil.lastCheckedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  describe("overdue draw", () => {
    const overdueNow = "2026-10-20T20:00:00.000Z"; // Lotofácil: next draw 19/10 -> deadline 2026-10-20 17:00Z (passed); Mega: 20/10 -> 2026-10-21 17:00Z (not yet)

    it("opens one overdue issue (shared label, marker, cause stated as uncertain) and does not fail the run", async () => {
      vi.setSystemTime(new Date(overdueNow));
      await run(INTERMEDIATE);
      expect(w.commits).toHaveLength(0);
      expect(openIssues(w)).toHaveLength(1);
      const body = w.issues[0]!.body;
      expect(w.issues[0]!.title).toBe("[Data] Resultado oficial possivelmente ainda não publicado");
      expect(body).toContain("<!-- data-update-overdue -->");
      expect(body).toContain("**Lotofácil**");
      expect(body).not.toContain("**Mega-Sena**");
      expect(body).toMatch(/calendário oficial/);
      expect(body).toMatch(/não afirma que houve falha da CAIXA/);
    });

    it("at most one notice per 12 h; the overdue run never closes the issue it raised", async () => {
      vi.setSystemTime(new Date(overdueNow));
      await run(INTERMEDIATE);
      vi.setSystemTime(new Date("2026-10-21T02:00:00.000Z")); // +6 h
      await run(INTERMEDIATE);
      expect(openIssues(w)).toHaveLength(1);
      expect(w.issues[0]!.comments).toHaveLength(0); // suppressed (<12 h)
      vi.setSystemTime(new Date("2026-10-21T10:30:00.000Z")); // +14.5 h
      await run(INTERMEDIATE);
      expect(w.issues[0]!.comments).toHaveLength(1);
      expect(w.issues[0]!.state).toBe("open");
    });

    it("closes the issue once the data catches up", async () => {
      vi.setSystemTime(new Date(overdueNow));
      await run(INTERMEDIATE);
      expect(openIssues(w)).toHaveLength(1);
      w.caixaLatest.lotofacil = { numero: 6, dataApuracao: "19/10/2026", dataProximoConcurso: "21/10/2026" };
      await run(INTERMEDIATE);
      expect(w.commits).toHaveLength(1);
      expect(openIssues(w)).toHaveLength(0);
    });

    it("a missing or malformed next-draw date never alerts and never breaks the run", async () => {
      vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
      delete w.caixaLatest.lotofacil.dataProximoConcurso;
      w.caixaLatest.megasena.dataProximoConcurso = "garbage";
      await run(INTERMEDIATE);
      expect(w.issues).toHaveLength(0);
    });
  });

  it("the manual /trigger endpoint requires the bearer token", async () => {
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p) };
    const denied = await worker.fetch(new Request("https://x.workers.dev/trigger"), { GITHUB_TOKEN: "test-token" }, ctx);
    expect(denied.status).toBe(401);
    expect(pending).toHaveLength(0);
    const ok = await worker.fetch(new Request("https://x.workers.dev/trigger", { headers: { Authorization: "Bearer test-token" } }), { GITHUB_TOKEN: "test-token" }, ctx);
    expect(ok.status).toBe(200);
    expect(pending).toHaveLength(1);
    const all = Promise.all(pending);
    let done = false;
    void all.finally(() => (done = true));
    for (let i = 0; i < 400 && !done; i++) await vi.advanceTimersByTimeAsync(2000);
    await all;
  });
});
