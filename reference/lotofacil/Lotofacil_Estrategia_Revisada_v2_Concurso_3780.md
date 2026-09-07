# Projeto Lotofácil — Estratégia Revisada v2

**Status da base:** concursos 1 a 3779  
**Último resultado disponível:** concurso 3779, de 03/09/2026  
**Janela atual de formação:** concursos 3760 a 3779  
**Próximo concurso tratado neste documento:** **3780**  
**Data da revisão:** 04/09/2026

> **Este documento substitui integralmente o contexto anterior do projeto.** Não carregar decisões antigas, resultados de apostas passadas, pools antigas, obrigatoriedades superadas ou hipóteses que tenham sido corrigidas nesta revisão.

---

## 1. Objetivo e limite da estratégia

A estratégia organiza seis jogos de 15 dezenas como uma **carteira diversificada**, usando uma divisão A-B-C calculada sobre os 20 concursos anteriores.

Ela busca:

- reduzir redundância entre os seis jogos;
- distribuir melhor a exposição às 25 dezenas;
- cobrir diferentes estruturas de paridade e faixas numéricas;
- aplicar critérios reproduzíveis e auditáveis.

Ela **não prevê o próximo sorteio**, não altera a probabilidade de uma combinação individual e não transforma a Lotofácil em investimento. O orçamento deve ser fixado antes das apostas, sem aumento para recuperar perdas.

---

## 2. Principal conclusão da auditoria estatística

A auditoria utilizou **3.759 avaliações walk-forward**, dos concursos 21 a 3779. Em cada avaliação, as pools foram calculadas somente com os 20 concursos anteriores ao resultado testado.

### 2.1 Os seis padrões A-B-C são úteis para diversificar, não para prever

Os seis padrões usados cobriram **60,79%** dos resultados históricos avaliados. A cobertura combinatória esperada para esses mesmos padrões é **61,03%**.

A proximidade entre os dois valores mostra que a cobertura decorre essencialmente da estrutura combinatória das pools de tamanhos 15, 5 e 5. Não apareceu vantagem preditiva relevante da janela móvel.

### 2.2 A Pool A não apresentou superioridade no concurso seguinte

Média de dezenas de cada pool presentes no resultado seguinte:

| Pool | Média esperada | Média observada | Taxa por dezena |
|---|---:|---:|---:|
| A — 15 dezenas | 9,000 | 8,992 | 59,95% |
| B — 5 dezenas | 3,000 | 3,018 | 60,35% |
| C — 5 dezenas | 3,000 | 2,990 | 59,80% |

As três taxas ficaram próximas dos **60%** esperados para qualquer dezena em um resultado de 15 números entre 25.

**Decisão:** manter a janela de 20 concursos como mecanismo de classificação e rotação, mas não tratar A como “mais provável” nem B como “atrasada”.

### 2.3 Empates nas fronteiras são a regra, não a exceção

No backtest:

- empate no corte A/C: **71,93%** das janelas;
- empate no corte C/B: **68,85%**;
- ao menos um corte empatado: **91,67%**.

**Decisão:** dezenas empatadas devem ser tratadas como uma faixa de fronteira. A alocação final entre as pools deve favorecer o equilíbrio dos seis jogos, sem alegar superioridade probabilística entre dezenas com a mesma frequência.

### 2.4 Incluir cinco pares é estatisticamente justificável

| Faixa de pares | Cobertura histórica | Cobertura combinatória |
|---|---:|---:|
| 6 a 9 pares | 88,75% | 88,93% |
| 5 a 9 pares | 95,85% | 95,86% |

**Decisão:** reservar **um dos seis jogos com cinco pares**. Os demais devem cobrir 6, 7, 7, 8 e 9 pares, evitando concentração excessiva em uma única faixa.

### 2.5 A regra antiga de 3 ou 4 dezenas entre 20 e 25 era restritiva

A faixa de 3 ou 4 dezenas entre 20 e 25 cobre somente cerca de **65,51%** das combinações possíveis e **66,40%** do histórico avaliado.

