# RMS-201 — Experimento histórico: desempate multi-horizonte 20+50

Status deste documento: **relatório de pesquisa, exigido pela DEC-017 como pré-condição** para que a RMS-201 (regra candidata de desempate) possa sequer ser considerada para implementação. Nenhum código de produção foi alterado para produzir este relatório. Nenhuma decisão de roadmap é tomada aqui — a leitura e a decisão (seguir, não seguir, ou pedir mais dados) são do product owner.

## 1. O que está sendo testado

A regra candidata (RMS-201) não substitui a janela de 20 concursos, que continua soberana em toda a RMS v2. Ela só age quando dois ou mais números **já empatam** em frequência na janela de 20, exatamente na fronteira de um pool (posição 15 → A/C, ou posição 20 → C/B). Hoje esse empate é resolvido por uma seed pseudo-aleatória. A regra candidata propõe resolvê-lo, antes de cair na seed, comparando a frequência desses números específicos na janela de 50 concursos anteriores.

Três versões foram comparadas para cada concurso-alvo simulado:

- **Versão A** — comportamento atual em produção: `buildPools` real, importado diretamente de `src/modules/lotofacil/domain/rms.ts`, sem nenhuma modificação. Empates resolvidos por seed.
- **Versão B** — candidata: mesmo agrupamento por frequência de 20, mas o desempate dentro de cada grupo empatado usa primeiro a frequência de 50; um empate residual (mesma frequência em 50 também) cai na seed, exatamente como a Versão A resolveria qualquer empate.
- **Versão R** — controle "baseline aleatório": mesmo `buildPools` real da Versão A, mas com uma seed **independente**, não relacionada à janela de 50. Existe só para dar contexto: se A e B diferem tanto quanto A e R diferem entre si, a diferença A↔B não é atribuível ao sinal da janela de 50 — é só "ruído de qualquer desempate diferente".

## 2. Metodologia e limitações declaradas

- Script isolado, não versionado como feature: [`scripts/research/rms201_experiment.ts`](../../scripts/research/rms201_experiment.ts), executado com `npx tsx`, importando `buildPools`, `computeFrequencies`, `targetExposureSplit` (produção, sem cópia) e `assignPoolToBucketsWithExposureMap` (produção, sem cópia).
- **No-look-ahead estrito (DEC-014):** para cada concurso-alvo `T`, as janelas de 20 e de 50 usam somente concursos `< T`. O resultado real de `T` só é usado depois, para contar acertos — nunca para montar os pools.
- Os seis padrões fixos J1–J6 (9-3-3, 8-3-4, 8-4-3, 10-2-3, 10-3-2, 9-4-2/9-2-4) foram copiados literalmente de `docs/lotofacil/LOTOFACIL_DOMAIN_SPEC_V1.md §9` como tabela pública e reutilizados para montar as seis apostas de cada carteira, usando o mesmo primitivo de atribuição por quota (`assignPoolToBucketsWithExposureMap`) e a mesma meta de exposição por paridade/faixa 20–25 (`targetExposureSplit`) que a produção usa.
- **Limitação metodológica explícita:** o script reproduz a montagem estrutural (quotas por pool, meta de exposição 3×4 por paridade/faixa) mas **não** reproduz `localSearchRepair` — o passo de refinamento interno da produção que ajusta interseção entre pares de jogos e sequências consecutivas. Isso não afeta a comparação de agrupamento/desempate entre A, B e R (o objeto deste experimento), mas significa que as carteiras aqui geradas não são bit-a-bit idênticas ao que a RMS v2 completa produziria em produção hoje. Algumas tentativas de montagem (rejeitadas por não fecharem as quotas dentro do limite de tentativas) foram descartadas e contadas como "não-montada" — ver seção 3.

## 3. Amostra

Dataset real: [`public/data/lotofacil/results.json`](../../public/data/lotofacil/results.json), concursos 1–3790 (o último disponível em 29/09/2026).

**Critério de amostragem, definido antes de rodar o experimento** (para não haver escolha a posteriori dos concursos que favorecem um resultado): amostragem sistemática, um concurso-alvo a cada 10, cobrindo toda a história disponível a partir do primeiro concurso que já tem 50 concursos anteriores completos (concurso 52) até o último concurso publicado (3790). Isso cobre deliberadamente toda a linha do tempo — não apenas um período recente ou um período escolhido por já se saber que teria empates.

