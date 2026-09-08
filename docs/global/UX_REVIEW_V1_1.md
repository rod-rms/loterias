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
- O subtítulo de marca "Carteiras e estratégias auditáveis" no cabeçalho do app foi mantido; é um rótulo de marca explicitamente definido em `00_START_HERE_CLAUDE_CODE.md` (seção 8), não um termo de fluxo operacional, então não foi considerado dentro do escopo de "evitar jargão no fluxo primário".
- Nenhuma auditoria automatizada de acessibilidade (ex. axe-core) foi executada nesta revisão; as melhorias foram guiadas por semântica ARIA manual e pelos testes E2E de interação por teclado/toque.
- Testes de breakpoint mobile foram feitos via Playwright (`hasTouch`/`isMobile`) e inspeção de build; não houve teste em dispositivo físico.

## 7. Status Git / CI

Trabalho feito inteiramente na branch `feat/user-friendly-ux-v1-1`, sem merge para `main`. Nenhum force-push. Após todos os testes acima ficarem verdes, a branch foi enviada (`push`) para `origin` para permitir revisão do preview antes do merge.
