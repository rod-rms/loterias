# Mega-Sena — Rolling 20 Balanceada v2.1 (especificação canônica)

**Status: APPROVED — NOT IMPLEMENTED.** Nenhum código, estratégia registrada, teste ou UI desta estratégia existe em `main`. Item de roadmap: `MEGA-ROLL-001` (`docs/project-management/ROADMAP.md`).

Este documento é o contrato de implementação. Ele foi reconciliado com a auditoria independente (pacote local `MEGASENA_ROLLING20_AUDIT_PACKAGE_v2_1/`, não versionado: auditoria de 10/09/2026, base concursos 1–3055, SHA-256 `cc7d2251ec76bda7d2c46bb7e13705f9dbe8e9b26c006eecaa21facee0fb039c`). O pacote bruto serve só como evidência de apoio; **não é necessário para implementar**.

> A estratégia usa o histórico recente para criar uma partição rotativa G1/G2/G3 e organizar a carteira. Ela **não** prevê o próximo sorteio, não identifica dezenas mais prováveis e não altera a probabilidade individual de nenhuma combinação.

## 1. Identidade e capacidades iniciais

| Campo | Valor |
|---|---|
| `id` | `megasena.rolling_20_v2` |
| `version` | `2.1.0` |
| Nome técnico | Rolling 20 Balanceada v2.1 |
| Modalidade / evidência | Mega-Sena / `structural` |
| Badge | "Estratégia personalizada" |
| Título de UI (oficial) | "Organizar pelo histórico recente" (decisão do product owner; proveniência: o pacote de auditoria havia proposto "Equilibrar com histórico recente", que **não** é o título oficial) |
| Jogos (N) | 1..100 |
| `supportsBudget` | `true` (converter pelo preço versionado; nunca aumentar N automaticamente) |
| `supportsFixedNumbers` / `supportsExcludedNumbers` | `false` / `false` (sem suporte parcial silencioso) |
| `supportsUserSeed` | `true` |
| `supportsQualityPreset` | `true` (`fast`/`balanced`/`deep`; seed reproduzível dentro do mesmo preset e versão) |
| `requiresHistoricalDraws` / `requiresTargetContest` | `true` / `true` |
| Histórico exigido | 20 concursos |

O perfil legado 2-0-4 rígido **não** faz parte da UI inicial (§10).

## 2. Janela histórica e no-look-ahead

Para o concurso-alvo `T`, a janela é **exatamente** `T-20 … T-1`.

- Nunca usar `T` nem concursos posteriores.
- Simulação histórica: grupos idênticos aos de uma base fisicamente truncada em `T-1`; mutar concursos `> T-1` não pode mudar nada.
- Qualquer concurso da janela ausente ⇒ bloquear (`ROLLING20_INCOMPLETE_HISTORY_WINDOW`).
- Próximo concurso = `latestContest + 1`. Usar o dataset local; nunca buscar a CAIXA no browser.

## 3. Grupos

Frequência `f(n)` de cada dezena 1..60 na janela.

- **G2** = `{ n : f(n) = 0 }` (tamanho variável).
- **G1** = as 20 primeiras dezenas entre as que apareceram (`f>0`), ordenadas por: (1) `f` decrescente; (2) ocorrência mais recente na janela, decrescente; (3) dezena crescente. A recência serve **só** como desempate determinístico — sem peso e sem interpretação preditiva.
- **G3** = demais dezenas (`{1..60} − G1 − G2`).
- Caso patológico: menos de 20 dezenas distintas apareceram ⇒ nunca colocar `f=0` em G1; bloquear com `ROLLING20_INSUFFICIENT_SEEN_NUMBERS`. Não ocorreu em nenhuma das 3.035 janelas da base 1–3055 (G2 variou de 1 a 15).

Fato de auditoria: em 80,26% das janelas (2.436/3.035) há empate de frequência atravessando o corte da posição 20; por isso o desempate acima é obrigatório e determinístico.

## 4. Estrutura do jogo e alocação proporcional de G2

