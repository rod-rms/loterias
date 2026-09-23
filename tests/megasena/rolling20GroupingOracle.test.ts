// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { computeRolling20Groups, deriveRolling20Window, Rolling20GroupingError, ROLLING20_WINDOW_SIZE } from "../../src/modules/megasena/domain/rolling20Grouping";

/**
 * MEGA-ROLL-001 — validation spike for the Rolling 20 Balanceada v2.1
 * GROUPING STEP ONLY (spec §2–§3). This does NOT implement the strategy: no
 * allocation (§4), no filters (§5), no optimizer (§6), no Strategy Registry
 * wiring, no UI. It proves the algorithm reproduces the audited reference
 * fixture before any full-implementation task is authorized (DEC-017-style
 * reproducible-experiment discipline, applied here to MEGA-ROLL-001).
 *
 * Additive to the Mega-Sena node:test oracle suite run by
 * `npm run test:mega:oracle` — does not modify any of the existing 24
 * assertions in combinatorics/coverage/overlap/portfolio/validation/optimizer/
 * invariants.test.ts.
 */
const fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/rolling20_3056_grouping_oracle.json"), "utf8"));

const fullDataset = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/megasena/results.json"), "utf8"));

// Physically truncated at the fixture's base contest — this dataset has no
// way to contain the target contest (3056) or anything after it.
const truncatedDraws = fullDataset.draws.filter((d) => d.contest <= fixture.datasetTruncatedAtContest);

const sorted = (numbers) => [...numbers].sort((a, b) => a - b);

test("the real dataset actually contains the base 1..3055 needed to reproduce this fixture", () => {
  assert.ok(truncatedDraws.find((d) => d.contest === fixture.datasetTruncatedAtContest));
  // Sanity: the un-truncated dataset must have advanced past the fixture's
  // base contest, otherwise this test would pass trivially without
  // exercising truncation at all.
  assert.ok(fullDataset.latestContest > fixture.datasetTruncatedAtContest);
});

test("no-look-ahead: the physically truncated dataset cannot contain contest 3056 or later", () => {
  for (const draw of truncatedDraws) assert.ok(draw.contest < fixture.targetContest);
});

test("the reference window for target 3056 is exactly 3036..3055 (20 contests immediately before the target)", () => {
  const window = deriveRolling20Window(truncatedDraws, fixture.targetContest, ROLLING20_WINDOW_SIZE);
  assert.notEqual(window, null);
  const contests = sorted(window.map((d) => d.contest));
  assert.deepEqual(
    contests,
    Array.from({ length: 20 }, (_, i) => fixture.window.firstContest + i),
  );
  assert.equal(Math.min(...contests), fixture.window.firstContest);
  assert.equal(Math.max(...contests), fixture.window.lastContest);
  assert.equal(Math.max(...contests), fixture.targetContest - 1);
});

test("reproduces the exact audited G1/G2/G3 partition (set equality per group; sizes 20/10/30)", () => {
  const window = deriveRolling20Window(truncatedDraws, fixture.targetContest, ROLLING20_WINDOW_SIZE);
  const groups = computeRolling20Groups(window);

  assert.deepEqual(sorted(groups.g1), fixture.expected.g1);
  assert.deepEqual(sorted(groups.g2), fixture.expected.g2);
  assert.deepEqual(sorted(groups.g3), fixture.expected.g3);

  assert.equal(groups.g1.length, 20);
  assert.equal(groups.g2.length, 10);
  assert.equal(groups.g3.length, 30);
});

test("the three groups are disjoint and together cover the full 1..60 universe exactly once", () => {
  const window = deriveRolling20Window(truncatedDraws, fixture.targetContest, ROLLING20_WINDOW_SIZE);
  const groups = computeRolling20Groups(window);
  const all = [...groups.g1, ...groups.g2, ...groups.g3];
  assert.equal(new Set(all).size, 60);
  assert.deepEqual(
    sorted(all),
    Array.from({ length: 60 }, (_, i) => i + 1),
  );
});

test("mutating a draw at/after the target contest (3056+) does not change the computed groups", () => {
  const mutatedDraws = fullDataset.draws.map((d) => (d.contest >= fixture.targetContest ? { ...d, numbers: [1, 2, 3, 4, 5, 6] } : d));
  const window = deriveRolling20Window(mutatedDraws, fixture.targetContest, ROLLING20_WINDOW_SIZE);
  const groups = computeRolling20Groups(window);
  assert.deepEqual(sorted(groups.g1), fixture.expected.g1);
  assert.deepEqual(sorted(groups.g2), fixture.expected.g2);
  assert.deepEqual(sorted(groups.g3), fixture.expected.g3);
});

test("rejects a window that is not exactly 20 draws (ROLLING20_INCOMPLETE_HISTORY_WINDOW)", () => {
  const window = deriveRolling20Window(truncatedDraws, fixture.targetContest, ROLLING20_WINDOW_SIZE);
  assert.throws(() => computeRolling20Groups(window.slice(1)), Rolling20GroupingError);
});

test("deriveRolling20Window returns null when a contest inside the required window is missing", () => {
  const gappyDraws = truncatedDraws.filter((d) => d.contest !== fixture.window.firstContest + 5);
  const window = deriveRolling20Window(gappyDraws, fixture.targetContest, ROLLING20_WINDOW_SIZE);
  assert.equal(window, null);
});
