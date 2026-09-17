# LotoAtlas — Sistema de Cores (v0.3)

Esta versão reorganiza a aplicação das cores em torno de um tema **escuro por padrão** e de **papéis semânticos**, sem alterar nenhuma cor bruta da marca (v0.2). Se você está implementando UI, use os tokens semânticos desta seção — nunca um hex bruto diretamente.

## Paleta bruta (inalterada desde v0.2)

| Nome | HEX | Papel de marca |
|---|---|---|
| Atlas Ink | #101729 | fundo escuro, texto, confiança |
| Atlas Ink 2 | #1D2740 | superfície escura secundária |
| Atlas Violet | #6D3CFF | marca, tecnologia, seleção |
| Atlas Violet Light | #8B5CFF | gradientes e destaque |
| Atlas Blue | #1677FF | clareza, dados, apoio |
| Atlas Teal | #12C7B0 | análise, confirmação, apoio |
| Luck Green | #22B96B | sorte, trevo, sucesso factual |
| Luck Green Light | #66D889 | gradientes do trevo |
| Atlas Off-white | #F7F9FC | fundo institucional/claro |
| White | #FFFFFF | texto sobre fundo escuro, superfícies claras |
| Atlas Muted | #6B7280 | texto secundário (tema claro) |
| Atlas Line | #DDE3EC | divisores e bordas (tema claro) |

## Hierarquia escura por padrão (v0.3)

O aplicativo abre em modo escuro por padrão. O tema claro permanece documentado como alternativa secundária/institucional e como preparação para uma futura alternância de tema — não é a superfície primária do produto nesta versão.

- **Fundo primário da aplicação:** Atlas Ink (`#101729`).
- **Superfície primária de cartões/painéis:** Atlas Ink 2 (`#1D2740`), salvo quando acessibilidade/hierarquia exigir uma superfície semântica ligeiramente ajustada (ex.: superfície elevada).
- **Superfície elevada** (modais, pop-overs, menus): `#232F4D` — um pouco mais clara que Atlas Ink 2, para indicar elevação sem depender de sombra.

Cartões **não** devem mais ser documentados como predominantemente brancos no tema principal do produto — essa era a orientação da v0.2, escrita em torno de superfícies claras.

## Uma única cor de ação funcional

**Atlas Violet (`#6D3CFF`)** é a única cor de ação funcional do produto. Use-a para:

- fundo de botões primários;
- estados selecionados;
- controles ativos;
- indicadores de foco (quando o contraste permitir);
- ênfase interativa primária.

Atlas Blue e Atlas Teal **nunca** competem como cores de CTA. Permanecem disponíveis para:

- o símbolo da marca;
- identificadores de modalidade/local (ex.: Lotofácil vs. Mega-Sena);
- séries de visualização de dados;
- distinções informativas de dados.

Luck Green permanece reservado para confirmação/sucesso **factual** (jogos salvos, dados atualizados, validação aprovada) e nunca deve sugerir visualmente prêmio ou sucesso garantido na loteria.

## Papéis semânticos (tokens)

Ver `design-tokens/colors.json` (`semantic.dark` / `semantic.light`) e `design-tokens/tokens.css` para os valores exatos. Resumo do mapeamento:

| Token semântico | Tema escuro (padrão) | Tema claro (secundário) |
|---|---|---|
| `--la-bg-primary` | Atlas Ink | Atlas Off-white |
| `--la-bg-surface` | Atlas Ink 2 | White |
| `--la-bg-surface-elevated` | `#232F4D` (novo) | White |
| `--la-text-primary` | White | Atlas Ink |
| `--la-text-secondary` | `#B7C0D6` "Atlas Mist" (novo) | Atlas Muted |
| `--la-border` | `#2C3856` (novo, decorativo) | Atlas Line |
| `--la-border-strong` | Atlas Violet | Atlas Violet |
| `--la-action` | Atlas Violet | Atlas Violet |
| `--la-action-foreground` | White | White |
| `--la-action-text` / `--la-link` | `#A07AFF` "Atlas Violet Accessible" (novo) | Atlas Violet |
| `--la-focus` | Atlas Violet | Atlas Violet |
| `--la-success` / `--la-success-text` | Luck Green | Luck Green / `#178350` para texto |

Os tokens brutos históricos (`--la-ink`, `--la-violet`, etc.) **não foram removidos nem alterados** — os tokens semânticos apenas dão significado de uso a eles.

## Correção de acessibilidade importante (v0.3)

A v0.2 listava Atlas Violet e Atlas Violet Light como utilizáveis livremente sobre fundo escuro. Medições exatas (fórmula de luminância relativa do WCAG 2.x) mostram que isso **não é verdade para texto normal**:

