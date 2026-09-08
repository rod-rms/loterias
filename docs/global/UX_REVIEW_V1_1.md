# UX Review — v1.1 (usability pass)

**Branch:** `feat/user-friendly-ux-v1-1`
**Escopo:** apresentação, arquitetura de informação, acessibilidade e copywriting. Nenhuma mudança em matemática, algoritmos de estratégia, IDs de estratégia, restrições da RMS v2, domínio/oráculos da Mega-Sena, valores de oráculo da Lotofácil, cálculos de probabilidade, datasets, algoritmos de worker, semântica de persistência, preços ou comportamento de reprodutibilidade.

## 1. Arquivos alterados

### Novos

```text
src/shared/components/InfoHelp.tsx
src/shared/components/NumberCustomizer.tsx
src/shared/components/SimpleDiversitySummary.tsx
src/shared/lib/metricPresentation.ts
src/shared/lib/statusPresentation.ts
src/shared/utils/probabilityFormat.ts
tests/shared/probabilityFormat.test.ts
docs/global/UX_COPY_AND_TERMINOLOGY_V1_1.md
docs/global/UX_REVIEW_V1_1.md (este arquivo)
```

### Removidos

```text
src/shared/components/NumberSelector.tsx  (substituído por NumberCustomizer.tsx — ciclo de 3 cliques removido)
```

### Modificados

```text
src/shared/types/strategy.ts                        (+ StrategyUxMetadata / campo ux)
src/modules/lotofacil/strategies/definitions.ts      (+ ux metadata por estratégia)
src/modules/megasena/strategies/definitions.ts       (+ ux metadata por estratégia)
src/shared/components/StrategyCard.tsx               (título/resumo/badge leigos + Detalhes técnicos colapsados)
src/shared/components/StrategyBadge.tsx              (badge simplificado, recebe rótulo pronto em vez de evidence/status)
src/shared/components/QuantityBudgetInput.tsx        (copy humanizada, aria-label explícito)
src/shared/components/QualityPresetSelector.tsx      (Rápida/Equilibrada/Intensiva + InfoHelp + badge "Padrão")
src/shared/components/SeedInput.tsx                  ("Código de reprodução" + InfoHelp)
src/shared/components/MetricCard.tsx                 (formatação adaptativa, InfoHelp, testId)
src/shared/components/MetricStatusBadge.tsx           (rótulos leigos + InfoHelp para exact/estimated/...)
src/shared/components/OverlapSummary.tsx              ("Quanto os jogos repetem dezenas entre si")
src/shared/components/ExposureSummary.tsx             ("Quantas vezes cada dezena aparece")
src/shared/components/BaselineComparison.tsx          ("Comparação com jogos aleatórios equivalentes", formatação adaptativa)
src/shared/components/SavedPortfolioCard.tsx          (título de estratégia leigo em vez do id técnico)
src/shared/components/index.ts                        (novos exports)
src/app/pages/GerarPage.tsx                            (reescrita: 4 passos conceituais, resumo em linguagem natural, resultado com progressive disclosure)
src/app/pages/ComparePanel.tsx                         (nomes leigos, "Comparar com outra opção")
src/app/pages/ModalityHome.tsx                         ("Formas de organizar seus jogos", badges leigos)
src/app/pages/Home.tsx                                 (novo hero/CTA leigos)
src/app/pages/CarteirasPage.tsx                        ("Meus jogos salvos", copy leiga)
src/app/layout/AppShell.tsx                            (nav "Meus jogos salvos")
tests/e2e/critical-flows.spec.ts                       (copy atualizada + 7 novos cenários)
```

## 2. Resumo antes/depois (textual)

