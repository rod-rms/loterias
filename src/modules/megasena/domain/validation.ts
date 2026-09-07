import {
  MEGASENA_MAX_NUMBER,
  MEGASENA_MIN_NUMBER,
  MEGASENA_TICKET_SIZE,
} from "./constants";
import type {
  MegaSenaGenerationInput,
  MegaSenaPortfolio,
  MegaSenaTicket,
  ValidationIssue,
  ValidationResult,
} from "./types";

export function canonicalizeTicket(ticket: MegaSenaTicket): MegaSenaTicket {
  return [...ticket].sort((a, b) => a - b);
}

export function ticketKey(ticket: MegaSenaTicket): string {
  return canonicalizeTicket(ticket).map((n) => String(n).padStart(2, "0")).join("-");
}

export function validateTicket(ticket: MegaSenaTicket): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(ticket)) {
    return { valid: false, issues: [{ code: "ticket_not_array", message: "Ticket must be an array." }] };
  }
  if (ticket.length !== MEGASENA_TICKET_SIZE) {
    issues.push({
      code: "ticket_size",
      message: `Ticket must contain exactly ${MEGASENA_TICKET_SIZE} numbers.`,
    });
  }
  const seen = new Set<number>();
  ticket.forEach((value, index) => {
    if (!Number.isInteger(value)) {
      issues.push({ code: "number_not_integer", message: "Every number must be an integer.", path: `[${index}]` });
      return;
    }
    if (value < MEGASENA_MIN_NUMBER || value > MEGASENA_MAX_NUMBER) {
      issues.push({
        code: "number_out_of_range",
        message: `Number must be between ${MEGASENA_MIN_NUMBER} and ${MEGASENA_MAX_NUMBER}.`,
        path: `[${index}]`,
      });
    }
    if (seen.has(value)) {
      issues.push({ code: "duplicate_number", message: `Number ${value} is duplicated inside the ticket.` });
    }
    seen.add(value);
  });
  return { valid: issues.length === 0, issues };
}

export function assertValidTicket(ticket: MegaSenaTicket): MegaSenaTicket {
  const validation = validateTicket(ticket);
  if (!validation.valid) {
    throw new TypeError(validation.issues.map((issue) => issue.message).join(" "));
  }
  return canonicalizeTicket(ticket);
}

export function validatePortfolio(tickets: MegaSenaPortfolio): ValidationResult {
  const issues: ValidationIssue[] = [];
  const keys = new Map<string, number>();
  tickets.forEach((ticket, index) => {
    const result = validateTicket(ticket);
    for (const issue of result.issues) {
      issues.push({ ...issue, path: `tickets[${index}]${issue.path ?? ""}` });
    }
    if (result.valid) {
      const key = ticketKey(ticket);
      const previous = keys.get(key);
      if (previous !== undefined) {
        issues.push({
          code: "duplicate_ticket",
          message: `Ticket ${key} duplicates tickets[${previous}].`,
          path: `tickets[${index}]`,
        });
      } else {
        keys.set(key, index);
      }
    }
  });
  return { valid: issues.length === 0, issues };
}

export const validateMegaSenaPortfolio = validatePortfolio;

export function assertValidPortfolio(tickets: MegaSenaPortfolio): MegaSenaTicket[] {
  const result = validatePortfolio(tickets);
  if (!result.valid) {
    throw new TypeError(result.issues.map((issue) => issue.message).join(" "));
  }
  return tickets.map(canonicalizeTicket);
}

function validateNumberList(values: readonly number[] | undefined, label: string): ValidationIssue[] {
  if (!values) return [];
  const issues: ValidationIssue[] = [];
  const seen = new Set<number>();
  values.forEach((value, index) => {
    if (!Number.isInteger(value) || value < MEGASENA_MIN_NUMBER || value > MEGASENA_MAX_NUMBER) {
      issues.push({ code: `${label}_invalid_number`, message: `${label} must contain integers from 1 to 60.`, path: `${label}[${index}]` });
    }
    if (seen.has(value)) {
      issues.push({ code: `${label}_duplicate`, message: `${label} contains duplicate ${value}.`, path: `${label}[${index}]` });
    }
    seen.add(value);
  });
  return issues;
}

