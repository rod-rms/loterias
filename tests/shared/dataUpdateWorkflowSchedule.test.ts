import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for the post-draw verification schedule in
 * .github/workflows/data-update.yml. Every window must stay scoped to the days
 * where it is useful (never "every day"), and UTC Monday must stay covered: a
 * Sunday-night result is looked for on UTC Monday, and the repository history
 * (ROADMAP DATA-002) shows Sunday results were captured only on Tuesday while
 * Monday UTC had no run. The real Sunday publication time is unknown, so the
 * schedule makes no assumption about it. This test has no YAML dependency; it
 * checks the raw workflow text directly, the same way
 * scripts/data/validate-dataset.mjs avoids extra dependencies.
 */

const WORKFLOW_PATH = path.join(process.cwd(), ".github/workflows/data-update.yml");

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, "utf8");
}

function cronList(workflow: string): string[] {
  const scheduleSection = workflow.slice(workflow.indexOf("schedule:"), workflow.indexOf("workflow_dispatch:"));
  return [...scheduleSection.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]!);
}

const EVENING_FOLLOWUP_CRONS = ["45 1 * * 1-6", "30 3 * * 1-6", "0 10 * * 1-6"];
const MONDAY_EXTRA_CRONS = ["0 15 * * 1", "0 19 * * 1"];
const SUNDAY_FOLLOWUP_CRONS = ["0 16 * * 0", "30 18 * * 0", "0 23 * * 0"];
const FINAL_FALLBACK_CRONS = ["0 10 * * 1-6", "0 23 * * 0"];

describe("data-update workflow — post-draw schedule scope", () => {
  it("runs the evening follow-up sequence on Mon-Sat UTC (Monday UTC follows Sunday night)", () => {
    const workflow = readWorkflow();
    for (const cron of EVENING_FOLLOWUP_CRONS) {
      expect(workflow).toContain(`cron: "${cron}"`);
    }
  });

  it("adds two Monday-only follow-ups (12:00 and 16:00 BRT) for a Sunday result that appears during Monday daytime", () => {
    const workflow = readWorkflow();
    for (const cron of MONDAY_EXTRA_CRONS) {
      expect(workflow).toContain(`cron: "${cron}"`);
    }
  });

  it("keeps the Sunday follow-up sequence on Sunday UTC only", () => {
    const workflow = readWorkflow();
    for (const cron of SUNDAY_FOLLOWUP_CRONS) {
      expect(workflow).toContain(`cron: "${cron}"`);
    }
  });

  it("has exactly these eight windows and never reverts to an unrestricted every-day schedule", () => {
    const crons = cronList(readWorkflow());
    expect(crons.sort()).toEqual([...EVENING_FOLLOWUP_CRONS, ...MONDAY_EXTRA_CRONS, ...SUNDAY_FOLLOWUP_CRONS].sort());
    for (const cron of crons) {
      // Day-of-week field (5th token) must be a restricted set, never "*".
      expect(cron.trim().split(/\s+/)[4]).not.toBe("*");
    }
  });

  it("UTC Monday is covered (the gap that left Sunday results uncaptured until Tuesday)", () => {
    const covers = (dow: string, day: number) =>
      dow.split(",").some((part) => {
        const [from, to] = part.split("-").map(Number);
        return to === undefined ? from === day : day >= from! && day <= to;
      });
    const mondayCrons = cronList(readWorkflow()).filter((c) => covers(c.trim().split(/\s+/)[4]!, 1));
    expect(mondayCrons.length).toBeGreaterThanOrEqual(5); // 3 evening + 2 Monday-only
  });

  it("does not encode a Sunday-publication-time assumption in the header", () => {
    const workflow = readWorkflow();
    expect(workflow).not.toMatch(/Sunday from 11:00 BRT/);
    expect(workflow).not.toMatch(/Sunday-morning (draw|sequence)/i);
  });

  it("ALLOW_CHECKED_ONLY_STATUS_WRITE matches workflow_dispatch and exactly the two final fallback crons", () => {
    const workflow = readWorkflow();
    const match = workflow.match(/ALLOW_CHECKED_ONLY_STATUS_WRITE:\s*\$\{\{([^}]+)\}\}/);
    expect(match).not.toBeNull();
    const expr = match![1]!;
    expect(expr).toContain("github.event_name == 'workflow_dispatch'");
    for (const cron of FINAL_FALLBACK_CRONS) {
      expect(expr).toContain(`github.event.schedule == '${cron}'`);
    }
    expect([...expr.matchAll(/github\.event\.schedule == '([^']+)'/g)]).toHaveLength(FINAL_FALLBACK_CRONS.length);
  });
});

describe("data-update workflow — overdue-draw alerting wiring", () => {
  it("the update step has an id and the report path, and the overdue alert step reads that step's output", () => {
    const workflow = readWorkflow();
    expect(workflow).toMatch(/- name: Update datasets from the official CAIXA source\s+id: update/);
    expect(workflow).toContain("OVERDUE_REPORT_PATH: ${{ runner.temp }}/overdue-report.json");
    expect(workflow).toMatch(/- name: Alert on overdue draw\s+if: always\(\) && steps\.update\.outputs\.overdue == 'true'/);
    expect(workflow).toContain("scripts/data/overdue-alert.cjs");
  });

  it("the recovery step is skipped on a run that is itself overdue (so it cannot close the issue it just raised)", () => {
    const workflow = readWorkflow();
    expect(workflow).toMatch(/- name: Close updater incident on recovery\s+if: success\(\) && steps\.update\.outputs\.overdue != 'true'/);
  });
});