| | Valor |
|---|---|
| Primeiro concurso-alvo | 52 |
| Último concurso-alvo | 3790 |
| Passo da amostra | a cada 10 concursos |
| Concursos-alvo solicitados | 374 |
| Concursos-alvo utilizáveis (dados completos) | 374 (nenhum pulado) |
| Carteiras A montadas com sucesso | 334 / 374 |
| Carteiras B montadas com sucesso | 325 / 374 |
| Carteiras R montadas com sucesso | 317 / 374 |

As carteiras não montadas (rejeição por limite de tentativas na busca combinatória simplificada, não um erro estrutural) foram excluídas das métricas 1–4 para o respectivo concurso; não houve nenhum concurso pulado por falta de dados históricos.

## 4. Métrica 1 — Distribuição completa de acertos (11 a 15)

Contagem sobre o total de bilhetes efetivamente gerados em cada versão (6 por carteira montada).

| Acertos | A (n=2004) | B (n=1950) | R (n=1902) |
|---|---|---|---|
| 11 | 177 (8,83%) | 167 (8,56%) | 168 (8,83%) |
| 12 | 29 (1,45%) | 34 (1,74%) | 29 (1,53%) |
| 13 | 1 (0,05%) | 3 (0,15%) | 0 (0,00%) |
| 14 | 0 | 0 | 0 |
| 15 | 0 | 0 | 0 |

As diferenças entre A e B (12: +0,29pp; 13: +0,10pp) são da mesma ordem de grandeza das diferenças entre A e R (12: +0,08pp; 13: −0,05pp), com contagens absolutas de 1 a 4 eventos — não há separação estatística entre "trocar o desempate pela janela de 50" e "trocar o desempate por qualquer outra coisa aleatória diferente".

## 5. Métrica 2 — Melhor bilhete por carteira, A vs. B

Comparação restrita aos 303 concursos-alvo em que **ambas** as versões montaram carteira com sucesso.

| | Valor |
|---|---|
| Concursos comparáveis | 303 |
| Melhor bilhete igual em A e B | 124 (40,9%) |
| Melhor bilhete diferente entre A e B | 179 (59,1%) |

O melhor bilhete da carteira muda de A para B na maioria dos concursos comparáveis — não é um efeito de borda raro. Isso é esperado dado a taxa de empate observada na métrica 5 (92,2%): como quase todo concurso tem empate de fronteira, quase todo concurso tem alguma composição de pool diferente entre A e B, o que realoca qual dos seis bilhetes fixos acaba puxando mais números certos. Isso **não** implica que B acerta mais (ver métrica 1) — só que a identidade do "melhor bilhete" é instável frente à escolha do desempate.

Exemplos (10 primeiros concursos com mudança, de um total de 179):

| Concurso | Melhor A | Melhor B |
|---|---|---|
| 52 | 11 | 10 |
| 72 | 11 | 10 |
| 162 | 10 | 11 |
| 182 | 11 | 10 |
| 192 | 11 | 9 |
| 202 | 12 | 11 |
| 232 | 10 | 11 |
| 242 | 12 | 10 |
| 262 | 10 | 12 |
| 322 | 11 | 10 |

## 6. Métrica 3 — Checagem estrutural J1–J6

| | A | B |
|---|---|---|
| Carteiras verificadas | 334 | 325 |
| Respeitam exatamente o padrão de quotas por pool (9-3-3 / 8-3-4 / 8-4-3 / 10-2-3 / 10-3-2 / 9-4-2 ou 9-2-4) | 334 (100%) | 325 (100%) |

Nenhuma quebra estrutural em nenhuma das duas versões. Isso é o resultado esperado por construção (o primitivo de atribuição por quota rejeita e não retorna uma carteira que não bata exatamente as quotas), mas a checagem foi feita de qualquer forma, de fora, contra as pools e os bilhetes efetivamente produzidos — não é assumido.

## 7. Métrica 4 — Estabilidade dos pools A/B/C entre a Versão A e a Versão B

Para cada um dos 374 concursos-alvo, quantos dos números de cada pool permanecem os mesmos entre a Versão A e a Versão B (médias).

