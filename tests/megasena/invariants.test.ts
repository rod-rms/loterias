// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateMegaSenaPortfolio,
  evaluateF4,
  evaluateF5,
  evaluateF6,
  senaProbability,
} from "../../src/modules/megasena/domain";

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/reference_portfolios.json"), "utf8"));
const close = (a: number, b: number, tolerance = 1e-15) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test("Sena invariance holds for same N regardless of overlap", () => {
  close(evaluateF6(fixtures.concentrated).probability, evaluateF6(fixtures.disjoint).probability);
  close(evaluateF6(fixtures.disjoint).probability, senaProbability(7).probability);
});

test("global bijection 1..60 preserves overlap and F4/F5/F6", () => {
  const relabeled = fixtures.disjoint.map((ticket) => ticket.map((n) => 61 - n).sort((a, b) => a - b));
  const original = evaluateMegaSenaPortfolio(fixtures.disjoint);
  const mapped = evaluateMegaSenaPortfolio(relabeled);
  assert.deepEqual(mapped.overlap.matrix, original.overlap.matrix);
  close(mapped.probability.atLeast4.probability, original.probability.atLeast4.probability);
  close(mapped.probability.atLeast5.probability, original.probability.atLeast5.probability);
  close(mapped.probability.sena.probability, original.probability.sena.probability);
});

test("ticket order and portfolio order do not alter metrics", () => {
  const reordered = [...fixtures.concentrated].reverse().map((ticket) => [...ticket].reverse());
  const a = evaluateMegaSenaPortfolio(fixtures.concentrated);
  const b = evaluateMegaSenaPortfolio(reordered);
  close(a.probability.atLeast4.probability, b.probability.atLeast4.probability);
  close(a.probability.atLeast5.probability, b.probability.atLeast5.probability);
  close(a.probability.sena.probability, b.probability.sena.probability);
});

test("probabilities remain ordered and bounded", () => {
  for (const portfolio of [fixtures.concentrated, fixtures.disjoint]) {
    const f4 = evaluateF4(portfolio).probability;
    const f5 = evaluateF5(portfolio).probability;
    const f6 = evaluateF6(portfolio).probability;
    assert.ok(f4 >= f5 && f5 >= f6);
    assert.ok(f6 >= 0 && f4 <= 1);
  }
});

test("F6 is strictly increasing with N distinct tickets", () => {
  for (let n = 1; n < 50; n += 1) {
    assert.ok(senaProbability(n + 1).probability > senaProbability(n).probability);
  }
});
