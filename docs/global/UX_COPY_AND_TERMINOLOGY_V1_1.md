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
| "Carteiras e estratégias auditáveis" (subtítulo global) | "Jogos organizados com transparência" | Linguagem de auditabilidade permanece em Metodologia/docs técnicos |
| "Dados atualizados até o concurso X" (badge, sem identificar a loteria) | "Lotofácil · dados até o concurso X" / "Mega-Sena · dados até o concurso Y" | — |
| Diferença de baseline com ruído de ponto flutuante (`-0,000000000000%`) | "Igual" (diferença indistinguível de zero) ou "+ menos de 0,0001 p.p." (diferença real, porém minúscula) | Valor numérico exato permanece em "Detalhes técnicos" |
| `toFixed(1)`/`toFixed(2)` em inglês ("8.0 dezenas") | Formatação decimal pt-BR ("8,0 dezenas") via `formatDecimalPtBR` | — |

## 3. Nomes de estratégia (título de UX)

| ID interno | Nome técnico (Detalhes técnicos) | Título exibido | Badge |
|---|---|---|---|
| `lotofacil.rms_v2` | RMS v2 | Equilibrar meus 6 jogos (RMS) | 6 jogos fixos |
| `lotofacil.max_diversification` | Diversificação de carteira | Variar mais os jogos | Mais diversidade |
| `lotofacil.max_coverage_11` | Otimizar cobertura 11+ | Priorizar 11 acertos ou mais | Busca otimizada |
| `lotofacil.max_coverage_12` | Otimizar cobertura 12+ | Priorizar 12 acertos ou mais | Busca otimizada |
| `lotofacil.uniform_random` | Aleatória distinta | Gerar jogos aleatórios | Sem filtros |
| `megasena.max_f4` | Otimizar cobertura Quadra+ | Priorizar Quadra ou mais | Busca otimizada |
| `megasena.max_f5` | Otimizar cobertura Quina+ | Priorizar Quina ou mais | Busca otimizada |
| `megasena.max_diversification` | Diversificação de carteira | Variar mais os jogos | Mais diversidade |
| `megasena.uniform_random` | Aleatória distinta | Gerar jogos aleatórios | Sem filtros |

Cada estratégia carrega esses valores em `StrategyDefinition.ux` (`title`, `summary`, `badge`, `helpTitle`, `helpBody`, `technicalName`), lido pela UI de forma inteiramente orientada por metadados — nenhuma página faz `if (strategyId === ...)`.

### 3.1 Passe de polimento (revisão manual do preview)

Após revisão manual do preview publicado, os seguintes ajustes foram aplicados:

- **Nenhuma opção é pré-selecionada ao entrar na tela Gerar.** A primeira versão selecionava automaticamente o primeiro cartão (RMS, no caso da Lotofácil), o que podia ser lido como uma recomendação implícita do aplicativo. Agora todos os cartões começam neutros; os passos 2+ ficam ocultos até o usuário escolher explicitamente uma opção, e a mensagem "Escolha uma opção acima para continuar." aparece abaixo dos cartões. Trocar de modalidade nunca herda uma seleção.
- **Título da RMS revisado:** de "Carteira equilibrada (RMS)" para "**Equilibrar meus 6 jogos (RMS)**" — mais próximo da intenção do usuário ("o que eu quero fazer") do que de uma descrição de produto.
- **"Como funciona?" é a explicação primária de cada estratégia**, com texto visível (não apenas um ícone) usando `InfoHelp` com `triggerContent`. "Detalhes técnicos" (nome técnico, ID, versão, evidência) permanece como um link secundário, visualmente mais discreto, mas nunca removido.

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

A representação "1 em X" (`formatOneIn`) complementa apenas probabilidades genuinamente raras: é omitida sempre que a probabilidade é `>= 5%` (eventos comuns, onde "Aproximadamente 1 em 2" para ~55% não ajuda), nula, ou próxima de 100% (onde "1 em 1" não agrega informação). Abaixo de 5%, mostra "Aproximadamente 1 em X" quando útil.

### 4.1 Diferença de probabilidade em pontos percentuais (`formatPercentagePointDifference`)

