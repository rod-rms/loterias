// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  countPortfolioCoverageExact,
  evaluateF4,
  evaluateF5,
  evaluateF6,
} from "../../src/modules/megasena/domain";

const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/reference_portfolios.json"), "utf8"));
const oracle = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/resultados_verificados_v0_1.json"), "utf8"));

const close = (actual: number, expected: number, tolerance = 1e-15) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("concentrated seven-ticket portfolio reproduces v0.1 favourable counts", () => {
  assert.equal(countPortfolioCoverageExact(fixtures.concentrated, 4), oracle.portfolios.all_combinations_within_seven_numbers.at_least_4.favourable_draws);
  assert.equal(countPortfolioCoverageExact(fixtures.concentrated, 5), oracle.portfolios.all_combinations_within_seven_numbers.at_least_5.favourable_draws);
  assert.equal(countPortfolioCoverageExact(fixtures.concentrated, 6), oracle.portfolios.all_combinations_within_seven_numbers.at_least_6.favourable_draws);
  close(evaluateF4(fixtures.concentrated).percent, 0.098574101158001, 1e-15);
  close(evaluateF5(fixtures.concentrated).percent, 0.002237142721316335, 1e-15);
});

test("seven disjoint tickets reproduce v0.1 counts", () => {
  const f4 = evaluateF4(fixtures.disjoint);
  const f5 = evaluateF5(fixtures.disjoint);
  const f6 = evaluateF6(fixtures.disjoint);
  assert.equal(f4.status, "exact");
  assert.equal(f4.favourableDraws, oracle.portfolios.seven_pairwise_disjoint_tickets.at_least_4.favourable_draws);
  assert.equal(f5.favourableDraws, oracle.portfolios.seven_pairwise_disjoint_tickets.at_least_5.favourable_draws);
  assert.equal(f6.favourableDraws, oracle.portfolios.seven_pairwise_disjoint_tickets.at_least_6.favourable_draws);
  close(f4.percent, 0.3046708743592684, 1e-15);
  close(f5.percent, 0.004544196152673805, 1e-15);
  close(f6.percent, 0.000013982142008227091, 2e-18);
});
