// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

describe(".github/workflows/ledger.yml", () => {
  const wf = read(".github/workflows/ledger.yml");

  it("has contents: write as its ONLY permission", () => {
    const perms = wf.slice(wf.indexOf("permissions:"), wf.indexOf("concurrency:"));
    expect(perms.trim().split("\n").map((l) => l.trim())).toEqual(["permissions:", "contents: write"]);
    expect(wf.match(/^permissions:/gm)).toHaveLength(1);
  });

  it("serializes writes to main with the SAME concurrency group as the data updater, never cancelling", () => {
    const group = (text: string) => /concurrency:\n\s+group: (\S+)\n\s+cancel-in-progress: false/.exec(text)?.[1];
    expect(group(wf)).toBe("main-data-writes");
    expect(group(read(".github/workflows/data-update.yml"))).toBe("main-data-writes");
  });

  it("has the LEDGER_ENABLED kill switch on the job", () => {
    expect(wf).toMatch(/jobs:\n\s+ledger:\n\s+if: \$\{\{ vars\.LEDGER_ENABLED != 'false' \}\}/);
  });

  it("triggers only by schedule and manual dispatch (no workflow_run until it is verified to fire)", () => {
    const on = wf.slice(wf.indexOf("\non:"), wf.indexOf("\npermissions:"));
    expect(on).toContain("schedule:");
    expect(on).toContain("workflow_dispatch");
    expect(on).not.toContain("workflow_run");
    expect([...on.matchAll(/cron: "([^"]+)"/g)].map((m) => m[1])).toEqual(["30 8,12,16,19 * * *", "15 22 * * *"]);
  });

  it("validates before committing, commits only public/data/ledger, with a plain (non-force) push", () => {
    expect(wf.indexOf("npm run ledger:run")).toBeLessThan(wf.indexOf("npm run ledger:validate"));
    expect(wf.indexOf("npm run ledger:validate")).toBeLessThan(wf.indexOf("git commit"));
    expect(wf).toContain("git add public/data/ledger");
    expect(wf).not.toMatch(/git add (\.|-A|--all)/);
    expect(wf).toContain('git commit -m "data: prospective ledger update"');
    expect(wf).not.toMatch(/--force|push -f|force-with-lease/);
  });
});

describe("ci.yml", () => {
  it("runs ledger:validate and fetches 2 commits so the append-only check has a baseline", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("npm run ledger:validate");
    expect(ci).toMatch(/fetch-depth: 2/);
  });
});
