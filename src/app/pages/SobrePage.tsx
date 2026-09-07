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
        Todos os dados pessoais (carteiras salvas, observações, conferências) permanecem no navegador do usuário. Não há login, sincronização em nuvem ou
        pagamentos nesta versão.
      </p>
      <ResponsibleGamingNotice />
    </div>
  );
}