Usada na tabela "Comparação com jogos aleatórios equivalentes" para a coluna de diferença. Corrige um bug real observado no preview: ruído de ponto flutuante aparecendo como `-0,000000000000%` ou `+0,0000003%`.

| Situação | Exibição |
|---|---|
| Diferença indistinguível de zero em precisão dupla (`< 1e-9`) | **"Igual"** |
| Diferença real, porém menor que 0,0001 p.p. | **"+ menos de 0,0001 p.p."** / **"- menos de 0,0001 p.p."** |
| Diferença maior, com sinal | precisão adaptativa igual à de `formatProbabilityPercent`, com sufixo " p.p." |

Para métricas de "jackpot" (Sena na Mega-Sena, 15 acertos na Lotofácil), a carteira e a baseline não-restrita de mesmo N são matematicamente idênticas (`F6 = N / M` não depende de sobreposição) — por isso a UI mostra corretamente "Igual" nesses casos, e isso não é um bug de exibição. O valor numérico exato continua disponível nos metadados de auditoria em "Detalhes técnicos do resultado".

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

Substituiu o ciclo de 3 cliques (fixar → excluir → limpar) e, na revisão seguinte (v1.1), também substituiu o controle de modo único ("Incluir obrigatoriamente" / "Não usar" via `radiogroup`), que ainda dava a impressão de um modo pré-selecionado.

Modelo atual: um checkbox "Quer personalizar suas dezenas?" começa **desmarcado** por padrão. Quando marcado, revela **duas seções independentes, usáveis ao mesmo tempo** — "Dezenas que devem aparecer em todos os jogos" e "Dezenas que não quero usar" — cada uma com sua própria grade de dezenas e resumo textual ("Obrigatórias: 03, 07" / "Não usar: 18, 21"). Uma dezena já escolhida em uma seção fica visivelmente desabilitada na outra, preservando a regra de que nunca pertence às duas ao mesmo tempo — mas o usuário não precisa alternar entre "modos" para configurar as duas listas.

## 7. Componente de ajuda (`InfoHelp`)

`src/shared/components/InfoHelp.tsx`. Abre em clique/toque, hover (desktop) e foco por teclado — nunca depende só de hover. Fecha com Escape, clique fora, ou ao sair do elemento sem foco. Usa `aria-expanded`, `aria-describedby` e `role="tooltip"` no conteúdo. Informação crítica nunca existe exclusivamente dentro de um `InfoHelp` — ele sempre complementa texto já visível.

**Nota de implementação:** a primeira versão fazia `onClick` alternar (toggle) o estado enquanto `onMouseEnter`/`onFocus` já haviam aberto o popover — como o clique do mouse dispara `focus` antes de `click`, o toggle fechava o popover imediatamente após abri-lo. A correção fez clique/hover/foco sempre abrirem (idempotente); o fechamento fica a cargo de Escape, clique fora, ou `mouseleave` sem foco remanescente.

## 8. Componente `Disclosure` (acordeões)

`src/shared/components/Disclosure.tsx` padroniza todos os controles de expandir/recolher ("Configurações avançadas", "Ver análise detalhada", "Detalhes técnicos do resultado"): botão sempre `flex` (block-level), chevron visível que gira ao abrir, `aria-expanded`, área de toque adequada, e um subtítulo opcional (ex.: badge "Opcional" em "Configurações avançadas").

**Bug corrigido:** no preview, "Ver análise detalhada" e "Detalhes técnicos do resultado" apareciam visualmente colados ("Ver análise detalhadaDetalhes técnicos do resultado"). Causa: os botões eram `<button>` simples (`display: inline-block` por padrão); dois elementos inline-block adjacentes com espaço horizontal disponível permanecem lado a lado em vez de empilhar, mesmo dentro de um contêiner `space-y-*`. A correção usa `flex w-full` no botão do `Disclosure`, tornando-o sempre um bloco de largura total — testado via E2E comparando as posições verticais (`boundingBox`) dos dois controles.

## 9. Hierarquia de ações no resultado

- **Primárias** (destaque visual maior): "Salvar estes jogos", "Copiar todos".
- **Secundárias** (visual mais discreto): "Gerar outra opção", "Comparar com outra opção", "Exportar" (menu único agrupando CSV/JSON via `ExportMenu`), "Limpar resultado" (a mais discreta de todas).
- **"Gerar novamente este mesmo conjunto"** foi movida para dentro de "Detalhes técnicos do resultado", ao lado do código de reprodução (seed) — é uma ação de reprodutibilidade avançada, não uma ação principal do resultado.

