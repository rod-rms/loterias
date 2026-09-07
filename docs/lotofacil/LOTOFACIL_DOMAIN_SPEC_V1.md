# Lotofácil Domain Specification — v1.1

## 1. Universo

- dezenas 1..25;
- aposta simples: 15 distintas;
- `M=C(25,15)=3.268.760`.

Para `N` jogos distintos:

```text
F15 = N / 3.268.760
```

## 2. Métricas

- F11, F12, F13, F14, F15;
- nenhum 11+;
- quantidade esperada de jogos com exatamente 11..15;
- exposição por dezena;
- matriz/histograma de interseções;
- baseline uniforme;
- status/método de avaliação;
- método de otimização separado.

## 3. Contagens individuais

```text
11: 286.650
12:  54.600
13:   4.725
14:     150
15:       1
```

Acumulados:

```text
11+ = 346.126
12+ =  59.476
13+ =   4.876
14+ =     151
15  =       1
```

## 4. Baseline uniforme

Para N jogos distintos uniformemente escolhidos e `K_h` resultados favoráveis a uma aposta fixa:

```text
F_h_baseline = 1 - C(M-K_h, N) / C(M, N)
```

quando a comparação for irrestrita.

Sob restrições explícitas, preferir controle uniforme reproduzível sob as mesmas restrições em vez de usar baseline irrestrita como equivalente.

## 5. Representação

Bitmask de 25 bits pode usar `number`/`Uint32` com utilitários isolados e testes ou `bigint`. Não espalhar bitwise pela UI.

## 6. Avaliação

O universo permite enumerador canônico de 3.268.760 resultados.

A implementação deve benchmarkar:

- máscaras pré-geradas;
- typed arrays;
- bitsets de cobertura;
- união de regiões favoráveis.

A avaliação final deve retornar status explícito.

## 7. API

```ts
generateLotofacilPortfolio(input)
evaluateLotofacilPortfolio(tickets, options)
validateLotofacilPortfolio(tickets)
```

Adapters:

```ts
generateRmsV2(...)
generateMaxDiversification(...)
generateMaxCoverage11(...)
generateMaxCoverage12(...)
generateUniformRandom(...)
```

## 8. Validação de restrições

Para `f` fixas e `e` excluídas:

```text
maxDistinct = C(25-f-e, 15-f)
```

Rejeitar N maior que `maxDistinct`.

Regras mínimas:

- fixas únicas, 1..25;
- excluídas únicas, 1..25;
- conjuntos disjuntos;
- `f<=15`;
- `25-e>=15`;
- cada jogo contém todas as fixas e nenhuma excluída.

## 9. RMS v2

Fonte canônica: `reference/lotofacil/Lotofacil_Estrategia_Revisada_v2_Concurso_3780.md`.

### Dados

Usar somente os 20 concursos anteriores ao alvo. Nunca consultar o resultado do concurso-alvo durante geração.

### Pools

- A 15;
- B 5;
- C 5;
- empates de fronteira entram no processo de busca.

### Padrões

```text
J1 9-3-3
J2 8-3-4
J3 8-4-3
J4 10-2-3
J5 10-3-2
J6 9-4-2 ou 9-2-4
```

### Restrições duras da carteira RMS

- 6 jogos distintos;
- padrões A-B-C;
- 10 dezenas em 3 jogos e 15 em 4;
- interseção de cada par entre 7 e 9;
- paridades como multiset `{5,6,7,7,8,9}`;
- contagens 20–25 como multiset `{2,3,3,4,4,5}`;
- 4–7 dezenas 01–09 em cada jogo;
- sequência máxima <=7;
- 01,02,13,17 em 3 ou 4 jogos;
- ao menos um jogo sem 01/02;
- ao menos um jogo sem 13/17.

### Objetivo de desempate RMS

Depois de cumprir todas as restrições duras:

1. minimizar soma de `abs(intersection_ij - 8)`;
2. minimizar maior `abs(intersection_ij - 8)`;
3. preferir a variante J6 que produzir o menor score anterior;
4. desempatar por ordem canônica determinística derivada de uma seed estável da forma `rms-v2:<contest>:<algorithmVersion>`.

Não usar F11 ou qualquer informação do resultado-alvo como critério oculto da RMS v2.

### Falha

Se nenhuma carteira válida for encontrada dentro da política de busca configurada, retornar erro estruturado `RMS_NO_VALID_PORTFOLIO_FOUND`. Não relaxar regras sem criar nova versão de estratégia.

### Fixture 3780

A carteira original permanece fixture de avaliação e deve reproduzir seus invariantes e coberturas. O gerador não é obrigado a reproduzir os mesmos seis jogos se existir outro desempate válido, mas precisa ser determinístico pela versão/seed.

## 10. Diversificação

Para `P=15N`, alvo equilibrado de exposição.

Prioridade:

1. menor `sum C(r_i,2)`;
2. menor soma das interseções;
3. menor interseção máxima;
4. maior F11;
5. seed.

Sob fixas/excluídas, o alvo precisa ser recalculado respeitando as restrições e não pode fingir que o equilíbrio irrestrito continua possível.

## 11. Cobertura 11+/12+

Busca inicial: gulosa + local search.

Score principal: cobertura direta.

Guardar:

- método de busca;
- preset;
- iterações/candidatos reais;
- seed;
- melhor score encontrado;
- método de avaliação final.

Nunca rotular globalmente como “ótimo” sem prova.

## 12. Aleatória

Uniforme, distinta, sem filtros ocultos, seed opcional/gerada.

## 13. Testes

- M;
- contagens 11..15;
- baseline;
- F15=N/M;
- canonicalização;
- duplicatas;
- restrições/viabilidade combinatória;
- relabeling para estratégias sem histórico/labels;
- fixture RMS 3780;
- pools da janela 3760–3779;
- ausência de look-ahead;
- RMS rejeita N !=6;
- RMS não relaxa regras silenciosamente;
- seed/reprodutibilidade;
- status otimização vs avaliação.
