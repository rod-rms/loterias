import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Deterministic contract checks for the operational-alerting behavior of
 * .github/workflows/data-update.yml, and for the architectural decision
 * that normal PR/main CI never depends on the live CAIXA source. These are
 * plain text/config assertions on the YAML — no YAML parser needed, and no
 * live GitHub Actions run required to verify the contract stays intact.
 */

const DATA_UPDATE_WORKFLOW_PATH = path.join(process.cwd(), ".github/workflows/data-update.yml");
const CI_WORKFLOW_PATH = path.join(process.cwd(), ".github/workflows/ci.yml");

function readWorkflow(p: string): string {
  return readFileSync(p, "utf8");
}

describe("data-update.yml — updater failure alerting (GitHub-native, no paid service)", () => {
  const workflow = readWorkflow(DATA_UPDATE_WORKFLOW_PATH);

  it("grants the issues:write permission required to create/comment/close issues", () => {
    expect(workflow).toMatch(/permissions:[\s\S]*?issues:\s*write/);
  });

  it("has a failure-alert step gated on if: failure()", () => {
    expect(workflow).toMatch(/Alert on updater failure[\s\S]*?if:\s*failure\(\)/);
  });

  it("has a recovery step gated on if: success() that closes the incident", () => {
    expect(workflow).toMatch(/Close updater incident on recovery[\s\S]*?if:\s*success\(\)/);
    expect(workflow).toContain('state: "closed"');
  });

  it("uses a stable label to prevent duplicate incident issues across runs", () => {
    const labelMatches = workflow.match(/data-update-failure/g) ?? [];
    // Referenced by both the alert step (create/find) and the recovery step (find/close).
    expect(labelMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("never creates a new issue without first checking for an existing open one", () => {
    const alertSection = workflow.slice(workflow.indexOf("Alert on updater failure"), workflow.indexOf("Close updater incident on recovery"));
    expect(alertSection).toContain("listForRepo");
    expect(alertSection).toContain("issues.create(");
    // The create call must be reachable only through a branch that already checked openIncidents.
    expect(alertSection.indexOf("listForRepo")).toBeLessThan(alertSection.indexOf("issues.create("));
  });

  it("does not introduce a live CAIXA dependency via a new secret", () => {
    expect(workflow).not.toMatch(/secrets\.[A-Z0-9_]*(SLACK|DISCORD|WEBHOOK|PAGERDUTY)/i);
  });
});

describe("ci.yml — normal PR/main CI never depends on the live CAIXA source", () => {
  const ci = readWorkflow(CI_WORKFLOW_PATH);

  it("never invokes the live dataset updater", () => {
    expect(ci).not.toMatch(/run:\s*npm run data:update/);
    expect(ci).not.toMatch(/update-dataset\.mjs/);
  });

  it("documents the architectural decision to keep CI deterministic and independent of live CAIXA availability", () => {
    expect(ci.toLowerCase()).toContain("deterministic");
    expect(ci).toContain("data-update.yml");
  });
});
