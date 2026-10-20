import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const overdueAlert = require("../../scripts/data/overdue-alert.cjs");
const { MARKER, MIN_INTERVAL_MS, LABEL, buildBody, formatBrt } = overdueAlert;

/**
 * The overdue-draw alert (scripts/data/overdue-alert.cjs, called by the workflow through actions/github-script):
 * opens or comments on the shared `data-update-failure` issue, at most once per 12 h, with text that states a
 * likely cause and never asserts a CAIXA fault.
 */

const context = { repo: { owner: "o", repo: "r" }, serverUrl: "https://github.com", runId: 123 };
const entries = [
  { modality: "lotofacil", storedLatest: 3806, officialLatest: 3806, nextDrawDateBr: "18/10/2026", deadlineIso: "2026-10-19T17:00:00.000Z", nowIso: "2026-10-19T19:00:00.000Z" },
];
const NOW = new Date("2026-10-19T19:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function makeGithub(opts: { openIssues?: Array<{ number: number; body?: string; created_at?: string }>; comments?: Array<{ body: string; created_at: string }>; labelExists?: boolean; createLabelStatus?: number } = {}) {
  const calls = {
    getLabel: vi.fn(async () => {
      if (opts.labelExists === false) throw Object.assign(new Error("nf"), { status: 404 });
      return {};
    }),
    createLabel: vi.fn(async () => {
      if (opts.createLabelStatus) throw Object.assign(new Error("exists"), { status: opts.createLabelStatus });
      return {};
    }),
    listForRepo: vi.fn(async () => ({ data: opts.openIssues ?? [] })),
    listComments: vi.fn(async () => ({ data: opts.comments ?? [] })),
    createComment: vi.fn(async () => ({})),
    create: vi.fn(async () => ({})),
  };
  return { calls, github: { rest: { issues: calls } } };
}