**Decisão:** distribuir nos seis jogos as quantidades **2, 3, 3, 4, 4 e 5**. Assim, a carteira também protege os cenários com duas ou cinco dezenas finais.

### 2.6 01/02 e 13/17 não possuem vantagem própria

Para qualquer dupla fixa de dezenas:

- as duas aparecem juntas em **35%** das combinações;
- ao menos uma aparece em **85%**;
- nenhuma aparece em **15%**.

Logo, os percentuais observados para 01/02 e 13/17 não demonstram uma característica especial desses números.

**Decisão:** remover obrigatoriedades rígidas por jogo. Cada uma das dezenas 01, 02, 13 e 17 deve aparecer em três ou quatro jogos, com pelo menos um jogo sem 01/02 e um jogo sem 13/17.

### 2.7 Regras estruturais que continuam justificadas

A faixa de **4 a 7 dezenas entre 01 e 09** cobriu **91,54%** do histórico avaliado, muito próxima da cobertura combinatória de **91,28%**.

A regra de **sequência consecutiva máxima de 7** cobriu **94,71%** do histórico, diante de uma cobertura combinatória de aproximadamente **93,46%**.

**Decisão:** manter as duas regras como filtros estruturais amplos. Continuar sem regra de gap máximo, pois a distância visual entre dezenas não fornece vantagem preditiva demonstrada.

### 2.8 Correção conceitual sobre a chance de 15 acertos

Acertar previamente uma classe A-B-C não multiplica a chance real de jackpot antes do sorteio. A chance de uma combinação específica continua sendo:

`1 / C(25,15) = 1 / 3.268.760`

Com seis jogos simples e distintos:

`6 / 3.268.760 ≈ 1 em 544.793`

Os padrões ajudam a organizar a carteira. Eles não tornam uma combinação específica mais provável.

---

## 3. Estratégia operacional revisada

### 3.1 Formação das pools

Usar os **20 concursos imediatamente anteriores** ao concurso-alvo:

- **Pool A:** 15 dezenas selecionadas da faixa mais frequente;
- **Pool B:** 5 dezenas selecionadas da faixa menos frequente;
- **Pool C:** 5 dezenas intermediárias restantes.

Quando houver empate em um corte, registrar explicitamente as dezenas empatadas. O desempate será feito durante a otimização conjunta dos seis jogos.

### 3.2 Padrões A-B-C

| Jogo | Padrão |
|---|---:|
| J1 | 9-3-3 |
| J2 | 8-3-4 |
| J3 | 8-4-3 |
| J4 | 10-2-3 |
| J5 | 10-3-2 |
| J6 | 9-4-2 ou 9-2-4 |

Os padrões 9-4-2 e 9-2-4 têm a mesma probabilidade combinatória. Para cada rodada, escolher a variante do J6 que gerar o melhor equilíbrio global. No concurso 3780 foi usado **9-4-2**.

### 3.3 Restrições por jogo

Cada jogo deve:

- conter exatamente 15 dezenas distintas;
- cumprir seu padrão A-B-C;
- ter de 4 a 7 dezenas entre 01 e 09;
- ter sequência consecutiva máxima de 7;
- não usar regra de gap máximo.

### 3.4 Restrições da carteira de seis jogos

O conjunto deve buscar simultaneamente:

- cada uma das 25 dezenas presente em **3 ou 4 jogos**;
- paridade distribuída como **5, 6, 7, 7, 8 e 9 pares**;
- dezenas 20-25 distribuídas como **2, 3, 3, 4, 4 e 5**;
- interseção preferencial de **8 dezenas** entre cada par de jogos;
- faixa aceitável de interseção: 7 a 9;
- nenhum jogo duplicado;
- 01, 02, 13 e 17 presentes em 3 ou 4 jogos cada;
- ao menos um jogo sem 01 e 02;
- ao menos um jogo sem 13 e 17.

