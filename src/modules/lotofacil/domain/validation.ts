import { comb } from "../../../shared/lib/combinatorics";
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER, LOTOFACIL_TICKET_SIZE } from "./constants";
import type { LotofacilPortfolio, LotofacilTicket, ValidationIssue, ValidationResult } from "./types";

export function canonicalizeTicket(ticket: readonly number[]): LotofacilTicket {
  return [...new Set(ticket)].sort((a, b) => a - b);
}

export function ticketKey(ticket: readonly number[]): string {
  return canonicalizeTicket(ticket).join(",");
}

export function validateTicket(ticket: readonly number[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const unique = new Set(ticket);
  if (unique.size !== ticket.length) {
    issues.push({ code: "DUPLICATE_NUMBERS", message: "Ticket contains duplicate numbers." });
  }
  if (ticket.length !== LOTOFACIL_TICKET_SIZE) {
    issues.push({ code: "WRONG_SIZE", message: `Ticket must contain exactly ${LOTOFACIL_TICKET_SIZE} numbers.` });
  }
  for (const n of ticket) {
    if (!Number.isInteger(n) || n < LOTOFACIL_MIN_NUMBER || n > LOTOFACIL_MAX_NUMBER) {
      issues.push({ code: "OUT_OF_RANGE", message: `Number ${n} is out of range 1..${LOTOFACIL_MAX_NUMBER}.` });
    }
  }
  return { valid: issues.length === 0, issues };
}

export function validatePortfolio(tickets: LotofacilPortfolio): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenKeys = new Set<string>();
  tickets.forEach((ticket, index) => {
    const result = validateTicket(ticket);
    for (const issue of result.issues) {
      issues.push({ ...issue, path: `tickets[${index}]` });
    }
    const key = ticketKey(ticket);
    if (seenKeys.has(key)) {
      issues.push({ code: "DUPLICATE_TICKET", message: "Portfolio contains duplicate tickets.", path: `tickets[${index}]` });
    }
    seenKeys.add(key);
  });
  return { valid: issues.length === 0, issues };
}

export function assertValidPortfolio(tickets: LotofacilPortfolio): LotofacilTicket[] {
  const canonical = tickets.map((t) => canonicalizeTicket(t));
  const result = validatePortfolio(canonical);
  if (!result.valid) {
    throw new Error(`Invalid Lotofacil portfolio: ${result.issues.map((i) => i.message).join("; ")}`);
  }
  return canonical;
}

export interface FixedExcludedValidationInput {
  fixedNumbers?: readonly number[];
  excludedNumbers?: readonly number[];
}

export function validateFixedExcluded(input: FixedExcludedValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fixed = input.fixedNumbers ?? [];
  const excluded = input.excludedNumbers ?? [];

  if (new Set(fixed).size !== fixed.length) issues.push({ code: "FIXED_DUPLICATE", message: "Fixed numbers must be unique." });
  if (new Set(excluded).size !== excluded.length) issues.push({ code: "EXCLUDED_DUPLICATE", message: "Excluded numbers must be unique." });

  for (const n of fixed) {
    if (n < LOTOFACIL_MIN_NUMBER || n > LOTOFACIL_MAX_NUMBER) issues.push({ code: "FIXED_OUT_OF_RANGE", message: `Fixed number ${n} out of range.` });
  }
  for (const n of excluded) {
    if (n < LOTOFACIL_MIN_NUMBER || n > LOTOFACIL_MAX_NUMBER) issues.push({ code: "EXCLUDED_OUT_OF_RANGE", message: `Excluded number ${n} out of range.` });
  }

  const overlap = fixed.filter((n) => excluded.includes(n));
  if (overlap.length > 0) {
    issues.push({ code: "FIXED_EXCLUDED_CONFLICT", message: `Numbers cannot be both fixed and excluded: ${overlap.join(", ")}` });
  }
  if (fixed.length > LOTOFACIL_TICKET_SIZE) {
    issues.push({ code: "TOO_MANY_FIXED", message: `At most ${LOTOFACIL_TICKET_SIZE} fixed numbers are allowed.` });
  }
  if (LOTOFACIL_MAX_NUMBER - excluded.length < LOTOFACIL_TICKET_SIZE) {
    issues.push({ code: "TOO_MANY_EXCLUDED", message: "Too many excluded numbers; not enough remain to form a ticket." });
  }
  return { valid: issues.length === 0, issues };
}

/** C(25 - f - e, 15 - f): maximum number of distinct tickets possible under fixed/excluded constraints. */
export function maxDistinctTicketsUnderConstraints(input: FixedExcludedValidationInput = {}): number {
  const f = new Set(input.fixedNumbers ?? []).size;
  const e = new Set(input.excludedNumbers ?? []).size;
  const remainingPool = LOTOFACIL_MAX_NUMBER - f - e;
  const remainingSlots = LOTOFACIL_TICKET_SIZE - f;
  return Number(comb(remainingPool, remainingSlots));
}