export function determineTargetTicketCount(input: MegaSenaGenerationInput): number {
  if (!Number.isFinite(input.ticketCostBRL) || input.ticketCostBRL <= 0) {
    throw new RangeError("ticketCostBRL must be greater than zero");
  }
  const byBudget = input.budgetBRL === undefined
    ? undefined
    : Math.floor(input.budgetBRL / input.ticketCostBRL + 1e-12);

  if (input.numberOfTickets === undefined && byBudget === undefined) {
    throw new TypeError("Provide numberOfTickets or budgetBRL.");
  }
  if (input.numberOfTickets !== undefined && (!Number.isInteger(input.numberOfTickets) || input.numberOfTickets < 1)) {
    throw new RangeError("numberOfTickets must be a positive integer.");
  }
  if (input.budgetBRL !== undefined && (!Number.isFinite(input.budgetBRL) || input.budgetBRL < 0)) {
    throw new RangeError("budgetBRL must be a non-negative finite number.");
  }
  const target = input.numberOfTickets ?? byBudget ?? 0;
  if (byBudget !== undefined && input.numberOfTickets !== undefined && input.numberOfTickets > byBudget) {
    throw new RangeError("numberOfTickets exceeds the supplied budgetBRL.");
  }
  if (target < 1) {
    throw new RangeError("Budget is insufficient for one elementary ticket.");
  }
  return target;
}

export function validateGenerationInput(input: MegaSenaGenerationInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  try {
    const target = determineTargetTicketCount(input);
    const existing = input.existingTickets ?? [];
    const existingValidation = validatePortfolio(existing);
    issues.push(...existingValidation.issues.map((issue) => ({ ...issue, path: `existingTickets.${issue.path ?? ""}` })));
    if (existing.length > target) {
      issues.push({ code: "existing_exceeds_target", message: "existingTickets count exceeds the target total ticket count." });
    }
  } catch (error) {
    issues.push({ code: "generation_size", message: error instanceof Error ? error.message : String(error) });
  }

  issues.push(...validateNumberList(input.fixedNumbers, "fixedNumbers"));
  issues.push(...validateNumberList(input.excludedNumbers, "excludedNumbers"));

  const fixed = new Set(input.fixedNumbers ?? []);
  const excluded = new Set(input.excludedNumbers ?? []);
  if (fixed.size > MEGASENA_TICKET_SIZE) {
    issues.push({ code: "too_many_fixed", message: "At most six fixed numbers are allowed." });
  }
  for (const value of fixed) {
    if (excluded.has(value)) {
      issues.push({ code: "fixed_excluded_conflict", message: `Number ${value} cannot be both fixed and excluded.` });
    }
  }
  const available = MEGASENA_MAX_NUMBER - excluded.size;
  if (available < MEGASENA_TICKET_SIZE) {
    issues.push({ code: "insufficient_available_numbers", message: "Exclusions leave fewer than six available numbers." });
  }
  if (input.maxIterations !== undefined && (!Number.isInteger(input.maxIterations) || input.maxIterations < 0)) {
    issues.push({ code: "invalid_max_iterations", message: "maxIterations must be a non-negative integer." });
  }
  if (input.candidatePoolSize !== undefined && (!Number.isInteger(input.candidatePoolSize) || input.candidatePoolSize < 1)) {
    issues.push({ code: "invalid_candidate_pool", message: "candidatePoolSize must be a positive integer." });
  }
  return { valid: issues.length === 0, issues };
}

export function assertValidGenerationInput(input: MegaSenaGenerationInput): void {
  const result = validateGenerationInput(input);
  if (!result.valid) {
    throw new TypeError(result.issues.map((issue) => issue.message).join(" "));
  }
}
