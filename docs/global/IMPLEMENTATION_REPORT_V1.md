# Implementation Report — Loterias v1

**Data:** 2026-09-07
**Commit SHA local final:** ver `git log -1` após o commit de fechamento deste relatório (ver seção "Status do push" abaixo para o SHA exato incluído no push).
**Node:** v24.18.0 · **npm:** 11.16.0

## 1. Resumo

A v1 completa do produto Loterias foi implementada de ponta a ponta a partir do starter pack: shell React/Vite/TypeScript, camada compartilhada, domínio Lotofácil criado do zero, domínio Mega-Sena preservado, 9 estratégias do catálogo, persistência local, datasets oficiais completos, testes unitários/integração/E2E, workflows de CI e atualização de dados, e documentação de deploy.

## 2. Dependências principais

```text
react 18, react-dom 18, react-router-dom 6
dexie 4, dexie-react-hooks
zod 3
lucide-react
vite 6, @vitejs/plugin-react
typescript 5.9 (strict)
tailwindcss 3, postcss, autoprefixer
vitest 3, @testing-library/react, @testing-library/jest-dom, fake-indexeddb
@playwright/test 1.49
eslint 9, typescript-eslint 8
```

## 3. Funcionalidades implementadas

- Shell único React/Router com módulos separados `lotofacil/` e `megasena/`.
- Strategy Registry (`src/shared/lib/strategyRegistry.ts`) com 9 `StrategyDefinition` (5 Lotofácil + 4 Mega-Sena); a UI (`GerarPage`, `StrategyCard`, `QuantityBudgetInput`, etc.) é inteiramente dirigida por esses metadados — nenhum `if strategy === ...` espalhado.
- Fluxo Gerar (estratégia → quantidade/orçamento → concurso → opções avançadas → resumo → gerar) para ambas as modalidades, com Web Worker dedicado por modalidade (`src/modules/*/workers/generate.worker.ts`), estágios reais (`preparing/optimizing/evaluating/auditing/done`), sem percentual inventado.
- Resultado: jogos paginados, métricas com status (`exact`/`estimated`/...), overlap, exposição, baseline (rotulada separadamente da estratégia Aleatória), copiar/CSV/JSON, salvar, Nova variação, Reproduzir carteira.
- Comparação (`ComparePanel`): no máximo uma estratégia adicional, mesmo N e mesmas restrições, sem "vencedora absoluta"; RMS só aparece na lista de compatíveis quando N=6.
- Minhas carteiras: filtros (modalidade, apostada), abrir, marcar/desmarcar apostada, conferência contra resultado oficial, exportar/importar backup (com preview de contagem e tratamento de duplicados), apagar tudo com confirmação.
- Metodologia e Sobre com a linguagem exigida (equiprobabilidade, cobertura vs. previsão, exato vs. estimado, etc.) e aviso de jogo responsável em toda tela relevante.
- Validação de viabilidade combinatória (`maxDistinct = C(total-f-e, k-f)`) e do limite declarado por estratégia (`ticketCount.max`) antes de iniciar qualquer busca, nos dois níveis (UI e adapter/domínio).

## 4. Estratégias implementadas

**Lotofácil**
- `lotofacil.rms_v2` — busca estrutural (pools A/B/C + padrões + otimização local) com falha estruturada `RMS_NO_VALID_PORTFOLIO_FOUND`.
- `lotofacil.max_diversification` — balanceamento lexicográfico de exposição/sobreposição.
- `lotofacil.max_coverage_11` / `max_coverage_12` — guloso + busca local sobre amostra de sorteios, avaliação final exata e separada.
- `lotofacil.uniform_random` — uniforme, distinta, sem filtros ocultos.

**Mega-Sena**
- `megasena.max_f4` / `max_f5` — adapters finos sobre `generateMegaSenaPortfolio` (domínio preservado, sem alteração).
- `megasena.max_diversification` — nova, composta sobre funções canônicas já testadas, sem alterar seus resultados.
- `megasena.uniform_random` — usa o gerador uniforme já existente no domínio preservado.

