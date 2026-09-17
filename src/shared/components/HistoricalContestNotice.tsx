import { formatDatePtBR, formatDrawNumbers } from "../utils/numberFormat";
import type { LotteryDraw } from "../types";

/**
 * Shown near the contest field when the chosen contest already exists in
 * the locally validated dataset (historical simulation) or is exactly the
 * next contest (the normal forward case). Reads only the already-loaded
 * dataset — never makes a new request — and never claims a scheduled draw
 * date for the next contest, since the app has no authoritative data for it.
 */
export function HistoricalContestNotice({ draw }: { draw: LotteryDraw }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surfaceElevated p-3 text-sm" role="status">
      <p className="font-medium text-brand-text">
        Concurso {draw.contest} já realizado em {formatDatePtBR(draw.drawDate)}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brand-textMuted">Resultado oficial</p>
      <p className="mt-0.5 font-mono text-base text-brand-text">{formatDrawNumbers(draw.numbers)}</p>
      <p className="mt-2 text-brand-textMuted">
        Você está fazendo uma simulação histórica. O resultado deste sorteio não será usado para montar os jogos.
      </p>
    </div>
  );
}

export function NextContestNotice() {
  return (
    <p className="text-xs text-brand-textMuted" role="status">
      Próximo concurso disponível
    </p>
  );
}