As características extremas devem ficar, quando possível, em jogos diferentes: o jogo de cinco pares não deve ser também, automaticamente, o único jogo com duas ou cinco dezenas finais.

---

## 4. Janela atual — concursos 3760 a 3779

### 4.1 Frequência das dezenas

| Dezena | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Frequência | 10 | 11 | 15 | 13 | 16 | 10 | 10 | 11 | 14 | 12 | 11 | 10 | 13 |

| Dezena | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Frequência | 12 | 14 | 13 | 13 | 11 | 9 | 8 | 14 | 9 | 14 | 13 | 14 |

### 4.2 Empates de fronteira

**Fronteira A/C — frequência 11:** 02, 08, 11 e 18.  
Uma dessas dezenas precisava completar A; as outras três permaneceriam em C.

**Fronteira C/B — frequência 10:** 01, 06, 07 e 12.  
Duas dessas dezenas precisavam ficar em C e duas em B.

A configuração adotada permitiu cumprir exatamente as metas de exposição e sobreposição. Isso não significa que 02 seja mais provável que 08, 11 ou 18, nem que 01/06 sejam mais prováveis que 07/12.

### 4.3 Pools adotadas para o concurso 3780

**Pool A — 15 dezenas**  
02, 03, 04, 05, 09, 10, 13, 14, 15, 16, 17, 21, 23, 24, 25

**Pool B — 5 dezenas**  
07, 12, 19, 20, 22

**Pool C — 5 dezenas**  
01, 06, 08, 11, 18

---

## 5. Jogos sugeridos para o concurso 3780

### J1 — padrão 9-3-3

**03 · 05 · 06 · 07 · 08 · 09 · 10 · 13 · 14 · 16 · 17 · 18 · 19 · 20 · 23**

### J2 — padrão 8-3-4

**01 · 05 · 06 · 07 · 09 · 10 · 11 · 12 · 15 · 17 · 18 · 19 · 21 · 24 · 25**

### J3 — padrão 8-4-3

**02 · 03 · 04 · 06 · 07 · 10 · 11 · 12 · 15 · 16 · 18 · 20 · 21 · 22 · 23**

### J4 — padrão 10-2-3

**02 · 03 · 04 · 07 · 08 · 09 · 11 · 13 · 14 · 15 · 17 · 18 · 22 · 24 · 25**

### J5 — padrão 10-3-2

**01 · 03 · 04 · 05 · 08 · 10 · 12 · 13 · 16 · 17 · 20 · 21 · 22 · 24 · 25**

### J6 — padrão 9-4-2

**01 · 02 · 05 · 09 · 11 · 12 · 13 · 14 · 15 · 16 · 19 · 20 · 22 · 23 · 25**

---

## 6. Validação dos jogos

| Jogo | A-B-C | Pares | 01-09 | 20-25 | Maior sequência | Proteção estrutural |
|---|---:|---:|---:|---:|---:|---|
| J1 | 9-3-3 | 7 | 6 | 2 | 6 | sem 01/02 |
| J2 | 8-3-4 | 5 | 5 | 3 | 4 | proteção de 5 pares |
| J3 | 8-4-3 | 9 | 5 | 4 | 4 | sem 13/17 |
| J4 | 10-2-3 | 7 | 6 | 3 | 3 | 13 e 17 presentes |
| J5 | 10-3-2 | 8 | 5 | 5 | 3 | proteção de 5 finais |
| J6 | 9-4-2 | 6 | 4 | 4 | 6 | 01 e 02 juntos |

Todos os critérios definidos para esta rodada foram cumpridos.

### 6.1 Exposição das 25 dezenas

**Presentes em 3 jogos:** 01, 02, 04, 06, 08, 14, 19, 21, 23 e 24.  
**Presentes em 4 jogos:** 03, 05, 07, 09, 10, 11, 12, 13, 15, 16, 17, 18, 20, 22 e 25.