Nenhuma capacidade foi removida; apenas reorganizada por prioridade visual.

## 10. Título dinâmico do passo 3

"3. Concurso e personalização" só aparece quando a estratégia selecionada suporta dezenas obrigatórias/não usadas (`supportsFixedNumbers || supportsExcludedNumbers`); caso contrário (ex.: RMS), o título é simplesmente "3. Concurso". Decidido por capacidade declarada na `StrategyDefinition`, nunca por `if (strategyId === ...)`.

## 11. Badges de atualização de dados por loteria

`DataFreshnessBadge` agora recebe um `label` obrigatório e exibe "Lotofácil · dados até o concurso X" / "Mega-Sena · dados até o concurso Y". O `AppShell` decide quais badges mostrar a partir da rota atual (`useLocation`): em `/lotofacil/*` mostra só a badge da Lotofácil; em `/megasena/*` só a da Mega-Sena; nas demais rotas (Home, Meus jogos salvos, Sobre) mostra as duas, sempre identificadas.

## 12. Navegação simplificada (v1.1)

As páginas de landing por modalidade (`/lotofacil`, `/megasena`) foram removidas — passam a ser apenas redirects para `/<modalidade>/gerar`, que é o hub da modalidade. Os links "Meus jogos salvos" e "Metodologia" da modalidade atual aparecem no topo da própria página de geração, com peso visual neutro e igual entre si (não é um botão de destaque nem um link secundário apagado). Um novo componente `BackLink` padroniza a navegação "voltar" com destino fixo (não histórico do navegador): "← Voltar ao início" em Gerar; "← Voltar para Lotofácil/Mega-Sena" em Metodologia e em Carteiras escopadas por modalidade; "← Voltar ao início" em Carteiras global.

## 13. "Como você quer definir seus jogos?"

Os antigos botões escuros de modo ("Por quantidade" / "Por valor que quero gastar") foram substituídos por um controle de opção (`radio`) explícito, rotulado "Como você quer definir seus jogos?", com as opções "Quantidade de jogos" e "Valor que quero gastar". Nenhuma mudança na lógica de cálculo (`ticketsForBudget`, custo, saldo).

## 14. "Limpar configuração"

Ação de baixo destaque no passo 4 ("Revisar e gerar") que reseta **apenas o formulário editável** — estratégia (volta a nenhuma selecionada), quantidade/orçamento, concurso (volta ao sugerido), personalização de dezenas, código de reprodução e preset, além das mensagens de validação. Nunca apaga jogos já salvos em "Meus jogos salvos" (IndexedDB não é tocado).

**Importante (corrigido após revisão manual):** "Limpar configuração" **preserva** qualquer resultado já gerado — nunca o remove. Se havia um resultado exibido, ele continua visível, com `lastGeneratedInput` e `resolvedSnapshot` intactos; como o formulário limpo não corresponde mais a essa configuração, o aviso de resultado desatualizado (seção 15) aparece automaticamente. Enquanto o formulário limpo não tiver uma opção selecionada (ou não for válido o suficiente para gerar), "Gerar com a nova configuração" fica desabilitado — nunca fica clicável sem fazer nada. A única forma de efetivamente remover um resultado exibido continua sendo uma ação explícita de descarte ("Descartar resultado anterior" no aviso, ou "Limpar resultado" na área do resultado).

## 15. Resultado desatualizado (stale) — nunca some sozinho

Se a configuração mudar depois de já ter gerado um resultado, o resultado **continua visível**. Um aviso âmbar aparece diretamente acima dele: "Você alterou a configuração depois de gerar estes jogos. Os jogos abaixo ainda correspondem à configuração anterior.", com três ações: **"Gerar com a nova configuração"** (primária), **"Restaurar configuração anterior"** (secundária — devolve o formulário exatamente ao estado que gerou o resultado exibido, sem gerar de novo, e o aviso desaparece), e **"Descartar resultado anterior"** (baixo destaque). Editar o formulário de volta ao estado exato que gerou o resultado também remove o aviso automaticamente, sem nenhuma ação explícita.