Todo jogo tem **exatamente 2 dezenas de G1**. (`6N × 20/60 = 2N`: é a proporção neutra.)

Para N jogos e `g2 = |G2|`:

```
targetG2Slots = floor((N * g2 / 10) + 0.5)   // round-half-up, determinístico, não negativo
baseB  = floor(targetG2Slots / N)
extraB = targetG2Slots % N
```

Exatamente `extraB` jogos recebem `baseB + 1` dezenas de G2; os demais recebem `baseB`. Cada jogo recebe `G3 = 4 − G2count`. Formato: `2 G1 + b G2 + (4−b) G3`.

> Nota de reconciliação: a auditoria escreve `round(N × g2 / 10)` sem fixar a regra de meio-ponto; esta especificação a fixa em **round-half-up** (`floor(x + 0.5)`), evitando o arredondamento bancário de algumas linguagens. Implementar exatamente a fórmula acima.

Quais jogos recebem o slot extra é decidido pelo otimizador/seed, **sem** prioridade preditiva.

Exemplos verificados:

| g2 | N | Resultado |
|---|---|---|
| 7 | 3 | 1 jogo 2-0-4; 2 jogos 2-1-3 |
| 7 | 6 | 2 jogos 2-0-4; 4 jogos 2-1-3 |
| 7 | 100 | 30 jogos 2-0-4; 70 jogos 2-1-3 |
| 10 | qualquer | todos 2-1-3 |
| 15 | 6 | 3 jogos 2-1-3; 3 jogos 2-2-2 |

Por que não o 2-0-4 rígido: no walk-forward 21–3055 (3.035 avaliações) o 2-0-4 apareceu em 15,585% vs 15,085% esperado condicionalmente (`p≈0,439`), instável no tempo; e forçá-lo exclui G2 de toda a carteira, aumentando a sobreposição (N=100: interseção média 0,694 vs 0,600 uniforme; DP de exposição 4,923 vs 2,973).

## 5. Filtros estruturais (padrão)

Filtros de **forma**, não previsores. Aplicados após a composição de grupos:

| Filtro | Regra padrão |
|---|---|
| Pares | 2..4 pares |
| Soma | `130 ≤ soma ≤ 249` (faixa 150–219 é só informação descritiva, sem bônus de score) |
| Metade baixa | 2..4 dezenas em 01–30 |
| Faixa 01–10 | no máximo 2 dezenas (0..2) |
| Blocos consecutivos | `≤ 1` |

**Bloco consecutivo** = sequência **maximal** de duas ou mais dezenas adjacentes. `10-11-12` = 1 bloco; `10-11-12-13` = 1 bloco; `10-11` e `20-21` = 2 blocos. Não implementar como "número de pares adjacentes".

Os cinco filtros juntos aceitam `28.641.848 / 50.063.860 = 57,210627%` do universo (sequência exata: pares 40.325.950 → +soma 34.308.899 → +metade baixa 30.756.059 → +01–10 29.977.747 → +blocos 28.641.848). A faixa de soma 130–249 cobre 86,448% do histórico 1–3055 e 85,256% do universo (a v2.0 original dizia 90,2%, erro aritmético corrigido).

### Opções lúdicas (padrão **OFF**)

- `repeatPreviousDraw`: exige `ticket ∩ draw(T−1) ≠ ∅`. Copy: aproximadamente metade dos sorteios repete naturalmente ao menos uma dezena do concurso anterior (histórico 48,101% vs 48,412% combinatório); muda o perfil do jogo, não a probabilidade.
- `requireLow10`: exige `1 ≤ count(01..10) ≤ 2` (sem a opção vale `0..2`). Histórico 70,049% vs 68,259% combinatório — não apresentar como previsão.

## 6. Geração simultânea da carteira

Candidatos: para cada padrão exigido pela alocação (§4) escolher as quantidades G1/G2/G3, garantir seis dezenas distintas, aplicar filtros padrão e opções ligadas, e garantir unicidade global.

Otimização **lexicográfica** aprovada:

