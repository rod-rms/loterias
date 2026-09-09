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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" role="status">
      <p className="font-medium text-slate-800">
        Concurso {draw.contest} já realizado em {formatDatePtBR(draw.drawDate)}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Resultado oficial</p>
      <p className="mt-0.5 font-mono text-base text-slate-900">{formatDrawNumbers(draw.numbers)}</p>
      <p className="mt-2 text-slate-600">
        Você está fazendo uma simulação histórica. O resultado deste sorteio não será usado para montar os jogos.
      </p>
    </div>
  );
}

export function NextContestNotice() {
  return (
    <p className="text-xs text-slate-500" role="status">
      Próximo concurso disponível
    </p>
  );
}
