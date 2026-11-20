# LotoAtlas — Kit de Identidade Visual

Versão: 1.0 — novembro de 2026

## Conceito

A nova marca combina **Atlas / Coordenadas** com **Intervalo / Probabilidade**. O símbolo forma um **A modular** a partir de posições organizadas em matriz e usa uma faixa central destacada para representar **seleção, intervalo analítico e análise probabilística**. A construção evita códigos visuais tradicionais de loteria (trevo, bola, bilhete, globo ou bússola) para reforçar a LotoAtlas como produto digital independente, orientado por dados e método.

## Paleta principal

| Cor | HEX | Uso sugerido |
|---|---|---|
| Navy | `#0B1B4D` | texto principal, estrutura, logotipo |
| Navy Dark | `#07142F` | fundos escuros, app icon |
| Violeta | `#6C3DFF` / `#7A3DFF` | inteligência, tecnologia, destaque de “Atlas” |
| Ciano | `#00D6C6` | intervalo selecionado, estados de foco e acentos |
| Cyan Blue | `#25B6F2` | início da faixa analítica / gradiente |
| Ink | `#10162F` | versão monocromática escura |
| Branco | `#FFFFFF` | versão reversa |

## Tipografia

O wordmark foi desenvolvido a partir de **Inter Display Bold** e convertido em curvas nos SVGs finais. Portanto, **os arquivos de produção não dependem da fonte instalada**. O arquivo editável preservado em `05_Source/` mantém texto para manutenção futura e requer Inter / Inter Display.

## Qual arquivo usar

### Logo horizontal

- `lotoatlas-logo-horizontal.svg` — **assinatura principal**. Use em cabeçalho do site, landing pages, apresentações, documentos e peças institucionais.
- `lotoatlas-logo-horizontal-reversed.svg` — mesma assinatura sobre fundos escuros. O SVG é transparente; aplique sobre Navy Dark ou outro fundo de contraste adequado.
- `lotoatlas-logo-horizontal-mono-ink.svg` — impressão 1 cor, documentos simples, gravação e aplicações técnicas.
- `lotoatlas-logo-horizontal-mono-white.svg` — aplicação monocromática clara sobre fundos escuros.
- `lotoatlas-logo-horizontal-tagline.svg` — assinatura secundária com **ORGANIZE. ANALISE. CONFIRA.**. Use apenas quando houver espaço; não é a versão padrão do logo.

**Largura mínima sugerida:** 180 px em tela. Abaixo disso, prefira `lotoatlas-logo-compact.svg` ou o símbolo.

### Logo compacto

- `lotoatlas-logo-compact.svg` — headers menores, barra lateral, telas internas, rodapés e áreas com pouca altura vertical.
- `lotoatlas-logo-compact-reversed.svg` — versão para fundo escuro.

**Largura mínima sugerida:** 130 px.

### Logo empilhado

- `lotoatlas-logo-stacked.svg` — cards, capas, splash screens, materiais quadrados ou verticais.
- versões `reversed`, `mono-ink`, `mono-white` e `tagline` seguem a mesma lógica da assinatura horizontal.

**Largura mínima sugerida:** 120 px.

### Símbolo completo

- `lotoatlas-symbol-color.svg` — quando a marca já estiver contextualizada: dashboard, selo de produto, rodapé, marca d'água ou elemento de identidade.
- `lotoatlas-symbol-on-dark.svg` — aplicação pronta sobre Navy Dark.
- versões `mono-ink` e `mono-white` — 1 cor.

**Tamanho mínimo sugerido:** 32 px.

### Micro-símbolo

- `lotoatlas-symbol-micro-color.svg` — versão responsiva simplificada para interfaces pequenas.
- versões monocromáticas incluídas.

**Use entre 16 e 31 px.** Não reduza o símbolo completo até 16 px; a microversão foi construída justamente para preservar leitura nesses tamanhos.

### Favicon e app icon