## 5. Datasets

```text
public/data/lotofacil/results.json  — concursos 1 a 3779 (completo, 0 gaps)
public/data/megasena/results.json   — concursos 1 a 3054 (completo, 0 gaps)
public/data/config/game-config.json — Lotofácil R$3,50 / Mega-Sena R$6,00 (referência 2026-09-07, mantida sem alteração; validada contra a fonte oficial durante a implementação)
```

Ambos os datasets foram integralmente baixados/validados via `scripts/data/update-dataset.mjs` diretamente da API oficial da CAIXA (`servicebus2.caixa.gov.br/portaldeloterias/api/...`) durante esta implementação. A API aplicou rate limiting (HTTP 429/403) durante o backfill inicial; o script foi ajustado (concorrência reduzida, backoff, cabeçalhos de navegador) e o backfill foi refeito com sucesso — não há lacunas nos dados finais.

## 6. Testes executados e resultados

```text
npm run lint            → PASS (0 problemas)
npm run typecheck       → PASS (tsc --noEmit, strict)
npm run test:unit       → PASS (75/75 testes, 14 arquivos)
npm run test:mega:oracle→ PASS (24/24 testes legados node:test, preservados sem alteração)
npm run test:lotofacil:oracle → PASS (subconjunto do test:unit; oráculo RMS 3780 incluso)
npm run build           → PASS
npm run test:e2e        → PASS (13/13 cenários Playwright, Chromium)
```

### Status dos 24 testes Mega

Todos os 24 testes originais (`tests/megasena/*.test.ts`, `node:test`) passam, executados via `scripts/megasena/run-tests.mjs` — um runner Node cross-platform criado para este handoff (compila os arquivos legados para CommonJS num diretório temporário e roda `node --test`), porque os testes originais usam `node:test` diretamente e não são reconhecidos pelo runner do Vitest. O script Bash original (`scripts/megasena/run-benchmark.sh`, `run-tests.sh`) foi preservado como referência.

### Status do oráculo Lotofácil

O fixture `tests/lotofacil/fixtures/rms_3780_oracle.json` é reproduzido exatamente: contagens de cobertura (11+=1.840.731, 12+=356.856, 13+=29.256, 14+=906, 15=6), matriz de interseção (diagonal 15, todos os pares 8), exposição (10 dezenas ×3, 15 dezenas ×4) e baseline uniforme N=6 — todos batendo com os valores do fixture via `evaluateExactCoverage`/`evaluateLotofacilPortfolio` (enumeração canônica exata das 3.268.760 combinações). F15 de 6 jogos = 6/3.268.760 confirmado.

O **gerador** RMS v2 (`generateRmsV2`) não é obrigado a reproduzir os mesmos 6 jogos do fixture (conforme a especificação permite), e de fato produz outra solução válida determinística por seed; suas invariantes estruturais (padrões A-B-C, exposição 3/4, interseção 7-9, paridade, faixa 20-25, regras 01/02/13/17) são testadas separadamente em `tests/lotofacil/rmsGenerator.test.ts` sobre a janela real 3760-3779.

### E2E (13 cenários Playwright)

Todos os cenários da seção 28.3 do handoff: home, gerar Lotofácil aleatória, gerar RMS com janela válida, alternar modalidade, gerar Mega aleatória, gerar Mega cobertura, salvar carteira, Minhas carteiras, exportar backup, comparar estratégias, restrição impossível, RMS bloqueada fora de N=6, conferência. Executados com `workers: 1` no Playwright para evitar contenção de CPU entre páginas paralelas que disparam Web Workers pesados simultaneamente.

## 7. Benchmarks

