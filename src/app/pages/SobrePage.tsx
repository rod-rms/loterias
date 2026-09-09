import { ResponsibleGamingNotice } from "../../shared/components";

export function SobrePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sobre</h1>
      <p className="max-w-2xl text-slate-600">
        Loterias é uma aplicação para construir, comparar, explicar e acompanhar carteiras de Lotofácil e Mega-Sena sob equiprobabilidade, com estratégias
        matemáticas reproduzíveis e limitações transparentes. Não é afiliado à CAIXA, não vende nem registra apostas, não prevê sorteios e não promete
        lucro.
      </p>
      <p className="max-w-2xl text-slate-600">
        Seus jogos salvos, observações e conferências ficam guardados apenas neste navegador, neste dispositivo — não há login nem sincronização em nuvem.
        Isso significa que: outro dispositivo ou outro perfil de navegador não enxerga automaticamente os mesmos jogos salvos; qualquer pessoa que use o
        mesmo perfil de navegador pode acessar esses mesmos jogos; e limpar os dados do site/navegador pode apagá-los permanentemente. Se preservar seus
        jogos importa, use "Exportar backup" em "Meus jogos salvos" antes de limpar dados ou trocar de dispositivo. Não há pagamentos nesta versão.
      </p>
      <ResponsibleGamingNotice />
    </div>
  );
}
