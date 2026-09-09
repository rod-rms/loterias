import type { LotteryDataset, LotteryDraw } from "../types";

/**
 * Deterministic validation for "Concurso em que você pretende jogar",
 * based only on the already-loaded, validated local dataset — never a new
 * network request. Three allowed states, two blocked states:
 *
 *   ok_next        — contest === latestContest + 1 (the normal forward case)
 *   ok_historical  — contest <= latestContest AND present in the dataset
 *                     (historical simulation)
 *   blocked_future — contest > latestContest + 1 (not supported yet)
 *   blocked_gap    — contest <= latestContest but missing from the dataset
 *   blocked_invalid— not a positive integer (zero, negative, decimal, NaN)
 */
export type TargetContestValidation =
  | { status: "ok_next"; nextContest: number }
  | { status: "ok_historical"; draw: LotteryDraw }
  | { status: "blocked_future"; message: string }
  | { status: "blocked_gap"; message: string }
  | { status: "blocked_invalid"; message: string };

export function validateTargetContest(contest: number, dataset: LotteryDataset): TargetContestValidation {
  if (!Number.isInteger(contest) || contest <= 0) {
    return { status: "blocked_invalid", message: "Informe um número de concurso válido (um número inteiro maior que zero)." };
  }

  const nextContest = dataset.latestContest + 1;

  if (contest === nextContest) {
    return { status: "ok_next", nextContest };
  }

  if (contest > nextContest) {
    return {
      status: "blocked_future",
      message: `Esse concurso ainda não está disponível para geração. A base oficial está atualizada até o concurso ${dataset.latestContest}. O próximo concurso disponível é o ${nextContest}.`,
    };
  }

  // contest <= dataset.latestContest: must exist exactly in the validated dataset.
  const draw = dataset.draws.find((d) => d.contest === contest);
  if (!draw) {
    return { status: "blocked_gap", message: "Esse concurso não está disponível na base local validada." };
  }
  return { status: "ok_historical", draw };
}

/** True for any state that should allow generation to proceed. */
export function isTargetContestAllowed(validation: TargetContestValidation): boolean {
  return validation.status === "ok_next" || validation.status === "ok_historical";
}