- Atlas Violet (`#6D3CFF`) sobre Atlas Ink: **3,18:1** — abaixo do mínimo de 4,5:1 para texto normal; suficiente para contornos/estados não textuais (≥3:1);
- Atlas Violet Light (`#8B5CFF`) sobre Atlas Ink: **4,31:1** — também abaixo de 4,5:1 para texto normal, embora perto.

Por isso, a v0.3 introduz um token novo — `--la-action-text` (`#A07AFF`, "Atlas Violet Accessible") — especificamente para texto de ação/link sobre fundo escuro, que atinge AA para texto normal. Os tokens brutos originais permanecem intactos; este é um token semântico adicional, não uma substituição.

## Tabela de contraste medida (tema escuro)

Todos os valores computados pela fórmula de luminância relativa do WCAG 2.x (`(L1 + 0.05) / (L2 + 0.05)`, L1 ≥ L2). Metas: texto normal ≥ 4,5:1; texto grande ≥ 3:1; contornos/estados não textuais significativos ≥ 3:1.

| Par | Contraste | Uso válido |
|---|---|---|
| White / Atlas Ink | 17,85:1 | texto normal (AAA) |
| White / Atlas Ink 2 | 14,83:1 | texto normal (AAA) |
| Atlas Off-white / Atlas Ink | 16,92:1 | texto normal (AAA) |
| Atlas Mist `#B7C0D6` / Atlas Ink | 9,79:1 | texto secundário (AAA) |
| Atlas Mist `#B7C0D6` / Atlas Ink 2 | 8,14:1 | texto secundário (AAA) |
| Atlas Violet Accessible `#A07AFF` / Atlas Ink | 5,71:1 | texto de ação/link (AA) |
| Atlas Violet Accessible `#A07AFF` / Atlas Ink 2 | 4,75:1 | texto de ação/link (AA) |
| Atlas Violet Light `#8B5CFF` / Atlas Ink | 4,31:1 | **não** usar para texto normal; ok para texto grande/decorativo |
| Atlas Violet `#6D3CFF` / Atlas Ink | 3,18:1 | contornos/foco não textuais apenas — **não** para texto |
| White / Atlas Violet (texto em botão) | 5,61:1 | texto sobre botão primário (AA) |
| Atlas Blue `#1677FF` / Atlas Ink | 4,35:1 | texto grande apenas; identificador de dado, não texto normal pequeno |
| Atlas Teal `#12C7B0` / Atlas Ink | 8,35:1 | texto/ícone (AAA) |
| Luck Green `#22B96B` / Atlas Ink | 6,99:1 | texto de sucesso (AAA) |
| Luck Green Light `#66D889` / Atlas Ink | 9,99:1 | texto/ícone (AAA) |
| Atlas Muted `#6B7280` / Atlas Ink | 3,69:1 | **não** projetado para o tema escuro — por isso `--la-text-secondary` usa `#B7C0D6` no escuro, não Atlas Muted |
| `#2C3856` (novo `--la-border`) / Atlas Ink | ~1,54:1 | decorativo apenas — nunca a única forma de indicar estado interativo |

### Exemplos válidos

- Botão primário: fundo Atlas Violet, texto White (5,61:1) — ✅.
- Link/ação textual sobre Atlas Ink: `#A07AFF` (5,71:1) — ✅.
- Aro de foco sobre Atlas Ink: contorno Atlas Violet (3,18:1, não textual) — ✅.
- Texto secundário sobre cartão (Atlas Ink 2): Atlas Mist (8,14:1) — ✅.

### Exemplos inválidos

- Texto normal em Atlas Violet Light sobre Atlas Ink (4,31:1) — ❌ abaixo de 4,5:1.
- Texto normal em Atlas Violet sobre Atlas Ink (3,18:1) — ❌.
- Usar Atlas Blue ou Atlas Teal como cor de botão primário/CTA — ❌ (competiria com a única cor de ação).
- Usar Luck Green para sugerir "você ganhou" ou qualquer resultado de prêmio — ❌ (uso proibido pela marca, ver `10_LEGAL_NAMING_AND_GOVERNANCE.md` e `14_MONETIZATION_AND_COBRANDING_GUARDRAILS.md`).

## Gradiente de marca

**Atlas Spectrum:** #6D3CFF → #1677FF → #12C7B0

Uso: conexões do símbolo, detalhes de destaque, gráficos institucionais, estados ativos. Evitar como fundo de grandes blocos de texto (o gradiente não tem uma única razão de contraste garantida ponto a ponto).

## Gradiente do trevo

#66D889 → #22B96B

Restrito a códigos de sorte, confirmação e marca. Não usar como cor dominante do produto para evitar aparência de casa de apostas.