| Antes | Depois |
|---|---|
| "1. Estratégia" | "1. O que você quer priorizar?" |
| "2. Quantidade / orçamento" | "2. Quantos jogos você quer gerar?" |
| "Concurso-alvo (apenas contexto)" | "Concurso em que você pretende jogar" (prefill automático do próximo concurso sugerido; RMS mostra "Obrigatório para esta opção.") |
| Seleção de dezenas: 1 clique = fixar, 2 = excluir, 3 = limpar | Dois modos explícitos ("Incluir obrigatoriamente" / "Não usar") + resumo textual sempre visível |
| "Seed" visível no formulário | Escondido em "Configurações avançadas" como "Código de reprodução" |
| "Rápida / Equilibrada / Profunda" | "Rápida / Equilibrada / Intensiva" com pergunta "Quanto tempo o app deve dedicar à busca?" e badge "Padrão" |
| Resumo em `dl` técnico antes de gerar | Frase em linguagem natural: "Você vai gerar 6 jogos da Lotofácil para o concurso 3780 usando Carteira equilibrada (RMS). Custo total: R$ 21,00." |
| Cabeçalho de resultado "Resultado" com seed/método visíveis | "Seus jogos estão prontos" com seed/método/audit movidos para "Detalhes técnicos do resultado" (colapsado) |
| `atLeast11`, `F4`, `baseline` renderizados quase brutos | "Chance de 11 acertos ou mais", "Chance de Quadra ou mais", "Comparação com jogos aleatórios equivalentes" |
| `percent.toFixed(4)` (podia mostrar "0.0000%") | Formatação adaptativa — nunca exibe uma probabilidade não-nula como 0% |
| Badges "ESTRUTURAL"/"MATEMÁTICA"/"BASELINE" | "6 jogos fixos", "Mais diversidade", "Busca otimizada", "Sem filtros" (evidência técnica movida para Detalhes técnicos) |
| "Gerar carteira" / "Salvar carteira" / "Nova variação" / "Reproduzir carteira" / "Minhas carteiras" | "Gerar jogos" / "Salvar estes jogos" / "Gerar outra opção" / "Gerar novamente este mesmo conjunto" / "Meus jogos salvos" |
| Home genérica | Hero "Monte seus jogos com estratégia e transparência" + CTAs "Gerar jogos da Lotofácil/Mega-Sena" |

## 3. Breakpoints testados

Testados manualmente via build de produção + DevTools, e via Playwright com contexto `viewport: 375×812, hasTouch: true` para o cenário de toque:

- 375px (iPhone SE/mini) — sem rolagem horizontal; grade de dezenas usa `grid-cols-8`; cartões de estratégia empilham em coluna única.
- 430px (iPhone padrão maior) — mesmo comportamento, mais respiro.
- 768px (tablet) — cartões de estratégia em 2 colunas (`sm:grid-cols-2`); métricas em 2-3 colunas.
- 1280px+ (desktop) — layout completo, métricas em até 5 colunas (`sm:grid-cols-5`), largura de conteúdo limitada a `max-w-6xl` no shell.

Textos longos (seed hexadecimal, JSON de auditoria) usam `break-all`/`whitespace-pre-wrap` dentro de contêineres com `overflow-x-auto` nos "Detalhes técnicos", evitando estouro de layout.

## 4. Acessibilidade

- `InfoHelp`: abre em clique/toque, hover e foco por teclado; fecha com Escape, clique fora ou perda de foco+hover; `aria-expanded`, `aria-describedby`, `role="tooltip"`. Corrigido um bug real descoberto via E2E: o clique do mouse dispara `focus` antes de `click`, então um `onClick` que alternava (toggle) o estado fechava o popover imediatamente após abri-lo — corrigido tornando clique/hover/foco todos idempotentes (sempre abrem).
- Corrigido aninhamento de `<button>` dentro de `<button>` (HTML inválido) no seletor de modo de personalização de dezenas, que quebrava a árvore de acessibilidade e a computação do nome acessível.
- `NumberCustomizer`: modos exclusivos via `role="radiogroup"`/`role="radio"`; dezenas já usadas no modo oposto ficam `disabled` (não apenas visualmente diferentes); resumo textual nunca depende só de cor.
- Presets de qualidade e modos de personalização usam `aria-checked` num `radiogroup` real.
- Acordeões ("Configurações avançadas", "Ver análise detalhada", "Detalhes técnicos do resultado", detalhes técnicos por estratégia) usam `aria-expanded` no botão de alternância.
- Inputs com `InfoHelp` embutido no rótulo visual receberam `aria-label` explícito no `<input>` para que leitores de tela (e testes automatizados) não confundam o nome acessível do campo com o texto do botão de ajuda vizinho.