Ver `docs/global/IMPLEMENTATION_BENCHMARKS_V1.md` para os números medidos (avaliação exata Lotofácil por N, presets de cobertura, geração RMS, bundle de produção). O benchmark Mega-Sena pré-existente (`docs/megasena/MEGASENA_BENCHMARKS.md`) foi preservado sem novas medições, pois o domínio não foi alterado.

## 8. Arquivos e workflows criados

```text
.github/workflows/ci.yml            — lint, typecheck, unit, oráculos, build, E2E crítico
.github/workflows/data-update.yml   — atualização diária + workflow_dispatch, commit condicional
scripts/data/update-dataset.mjs     — atualizador cross-platform (fetch + validação + escrita atômica)
scripts/data/validate-dataset.mjs   — validação estrutural usada pelo workflow de dados
scripts/megasena/run-tests.mjs      — runner cross-platform para a suíte node:test preservada
docs/global/DEPLOY_CLOUDFLARE.md
docs/global/IMPLEMENTATION_BENCHMARKS_V1.md
docs/global/IMPLEMENTATION_REPORT_V1.md (este arquivo)
```

Mais a árvore completa `src/modules/lotofacil/**`, `src/modules/megasena/strategies/**` (novo), `src/shared/**`, `src/app/**`, e os testes em `tests/lotofacil/**`, `tests/shared/**`, `tests/integration/**`, `tests/e2e/**`.

## 9. Decisões técnicas