## 16. Comparação com jogos aleatórios, sem jargão de "p.p."

A tabela de comparação foi substituída por frases por métrica, sem a abreviação técnica "p.p.": "Seus jogos: 55,86% · Jogos aleatórios equivalentes: 48,91%" seguido de "6,95 pontos percentuais a favor deste conjunto" (ou "... pontos percentuais abaixo dos jogos aleatórios equivalentes" quando negativo). Diferença matematicamente indistinguível de zero mostra "Mesma cobertura"; diferença real porém desprezível (< 0,0001 p.p.) mostra "Praticamente igual". Um `InfoHelp` explica o conceito de "pontos percentuais" na própria seção. Os valores exatos e a formatação técnica com "p.p." (`formatPercentagePointDifference`) continuam existindo como utilitário para uso técnico/exportação, mas não aparecem na tela leiga.

## 17. Link de jogo responsável

A URL usada em "Saiba mais sobre jogo responsável" estava quebrada/obsoleta e foi corrigida para a página oficial atual da CAIXA, centralizada em `RESPONSIBLE_GAMING_URL` (`src/shared/lib/externalLinks.ts`) — abre em nova aba com `rel="noopener noreferrer"`.

## 18. Concurso-alvo e simulação histórica (v1.1.1)

O campo "Concurso em que você pretende jogar" passa a reagir ao valor digitado:

- concurso igual ao próximo disponível: nota neutra e discreta "Próximo concurso disponível" (nunca inventa uma data de sorteio, já que o app não tem essa informação com autoridade);
- concurso já realizado (existe na base local): bloco "Concurso {N} já realizado em {DD/MM/AAAA}" com "Resultado oficial" e as dezenas sorteadas, seguido de "Você está fazendo uma simulação histórica. O resultado deste sorteio não será usado para montar os jogos.";
- concurso muito à frente do disponível: mensagem de bloqueio dinâmica, ex. "Esse concurso ainda não está disponível para geração. A base oficial está atualizada até o concurso 3055. O próximo concurso disponível é o 3056.";
- concurso ausente da base local (lacuna) ou valor inválido (zero, negativo, decimal): bloqueado com mensagem específica.

Tudo isso usa somente o dataset já carregado — nenhuma nova requisição à CAIXA a partir do navegador.

## 19. Conferência de jogos salvos — resultado completo (v1.1.1)

A conferência de uma carteira salva deixou de resumir tudo em "Conferido: maior pontuação X acertos." Agora mostra, juntos: "Resultado oficial — Concurso N" com as dezenas sorteadas; uma frase identificando o(s) melhor(es) jogo(s), tratando empates corretamente ("J3 foi o melhor jogo, com 4 acertos · Quadra." / "J2 e J5 foram os melhores jogos, com 4 acertos cada · Quadra." / "J2, J4 e J6 tiveram a maior pontuação..."); e, junto de cada jogo na lista, seu número de acertos e o rótulo convencional quando aplicável ("Quadra"/"Quina"/"Sena" para Mega-Sena, "11 acertos" a "15 acertos" para Lotofácil). Nunca usa linguagem de premiação ("premiação", "prêmio", "ganhou", "aposta vencedora") — apenas o número de acertos e o nome convencional do resultado.

## 20. Versão do aplicativo e transparência de armazenamento (v1.1.1)

O rodapé agora mostra "Loterias v{versão} · Não afiliado à CAIXA · Uso destinado a maiores de 18 anos · Não é uma plataforma de apostas.", com a versão vinda de `package.json` via a constante de build `APP_VERSION` — nunca escrita à mão em um componente. Em Sobre e em "Meus jogos salvos", a copy sobre armazenamento local foi reforçada: os jogos salvos existem apenas naquele navegador/dispositivo, sem conta nem sincronização em nuvem, e "Exportar backup" é a forma recomendada de preservá-los antes de limpar dados ou trocar de dispositivo. Também foi trocada uma frase que dizia "A v1 não calcula..." por linguagem natural de produto ("Esta versão do aplicativo não calcula...") — identificadores técnicos de versão (estratégia, motor, dataset) permanecem intactos onde já eram metadados de auditoria.