Como existem 90 posições nos seis jogos, a distribuição 10 dezenas × 3 aparições e 15 dezenas × 4 aparições é perfeitamente equilibrada.

### 6.2 Sobreposição entre jogos

Todos os **15 pares possíveis de jogos** compartilham exatamente **8 dezenas**.

Esse resultado reduz a redundância sem tentar eliminar uma sobreposição que é inevitável quando seis jogos de 15 dezenas são formados dentro de um universo de apenas 25.

---

## 7. Cobertura combinatória desta carteira

Considerando todos os **3.268.760** resultados possíveis, o melhor resultado entre os seis jogos atingiria:

| Faixa alcançada por ao menos um jogo | Cobertura |
|---|---:|
| 11 ou mais acertos | 56,31% |
| 12 ou mais acertos | 10,92% |
| 13 ou mais acertos | 0,895% |
| 14 ou mais acertos | 0,0277% |
| 15 acertos | 0,0001836% — aproximadamente 1 em 544.793 |

O principal ganho da formação conjunta está na diversificação para 11 e 12 acertos. O efeito sobre 13, 14 e 15 acertos é muito pequeno ou inexistente em relação a quaisquer outros seis jogos distintos.

---

## 8. Procedimento para os próximos concursos

Quando uma nova planilha for recebida:

1. identificar o concurso mais recente e definir o concurso-alvo como `último + 1`;
2. usar somente os 20 resultados anteriores ao concurso-alvo;
3. recalcular a frequência das 25 dezenas;
4. identificar e registrar os empates nos cortes A/C e C/B;
5. montar as pools, permitindo que o desempate seja decidido pela otimização conjunta;
6. gerar os seis jogos simultaneamente, e não um de cada vez;
7. cumprir os padrões A-B-C e as restrições da carteira;
8. validar cada jogo e todas as 15 interseções entre pares de jogos;
9. apresentar os jogos em ordem crescente e indicar claramente o concurso;
10. invalidar pools e jogos anteriores assim que um novo resultado entrar na base.

### Prioridades do otimizador

1. cumprir os seis padrões A-B-C;
2. usar todas as 25 dezenas três ou quatro vezes;
3. manter interseção de oito dezenas entre pares, ou o mais próximo possível;
4. cumprir as distribuições de pares e de dezenas 20-25;
5. cumprir baixos 01-09 e sequência máxima;
6. equilibrar 01, 02, 13 e 17;
7. escolher entre 9-4-2 e 9-2-4 para o J6 pela qualidade global da carteira.

---

## 9. Dados que precisam passar a ser registrados

A planilha de resultados oficiais não contém o histórico completo dos jogos efetivamente apostados. Portanto, ainda não é possível concluir se a estratégia superou carteiras aleatórias equivalentes em premiação ou retorno financeiro.

A partir do concurso 3780, registrar para cada rodada:

- concurso e data;
- janela de 20 concursos utilizada;
- frequências e pools A/B/C;
- empates e critério de desempate;
- seis jogos gerados;
- acertos de cada jogo;
- valor total apostado;
- prêmio bruto;
- resultado líquido;
- comparação com uma amostra de carteiras aleatórias de seis jogos.

Somente esse histórico permitirá avaliar desempenho real, volatilidade e eventual diferença em relação a um controle aleatório com o mesmo custo.

---

## 10. Regras que não devem retornar sem nova evidência

- tratar dezenas da Pool A como mais prováveis no concurso seguinte;
- obrigar 01 e 02 em jogos específicos;
- obrigar 13 ou 17 em jogos específicos;
- limitar todos os jogos a três ou quatro dezenas entre 20 e 25;
- excluir jogos com cinco pares;
- criar regra de gap máximo;
- afirmar que acertar um padrão A-B-C multiplica a chance real de 15 acertos;
- alterar a estratégia para perseguir oscilações de poucos concursos.

Qualquer futura mudança deve ser apoiada por backtest walk-forward, comparação combinatória e, quando houver histórico suficiente, comparação com carteiras aleatórias de mesmo custo.