1. **Representação Lotofácil:** bitmask de 25 bits em `number` (cabe em 32 bits assinados), isolada em `bitmask.ts`; nenhuma operação bitwise vaza para UI/adapters.
2. **Avaliação sempre exata:** como `C(25,15) = 3.268.760` é pequeno o suficiente, a avaliação de cobertura/probabilidade da Lotofácil é sempre `exact` via enumeração canônica completa (Gosper's hack para percorrer todas as combinações de 15 bits em ordem), nunca precisando de Monte Carlo — diferente da Mega-Sena, cujo universo de 50M exige a política exact/estimated preservada.
3. **Otimização heurística com amostra, avaliação final exata:** os otimizadores de cobertura 11+/12+ usam um conjunto amostrado de sorteios (não o universo completo) para acelerar a busca gulosa + local, mas a carteira final é sempre avaliada de forma exata e separada — método de otimização e método de avaliação são registrados e exibidos separadamente, nunca colapsados num único selo.
4. **RMS v2 — problema de construção, não apenas de busca:** a primeira implementação da busca local (swap-based) falhava ocasionalmente em convergir para o multiset de paridade/faixa 20-25 exato, mesmo com orçamentos de iteração muito maiores. Causa raiz identificada: a soma agregada de exposição por paridade/faixa é um **invariante fixado pela escolha inicial de quais números recebem exposição 4 (vs. 3)**, porque um swap de busca local só realoca a associação jogo↔número sem alterar a exposição total de nenhum número. A correção foi resolver essa escolha inicial via amostragem rejeitada visando as somas exatas exigidas (`selectExposureHighSets` em `rms.ts`) — depois disso, a busca local converge em dezenas de milissegundos em vez de nunca convergir. Este é o principal "gotcha" combinatório desta implementação e está documentado inline no código.
5. **Compartilhamento seletivo:** o algoritmo de atribuição por grau (Havel-Hakimi-like) usado pelas pools RMS e por ambas as estratégias de diversificação (Lotofácil e Mega-Sena) foi promovido para `shared/lib/degreeAssignment.ts`, pois a semântica é genuinamente idêntica nas duas modalidades. O PRNG seedado (`shared/lib/prng.ts`) também foi promovido pela mesma razão — sem alterar o `random.ts` já existente e testado da Mega-Sena.
6. **Runner de testes Mega cross-platform:** em vez de tentar rodar os testes legados `node:test` sob o Vitest (o que falha silenciosamente — Vitest não reconhece `test()` do módulo `node:test` como seu próprio framework), foi criado `scripts/megasena/run-tests.mjs`, que replica o comportamento do `run-tests.sh` original (compilar para CommonJS, então `node --test`) sem depender de Bash.
7. **Simplificações documentadas na diversificação:** o critério de desempate #4 da especificação (maximizar F11/F4 como último critério lexicográfico) não foi implementado como uma comparação explícita entre múltiplas soluções empatadas nos 3 primeiros critérios — a busca local converge para uma única solução por seed. Isso é uma simplificação aceitável dado "escolha a alternativa mais simples" quando várias implementações válidas existem, mas está registrado aqui como desvio menor.
8. **Comparação de estratégias:** implementada como painel inline no resultado da tela Gerar (`ComparePanel`), não como rota dedicada — a especificação de UX descreve a comparação como uma ação dentro do fluxo Gerar, não como uma tela própria na lista de rotas obrigatórias.

## 10. Desvios da especificação

- Nenhum desvio matemático foi introduzido nas regras canônicas (RMS v2, Mega-Sena, combinatória Lotofácil).
- O preço configurado (R$3,50 / R$6,00, referência 2026-09-07) foi mantido sem alteração — nenhuma fonte oficial consultada durante a implementação indicou um valor diferente.
- Ver item 7.7 acima (desempate #4 de diversificação) como única simplificação de algoritmo registrada.

## 11. Limitações conhecidas

- **Deploy Cloudflare:** não executado (nenhuma credencial disponível no ambiente). Passos manuais completos em `docs/global/DEPLOY_CLOUDFLARE.md`; o build de produção foi validado localmente.
- **Acessibilidade:** cobertura crítica implementada (labels, `aria-*`, foco visível, navegação por teclado, `prefers-reduced-motion`, cor nunca como único indicador), mas não houve auditoria automatizada com ferramenta dedicada (ex. axe-core) nesta entrega.
- **Dark mode:** fora de escopo da v1 (documentado na spec como opcional pós-v1); não implementado.
- **Popularidade experimental Mega-Sena:** não exposta na UI nesta v1 (o domínio já a suporta como `popularityMode: "experimental"`, desligada por padrão); pode ser adicionada em "Opções avançadas" numa iteração futura sem alterar o domínio.
- **Rate limiting da API oficial:** observado durante o backfill inicial (HTTP 429/403 temporário). O atualizador já implementa backoff/retry; se a fonte oficial voltar a limitar agressivamente, `npm run data:update` pode precisar ser executado mais de uma vez.

## 12. Instruções

```bash
npm install
npm run dev        # http://localhost:5173
npm run build && npm run preview
npm test           # unit + oráculo Mega + oráculo Lotofácil
npm run test:e2e   # Playwright (requer `npx playwright install chromium` na primeira vez)
npm run data:update    # atualiza os datasets a partir da fonte oficial
npm run data:validate  # valida a estrutura dos datasets
```

## 13. Status do push

Commits locais criados por marco (bootstrap, comparação/E2E, CI/docs/fixes finais — ver `git log`). Push para `https://github.com/rod-rms/loterias.git` (branch `main`) realizado após todos os itens acima estarem verdes, conforme a Definition of Done.

## 14. v1.1.0 — navegação, transparência de dados e persistência (branch `feat/user-friendly-ux-v1-1`, PR #1)

Trabalho subsequente à v1, feito em branch separada (`feat/user-friendly-ux-v1-1`) e mesclado a `main` como release v1.1.0 — ver `CHANGELOG.md`. Cobre quatro rodadas: (1) UX/copywriting/acessibilidade em linguagem simples; (2) polish a partir de revisão manual; (3) navegação, transparência de origem de dados, e correção de um bug de persistência; (4) correções pontuais de uma segunda revisão manual (back-link em Gerar; "Limpar configuração" deixando de apagar o resultado exibido). Detalhes de UX em `UX_REVIEW_V1_1.md` e `UX_COPY_AND_TERMINOLOGY_V1_1.md`; decisões em `DECISIONS_AND_OPEN_POINTS_V1.md`; modelo de dados em `DATA_AND_PERSISTENCE_V1.md`.

Pontos que valem registro aqui (fora do escopo de UX pura):

- **Bug de persistência corrigido:** `SavedPortfolio.dataset` nunca era de fato preenchido no fluxo de salvar, e `parameters` era reconstruído a partir do formulário ao vivo (`buildRequest()`) em vez de usar a configuração congelada no momento da geração — o que quebraria a auditoria/reprodutibilidade sempre que o usuário editasse o formulário entre gerar e salvar. Corrigido com um modelo de dois retratos (`userInputSnapshot` para detectar desatualização, `resolvedGenerationSnapshot` para salvar/auditoria). Regressão coberta em `tests/app/gerarPageSnapshot.test.tsx` e em E2E.
- **Segundo bug de UX corrigido (pós-revisão manual):** "Limpar configuração" chamava a mesma rotina de descarte do resultado, apagando um resultado já gerado ao resetar o formulário — contrariando a proteção contra resultado desatualizado já aprovada. Corrigido para resetar apenas os campos editáveis, preservando resultado, `lastGeneratedInput` e `resolvedSnapshot`; o aviso de resultado desatualizado passa a aparecer automaticamente.
- **Agenda de atualização de dados revista:** de um cron diário único para seis janelas de verificação pós-sorteio, restritas aos dias em que os sorteios de fato ocorrem (ver `DATA_AND_PERSISTENCE_V1.md` §5.1 e `.github/workflows/data-update.yml`), com supressão de commits de status ruidosos em janelas intermediárias.
- **Novo arquivo `public/data/status.json`** valida via `scripts/data/validate-dataset.mjs` e `dataStatusSchema` (Zod).
- Todos os testes matemáticos/oráculo (Mega e Lotofácil) permaneceram inalterados e verdes durante toda a v1.1.0.

### Totais finais de validação (release v1.1.0)

```text
npm run lint              → PASS
npm run typecheck         → PASS
npm run test:unit         → PASS (113/113)
npm run test:mega:oracle  → PASS (24/24)
npm run test:lotofacil:oracle → PASS (38/38)
npm run build             → PASS
npm run test:e2e          → PASS (41/41)
npm run data:validate     → PASS
```

Estado pronto para release: todos os gates de qualidade verdes na branch `feat/user-friendly-ux-v1-1` antes da fusão com `main`.

## 15. v1.1.1 — validação de concurso, simulação histórica e conferência de resultados

Release de manutenção focada, construída a partir do `main` pós-v1.1.0. Quatro objetivos: validar corretamente o concurso-alvo; suportar simulação histórica segura ("sem espiada ao futuro"); melhorar a conferência de jogos salvos; e pequenos detalhes de transparência (versão visível, explicação de armazenamento local). **Não adiciona premiação/rateio nem cálculo de valores monetários.**

Pontos técnicos que valem registro:

- **`shared/lib/targetContest.ts`** (`validateTargetContest`): validação determinística do concurso-alvo a partir do dataset já carregado — próximo concurso, concurso histórico existente, futuro bloqueado, lacuna bloqueada, valor inválido bloqueado. Ver `PRODUCT_SPEC_V1.md` §7.2.
- **Garantia de "sem espiada ao futuro"**: já era estruturalmente garantida desde a v1 pela função `referenceWindow` (`shared/lib/dataLoaders.ts`), usada pelos adapters de estratégia — o trabalho desta release foi principalmente **provar isso com testes de regressão dedicados** (`tests/lotofacil/noLookAhead.test.ts`, release-blocking): fatiamento do dataset histórico, equivalência entre dataset completo e dataset truncado em `T-1`, e invariância a mutações em concursos posteriores a `T`. Nenhuma mudança de comportamento foi necessária no domínio RMS para satisfazer essa garantia.
- **`shared/lib/resultLabels.ts`**: rótulos de resultado ("Quadra"/"Quina"/"Sena", "11 a 15 acertos") e resumo de melhor(es) jogo(s) com tratamento de empate — puramente derivados de `hitsPerTicket` já existente em `CheckedResult`, sem novos campos persistidos.
- **`shared/components/HistoricalContestNotice.tsx`** e integração em `GerarPage`: mostra o resultado oficial de um concurso histórico como simulação, ou uma nota neutra para o próximo concurso — usando apenas o dataset já carregado.
- **`CarteirasPage`**: a conferência de resultado deixou de resumir em uma frase única; agora mostra resultado oficial, acertos por jogo e melhor(es) jogo(s) juntos. Também corrigido um bug lateral: o painel de detalhe (`selected`) não se atualizava automaticamente após conferir — agora é sincronizado explicitamente.
- **Versão do app**: `package.json` (`1.1.1`) é a única fonte de verdade, injetada via `__APP_VERSION__` (Vite `define`) e consumida por `shared/lib/appVersion.ts`; rodapé atualizado.
- **Compatibilidade retroativa**: `CheckedResult` e `SavedPortfolioDatasetRef` não perderam nem ganharam campos obrigatórios; testes dedicados provam que carteiras/backups no formato anterior continuam legíveis.

### Correções pós-revisão manual (mesma branch/PR, antes da aceitação final)

Duas rodadas de revisão manual no preview Cloudflare do branch encontraram problemas pontuais, corrigidos sem abrir nova rodada de design:

- **Duplicação de rótulo na Lotofácil**: "12 acertos · 12 acertos" podia aparecer porque o rótulo convencional da Lotofácil é textualmente idêntico à frase de contagem de acertos. Corrigido centralizando a apresentação em `formatHitResult(modality, hits)` — usado tanto na exibição por jogo quanto na frase-resumo do melhor jogo — que nunca duplica o sufixo para a Lotofácil.
- **Singular incorreto**: "1 acertos" corrigido para "1 acerto" via `formatHitsCount`, usado por `formatHitResult` e pela função de resumo de empates.
- **Corrida de validação com o carregamento do dataset**: gerar jogos com um concurso já digitado, mas antes do dataset da modalidade terminar de carregar, conseguia pular a validação de concurso-alvo. Corrigido com um estado explícito `datasetLoading`: a geração fica bloqueada com uma mensagem neutra ("Carregando a base de concursos...") até o dataset resolver, e a validação normal assume o controle automaticamente depois disso.

### Aceitação manual (Cloudflare preview)

Aceitação manual completa realizada no preview `https://da55bc53.loterias-bkr.pages.dev` (alias de branch `https://feat-v1-1-1-historical-valid.loterias-bkr.pages.dev`), no commit `fbfa928628cf7cc9922349595138c0a98fa66ec8`. Cobriu: comportamento do próximo concurso; aviso de concurso histórico e exibição do resultado oficial; bloqueio de concursos além de `latestContest + 1`; conferência completa de jogos salvos (números oficiais, acertos por jogo, melhor jogo, empates); rótulos Quadra/Quina/Sena e 11–15 acertos sem duplicação; versão visível no rodapé; e a explicação de armazenamento local.

### Totais finais de validação (release v1.1.1)

```text
npm run lint              → PASS
npm run typecheck         → PASS
npm run test:unit         → PASS (161/161)
npm run test:mega:oracle  → PASS (24/24)
npm run test:lotofacil:oracle → PASS (45/45 — 38 originais + 7 de sem-espiada-ao-futuro)
npm run build             → PASS
npm run test:e2e          → PASS (47/47)
npm run data:validate     → PASS
```

Nenhum teste matemático/oráculo pré-existente foi alterado, enfraquecido ou removido. Nenhuma funcionalidade de valor de prêmio/rateio/pagamento foi adicionada nesta release.
