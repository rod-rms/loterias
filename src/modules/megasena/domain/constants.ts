export const MEGASENA_MIN_NUMBER = 1;
export const MEGASENA_MAX_NUMBER = 60;
export const MEGASENA_TICKET_SIZE = 6;

export const TOTAL_POSSIBLE_DRAWS = 50_063_860;

export const EXACT_HIT_COUNTS = Object.freeze({
  4: 21_465,
  5: 324,
  6: 1,
} as const);

export const AT_LEAST_HIT_COUNTS = Object.freeze({
  4: 21_790,
  5: 325,
  6: 1,
} as const);

/**
 * Reference value used by the v0.1 oracle. It is not a permanent game rule.
 * Production callers should pass the current ticket cost explicitly.
 */
export const REFERENCE_TICKET_COST_BRL_V0_1 = 6;

export const MODEL_VERSION = "megasena-domain-v1";
export const ALGORITHM_VERSION = "coverage-greedy-local-v1";

export const DEFAULT_EXACT_F4_MAX_TICKETS = 25;
export const DEFAULT_EXACT_F5_MAX_TICKETS = 500;
export const DEFAULT_ESTIMATION_SAMPLES = 50_000;
export const DEFAULT_OPTIMIZER_ITERATIONS = 80;
export const DEFAULT_CANDIDATE_POOL_SIZE = 32;
