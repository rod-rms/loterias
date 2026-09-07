// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AT_LEAST_HIT_COUNTS,
  EXACT_HIT_COUNTS,
  TOTAL_POSSIBLE_DRAWS,
  comb,
  countAtLeastHits,
  countExactHits,
  uniformDistinctPortfolioAverageProbability,
  verifyCanonicalConstants,
} from "../../src/modules/megasena/domain";
import { numbersToMask } from "../../src/modules/megasena/domain/coverage";

const oracle = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/megasena/fixtures/resultados_verificados_v0_1.json"), "utf8"));

const close = (actual: number, expected: number, tolerance = 1e-15) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("canonical combinatorial constants are exact", () => {
  assert.equal(comb(60, 6), 50_063_860n);
  assert.equal(TOTAL_POSSIBLE_DRAWS, oracle.total_possible_draws);
  assert.equal(countExactHits(4), 21_465);
  assert.equal(countExactHits(5), 324);
  assert.equal(countExactHits(6), 1);
  assert.equal(countAtLeastHits(4), 21_790);
  assert.equal(countAtLeastHits(5), 325);
  assert.equal(countAtLeastHits(6), 1);
  assert.deepEqual(EXACT_HIT_COUNTS, { 4: 21465, 5: 324, 6: 1 });
  assert.deepEqual(AT_LEAST_HIT_COUNTS, { 4: 21790, 5: 325, 6: 1 });
  assert.equal(verifyCanonicalConstants(), true);
});

test("uniform distinct N=7 baseline reproduces v0.1 oracle", () => {
  close(uniformDistinctPortfolioAverageProbability(7, 4).percent, Number(oracle.uniform_distinct_portfolio_average.at_least_4_percent), 2e-15);
  close(uniformDistinctPortfolioAverageProbability(7, 5).percent, Number(oracle.uniform_distinct_portfolio_average.at_least_5_percent), 2e-15);
  close(uniformDistinctPortfolioAverageProbability(7, 6).percent, Number(oracle.uniform_distinct_portfolio_average.at_least_6_percent), 2e-15);
});

test("60-bit mask keeps high numbers distinct and collision-free", () => {
  const low = numbersToMask([1]);
  const thirtyTwo = numbersToMask([32]);
  const thirtyThree = numbersToMask([33]);
  const sixty = numbersToMask([60]);
  assert.notEqual(low, thirtyTwo);
  assert.notEqual(thirtyTwo, thirtyThree);
  assert.notEqual(thirtyThree, sixty);
  assert.equal((sixty & (1n << 59n)) !== 0n, true);
  assert.equal((thirtyThree & (1n << 32n)) !== 0n, true);
});