## 5. Testes executados

```text
npm run lint              → PASS
npm run typecheck         → PASS
npm run test:unit         → PASS (84/84 — 9 novos testes de formatação de probabilidade)
npm run test:mega:oracle  → PASS (24/24, sem alteração no domínio)
npm run test:lotofacil:oracle → PASS (oráculo RMS 3780 inalterado)
npm run build             → PASS
npm run test:e2e          → PASS (20/20 — 13 cenários originais atualizados para a nova copy + 7 novos)
```

Novos cenários E2E (seção 21 do pedido de UX):
14. abrir explicação de uma estratégia via InfoHelp (clique);
15. abrir explicação em contexto touch/mobile (`hasTouch`, `.tap()`);
16. modo "Incluir obrigatoriamente" (dezenas fixas aparecem em todos os jogos gerados);
17. modo "Não usar" (dezenas excluídas);
18. "Configurações avançadas" / código de reprodução (a palavra "Seed" não aparece na tela padrão);
19. acordeão "Detalhes técnicos do resultado" (nome técnico + seed só aparecem ali);
20. probabilidade de Sena minúscula nunca aparece como zero (`N=1` na Mega-Sena).

Nenhum teste matemático, de oráculo ou de integração foi enfraquecido ou removido; apenas seletores/asserções de copy foram atualizados nos 13 cenários pré-existentes.

## 6. Limitações conhecidas desta revisão

- A página de Metodologia (`MetodologiaPage.tsx`) manteve linguagem mais técnica deliberadamente — ela é o espaço sancionado pela própria especificação para termos como "baseline", "F4/F5" e "heurística".
- Nenhuma auditoria automatizada de acessibilidade (ex. axe-core) foi executada nesta revisão; as melhorias foram guiadas por semântica ARIA manual e pelos testes E2E de interação por teclado/toque.
- Testes de breakpoint mobile foram feitos via Playwright (`hasTouch`/`isMobile`) e inspeção de build; não houve teste em dispositivo físico.

## 7. Polish pass — revisão manual do preview

Segunda rodada, após revisão manual do preview publicado do PR #1. Continuação na mesma branch (`feat/user-friendly-ux-v1-1`), sem novo branch, sem merge.

### 7.1 Arquivos novos

```text
src/shared/components/Disclosure.tsx
src/shared/components/ExportMenu.tsx
src/shared/utils/numberFormat.ts
tests/shared/numberFormat.test.ts
```

### 7.2 Arquivos modificados nesta rodada