| Pool | Tamanho | Média retida | % retida |
|---|---|---|---|
| A (mais frequentes) | 15 | 14,25 | 95,0% |
| B (menos frequentes) | 5 | 4,33 | 86,7% |
| C (intermediário) | 5 | 3,61 | 72,2% |

Como esperado pela regra candidata (ela só reordena dentro de grupos já empatados em frequência de 20), a maior parte da composição de cada pool é preservada. O pool C — o pool intermediário, espremido entre as duas fronteiras (A/C e C/B) — é o que mais se movimenta, coerente com ele ser o ponto de contato de ambas as fronteiras onde o desempate age.

## 8. Métrica 5 — Taxa de empate na fronteira

| | Taxa |
|---|---|
| Algum empate de fronteira (A/C **ou** C/B) | 92,2% (345/374) |
| Empate especificamente na fronteira A/C (posição 15) | 71,7% (268/374) |
| Empate especificamente na fronteira C/B (posição 20) | 72,7% (272/374) |

**Este é o achado mais importante do experimento.** A hipótese de trabalho inicial (ver `docs/lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md`) tratava o empate de fronteira como uma situação relativamente incomum. Os dados mostram o contrário: em janelas de 20 concursos sobre 25 números, empate de frequência exatamente na fronteira do pool é a **regra**, não a excessão — ocorre em mais de 9 a cada 10 concursos da amostra. Isso muda o enquadramento do problema: a RMS-201 não seria uma correção de borda rara, seria uma regra que age quase sempre que a RMS v2 é executada.

## 9. Métrica 6 — Comparação com o baseline aleatório

Diferença de contagem de acertos em relação à Versão A (mesma base de tickets: A tem 2004, B tem 1950, R tem 1902 — diferenças de totais refletem quantas montagens tiveram sucesso em cada versão, não descartadas seletivamente).

| Acertos | B − A | R − A |
|---|---|---|
| 11 | −10 | −9 |
| 12 | +5 | 0 |
| 13 | +2 | −1 |
| 14 | 0 | 0 |
| 15 | 0 | 0 |

A diferença B−A em 12/13 acertos (+5, +2) é pequena e da mesma ordem que R−A (0, −1) — ou seja, a magnitude do efeito de "trocar o desempate para B (janela de 50)" não se distingue da magnitude do efeito de "trocar o desempate para qualquer coisa diferente e aleatória (R)". Não há, nestes dados, um sinal de que a janela de 50 especificamente carregue informação preditiva que uma troca aleatória de desempate não teria.

## 10. Conclusão

**Os dados NÃO sustentam a hipótese de que o desempate pela janela de 50 (RMS-201) produz carteiras com desempenho de acertos superior ao desempate atual por seed.** A diferença observada em acertos de 12 e 13 entre a Versão A e a Versão B é pequena, ocorre sobre contagens absolutas de poucas unidades, e é estatisticamente indistinguível da diferença observada entre a Versão A e um controle puramente aleatório (Versão R) — exatamente o resultado que a pesquisa exploratória original já havia previsto ("não se alega melhora preditiva").

Isso **não** significa que a RMS-201 seja inútil como decisão de produto: o achado da métrica 5 (empate de fronteira em 92,2% dos concursos da amostra) e da métrica 2 (o melhor bilhete muda em 59,1% dos concursos comparáveis) mostram que a regra teria impacto prático **frequente e não marginal** sobre qual composição de pool e qual bilhete a RMS v2 entrega — só que esse impacto seria sobre **determinismo/estabilidade e não sobre poder preditivo**. Hoje, dois usuários que gerassem a mesma carteira no mesmo concurso poderiam receber pools ligeiramente diferentes por causa da resolução aleatória do empate; a RMS-201 tornaria essa resolução determinística e ancorada num critério auditável (frequência em 50), sem prometer — nem entregar, pelos dados aqui — nenhuma vantagem de acerto.

A decisão de implementar ou não a RMS-201 é, portanto, uma decisão de **produto/transparência** (vale a pena tornar o desempate determinístico e auditável, mesmo sabendo que isso não melhora o acerto?), não uma decisão de **desempenho preditivo** — e cabe ao product owner.

---

Reprodutibilidade: `npx tsx scripts/research/rms201_experiment.ts` regenera [`scripts/research/rms201_experiment_output.json`](../../scripts/research/rms201_experiment_output.json) com os números brutos usados neste relatório.
