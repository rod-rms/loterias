import { useEffect, useState } from "react";
import type { DataStatus, Modality, ModalityDataStatus } from "../../shared/types";
import { ResponsibleGamingNotice, Disclosure, BackLink } from "../../shared/components";
import { loadDataStatus } from "../../shared/lib/dataLoaders";
import { CAIXA_LOTOFACIL_URL, CAIXA_MEGASENA_URL } from "../../shared/lib/externalLinks";

const MODALITY_LABEL: Record<Modality, string> = { lotofacil: "Lotofácil", megasena: "Mega-Sena" };
const SOURCE_URL: Record<Modality, string> = { lotofacil: CAIXA_LOTOFACIL_URL, megasena: CAIXA_MEGASENA_URL };
const STATUS_LABEL: Record<ModalityDataStatus["status"], string> = { ok: "Base validada, sem lacunas", degraded: "Base com lacunas pendentes de verificação" };

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function MetodologiaPage({ modality }: { modality: Modality }) {
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    loadDataStatus()
      .then(setStatus)
      .catch(() => setStatusError(true));
  }, []);

  const modalityStatus = status?.[modality];

  return (
    <div className="max-w-none space-y-8">
      <BackLink to={`/${modality}/gerar`} label={`Voltar para ${MODALITY_LABEL[modality]}`} />
      <h1 className="text-2xl font-bold">Metodologia — {MODALITY_LABEL[modality]}</h1>

      <section className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="text-lg font-semibold text-brand-text">Como este aplicativo funciona</h2>
        <p className="text-brand-textMuted">
          Todas as combinações possíveis de dezenas têm exatamente a mesma chance de serem sorteadas. Nenhuma das opções deste aplicativo prevê quais
          dezenas sairão nem aumenta a probabilidade de uma combinação específica.
        </p>
        <p className="text-brand-textMuted">
          <strong>Variar mais os jogos</strong> distribui melhor as dezenas entre os jogos e reduz repetição entre eles — isso deixa o conjunto mais
          diverso, não mais provável.
        </p>
        {modality === "lotofacil" ? (
          <>
            <p className="text-brand-textMuted">
              <strong>Priorizar 11+ / 12+ acertos</strong> organiza os jogos para cobrir mais cenários em que pelo menos um deles alcançaria aquele patamar
              de acertos, usando uma busca que testa várias combinações e fica com a melhor encontrada.
            </p>
            <p className="text-brand-textMuted">
              <strong>Equilibrar meus 6 jogos (RMS)</strong> usa os concursos anteriores apenas para organizar grupos de dezenas e montar uma carteira
              estruturalmente equilibrada — não para prever o próximo resultado.
            </p>
          </>
        ) : (
          <p className="text-brand-textMuted">
            <strong>Priorizar Quadra+ / Quina+</strong> organiza os jogos para cobrir mais cenários em que pelo menos um deles alcançaria aquele patamar de
            acertos, usando uma busca que testa várias combinações e fica com a melhor encontrada.
          </p>
        )}
        <p className="text-brand-textMuted">
          <strong>Jogos aleatórios equivalentes</strong> é uma referência de comparação: a média (ou um controle reproduzível) de conjuntos aleatórios com a
          mesma quantidade de jogos e as mesmas restrições — não é um conjunto que você recebe.
        </p>
      </section>

      <Disclosure title="Detalhes técnicos">
        <div className="space-y-6">
          <section>
            <h3 className="text-base font-semibold">Equiprobabilidade</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              Todas as combinações possíveis têm exatamente a mesma probabilidade de serem sorteadas. Nenhuma estratégia aqui altera essa probabilidade
              para uma combinação individual.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold">Aposta simples/elementar</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              Nesta versão, todo jogo gerado é uma aposta simples: {modality === "lotofacil" ? "15 dezenas entre 1 e 25" : "6 dezenas entre 1 e 60"}.
              Apostas ampliadas não são simuladas como se fossem um único jogo simples.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold">Cobertura vs. previsão</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              "Cobertura" descreve a fração dos resultados possíveis para os quais pelo menos um jogo do conjunto atinge um patamar de acertos. Isso é
              diferente de prever quais dezenas serão sorteadas.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold">Aleatória concreta vs. baseline</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              "Aleatória distinta" é um conjunto concreto gerado de forma uniforme. "Baseline" é a média teórica (ou um controle reproduzível) usada apenas
              para comparação — não é um conjunto que você recebe.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold">Sobreposição</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              Mede quantas dezenas dois jogos compartilham. Sobreposição menor tende a distribuir prêmios adicionais entre mais resultados possíveis; não
              muda a chance de acertar o prêmio máximo com N jogos distintos.
            </p>
          </section>

          {modality === "lotofacil" ? (
            <section>
              <h3 className="text-base font-semibold">RMS v2</h3>
              <p className="mt-1 text-sm text-brand-textMuted">
                A RMS v2 organiza seis jogos usando pools A/B/C calculadas sobre os 20 concursos anteriores, com regras de exposição, interseção, paridade
                e estrutura auditáveis. O histórico define rotação e pools — não dezenas "mais prováveis". A RMS não aumenta a chance de 15 acertos frente
                a outros seis jogos distintos quaisquer.
              </p>
            </section>
          ) : (
            <section>
              <h3 className="text-base font-semibold">F4 / F5</h3>
              <p className="mt-1 text-sm text-brand-textMuted">
                F4 e F5 medem a chance de pelo menos um jogo do conjunto atingir Quadra+ ou Quina+, respectivamente. Não devem ser interpretados como
                "chance de ganhar dinheiro" — apenas como chance de atingir aquele patamar de acertos sob o modelo de sorteio equiprovável.
              </p>
            </section>
          )}

          <section>
            <h3 className="text-base font-semibold">Busca heurística vs. ótimo provado</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              As estratégias de cobertura usam construção gulosa e busca local. Quando o algoritmo não prova otimalidade, o resultado é descrito como
              "melhor solução encontrada", nunca como "ótimo global".
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold">Exato vs. estimado</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              Toda métrica exibida indica seu status: exato, estimado, limite superior/inferior ou não calculado. Valores estimados informam também o
              método usado.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold">Limitações de rateio/popularidade</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              A popularidade de escolhas de outros apostadores é logicamente separada da probabilidade física do sorteio. Esta versão do aplicativo não
              calcula um rateio calibrado.
            </p>
          </section>
        </div>
      </Disclosure>

      <section className="space-y-3 rounded-xl border border-brand-border bg-brand-surface p-5" aria-labelledby="dados-atualizacoes">
        <h2 id="dados-atualizacoes" className="text-lg font-semibold text-brand-text">
          Dados e atualizações
        </h2>
        {statusError && <p className="text-sm text-amber-300">Não foi possível carregar as informações de atualização dos dados agora.</p>}
        {!statusError && !modalityStatus && <p className="text-sm text-brand-textMuted">Carregando informações de atualização…</p>}
        {modalityStatus && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-brand-textMuted">Fonte oficial</dt>
              <dd className="break-all font-medium">
                Loterias CAIXA —{" "}
                <a href={SOURCE_URL[modality]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand-text">
                  {SOURCE_URL[modality]}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-brand-textMuted">Último concurso na base</dt>
              <dd className="font-mono font-medium tabular-nums">{modalityStatus.latestContest}</dd>
            </div>
            <div>
              <dt className="text-xs text-brand-textMuted">Data do último sorteio</dt>
              <dd className="font-mono font-medium tabular-nums">{modalityStatus.latestDrawDate}</dd>
            </div>
            <div>
              <dt className="text-xs text-brand-textMuted">Situação da base</dt>
              <dd className="font-medium">{STATUS_LABEL[modalityStatus.status]}</dd>
            </div>
            <div>
              <dt className="text-xs text-brand-textMuted">Última atualização com novo concurso</dt>
              <dd className="font-mono font-medium tabular-nums">{formatDateTime(modalityStatus.lastUpdatedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-brand-textMuted">Última verificação da fonte oficial</dt>
              <dd className="font-mono font-medium tabular-nums">{formatDateTime(modalityStatus.lastCheckedAt)}</dd>
            </div>
          </dl>
        )}
        <p className="text-xs text-brand-textMuted">
          "Última verificação" é quando conferimos a fonte oficial pela última vez, mesmo que não houvesse concurso novo. "Última atualização" é quando um
          novo concurso realmente entrou na base local.
        </p>
      </section>

      <ResponsibleGamingNotice />
    </div>
  );
}
