# UX Copy & Terminology — v1.1

Esta é a fonte de verdade para a camada de apresentação (linguagem leiga) introduzida na revisão UX v1.1. A matemática, os IDs de estratégia, o domínio e os testes de oráculo **não foram alterados**; este documento descreve apenas como cada conceito interno é traduzido para o usuário final.

## 1. Princípio geral

Um usuário leigo deve conseguir gerar e entender um conjunto de jogos sem saber teoria de probabilidade, jargão de software ou a arquitetura interna de estratégias. A matemática continua rigorosa por baixo; a interface traduz esse rigor para um português claro, honesto e acessível. Termos técnicos continuam disponíveis em seções "Detalhes técnicos" e "Ver análise detalhada".

## 2. Tabela termo interno → termo do usuário

| Termo interno | Termo exibido ao usuário | Onde aparece o termo técnico |
|---|---|---|
| `seed` | "Código de reprodução" | "Detalhes técnicos" mostra `Seed: <valor>` |
| `baseline` | "Jogos aleatórios equivalentes" / "Comparação com jogos aleatórios equivalentes" | Metodologia, `kind` em detalhes técnicos |
| `F4` / `atLeast4` | "Chance de Quadra ou mais" | Metodologia |
| `F5` / `atLeast5` | "Chance de Quina ou mais" | Metodologia |
| `sena` | "Chance de Sena" | — |
| `noPrize` | "Chance de nenhum prêmio" | — |
| `atLeast11`..`atLeast14` | "Chance de 11/12/13/14 acertos ou mais" | — |
| `exactly15` | "Chance de 15 acertos" | — |
| `noAtLeast11` | "Chance de não chegar a 11 acertos" | — |
| "estrutural" / "matemática" / "baseline" (evidência) | Badge simples: "6 jogos fixos", "Mais diversidade", "Busca otimizada", "Sem filtros" | "Detalhes técnicos" do cartão de estratégia mostra a classificação de evidência original |
| "candidate pool", "heurística", "exposição", "sobreposição" | Não exibidos por padrão; "Diversidade do conjunto" resume em uma frase | "Ver análise detalhada" |
| "Estratégia" (rótulo do passo 1) | "O que você quer priorizar?" | — |
| "Quantidade / orçamento" | "Quantos jogos você quer gerar?" | — |
| "Concurso-alvo (apenas contexto)" | "Concurso em que você pretende jogar" | — |
| "Carteira" (ação) | "Jogos" / "Conjunto de jogos" | Nome técnico da estratégia, metodologia |
| "Gerar carteira" | "Gerar jogos" | — |
| "Salvar carteira" | "Salvar estes jogos" | — |
| "Nova variação" | "Gerar outra opção" | — |
| "Reproduzir carteira" | "Gerar novamente este mesmo conjunto" | — |
| "Minhas carteiras" | "Meus jogos salvos" | — |
| "Resultado" (cabeçalho) | "Seus jogos estão prontos" | — |
| "Rápida / Equilibrada / Profunda" (preset) | "Rápida / Equilibrada / Intensiva" | valor interno do preset continua `fast`/`balanced`/`deep` |
| "Sobreposição entre jogos" | "Quanto os jogos repetem dezenas entre si" | — |
| "Exposição das dezenas" | "Quantas vezes cada dezena aparece" | — |
| "Comparação com baseline" | "Comparação com jogos aleatórios equivalentes" | — |
| `exact` (status) | "Cálculo exato" | — |
| `estimated` (status) | "Estimativa" | — |
| `upper_bound` / `lower_bound` / `not_computed` | "Limite superior" / "Limite inferior" / "Não calculado" | — |

## 3. Nomes de estratégia (título de UX)

| ID interno | Nome técnico (Detalhes técnicos) | Título exibido | Badge |
|---|---|---|---|
| `lotofacil.rms_v2` | RMS v2 | Carteira equilibrada (RMS) | 6 jogos fixos |
| `lotofacil.max_diversification` | Diversificação de carteira | Variar mais os jogos | Mais diversidade |
| `lotofacil.max_coverage_11` | Otimizar cobertura 11+ | Priorizar 11 acertos ou mais | Busca otimizada |
| `lotofacil.max_coverage_12` | Otimizar cobertura 12+ | Priorizar 12 acertos ou mais | Busca otimizada |
| `lotofacil.uniform_random` | Aleatória distinta | Gerar jogos aleatórios | Sem filtros |
| `megasena.max_f4` | Otimizar cobertura Quadra+ | Priorizar Quadra ou mais | Busca otimizada |
| `megasena.max_f5` | Otimizar cobertura Quina+ | Priorizar Quina ou mais | Busca otimizada |
| `megasena.max_diversification` | Diversificação de carteira | Variar mais os jogos | Mais diversidade |
| `megasena.uniform_random` | Aleatória distinta | Gerar jogos aleatórios | Sem filtros |