1. exatamente N jogos;
2. alocação de grupos exata (§4);
3. minimizar desequilíbrio de exposição entre as 60 dezenas (meta `N/10` por dezena; sem exigir igualdade impossível);
4. minimizar a soma das interseções entre pares;
5. minimizar a maior interseção entre qualquer par;
6. F4 apenas como desempate final determinístico entre soluções estruturalmente equivalentes.

**A frequência histórica individual nunca vira score** depois que a pertença ao grupo foi determinada. F5 pode ser reportada, mas não compete no score principal. Não fixar um "máximo aceitável" universal de sobreposição: reportar média, máxima e histograma. Para F5, evitar pares com interseção ≥4 quando viável.

Avaliação final (F4/F5/F6, sobreposição, exposição, baseline) usa o domínio Mega existente, mantendo `exact`/`estimated` conforme as políticas atuais, e permanece separada do método heurístico de busca.

## 7. Seed e auditoria

Mesmos dataset snapshot, concurso-alvo, versão, N, opções, seed e preset ⇒ mesma saída. O audit snapshot registra: `strategyId`, `strategyVersion`, `targetContest`, `windowFirstContest`, `windowLastContest`, hash/versão do dataset, frequências 1..60, G1/G2/G3, regra de desempate, alocação de padrões, filtros ativos, seed, método de geração e método de avaliação.

## 8. Erros estruturados

`ROLLING20_INCOMPLETE_HISTORY_WINDOW`, `ROLLING20_INSUFFICIENT_SEEN_NUMBERS`, `ROLLING20_NO_VALID_CANDIDATE`, `ROLLING20_NO_VALID_PORTFOLIO_FOUND`, `ROLLING20_INVALID_TARGET_CONTEST`. A UI converte em mensagens claras, sem stack trace.

## 9. Conclusões aprovadas da auditoria

- Sem capacidade preditiva demonstrada: G1 teve média 1,9875 dezenas no resultado seguinte (esperado 2,0000; `p=0,532`); G2 0,7295 vs 0,7427 (`p=0,343`); G3 3,2830 vs 3,2573 (`p=0,224`). Nenhuma janela testada (5–200) mostrou sinal consistente; 20 fica por continuidade/identidade da estratégia, não por superioridade demonstrada.
- A tabela "P(4+ acertos) por composição" da v2.0 era produto indevido de duas probabilidades e foi removida; o contador de 2.973 pares não era reproduzível (o correto é `3055 − 20 = 3.035`).
- Backtest exploratório N=100: Quadra+ Rolling vs uniforme, IC95% inclui zero — **sem evidência histórica de superioridade de premiação**. O valor da estratégia está na organização da carteira (exposição/sobreposição), não em previsão.
- Benchmarks exploratórios de carteira (protótipo independente, N=100, janela 3036–3055): proporcional ≈ uniforme diversificado (F4 4,3060% vs 4,3093%; interseção média 0,546; DP de exposição 0,344) e melhor que 2-0-4 rígido (F4 4,2808%; interseção 0,681; DP 4,728). **Não são oráculos**: o otimizador TypeScript pode usar outra busca heurística, desde que preserve os invariantes.
- Viabilidade: alocação proporcional N=100 exercitada em 3.035 janelas, 0 falhas, pior caso 2,17 tentativas por jogo aceito.

### Contagens de candidatos (janela 3036–3055, alvo 3056, antes → depois dos filtros)

| Composição | Antes | Depois | Sobrevivência |
|---|---:|---:|---:|
| 2-0-4 | 5.206.950 | 3.075.060 | 59,06% |
| 2-1-3 | 7.714.000 | 4.466.773 | 57,90% |
| 3-0-3 | 4.628.400 | 2.807.575 | 60,66% |
| 1-1-4 | 5.481.000 | 3.044.048 | 55,54% |
| 4-0-2 | 2.107.575 | 1.253.007 | 59,45% |
| 4-1-1 | 1.453.500 | 803.616 | 55,29% |

### Fixture de grupos (alvo 3056, base 1–3055, janela 3036–3055)

