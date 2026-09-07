// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzeOverlap, intersectionSize } from "../../src/modules/megasena/domain";

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/reference_portfolios.json"), "utf8"));

test("intersection size is exact", () => {
  assert.equal(intersectionSize([1, 2, 3, 4, 5, 6], [1, 2, 7, 8, 9, 10]), 2);
  assert.equal(intersectionSize([1, 2, 3, 4, 5, 6], [7, 8, 9, 10, 11, 12]), 0);
});

test("disjoint portfolio satisfies F4 and F5 non-overlap sufficient conditions", () => {
  const report = analyzeOverlap(fixtures.disjoint);
  assert.equal(report.max, 0);
  assert.equal(report.allPairsAtMost1, true);
  assert.equal(report.allPairsAtMost3, true);
  assert.equal(report.f4RegionsPairwiseDisjoint, true);
  assert.equal(report.f5RegionsPairwiseDisjoint, true);
  assert.equal(report.histogram["0"], 21);
});

test("concentrated portfolio exposes high pairwise overlap", () => {
  const report = analyzeOverlap(fixtures.concentrated);
  assert.equal(report.min, 5);
  assert.equal(report.max, 5);
  assert.equal(report.allPairsAtMost3, false);
  assert.equal(report.histogram["5"], 21);
});