```text
src/shared/types/strategy.ts                    (sem mudança de contrato; ver definitions.ts)
src/modules/lotofacil/strategies/definitions.ts  (título/summary da RMS revisados)
src/shared/components/StrategyCard.tsx           ("Como funciona?" com texto visível via InfoHelp triggerContent; Detalhes técnicos secundário; data-testid por estratégia)
src/shared/components/InfoHelp.tsx               (+ prop triggerContent, para expor texto visível como gatilho em vez de apenas o ícone)
src/shared/components/QuantityBudgetInput.tsx    (bloco de quantidade fixa da RMS mais compacto, inline)
src/shared/components/DataFreshnessBadge.tsx     (+ label obrigatório: "Lotofácil · ..." / "Mega-Sena · ...")
src/shared/components/BaselineComparison.tsx     (usa formatPercentagePointDifference — corrige ruído de ponto flutuante)
src/shared/components/OverlapSummary.tsx         (formatDecimalPtBR na média de sobreposição)
src/shared/components/SimpleDiversitySummary.tsx (formatDecimalPtBR na média de repetição)
src/shared/components/index.ts                   (+ exports Disclosure, ExportMenu)
src/shared/utils/probabilityFormat.ts             (+ formatPercentagePointDifference; formatOneIn agora oculta abaixo de 5%, não só perto de 100%)
src/app/layout/AppShell.tsx                       (subtítulo "Jogos organizados com transparência"; badges de frescor por rota via useLocation)
src/app/pages/Home.tsx                            (corpo do hero revisado; título da RMS atualizado no card da Lotofácil)
src/app/pages/GerarPage.tsx                       (nenhuma opção selecionada por padrão; mensagem "Escolha uma opção acima para continuar."; título dinâmico do passo 3; Configurações avançadas/Ver análise detalhada/Detalhes técnicos usando Disclosure; hierarquia de ações primária/secundária; Exportar unificado; "Gerar novamente este mesmo conjunto" movido para Detalhes técnicos)
src/app/pages/ComparePanel.tsx                    (formatDecimalPtBR na repetição média)
tests/e2e/critical-flows.spec.ts                  (3 cenários existentes ajustados ao novo título da RMS/trigger de ajuda; +9 novos cenários)
docs/global/UX_COPY_AND_TERMINOLOGY_V1_1.md       (seções 3.1, 4.1, 8–11)
docs/global/UX_REVIEW_V1_1.md                     (esta seção)
```

### 7.3 Resumo antes/depois desta rodada

| Antes | Depois |
|---|---|
| Primeira estratégia pré-selecionada ao abrir "Gerar" (RMS na Lotofácil) | Nenhuma opção selecionada por padrão; "Escolha uma opção acima para continuar." até o usuário escolher |
| "Carteira equilibrada (RMS)" | "Equilibrar meus 6 jogos (RMS)" |
| Badges de frescor sem identificar a loteria | "Lotofácil · dados até o concurso 3779" / "Mega-Sena · dados até o concurso 3054"; escopadas por rota |
| "Carteiras e estratégias auditáveis" (subtítulo global) | "Jogos organizados com transparência" |
| Diferença de baseline exibindo `-0,000000000000%` / `+0,0000003%` | "Igual" (diferença zero/ruído de ponto flutuante) ou "+ menos de 0,0001 p.p." (diferença real e minúscula) |
| "8.0 dezenas" (ponto decimal em inglês) | "8,0 dezenas" (vírgula, pt-BR) em todos os resumos numéricos |
| "Aproximadamente 1 em 2" para uma chance de ~55% | Reciprocal oculto para qualquer probabilidade ≥ 5%; mantido apenas para eventos raros |
| "Ver análise detalhadaDetalhes técnicos do resultado" (botões colados) | Dois controles `Disclosure` claramente separados, com chevron e área de toque |
| "Configurações avançadas" parecendo texto simples | Controle de disclosure com borda, chevron e badge "Opcional" |
| "3. Concurso e personalização" sempre, mesmo para a RMS (que não personaliza dezenas) | "3. Concurso" quando a estratégia não suporta dezenas obrigatórias/excluídas; "3. Concurso e personalização" quando suporta — decidido por capacidade, não por ID |
| Bloco de quantidade da RMS em caixa grande de largura total | Linha compacta: "6 jogos · Esta opção foi criada e validada para exatamente 6 jogos. · Custo total: R$ 21,00" |
| 6 botões de ação com o mesmo peso visual | Primárias ("Salvar estes jogos", "Copiar todos") destacadas; secundárias mais discretas; CSV/JSON agrupados em um único "Exportar"; "Gerar novamente este mesmo conjunto" movida para Detalhes técnicos |
| "Detalhes técnicos" em destaque igual ao da explicação leiga no cartão de estratégia | "Como funciona?" com texto visível é a explicação primária; "Detalhes técnicos" secundário e mais discreto |