Cada estratégia carrega esses valores em `StrategyDefinition.ux` (`title`, `summary`, `badge`, `helpTitle`, `helpBody`, `technicalName`), lido pela UI de forma inteiramente orientada por metadados — nenhuma página faz `if (strategyId === ...)`.

## 4. Formatação de probabilidade (adaptativa)

Implementada em `src/shared/utils/probabilityFormat.ts`. Regra: uma probabilidade não-nula nunca pode ser exibida como `0%`.

| Faixa (percentual) | Casas decimais |
|---|---:|
| ≥ 10% | 2 |
| ≥ 1% | 2 |
| ≥ 0,01% | 4 |
| ≥ 0,0001% | 6 |
| menor ainda | adiciona casas decimais (até 12) até o valor deixar de arredondar para zero |

Exemplos reais do domínio:

- `55,8537%` → `55,85%`
- `0,0277%` → `0,0277%`
- Sena com N=1 (`1/50.063.860` ≈ 0,000001997%) → exibido com casas suficientes para nunca aparecer como `0%`

A representação "1 em X" (`formatOneIn`) complementa probabilidades pequenas ("Aproximadamente 1 em 544.793") e é omitida quando a probabilidade é nula ou está próxima de 100% (onde "1 em 1" não agrega informação).

## 5. Regras de divulgação progressiva ("progressive disclosure")

Ordem da tela de resultado (leiga, sempre visível):

1. "Seus jogos estão prontos" (cabeçalho com quantidade, custo total, opção usada, concurso);
2. Métricas principais (`PRIMARY_METRIC_ORDER`, ver `metricPresentation.ts`) — exclui métricas de "não atingir"/"nenhum prêmio";
3. Lista de jogos;
4. "Comparação com jogos aleatórios equivalentes";
5. "Diversidade do conjunto" (resumo simples: repetição média e faixa de exposição);
6. Ações (copiar, exportar, salvar, gerar outra opção, gerar novamente, comparar).

Atrás de acordeões colapsados por padrão:

- **"Ver análise detalhada"**: histograma completo de sobreposição, matriz de exposição por dezena;
- **"Detalhes técnicos do resultado"**: nome técnico da estratégia, identificador/versão, seed, método de geração, método de avaliação, metadados de auditoria completos (JSON).

Nas opções avançadas do formulário, "Configurações avançadas" (colapsado) contém o código de reprodução (seed) e o preset de qualidade — nunca aparecem na leitura padrão.

## 6. Personalização de dezenas — modelo de interação

Substituiu o ciclo de 3 cliques (fixar → excluir → limpar) por dois modos explícitos, escolhidos via controle segmentado (`role="radiogroup"`): **"Incluir obrigatoriamente"** e **"Não usar"**. No modo ativo, tocar uma dezena alterna sua presença naquela lista; dezenas já pertencentes à outra lista ficam visivelmente desabilitadas (nunca fica ambíguo, e uma dezena nunca é fixa e excluída ao mesmo tempo). Um resumo textual sempre visível ("Obrigatórias: 03, 07" / "Não usar: 18, 21") evita depender só da cor do chip, com ações "Limpar" por lista.

## 7. Componente de ajuda (`InfoHelp`)

`src/shared/components/InfoHelp.tsx`. Abre em clique/toque, hover (desktop) e foco por teclado — nunca depende só de hover. Fecha com Escape, clique fora, ou ao sair do elemento sem foco. Usa `aria-expanded`, `aria-describedby` e `role="tooltip"` no conteúdo. Informação crítica nunca existe exclusivamente dentro de um `InfoHelp` — ele sempre complementa texto já visível.

**Nota de implementação:** a primeira versão fazia `onClick` alternar (toggle) o estado enquanto `onMouseEnter`/`onFocus` já haviam aberto o popover — como o clique do mouse dispara `focus` antes de `click`, o toggle fechava o popover imediatamente após abri-lo. A correção fez clique/hover/foco sempre abrirem (idempotente); o fechamento fica a cargo de Escape, clique fora, ou `mouseleave` sem foco remanescente.