describe("overdue alert — what it posts", () => {
  it("creates the issue (with the shared label and the marker) when none is open", async () => {
    const { github, calls } = makeGithub();
    const result = await overdueAlert({ github, context, entries, now: NOW });
    expect(result).toEqual({ action: "created" });
    const arg = (calls.create.mock.calls[0] as unknown as [{ title: string; body: string; labels: string[] }])[0];
    expect(arg.labels).toEqual([LABEL]);
    expect(arg.title).toMatch(/possivelmente ainda não publicado/);
    expect(arg.body).toContain(MARKER);
    expect(calls.createComment).not.toHaveBeenCalled();
  });

  it("comments on an already-open failure issue that has no overdue notice yet", async () => {
    const { github, calls } = makeGithub({ openIssues: [{ number: 7, body: "A execução falhou.", created_at: hoursAgo(1) }], comments: [{ body: "outro comentário", created_at: hoursAgo(1) }] });
    expect(await overdueAlert({ github, context, entries, now: NOW })).toEqual({ action: "commented" });
    expect(calls.createComment).toHaveBeenCalledOnce();
    expect(calls.create).not.toHaveBeenCalled();
  });

  it("does not comment again within 12 h of the last overdue notice (comment)", async () => {
    const { github, calls } = makeGithub({ openIssues: [{ number: 7, body: "x", created_at: hoursAgo(40) }], comments: [{ body: `${MARKER} aviso`, created_at: hoursAgo(11.9) }] });
    expect(await overdueAlert({ github, context, entries, now: NOW })).toEqual({ action: "skipped-recent" });
    expect(calls.createComment).not.toHaveBeenCalled();
  });

  it("comments again once the last notice is older than 12 h", async () => {
    const { github, calls } = makeGithub({ openIssues: [{ number: 7, body: "x", created_at: hoursAgo(40) }], comments: [{ body: `${MARKER} aviso`, created_at: hoursAgo(12.1) }] });
    expect(await overdueAlert({ github, context, entries, now: NOW })).toEqual({ action: "commented" });
    expect(calls.createComment).toHaveBeenCalledOnce();
  });

  it("an issue this alert itself created less than 12 h ago also suppresses a duplicate (notice in the body, no comments)", async () => {
    const { github, calls } = makeGithub({ openIssues: [{ number: 9, body: `${MARKER} corpo`, created_at: hoursAgo(3) }] });
    expect(await overdueAlert({ github, context, entries, now: NOW })).toEqual({ action: "skipped-recent" });
    expect(calls.createComment).not.toHaveBeenCalled();
  });

  it("uses the LATEST notice among several comments (and paginates when the client supports it)", async () => {
    const { github, calls } = makeGithub({ openIssues: [{ number: 7, body: "x", created_at: hoursAgo(80) }] });
    const paginate = vi.fn(async () => [
      { body: `${MARKER} velho`, created_at: hoursAgo(60) },
      { body: `${MARKER} recente`, created_at: hoursAgo(2) },
    ]);
    expect(await overdueAlert({ github: { ...github, paginate }, context, entries, now: NOW })).toEqual({ action: "skipped-recent" });
    expect(paginate).toHaveBeenCalledOnce();
    expect(calls.createComment).not.toHaveBeenCalled();
  });

  it("does nothing, and calls nothing, with no entries", async () => {
    const { github, calls } = makeGithub();
    expect(await overdueAlert({ github, context, entries: [], now: NOW })).toEqual({ action: "none" });
    expect(calls.listForRepo).not.toHaveBeenCalled();
    expect(calls.create).not.toHaveBeenCalled();
  });

  it("creates the shared label when it does not exist, and tolerates a concurrent creation (422)", async () => {
    const first = makeGithub({ labelExists: false });
    await overdueAlert({ github: first.github, context, entries, now: NOW });
    expect(first.calls.createLabel).toHaveBeenCalledOnce();

    const raced = makeGithub({ labelExists: false, createLabelStatus: 422 });
    await expect(overdueAlert({ github: raced.github, context, entries, now: NOW })).resolves.toEqual({ action: "created" });

    const existing = makeGithub({ labelExists: true });
    await overdueAlert({ github: existing.github, context, entries, now: NOW });
    expect(existing.calls.createLabel).not.toHaveBeenCalled();
  });

  it("the interval constant is exactly 12 hours", () => {
    expect(MIN_INTERVAL_MS).toBe(12 * 60 * 60 * 1000);
  });
});

describe("overdue alert — wording", () => {
  const body: string = buildBody({ entries, runUrl: "https://github.com/o/r/actions/runs/123", nowIso: NOW.toISOString() });

  it("states a likely cause, mentions the calendar may have moved the draw, and asserts no CAIXA fault", () => {
    expect(body).toContain(MARKER);
    expect(body).toMatch(/ainda não ter sido publicado|ainda não foi publicado/);
    expect(body).toMatch(/problema no atualizador ou na fonte/);
    expect(body).toMatch(/calendário oficial/);
    expect(body).toMatch(/feriado ou mudança de agenda/);
    expect(body).toMatch(/não afirma que houve falha da CAIXA/);
    expect(body).not.toMatch(/CAIXA (falhou|está fora|quebrou|errou)/i);
  });

  it("lists the modality, contests, next-draw date, margin (in BRT) and run link", () => {
    expect(body).toContain("**Lotofácil**");
    expect(body).toContain("3806");
    expect(body).toContain("18/10/2026");
    expect(body).toContain("19/10/2026 14:00 (BRT)");
    expect(body).toContain("https://github.com/o/r/actions/runs/123");
    expect(body).toMatch(/fecha sozinha quando os dados forem atualizados/);
  });

  it("formats the deadline in BRT (UTC-3)", () => {
    expect(formatBrt("2026-10-19T17:00:00.000Z")).toBe("19/10/2026 14:00");
    expect(formatBrt("2027-01-01T02:30:00.000Z")).toBe("31/12/2026 23:30");
  });
});
