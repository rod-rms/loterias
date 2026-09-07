// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  generateMegaSenaPortfolio,
  ticketKey,
  validateMegaSenaPortfolio,
} from "../../src/modules/megasena/domain";

const input = {
  numberOfTickets: 7,
  ticketCostBRL: 6,
  objective: "quina_or_better",
  popularityMode: "off",
  seed: 12345,
  maxIterations: 20,
  candidatePoolSize: 12,
};

test("seeded generation is reproducible", () => {
  const a = generateMegaSenaPortfolio(input);
  const b = generateMegaSenaPortfolio(input);
  assert.deepEqual(a.tickets, b.tickets);
  assert.equal(a.probability.atLeast5.favourableDraws, b.probability.atLeast5.favourableDraws);
  assert.equal(a.audit.seed, 12345);
});

test("generated portfolio has no duplicates and respects fixed/excluded restrictions", () => {
  const result = generateMegaSenaPortfolio({
    ...input,
    seed: "constraints",
    fixedNumbers: [1, 60],
    excludedNumbers: [2, 3, 4, 5],
  });
  assert.equal(validateMegaSenaPortfolio(result.tickets).valid, true);
  assert.equal(new Set(result.tickets.map(ticketKey)).size, result.tickets.length);
  for (const ticket of result.tickets) {
    assert.ok(ticket.includes(1));
    assert.ok(ticket.includes(60));
    assert.equal(ticket.some((n) => [2, 3, 4, 5].includes(n)), false);
  }
});

test("optimizer never scores below its same-restriction seeded control on primary objective", () => {
  const result = generateMegaSenaPortfolio({ ...input, seed: "baseline-check" });
  assert.equal(result.randomBaseline.kind, "uniform_distinct_average");
  assert.ok(result.randomBaseline.atLeast5.relativeDifferencePercent >= -1e-9);
});

test("experimental popularity remains explicitly uncalibrated", () => {
  const result = generateMegaSenaPortfolio({ ...input, seed: "pop", popularityMode: "experimental", maxIterations: 2 });
  assert.equal(result.popularity.status, "experimental_uncalibrated");
  assert.equal(result.popularity.score, null);
  assert.match(result.popularity.warning, /NAO CALIBRADO/);
});
