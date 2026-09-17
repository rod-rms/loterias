# LotoAtlas Brand Kit v0.3

Pacote de desenvolvimento da identidade visual e verbal do LotoAtlas.

## Status

**Direção de marca aprovada para desenvolvimento. Não é ainda um manual jurídico/gráfico definitivo.**

A identidade parte do conceito escolhido: rede/atlas de combinações + trevo como representação secundária de sorte.

## O que mudou na v0.3 (a partir da v0.2 aprovada e geometricamente corrigida)

Esta é uma evolução das **regras de aplicação de UI**, não da identidade. A v0.3 é baseada exatamente na v0.2 — o símbolo, a geometria corrigida do trevo, a wordmark e toda a estratégia de marca permanecem inalterados.

- Tema escuro (Atlas Ink / Atlas Ink 2) como superfície primária e padrão do produto; o tema claro passa a ser documentado como alternativa secundária/institucional.
- Atlas Violet consolidado como a única cor de ação funcional (botões primários, seleção, foco).
- Nova camada de tokens semânticos (`--la-bg-*`, `--la-text-*`, `--la-action*`, `--la-focus`, `--la-success`) sobre os tokens brutos da marca, que permanecem inalterados.
- Correção de acessibilidade: Atlas Violet (3,18:1) e Atlas Violet Light (4,31:1) não atingem AA para texto normal sobre Atlas Ink — um novo token de texto de ação/link acessível (`#A07AFF`, "Atlas Violet Accessible") foi adicionado especificamente para isso.
- JetBrains Mono adicionado como família tipográfica de dados (dezenas, IDs de concurso, timestamps, valores), usada apenas para esse fim — nunca em títulos, parágrafos, navegação ou botões.
- `guidelines/03_COLOR_SYSTEM.md` e `guidelines/07_UI_BRAND_APPLICATION.md` reescritos em torno do produto escuro por padrão.

**Nada na identidade (símbolo, trevo, wordmark, arquitetura de marca, arquétipos, pilares, tom de voz, personas, mensagens, diretrizes legais/de naming, guardrails de monetização) foi alterado.** Ver `guidelines/02_LOGO_SYSTEM.md`, que permanece o mesmo da v0.2.

Esta versão **não** implementa o rebrand na aplicação React — é apenas o sistema de marca/tokens para uma implementação futura.

## Estrutura

- `brandbook/` — Brandbook em DOCX/PDF e conteúdo mestre;
- `logos/svg/` — logos vetoriais de trabalho (idênticos à v0.2 — geometria do trevo preservada);
- `logos/png/` — exports raster (idênticos à v0.2);
- `design-tokens/` — cores, tipografia e CSS, agora com camada semântica de tema escuro;
- `guidelines/` — regras detalhadas;
- `templates/` — templates editáveis em SVG;
- `preview/` — brand board (claro, v0.2) e novo brand board escuro (v0.3);
- `reference/` — conceitos visuais de referência aprovados na conversa.

## Identidade (inalterada desde v0.2)

**Nome:** LotoAtlas
**Tagline:** Organize. Analise. Confira.
**Essência:** Clareza para explorar possibilidades.
**Arquétipo:** Sábio + Explorador.
**Pilares:** Clareza, Método, Controle, Responsabilidade.

## Observação sobre o logo

Os arquivos vetoriais são uma reconstrução técnica utilizável da direção escolhida. Recomenda-se um último refinamento de desenho por designer antes de registro final e ampla produção comercial.

## Correção de logo v0.2 (histórico, preservado nesta versão)

A v0.2 corrigiu o desalinhamento óptico do trevo presente no primeiro pacote (v0.1). O trevo foi redesenhado com quatro folhas simétricas em um único centro de rotação, reposicionado no vazio interno da rede e reexportado em todas as assinaturas, ícones, favicons, previews, DOCX e PDF. **A v0.3 reutiliza esses mesmos arquivos sem qualquer alteração de geometria.**
