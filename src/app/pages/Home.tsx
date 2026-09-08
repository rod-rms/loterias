import { Link } from "react-router-dom";
import { ResponsibleGamingNotice } from "../../shared/components";

export function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">Monte seus jogos com estratégia e transparência</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Escolha como organizar seus jogos da Lotofácil ou Mega-Sena, compare diferentes abordagens e veja as probabilidades do conjunto. Nenhuma opção
          prevê o sorteio: toda combinação válida continua tendo a mesma chance de ser sorteada.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/lotofacil/gerar" className="rounded-xl border border-lotofacil-400/40 bg-lotofacil-50 p-6 transition hover:border-lotofacil-500">
          <h2 className="text-lg font-semibold text-lotofacil-600">Gerar jogos da Lotofácil</h2>
          <p className="mt-1 text-sm text-slate-600">Equilibrar meus 6 jogos (RMS), variar mais os jogos, priorizar mais acertos ou gerar jogos aleatórios.</p>
        </Link>
        <Link to="/megasena/gerar" className="rounded-xl border border-megasena-400/40 bg-megasena-50 p-6 transition hover:border-megasena-500">
          <h2 className="text-lg font-semibold text-megasena-600">Gerar jogos da Mega-Sena</h2>
          <p className="mt-1 text-sm text-slate-600">Priorizar Quadra ou Quina, variar mais os jogos ou gerar jogos aleatórios.</p>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/carteiras" className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-400">
          <h2 className="text-lg font-semibold">Meus jogos salvos</h2>
          <p className="mt-1 text-sm text-slate-600">Jogos gerados anteriormente, filtros, backup e conferência do resultado.</p>
        </Link>
        <Link to="/sobre" className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-400">
          <h2 className="text-lg font-semibold">Metodologia e sobre</h2>
          <p className="mt-1 text-sm text-slate-600">Como calculamos as chances, o que é exato ou estimado, e as limitações de cada abordagem.</p>
        </Link>
      </section>

      <ResponsibleGamingNotice />
    </div>
  );
}
