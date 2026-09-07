import { Link } from "react-router-dom";
import { ResponsibleGamingNotice } from "../../shared/components";

export function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">Loterias</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Construa e compare carteiras de Lotofácil e Mega-Sena com estratégias matemáticas documentadas e reproduzíveis. Isto não é previsão de sorteio:
          todas as combinações continuam equiprováveis. O produto organiza, diversifica e audita carteiras — nunca promete lucro.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/lotofacil" className="rounded-xl border border-lotofacil-400/40 bg-lotofacil-50 p-6 transition hover:border-lotofacil-500">
          <h2 className="text-lg font-semibold text-lotofacil-600">Lotofácil</h2>
          <p className="mt-1 text-sm text-slate-600">RMS v2, diversificação, cobertura 11+/12+ e aleatória distinta.</p>
        </Link>
        <Link to="/megasena" className="rounded-xl border border-megasena-400/40 bg-megasena-50 p-6 transition hover:border-megasena-500">
          <h2 className="text-lg font-semibold text-megasena-600">Mega-Sena</h2>
          <p className="mt-1 text-sm text-slate-600">Cobertura Quadra+/Quina+, diversificação e aleatória distinta.</p>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/carteiras" className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-400">
          <h2 className="text-lg font-semibold">Minhas carteiras</h2>
          <p className="mt-1 text-sm text-slate-600">Histórico local de carteiras geradas, filtros, backup e conferência.</p>
        </Link>
        <Link to="/sobre" className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-400">
          <h2 className="text-lg font-semibold">Metodologia e sobre</h2>
          <p className="mt-1 text-sm text-slate-600">Equiprobabilidade, cobertura vs. previsão, exato vs. estimado, limitações.</p>
        </Link>
      </section>

      <ResponsibleGamingNotice />
    </div>
  );
}
