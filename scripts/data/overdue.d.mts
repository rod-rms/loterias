export const OVERDUE_BRT_UTC_OFFSET_HOURS: number;
export const OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR: number;
export function parseBrDate(value: unknown): { y: number; m: number; d: number } | null;
export function overdueDeadline(nextDrawDateBr: unknown): Date | null;
export type OverdueReason = "invalid-input" | "advanced" | "no-next-draw-date" | "before-deadline" | "overdue";
export function evaluateOverdue(input: {
  now: Date;
  nextDrawDateBr: unknown;
  storedLatest: number;
  officialLatest: number;
}): { overdue: boolean; reason: OverdueReason; deadline: Date | null };
