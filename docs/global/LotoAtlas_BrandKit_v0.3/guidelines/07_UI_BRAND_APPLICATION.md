# LotoAtlas — Aplicação da Marca na UI (v0.3 — Dark First)

A orientação de UI da v0.2 foi escrita em torno de superfícies claras (cartões brancos, fundo off-white). A partir da v0.3, o **tema escuro é a superfície primária e padrão do produto**. Este documento substitui a seção "Componentes" da v0.2; o tema claro permanece documentado como alternativa secundária/institucional (ver `03_COLOR_SYSTEM.md`) e como preparação para uma futura alternância de tema.

## Princípios (inalterados)

1. **Conteúdo primeiro.** Marca não deve competir com números e decisões.
2. **Uma cor de ação por contexto.** Evitar interface arco-íris — Atlas Violet é a única cor de ação funcional; ver §"Reforço" abaixo.
3. **Verde não significa "ganhou".** Usar para confirmação/sucesso factual, não promessa.
4. **Modalidades têm cores próprias, mas a plataforma permanece LotoAtlas.**
5. **Estados críticos usam semântica acessível, não apenas cor.**

## Componentes (tema escuro, padrão)

Todos os tokens abaixo estão definidos em `design-tokens/tokens.css`.

### Fundo da aplicação
`--la-bg-primary` (Atlas Ink, `#101729`). É o fundo de página padrão em todo o produto.

### Superfície de cartão
`--la-bg-surface` (Atlas Ink 2, `#1D2740`). Cartões, painéis e seções usam esta superfície sobre o fundo primário — **cartões não são mais predominantemente brancos** no tema principal do produto.

### Superfície elevada
`--la-bg-surface-elevated` (`#232F4D`). Modais, pop-overs, menus suspensos e tooltips usam esta superfície, ligeiramente mais clara que a superfície de cartão, para comunicar elevação sem depender só de sombra.

### Botão primário
Fundo `--la-action` (Atlas Violet), texto `--la-action-foreground` (White, 5,61:1). Única cor de ação funcional — nunca usar Atlas Blue ou Atlas Teal como fundo de botão primário/CTA.

### Botão secundário
Fundo transparente ou `--la-bg-surface`, borda `--la-border-strong` (Atlas Violet) ou `--la-border` conforme ênfase, texto `--la-text-primary`. Nunca usa uma segunda cor de ação — a diferenciação vem de peso visual (preenchido vs. contornado), não de uma cor concorrente.

### Links / texto de ação
Cor `--la-action-text` / `--la-link` (`#A07AFF`, "Atlas Violet Accessible", 5,71:1 sobre Atlas Ink, 4,75:1 sobre Atlas Ink 2). **Não** usar Atlas Violet puro (`#6D3CFF`) para texto de link — 3,18:1 não atinge AA para texto normal.

### Foco
Contorno `--la-focus` (Atlas Violet, 3,18:1 — atende ao limiar de 3:1 para contornos/estados não textuais). Sempre visível ao navegar por teclado; nunca `outline: none` sem substituto equivalente.

### Campos de entrada (inputs)
Fundo `--la-bg-surface` ou `--la-bg-surface-elevated`, borda `--la-border` em repouso, borda `--la-border-strong`/`--la-focus` (Atlas Violet) em foco ou validação ativa, texto `--la-text-primary`, placeholder `--la-text-secondary`.

### Bordas
`--la-border` (`#2C3856`) é deliberadamente sutil (~1,5:1) e serve apenas como divisor decorativo — nunca é a única forma de comunicar um estado interativo. Quando a borda precisa comunicar significado (selecionado, foco, erro), usar `--la-border-strong` (Atlas Violet) ou a cor semântica do estado (ex. sucesso), que atingem o limiar de 3:1 para elementos não textuais.

### Estado selecionado
Borda/realce `--la-border-strong` (Atlas Violet) e, quando aplicável, fundo com leve tinta violeta sobre `--la-bg-surface`. É a mesma cor de ação — reforça "uma cor de ação por contexto" em vez de introduzir uma cor de seleção separada.

### Estado de sucesso
`--la-success` / `--la-success-text` (Luck Green, 6,99:1 sobre Atlas Ink). Sempre acompanhado de texto/ícone explícito ("Jogos salvos", "Dados atualizados") — nunca apenas a cor. Nunca usado para sugerir resultado de prêmio ou vitória na loteria.

### Avisos / erros
Cor semântica própria da UI (não faz parte da identidade principal da marca — não reutilizar Atlas Violet, Atlas Blue ou Atlas Teal para erro). Documentar valor exato de aviso/erro no momento da implementação, com contraste medido sobre `--la-bg-primary` e `--la-bg-surface`, seguindo o mesmo processo desta seção.

### Badges de modalidade
As cores oficiais/convencionais de cada jogo (ex.: identidade visual associada a Lotofácil ou Mega-Sena) podem ser usadas como identificadores locais em badges — nunca como substitutas da cor de ação única da plataforma, e sempre com contraste verificado sobre a superfície onde aparecem.

### Chips de dezena (number chips)
Fundo `--la-bg-surface-elevated` ou `--la-bg-surface`, texto em `--la-font-mono` para o próprio número. Três estados visualmente distintos e nomeados textualmente (não só por cor): selecionado, sorteado/oficial, acerto — nunca dependendo de uma única cor para diferenciar todos os três.

### Dados numéricos
Fonte `--la-font-mono` (JetBrains Mono) para dezenas, IDs de concurso, timestamps, contadores e valores monetários, com alinhamento tabular quando em lista. Cor `--la-text-primary` para o valor principal, `--la-text-secondary` para rótulos/legendas auxiliares.

### Gráficos
Usar Atlas Blue e Atlas Teal como séries de apoio/distinção de dados (nunca como cor de ação); reservar Atlas Violet para destacar a série/ponto de dado principal quando fizer sentido editorial, sem competir com botões de ação na mesma tela.

### Controles desabilitados
Reduzir opacidade do token semântico correspondente (ex.: `--la-action` a ~40–50% de opacidade) mantendo a mesma cor-base — nunca introduzir um cinza genérico desconectado da paleta.

### Estado de hover
Reforço sutil do próprio token semântico do componente (ex.: leve clareamento do fundo do botão primário, leve aumento de opacidade da borda) — nunca uma cor de ação alternativa.

## Reforço: uma cor de ação funcional por contexto

Em qualquer tela, deve haver **no máximo uma** cor competindo pela atenção como "ação principal" — sempre Atlas Violet. Atlas Blue, Atlas Teal e Luck Green podem coexistir na mesma tela como identificadores de dado/modalidade ou confirmação factual, mas nunca como um segundo botão de ação com peso visual equivalente ao botão primário.

## Tema claro (secundário)

Mantém a orientação da v0.2 (cartões brancos/off-white, texto Atlas Ink) como alternativa institucional/documentação, usando os tokens semânticos de `[data-theme="light"]` em `tokens.css`. Não é a superfície padrão do produto nesta versão.
