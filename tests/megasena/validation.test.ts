// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeTicket,
  determineTargetTicketCount,
  ticketKey,
  validateGenerationInput,
  validateMegaSenaPortfolio,
  validateTicket,
} from "../../src/modules/megasena/domain";

test("ticket canonicalization ignores input order", () => {
  assert.deepEqual(canonicalizeTicket([60, 1, 18, 7, 42, 31]), [1, 7, 18, 31, 42, 60]);
  assert.equal(ticketKey([60, 1, 18, 7, 42, 31]), ticketKey([1, 7, 18, 31, 42, 60]));
});

test("invalid tickets do not pass silently", () => {
  assert.equal(validateTicket([1, 2, 3, 4, 5]).valid, false);
  assert.equal(validateTicket([1, 2, 3, 4, 5, 5]).valid, false);
  assert.equal(validateTicket([1, 2, 3, 4, 5, 61]).valid, false);
  assert.equal(validateTicket([1, 2, 3, 4, 5, 6.5]).valid, false);
});

test("portfolio rejects duplicate combinations even with different order", () => {
  const result = validateMegaSenaPortfolio([
    [1, 2, 3, 4, 5, 6],
    [6, 5, 4, 3, 2, 1],
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_ticket"));
});

test("generation validates budget and fixed/excluded conflicts", () => {
  assert.equal(determineTargetTicketCount({ budgetBRL: 42, ticketCostBRL: 6, objective: "quadra_or_better" }), 7);
  const result = validateGenerationInput({
    numberOfTickets: 7,
    budgetBRL: 42,
    ticketCostBRL: 6,
    objective: "quadra_or_better",
    fixedNumbers: [1, 2],
    excludedNumbers: [2, 60],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "fixed_excluded_conflict"));
});
