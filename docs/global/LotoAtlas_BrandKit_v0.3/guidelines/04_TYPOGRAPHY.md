# LotoAtlas — Tipografia (v0.3)

## Família principal (marca/UI) — inalterada

**Inter**

Motivos:

- alta legibilidade em telas;
- excelente leitura de números;
- ampla variedade de pesos;
- linguagem contemporânea e neutra;
- boa aplicação em interfaces, relatórios e marketing.

## Hierarquia sugerida

- Display / Hero: Inter ExtraBold 800;
- H1: Inter Bold 700;
- H2: Inter Bold 700;
- H3: Inter SemiBold 600;
- Body: Inter Regular 400;
- UI labels: Inter Medium/SemiBold 500–600.

## Família de dados (nova em v0.3) — JetBrains Mono

A partir da v0.3, **JetBrains Mono** é a família preferencial para valores numéricos/de dados — nunca para títulos, parágrafos, navegação ou rótulos de botão.

Use JetBrains Mono **apenas** para:

- dezenas sorteadas/selecionadas de loteria;
- IDs de concurso;
- timestamps;
- contadores;
- valores monetários;
- valores de métricas-chave onde o alinhamento tabular melhora a leitura rápida.

**Não** use JetBrains Mono para:

- títulos;
- parágrafos;
- rótulos de navegação;
- rótulos de botão;
- conteúdo explicativo.

Token: `--la-font-mono` (ver `design-tokens/tokens.css` e `design-tokens/typography.json`).

Fallback: `"SFMono-Regular", Consolas, "Liberation Mono", monospace`.

### Por que uma família separada para dados

Números de loteria, timestamps e valores monetários se beneficiam de largura fixa por caractere: alinhamento tabular consistente, menor ambiguidade entre dígitos parecidos (`1`/`l`/`I`, `0`/`O`), e leitura rápida em listas longas de jogos. Isso é uma decisão de legibilidade de dados, não uma mudança na voz visual da marca — Inter continua sendo 100% da experiência de marca, títulos e conteúdo.

## Dados/números importantes

- Inter SemiBold 600 continua válido para números importantes exibidos em contexto de marca/marketing (ex.: brandboard, apresentações);
- dentro do produto, valores numéricos de dados (dezenas, concursos, timestamps, contadores, valores monetários) usam JetBrains Mono, com `font-variant-numeric: tabular-nums` quando aplicável.

## Wordmark — inalterado

**Loto** em Atlas Ink (tema claro) ou White (tema escuro/reverso).
**Atlas** em Atlas Violet ou gradiente violeta.

Evitar itálico, serifas decorativas e fontes com estética de cassino.

## Fallback digital

Marca/UI: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`

Dados: `"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace`