### 7.4 Testes executados (após o polish pass)

```text
npm run lint              → PASS
npm run typecheck         → PASS
npm run test:unit         → PASS (93/93 — +9 testes novos: formatPercentagePointDifference, formatOneIn 5%, formatDecimalPtBR)
npm run test:mega:oracle  → PASS (24/24, domínio inalterado)
npm run test:lotofacil:oracle → PASS (oráculo RMS 3780 inalterado)
npm run build             → PASS
npm run test:e2e          → PASS (29/29 — 20 cenários anteriores + 9 novos)
```

Novos cenários E2E desta rodada:
21. nenhuma opção selecionada por padrão (cartões neutros, passo 2 ausente, botão "Gerar jogos" ausente);
22. selecionar uma opção revela o restante do fluxo;
23. trocar de modalidade não seleciona nenhuma opção implicitamente;
24. diferença de baseline matematicamente idêntica mostra "Igual", sem ruído de ponto flutuante em nenhuma parte da página;
25. resumo de diversidade usa vírgula decimal (pt-BR), nunca ponto;
26. probabilidade alta (10 jogos, ~acima de 5%) não mostra "Aproximadamente 1 em X";
27. "Ver análise detalhada" e "Detalhes técnicos do resultado" são controles distintos e não sobrepostos (verificado por posição vertical via `boundingBox`), com estados `aria-expanded` independentes;
28. título dinâmico do passo 3 (RMS → "3. Concurso"; estratégia com personalização → "3. Concurso e personalização");
29. exportar continua funcional (CSV) após a reorganização da hierarquia de ações.

Nenhum teste matemático, de oráculo ou de integração foi enfraquecido, removido ou teve sua asserção relaxada.

## 8. Status Git / CI

Trabalho feito inteiramente na branch `feat/user-friendly-ux-v1-1`, sem merge para `main`, sem novo branch, sem force-push, em ambas as rodadas. Push realizado após todos os testes acima ficarem verdes, para atualizar o PR #1 (draft) e permitir nova revisão do preview antes do merge.

## 9. Rodada 3 — navegação, transparência de dados e persistência (v1.1)

Terceira rodada na mesma branch/PR, focada em: simplificação de navegação (remoção das landing pages por modalidade, links de "Meus jogos salvos"/"Metodologia" no topo de Gerar, `BackLink` determinístico), redesenho de "Como você quer definir seus jogos?" e da personalização de dezenas (duas seções independentes, nunca pré-marcadas), proteção contra resultado desatualizado (nunca some sozinho — ver `DECISIONS_AND_OPEN_POINTS_V1.md` e `DATA_AND_PERSISTENCE_V1.md` §14), humanização da comparação com jogos aleatórios (sem "p.p." na tela leiga), "Limpar configuração", transparência de origem de dados na Metodologia (`public/data/status.json`), correção do link de jogo responsável, e a correção de um bug real: o retrato do dataset (`SavedPortfolio.dataset`) nunca era de fato preenchido ao salvar, e os parâmetros salvos eram reconstruídos do formulário ao vivo em vez de congelados no momento da geração.

```text
npm run lint              → PASS
npm run typecheck         → PASS
npm run test:unit         → PASS (104/104 — +11 novos: schema de status.json, snapshot do dataset em SavedPortfolio, loadDataStatus, comportamento congelar-ao-salvar/restaurar em GerarPage, URL de jogo responsável)
npm run test:mega:oracle  → PASS (24/24, domínio inalterado)
npm run test:lotofacil:oracle → PASS (38/38, oráculo RMS 3780 inalterado)
npm run build             → PASS
npm run test:e2e          → PASS (39/39 — 29 cenários anteriores + 10 novos)
node scripts/data/validate-dataset.mjs → PASS (datasets + status.json)
```

