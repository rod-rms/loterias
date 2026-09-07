import type { Modality } from "../../shared/types";
import { ResponsibleGamingNotice } from "../../shared/components";

export function MetodologiaPage({ modality }: { modality: Modality }) {
  return (
    <div className="prose prose-slate max-w-none space-y-6">
      <h1 className="text-2xl font-bold">Metodologia — {modality === "lotofacil" ? "Lotofácil" : "Mega-Sena"}</h1>

      <section>
        <h2 className="text-lg font-semibold">Equiprobabilidade</h2>
        <p className="text-slate-600">
          Todas as combinações possíveis têm exatamente a mesma probabilidade de serem sorteadas. Nenhuma estratégia aqui altera essa probabilidade para uma
          combinação individual.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Aposta simples/elementar</h2>
        <p className="text-slate-600">
          Nesta versão, todo jogo gerado é uma aposta simples: {modality === "lotofacil" ? "15 dezenas entre 1 e 25" : "6 dezenas entre 1 e 60"}. Apostas
          ampliadas não são simuladas como se fossem um único jogo simples.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cobertura vs. previsão</h2>
        <p className="text-slate-600">
          "Cobertura" descreve a fração dos resultados possíveis para os quais pelo menos um jogo da carteira atinge um patamar de acertos. Isso é diferente
          de prever quais dezenas serão sorteadas.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Aleatória concreta vs. baseline</h2>
        <p className="text-slate-600">
          "Aleatória distinta" é uma carteira concreta gerada de forma uniforme. "Baseline" é a média teórica (ou um controle reproduzível) usada apenas
          para comparação — não é uma carteira que você recebe.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Sobreposição</h2>
        <p className="text-slate-600">
          Mede quantas dezenas dois jogos compartilham. Sobreposição menor tende a distribuir prêmios adicionais entre mais resultados possíveis; não muda a
          chance de acertar o prêmio máximo com N jogos distintos.
        </p>
      </section>

      {modality === "lotofacil" ? (
        <section>
          <h2 className="text-lg font-semibold">RMS v2</h2>
          <p className="text-slate-600">
            A RMS v2 organiza seis jogos usando pools A/B/C calculadas sobre os 20 concursos anteriores, com regras de exposição, interseção, paridade e
            estrutura auditáveis. O histórico define rotação e pools — não dezenas "mais prováveis". A RMS não aumenta a chance de 15 acertos frente a
            outros seis jogos distintos quaisquer.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-lg font-semibold">F4 / F5</h2>
          <p className="text-slate-600">
            F4 e F5 medem a chance de pelo menos um jogo da carteira atingir Quadra+ ou Quina+, respectivamente. Não devem ser interpretados como "chance de
            ganhar dinheiro" — apenas como chance de atingir aquele patamar de acertos sob o modelo de sorteio equiprovável.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Busca heurística vs. ótimo provado</h2>
        <p className="text-slate-600">
          As estratégias de cobertura usam construção gulosa e busca local. Quando o algoritmo não prova otimalidade, o resultado é descrito como "melhor
          solução encontrada", nunca como "ótimo global".
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Exato vs. estimado</h2>
        <p className="text-slate-600">
          Toda métrica exibida indica seu status: exato, estimado, limite superior/inferior ou não calculado. Valores estimados informam também o método
          usado.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Limitações de rateio/popularidade</h2>
        <p className="text-slate-600">
          A popularidade de escolhas de outros apostadores é logicamente separada da probabilidade física do sorteio. A v1 não calcula um rateio calibrado.
        </p>
      </section>

      <ResponsibleGamingNotice />
    </div>
  );
}
