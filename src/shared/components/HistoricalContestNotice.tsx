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
    <div className="border-l-2 border-ink-400 pl-3 text-sm" role="status">
      <p className="font-medium text-ink-100">
        Concurso {draw.contest} já realizado em {formatDatePtBR(draw.drawDate)}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-200">Resultado oficial</p>
      <p className="mt-0.5 font-mono text-base text-ink-100">{formatDrawNumbers(draw.numbers)}</p>
      <p className="mt-2 text-ink-200">
        Você está fazendo uma simulação histórica. O resultado deste sorteio não será usado para montar os jogos.
      </p>
    </div>
  );
}

export function NextContestNotice() {
  return (
    <p className="text-xs text-ink-200" role="status">
      Próximo concurso disponível
    </p>
  );
}