Novos cenários E2E desta rodada: redirects de `/lotofacil`/`/megasena`; links de navegação no topo de Gerar; navegação "voltar" determinística; resultado permanece visível e marcado como desatualizado após alteração; restaurar configuração remove o aviso sem gerar de novo; salvar um resultado desatualizado usa a configuração que o gerou (não o formulário editado); "Limpar configuração" não apaga jogos salvos; link de jogo responsável aponta para a URL oficial atual; Metodologia mostra os dados de transparência; dezenas fixas e não usadas configuráveis ao mesmo tempo. Além disso, um teste de componente dedicado (`tests/app/gerarPageSnapshot.test.tsx`) verifica no nível de unidade que salvar usa o snapshot congelado mesmo com o formulário já editado — a regressão mais crítica desta rodada.

Nenhum teste matemático, de oráculo ou de integração foi enfraquecido, removido ou teve sua asserção relaxada.

## 10. Correções pós-revisão manual (mesma branch/PR)

Revisão manual do preview de produção encontrou exatamente dois problemas na Rodada 3, corrigidos sem abrir uma nova rodada de design:

1. **Nenhum `BackLink` em `/lotofacil/gerar` e `/megasena/gerar`.** A página de geração é o hub de cada modalidade, mas não tinha nenhuma forma visível de voltar ao início. Corrigido com `<BackLink to="/" label="Voltar ao início" />` no topo, antes do título e dos links "Meus jogos salvos"/"Metodologia" — mesmo componente reutilizável já usado em Metodologia/Carteiras, sem `navigate(-1)`.
2. **`handleClearConfiguration()` chamava `handleDiscardPreviousResult()`.** Isso apagava um resultado já gerado ao clicar em "Limpar configuração", contradizendo a decisão já aprovada de que um resultado nunca desaparece sem uma ação explícita de descarte. Corrigido: "Limpar configuração" agora só reseta os campos editáveis do formulário (estratégia, quantidade/orçamento, concurso, personalização, código de reprodução, preset, mensagens de validação) e nunca toca no resultado exibido, em `lastGeneratedInput` ou em `resolvedSnapshot`. Como o formulário limpo normalmente não corresponde mais à configuração que gerou o resultado, o aviso de resultado desatualizado aparece automaticamente — exceto se o usuário editar o formulário de volta exatamente ao estado original, caso em que o aviso não deveria (e não deve) aparecer.

Ajuste relacionado: como o formulário logo após "Limpar configuração" não tem nenhuma opção selecionada, o botão "Gerar com a nova configuração" do aviso de resultado desatualizado fica desabilitado (nunca fica clicável sem fazer nada) até o formulário voltar a ter uma opção selecionada e ser válido o suficiente para gerar — usando a mesma validação já usada pelo botão principal "Gerar jogos", extraída para uma função compartilhada (`validateBeforeGenerate`/`canGenerateNow`).

```text
npm run lint              → PASS
npm run typecheck         → PASS
npm run test:unit         → PASS (113/113 — +4 testes novos: preservação do resultado e do snapshot após "Limpar configuração", desabilitação/habilitação de "Gerar com a nova configuração", restaurar funciona após limpar, descarte explícito continua removendo o resultado)
npm run test:mega:oracle  → PASS (24/24, domínio inalterado)
npm run test:lotofacil:oracle → PASS (38/38, oráculo RMS 3780 inalterado)
npm run build             → PASS
npm run test:e2e          → PASS (41/41 — 39 cenários anteriores + 2 novos/reescritos)
node scripts/data/validate-dataset.mjs → PASS
```

Nenhum teste matemático, de oráculo ou de integração foi alterado. Nenhuma mudança de UX, dados, persistência ou arquitetura além das duas correções acima.