- `lotoatlas-favicon.svg` — favicon vetorial recomendado para navegadores atuais.
- `03_Web/favicon.ico` — fallback para navegadores/ambientes que exigem ICO.
- `lotoatlas-app-icon.svg` — PWA, atalhos, tiles e aplicação de produto.
- `lotoatlas-app-icon-maskable.svg` — Android/PWA com `purpose: maskable`.
- `03_Web/apple-touch-icon.png` — iOS / Safari.
- `03_Web/icon-192.png` e `icon-512.png` — PWA/Web App Manifest.

### Avatar / redes

- `lotoatlas-social-avatar.svg` e PNG 1080×1080 — avatar de perfil, grupos de teste, comunidade e canais sociais.

## PNGs incluídos

A pasta `02_PNG/` contém rasterizações prontas para uso em ambientes que não aceitam SVG. Foram incluídos:

- logo horizontal: 1600 px e 1200 px de largura;
- logo empilhado: 1080 px e 720 px de largura;
- logo compacto: 1240 px de largura;
- símbolo: 800 px;
- app icons: 64, 96, 128, 152, 180, 192, 256, 512 e 1024 px;
- favicons: 16, 32, 48, 64, 96, 128 e 256 px;
- avatar: 512×512 e 1080×1080.

Para impressão, edição ou aplicações em qualquer escala, **prefira sempre SVG**.

## Área de proteção

Considere como área livre mínima ao redor da marca o equivalente à **altura de um módulo do símbolo**. Nenhum texto, borda, fotografia ou outro elemento gráfico deve invadir essa área.

## Fundos

1. Fundo branco ou muito claro → versões padrão coloridas.
2. Fundo Navy Dark / fotografia escura → versões `reversed` ou `mono-white`.
3. Evite colocar a versão colorida sobre fundos violetas/cianos intensos, pois o intervalo central perde contraste.
4. Não aplique contorno, sombra, bevel ou brilho ao logotipo.

## Uso da faixa ciano

A faixa ciano é o elemento conceitual de **intervalo/foco analítico**. Em interfaces, ela pode inspirar estados selecionados, destaques de filtros, ranges e visualizações analíticas, mas não deve virar um ornamento repetitivo em todos os componentes.

## Aplicação no produto

Sugestão de hierarquia:

- **Login / landing page:** logo horizontal ou empilhado.
- **Header do dashboard:** logo compacto.
- **Sidebar recolhida:** símbolo completo ≥32 px; micro-símbolo se menor.
- **Favicon:** micro-símbolo no tile Navy Dark.
- **PWA / atalho de celular:** app icon 512/1024.
- **Loading / splash:** símbolo completo centralizado; evite animar cada módulo de forma aleatória — se houver animação, priorize a faixa de intervalo.
- **Relatórios exportados:** horizontal mono-ink ou colorido sobre branco.

## Identidade independente

A LotoAtlas é uma plataforma independente. Em páginas públicas relacionadas às modalidades das Loterias CAIXA, recomenda-se manter uma declaração clara de **não afiliação / não oficialidade** próxima ao rodapé, termos e áreas de contexto institucional. A identidade visual não deve imitar marcas, símbolos ou códigos proprietários da CAIXA.

## Arquivos para desenvolvimento

`03_Web/` inclui:

- `favicon.svg` e `favicon.ico`;
- `apple-touch-icon.png`;
- `icon-192.png`, `icon-512.png` e `icon-maskable.svg`;
- `site.webmanifest` de referência;
- `lotoatlas-brand-tokens.css`;
- `lotoatlas-brand-tokens.json`.

Os tokens podem ser incorporados ao design system do site e renomeados conforme a arquitetura do projeto.

## Estrutura do pacote

```text
LotoAtlas_BrandKit/
├── 01_SVG/
├── 02_PNG/
│   ├── icons/
│   ├── logos/
│   └── social/
├── 03_Web/
├── 04_Guidelines/
└── 05_Source/
```

## Regra principal

**Marca grande:** assinatura horizontal.  
**Espaço curto:** logo compacto.  
**Marca reconhecida:** símbolo.  
**16–31 px:** micro-símbolo.  

Essa gradação preserva a mesma identidade em todos os tamanhos sem sacrificar legibilidade.
