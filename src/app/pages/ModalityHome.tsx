import { Link } from "react-router-dom";
import { strategyRegistry } from "../../shared/lib/strategyRegistry";
import { StrategyBadge, ResponsibleGamingNotice } from "../../shared/components";
import type { Modality } from "../../shared/types";

const TITLE: Record<Modality, string> = { lotofacil: "Lotofácil", megasena: "Mega-Sena" };
const ACCENT: Record<Modality, string> = { lotofacil: "text-lotofacil-600", megasena: "text-megasena-600" };

export function ModalityHome({ modality }: { modality: Modality }) {
  const strategies = strategyRegistry.listByModality(modality);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={`text-2xl font-bold ${ACCENT[modality]}`}>{TITLE[modality]}</h1>
        <div className="flex gap-2">
          <Link to={`/${modality}/gerar`} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Gerar jogos
          </Link>
          <Link to={`/${modality}/carteiras`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
            Meus jogos salvos
          </Link>
          <Link to={`/${modality}/metodologia`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
            Metodologia
          </Link>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Formas de organizar seus jogos</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {strategies.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{s.ux.title}</h3>
                <StrategyBadge label={s.ux.badge} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{s.ux.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <ResponsibleGamingNotice compact />
    </div>
  );
}