- G1 (20): 02 11 16 21 24 30 33 35 36 38 39 40 43 48 49 50 53 54 55 58
- G2 (10): 07 09 19 28 32 34 41 45 56 59
- G3 (30): 01 03 04 05 06 08 10 12 13 14 15 17 18 20 22 23 25 26 27 29 31 37 42 44 46 47 51 52 57 60

Como `g2 = 10`, qualquer N usa somente 2-1-3. O dataset atual do repositório já passou do concurso 3055; para reproduzir o fixture, **truncar** o dataset em 3055 (ou usar alvo 3056 sobre base truncada em 3055) — isso é também o teste de no-look-ahead. Os grupos do fixture **não** podem ser constantes de produção.

## 10. Perfil legado 2-0-4

Não faz parte da UI inicial. Se um dia exposto (`classic204`): todos os jogos 2 G1 / 0 G2 / 4 G3, mesmos filtros e otimização, com aviso "2-0-4 não demonstrou aumentar a probabilidade de Quadra ou melhor".

## 11. Copy de UI (sem previsão nem promessa de chance)

- Título oficial: **"Organizar pelo histórico recente"** ("Organizar" descreve o papel do histórico sem sugerir previsão; o equilíbrio estrutural aparece no resumo/ajuda, não no título); badge "Estratégia personalizada"; nome técnico "Rolling 20 Balanceada v2.1".
- Resumo sugerido: "Usa os 20 concursos anteriores para formar três grupos e organizar jogos com exposição equilibrada e controle de repetição entre eles."
- "Como funciona?": os três grupos são recalculados a cada concurso e servem para variar a estrutura da carteira; depois a busca distribui melhor as dezenas e reduz a sobreposição. O histórico organiza a carteira, mas não prevê o próximo sorteio nem torna uma dezena mais provável.
- Detalhes técnicos: identificador `megasena.rolling_20_v2`, versão `2.1.0`, histórico "20 concursos anteriores", evidência "Estrutural", otimiza "exposição, sobreposição; F4 como desempate".
- Disclaimers: não prevê o próximo sorteio nem altera a probabilidade de uma combinação individual; o histórico define grupos rotativos, não dezenas mais prováveis; filtros estruturais não aumentam a chance individual.
- **Proibido:** "maior chance de ganhar" pela janela; "números quentes/frios/atrasados"; "2-0-4 é a composição vencedora"; "os filtros aumentam a probabilidade"; "evita dividir prêmio" (exigiria dados de comportamento de apostadores); "IA prevê"; ROI/resultado líquido.

## 12. Critérios de aceite da implementação futura

1. Reproduz exatamente o fixture de grupos do alvo 3056 (base truncada em 3055).
2. No-look-ahead por teste de base fisicamente truncada (mesmos grupos, padrões e jogos para o mesmo seed; mutar concursos posteriores não altera a saída).
3. Alocação proporcional correta para vários `g2` e N (incluir os exemplos da §4 e casos de meio-ponto).
4. Os cinco filtros validados; `10-11-12` é um bloco.
5. Sem jogos duplicados.
6. Grupos/padrões/filtros/seed no audit snapshot.
7. Os 24 testes do oráculo Mega permanecem intactos e as quatro estratégias Mega existentes não mudam de resultado.
8. Testes de integração, worker e E2E passam; sem linguagem preditiva.
9. Nenhum grupo do fixture como constante de produção.
10. `Strategy Registry` declara exatamente as capacidades da §1; `hard constraints` nunca relaxadas silenciosamente.

## 13. Limitações conhecidas

- Sem evidência de vantagem preditiva ou de premiação; a vantagem é estrutural (cobertura conjunta/diversificação).
- Sem dezenas fixas/excluídas na versão inicial (conflitam com as cotas de grupo; exigiriam solver de viabilidade específico).
- Benchmarks de carteira são exploratórios; o algoritmo exato de busca é livre.
- Poder estatístico baixo para comparar premiação em carteiras pequenas (com 3 jogos por concurso, esperam-se ~3,96 concursos com Quadra+ em 3.035).
