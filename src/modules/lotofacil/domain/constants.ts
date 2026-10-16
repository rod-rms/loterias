export const LOTOFACIL_MIN_NUMBER = 1;
export const LOTOFACIL_MAX_NUMBER = 25;
export const LOTOFACIL_TICKET_SIZE = 15;

/** C(25,15) */
export const TOTAL_POSSIBLE_DRAWS = 3_268_760;

export const EXACT_HIT_COUNTS = Object.freeze({
  11: 286_650,
  12: 54_600,
  13: 4_725,
  14: 150,
  15: 1,
} as const);

export const AT_LEAST_HIT_COUNTS = Object.freeze({
  11: 346_126,
  12: 59_476,
  13: 4_876,
  14: 151,
  15: 1,
} as const);

export const MODEL_VERSION = "lotofacil-domain-v1";
/** Original RMS v2 behaviour: 20-contest window only, boundary ties resolved by seed alone. Still reproducible (see buildPools without a tie-break window). */
export const RMS_ALGORITHM_VERSION_V2_0 = "rms-v2.0.0";
/** RMS v2.1 (RMS-201, DEC-024): same 20-contest pools, but ties in 20-window frequency are broken by 50-window frequency before falling back to the seed. */
export const RMS_ALGORITHM_VERSION = "rms-v2.1.0";
export const COVERAGE_ALGORITHM_VERSION = "coverage-greedy-local-v1";
export const DIVERSIFICATION_ALGORITHM_VERSION = "diversification-lexicographic-v1";
export const UNIFORM_ALGORITHM_VERSION = "uniform-random-v1";

export const RMS_HISTORY_WINDOW = 20;
/** Longer window used ONLY to break ties already present in the 20-contest frequency ranking; it never reorders numbers with different 20-window frequencies (DEC-015/DEC-016). */
export const RMS_TIEBREAK_WINDOW = 50;

export const RMS_NO_VALID_PORTFOLIO_FOUND = "RMS_NO_VALID_PORTFOLIO_FOUND";
