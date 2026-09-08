import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard for the post-draw verification schedule in
 * .github/workflows/data-update.yml. The six cron windows must stay scoped
 * to the days the corresponding draws actually happen (Tue-Sat UTC for the
 * Mon-Fri BRT evening draws; Sunday UTC for the Sunday-morning draws) —
 * they used to run every day, which was harmless but wasteful. This test
 * has no YAML dependency; it checks the raw workflow text directly, the
 * same way scripts/data/validate-dataset.mjs avoids extra dependencies.
 */

const WORKFLOW_PATH = path.join(process.cwd(), ".github/workflows/data-update.yml");

function readWorkflow(): string {
  return readFileSync(WORKFLOW_PATH, "utf8");
}

const EVENING_FOLLOWUP_CRONS = ["45 1 * * 2-6", "30 3 * * 2-6", "0 10 * * 2-6"];
const SUNDAY_FOLLOWUP_CRONS = ["0 16 * * 0", "30 18 * * 0", "0 23 * * 0"];
const FINAL_FALLBACK_CRONS = ["0 10 * * 2-6", "0 23 * * 0"];

describe("data-update workflow — post-draw schedule scope", () => {
  it("scopes the evening follow-up sequence to Tue-Sat UTC (the day after a Mon-Fri BRT draw)", () => {
    const workflow = readWorkflow();
    for (const cron of EVENING_FOLLOWUP_CRONS) {
      expect(workflow).toContain(`cron: "${cron}"`);
    }
  });

  it("scopes the Sunday-morning follow-up sequence to Sunday UTC only", () => {
    const workflow = readWorkflow();
    for (const cron of SUNDAY_FOLLOWUP_CRONS) {
      expect(workflow).toContain(`cron: "${cron}"`);
    }
  });

  it("never reverts to an unrestricted every-day schedule for these six windows", () => {
    const workflow = readWorkflow();
    const scheduleSection = workflow.slice(workflow.indexOf("schedule:"), workflow.indexOf("workflow_dispatch:"));
    const cronLines = [...scheduleSection.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(cronLines).toHaveLength(6);
    for (const cron of cronLines) {
      // Day-of-field (5th token) must be a restricted set, never "*".
      const dayOfWeek = cron.trim().split(/\s+/)[4];
      expect(dayOfWeek).not.toBe("*");
    }
  });

  it("ALLOW_CHECKED_ONLY_STATUS_WRITE matches workflow_dispatch and exactly the two final fallback crons", () => {
    const workflow = readWorkflow();
    const match = workflow.match(/ALLOW_CHECKED_ONLY_STATUS_WRITE:\s*\$\{\{([^}]+)\}\}/);
    expect(match).not.toBeNull();
    const expr = match![1];
    expect(expr).toContain("github.event_name == 'workflow_dispatch'");
    for (const cron of FINAL_FALLBACK_CRONS) {
      expect(expr).toContain(`github.event.schedule == '${cron}'`);
    }
  });
});
