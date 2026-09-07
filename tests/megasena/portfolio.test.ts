// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildUniformAverageBaselineComparison,
  evaluateMegaSenaPortfolio,
  expectedWinningTickets,
  senaProbability,
} from "../../src/modules/megasena/domain";

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/reference_portfolios.json"), "utf8"));

const close = (actual: number, expected: number, tolerance = 1e-14) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("portfolio evaluation reproduces disjoint no-prize probability and configurable cost", () => {
  const result = evaluateMegaSenaPortfolio(fixtures.disjoint, { ticketCostBRL: 6 });
  assert.equal(result.costBRL, 42);
  assert.equal(result.totalDistinctTickets, 7);
  close(result.probability.noPrize.percent, 99.69532912564073, 1e-12);
  assert.equal(result.audit.evaluationMethod, "exact");
});

test("expected exact-hit ticket counts depend only on N", () => {
  const expected = expectedWinningTickets(7);
  close(expected.quadra, 7 * 21465 / 50063860);
  close(expected.quina, 7 * 324 / 50063860);
  close(expected.sena, 7 / 50063860);
  close(senaProbability(7).probability, 7 / 50063860);
});

test("uniform baseline comparison reports required N=7 differences", () => {
  const result = evaluateMegaSenaPortfolio(fixtures.disjoint, { ticketCostBRL: 6 });
  const baseline = buildUniformAverageBaselineComparison(result);
  close(baseline.atLeast4.baseline.percent, 0.30427336241613708617, 2e-15);
  close(baseline.atLeast4.absolutePercentagePointDifference, 0.0003975119431313, 5e-16);
  close(baseline.atLeast4.relativeDifferencePercent, 0.130643030982, 1e-10);
});
