# Architecture — v1.1

## 1. Stack

- React + Vite + TypeScript strict;
- React Router ou equivalente leve;
- Tailwind CSS;
- componentes acessíveis sem lock-in;
- Vitest + Testing Library;
- Playwright;
- Web Workers;
- IndexedDB;
- localStorage apenas para preferências pequenas;
- hosting estático compatível com Cloudflare Pages;
- sem IA generativa em runtime.

## 2. Estrutura

```text
src/
  app/
  modules/
    lotofacil/
      domain/
      strategies/
      ui/
      workers/
    megasena/
      domain/
      strategies/
      ui/
      workers/
  shared/
    components/
    lib/
    types/
    utils/
```

Adicionar explicitamente `strategies/` em cada modalidade para adapters/registry. O domínio não deve importar UI nem registry.

Demais pastas permanecem conforme `REPOSITORY_STRUCTURE_V1.md`.

## 3. Camadas

### Domain

Matemática pura, validação, geração, avaliação.

### Strategy adapters

Traduzem `StrategyDefinition + input comum` em chamadas do domínio.

Devem mapear:

- capacidades;
- presets de qualidade;
- versão;
- regras de comparação;
- mensagens/limitações.

### UI

Formulários e apresentação. Não implementa matemática.

### Shared

Somente abstrações semanticamente iguais nas duas modalidades.

### Rotas (v1.1)

`/<modalidade>/gerar` é o ponto de entrada/hub de cada modalidade — reúne seleção de estratégia, geração e, no topo, os links para "Meus jogos salvos" e "Metodologia" daquela modalidade. As antigas páginas de landing (`/lotofacil`, `/megasena`, componente `ModalityHome`) foram removidas por duplicarem o catálogo de estratégias já mostrado em `/gerar`; essas rotas continuam existindo apenas como redirects (`<Navigate replace>`) para `/<modalidade>/gerar`, para não quebrar links/favoritos antigos.

```text
/                          Home
/lotofacil                → redirect → /lotofacil/gerar
/megasena                 → redirect → /megasena/gerar
/lotofacil/gerar           Gerar jogos (hub da modalidade)
/lotofacil/carteiras       Jogos salvos (escopo Lotofácil)
/lotofacil/metodologia     Metodologia (escopo Lotofácil)
/megasena/gerar             Gerar jogos (hub da modalidade)
/megasena/carteiras         Jogos salvos (escopo Mega-Sena)
/megasena/metodologia       Metodologia (escopo Mega-Sena)
/carteiras                  Jogos salvos (todas as modalidades)
/sobre                      Sobre
```

Navegação "voltar" (`BackLink`) usa destinos fixos e determinísticos, não o histórico do navegador: Gerar → Início; Metodologia/Carteiras de uma modalidade → Gerar da mesma modalidade; Carteiras global → Início.

## 4. Contrato comum

```ts
interface GeneratePortfolioRequest {
  modality: "lotofacil" | "megasena";
  strategyId: string;
  contest?: number;
  inputMode: "quantity" | "budget";
  numberOfTickets?: number;
  budgetBRL?: number;
  seed?: string | number;
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  qualityPreset?: "fast" | "balanced" | "deep";
  advanced?: Record<string, unknown>;
}
```

A UI envia somente o campo correspondente ao `inputMode`.

## 5. Resultado comum

O shell precisa conseguir ler metadados comuns sem apagar diferenças do domínio:

```ts
interface PortfolioEnvelope<TMetrics, TAudit> {
  id: string;
  modality: "lotofacil" | "megasena";
  strategyId: string;
  strategyVersion: string;
  contest?: number;
  seed: string | number;
  tickets: number[][];
  costBRL: number;
  metrics: TMetrics;
  audit: TAudit;
  generationMethod: string;
  evaluationMethod: string;
  createdAt: string;
}
```

## 6. Seed

Criar serviço compartilhado somente para:

- gerar seed quando ausente;
- serializar seed;
- derivar sub-seeds de forma determinística.

O algoritmo específico continua no domínio.

## 7. Worker

Usar Worker para:

- otimização;
- enumeração pesada;
- Monte Carlo;
- cobertura de milhões de resultados.

Mensagens:

```ts
type WorkerStage =
  | "preparing"
  | "optimizing"
  | "evaluating"
  | "auditing"
  | "done";
```

Sem percentuais inventados.

### 7.1 Ciclo de vida de falha do Worker (v1.1.2)

Além das mensagens estruturadas (`progress`/`success`/`error`) que o próprio worker pode postar, `useGenerationWorker` (`shared/lib/useGenerationWorker.ts`) trata falhas que acontecem fora do try/catch interno do worker:

- `worker.onerror` — exceção não tratada dentro do worker, ou falha ao carregar o próprio script/chunk do worker;
- `worker.onmessageerror` — a mensagem recebida não pôde ser desserializada (falha de structured clone);
- falha síncrona ao construir o worker (`new Worker(...)` lança);
- falha síncrona de `postMessage(...)`.

Qualquer uma dessas falhas: encerra o worker (`terminate()`), limpa `workerRef`, volta `stage` para `"idle"` (nunca deixa preso em `"preparing"`/`"optimizing"`), e expõe um erro único e amigável ("Não foi possível concluir a geração. Tente novamente.") — nunca uma stack trace para o usuário leigo.

**Proteção contra corrida de worker obsoleto:** cada handler (`onmessage`, `onerror`, `onmessageerror`) só altera estado se `workerRef.current === worker` (o worker que dispara o evento ainda é o worker "atual"). Como uma nova chamada a `generate()` substitui `workerRef.current` imediatamente, um evento atrasado de um worker já substituído nunca pode corromper o estado de uma geração mais nova.

## 8. Otimização vs avaliação

Guardar e exibir separadamente:

- `optimizationMethod` / `generationMethod`;
- `evaluationMethod`;
- status da métrica final.

Uma busca pode usar heurística/amostra e ainda assim a carteira final ser avaliada exatamente; ou ambos podem ser estimados. A UI não deve colapsar isso em um único badge.

## 9. Mega-Sena

Preservar o domínio recebido, testes e política `bigint`/exato-estimado.

Novos adapters:

- `uniform_random`;
- `max_diversification`.

## 10. Lotofácil

Implementar domínio próprio e adapters:

- RMS v2;
- diversificação;
- cobertura 11+;
- cobertura 12+;
- aleatória distinta.

## 11. Persistência

Criar camada `shared/lib/storage` ou equivalente com migrations explícitas para IndexedDB.

Não espalhar chamadas IndexedDB em componentes.

## 12. Dados

Criar adapters de dados de concurso e configuração. Domínio RMS recebe draws já validados; não lê JSON diretamente.

### 12.1 Fronteira de "sem espiada ao futuro" (v1.1.1)

O recorte de janela histórica (`referenceWindow`/`drawsBeforeContest`, em `shared/lib/dataLoaders.ts`) é a única fronteira que decide quais concursos um algoritmo de domínio pode enxergar para um concurso-alvo `T`. Ela sempre calcula os contests esperados como `T - windowSize .. T - 1` e falha (retorna `null`) se qualquer um estiver ausente — nunca aceita um concurso `>= T`, independentemente de quantos concursos futuros existam no dataset carregado. Os adapters de estratégia (`generateRmsV2Adapter`, etc.) chamam essa função e nunca recebem o dataset bruto diretamente no domínio. Isso é o que torna a simulação histórica segura: truncar fisicamente o dataset em `T - 1` ou alterar concursos posteriores a `T` nunca muda o resultado gerado (ver `tests/lotofacil/noLookAhead.test.ts`).

### 12.2 Validação de concurso-alvo

`shared/lib/targetContest.ts` (`validateTargetContest`) é a única fonte de verdade para decidir se um número de concurso é aceitável para geração, a partir do dataset já carregado — nunca por uma nova requisição de rede. Ver `PRODUCT_SPEC_V1.md` §7.2.

## 13. Deploy

GitHub → Cloudflare Pages.

Atualização de resultados por GitHub Action/script, preservando último snapshot válido em falhas.

## 14. Versão do aplicativo (v1.1.1)

`package.json` (`version`) é a única fonte de verdade para a versão visível do app. O Vite injeta esse valor em tempo de build como a constante `__APP_VERSION__` (ver `vite.config.ts` e `src/vite-env.d.ts`); componentes React importam `APP_VERSION` de `shared/lib/appVersion.ts` — nunca escrevem a versão como literal (`"v1.1.1"`) diretamente no JSX. Identificadores técnicos de versão que já existiam (versão de estratégia, de motor/algoritmo, de dataset) continuam sendo conceitos separados e não são substituídos por isso.

## 15. Barreira de erro global (v1.1.2)

`src/app/ErrorBoundary.tsx` é uma classe React (`Error Boundary`) que envolve toda a árvore do `RouterProvider` em `src/app/App.tsx`. Uma exceção de renderização/ciclo de vida em qualquer página é capturada aqui em vez de deixar o React desmontar a árvore inteira silenciosamente (tela em branco). O fallback é deliberadamente calmo e não técnico, com duas ações: "Tentar novamente" (reseta o estado da barreira e tenta renderizar os filhos de novo) e "Voltar ao início" — este último é um `<a href="/">` comum, não um `<Link>` do React Router, porque precisa funcionar mesmo que a falha tenha acontecido dentro da própria árvore do roteador. Dados do IndexedDB não são afetados por uma falha de renderização; o fallback reforça isso explicitamente ao usuário. Erros React que não podem ser capturados por uma Error Boundary (por exemplo, exceções em handlers de evento assíncronos) permanecem fora de escopo desta barreira, por design — não há tentativa de simular uma captura que o React não oferece nativamente.

## 16. Por que a atualização de dados ao vivo nunca entra na CI normal (v1.1.2)

A CI de PR/main (`ci.yml`) nunca chama a fonte oficial da CAIXA — não executa `npm run data:update`, apenas `npm run data:validate` (validação estrutural do dataset já versionado). Isso é uma decisão arquitetural deliberada, não uma omissão: os gates de qualidade de um PR precisam ser determinísticos, e nunca devem ficar vermelhos só porque a CAIXA está temporariamente indisponível ou lenta. A integração ao vivo com a fonte oficial é responsabilidade exclusiva do workflow agendado `data-update.yml`, que já tem sua própria camada de resiliência (retries/backoff internos) e, a partir da v1.1.2, seu próprio alerta operacional (ver §17). Um teste de contrato (`tests/shared/dataUpdateWorkflowAlert.test.ts`) garante que essa separação não seja revertida por engano.

## 17. Alerta operacional do atualizador de dados (v1.1.2)

O atualizador (`scripts/data/update-dataset.mjs`) já preserva o último dataset válido em caso de falha, mas isso por si só não avisa ninguém quando a fonte oficial muda de formato ou fica indisponível por muito tempo. `data-update.yml` adiciona dois passos usando `actions/github-script` com o `GITHUB_TOKEN` do próprio repositório (permissão `issues: write`, sem serviço pago, sem novo segredo):

- em caso de falha (`if: failure()`): cria uma issue rotulada `data-update-failure` com a URL da execução, evento/agenda que disparou, commit/ref e horário — ou comenta na issue já aberta com esse rótulo, em vez de criar uma duplicata;
- em caso de sucesso (`if: success()`): comenta e fecha qualquer issue aberta com esse rótulo, sinalizando recuperação.

Issues criadas manualmente nunca são tocadas, porque só o rótulo que este workflow gerencia marca uma issue como incidente do atualizador.

## 18. Política de terminação de linha (v1.1.2)

`.gitattributes` (`* text=auto eol=lf`, com ativos binários comuns marcados `-text`) e `.editorconfig` (LF, UTF-8, indentação de 2 espaços, nova linha final) padronizam a terminação de linha do repositório. A normalização (`git add --renormalize .`) foi verificada como não gerando nenhum diff além dos arquivos já intencionalmente alterados nesta branch — a árvore já era consistentemente LF internamente.

## 19. Integração visual da marca LotoAtlas (branch `feat/lotoatlas-brand-integration`)

A partir desta branch, a marca pública do aplicativo é **LotoAtlas** (antes "Loterias"), com o LotoAtlas Brand Kit v0.3 (`docs/global/LotoAtlas_BrandKit_v0.3/`, agora versionado no repositório) como fonte de verdade visual. Esta é uma mudança de identidade visual e de UX responsiva — **nenhuma matemática de loteria, comportamento de estratégia, restrição da RMS, saída de oráculo, distribuição de geração aleatória, regra de validação de concurso, comportamento de no-look-ahead, semântica do atualizador ou schema de persistência foi alterada.**

- **Tema escuro por padrão**: `index.html` define `<html data-theme="dark">`, `color-scheme: dark` e `theme-color: #101729`; não há alternância clara/escuro nesta entrega (tema claro documentado como alternativa secundária/institucional no próprio Brand Kit, para um toggle futuro).
- **Tokens semânticos**: `tailwind.config.js` define uma paleta `brand.*` (bg, surface, surfaceElevated, text, textMuted, border, borderStrong, action, actionHover, actionForeground, actionText, focus, success, além dos tons brutos violet/violetLight/blue/teal/luck/ink/ink2) com os mesmos valores hexadecimais do Brand Kit v0.3 (`design-tokens/colors.json`/`tokens.css`), para que os modificadores de opacidade do Tailwind funcionem corretamente. `src/styles/brandTokens.css` mantém as variáveis CSS customizadas do Brand Kit (`--la-*`) intactas para uso direto em CSS e para uma futura alternância de tema. Nenhum valor bruto de marca foi alterado; nenhuma cor de marca é referenciada como hexadecimal solto dentro de componentes — sempre via token semântico.
- **Uma única cor de ação funcional**: Atlas Violet (`brand.action` / `#6D3CFF`) é a única cor usada para CTAs primários e estados selecionados/ativos (ex.: botão "Gerar jogos", "Salvar estes jogos", card de estratégia selecionado, preset de qualidade selecionado). Azul e Teal permanecem reservados para o símbolo da marca e para distinção de modalidade/dado; Luck Green permanece estritamente para confirmação factual de sucesso (nunca para insinuar ganho ou melhoria de chance).
- **Acessibilidade de contraste**: texto de ação/link sobre fundo escuro usa `#A07AFF` (`brand.actionText`, ~5.71:1 sobre Atlas Ink), nunca o Atlas Violet bruto (~3.18:1, insuficiente para texto normal) — ver `guidelines/03_COLOR_SYSTEM.md` no Brand Kit v0.3 para a tabela completa de contraste.
- **Tipografia**: Inter (`@fontsource/inter`) permanece a família de UI/marca; JetBrains Mono (`@fontsource/jetbrains-mono`) foi adicionada exclusivamente para valores de dados (dezenas, IDs de concurso, timestamps, contadores, valores monetários, métricas tabulares) via a classe utilitária `font-mono` — nunca em títulos, parágrafos, navegação ou botões.
- **Logo**: os ativos SVG/PNG usados pela aplicação (`src/assets/brand/`, `public/brand/`) são cópias byte-idênticas dos ativos aprovados em `docs/global/LotoAtlas_BrandKit_v0.3/logos/` (geometria do trevo corrigida da v0.2, preservada sem redesenho) — verificado por teste automatizado (`tests/shared/logoAssetIntegrity.test.ts`).
- **Renomeação pública**: referências de marca própria do aplicativo ("Loterias" no cabeçalho, rodapé, título, meta description, Sobre) tornaram-se "LotoAtlas". Termos genéricos que se referem ao produto oficial da CAIXA (ex.: "Loterias CAIXA" na Metodologia) permanecem inalterados — não são autorreferência da marca do aplicativo.
- **Responsividade**: nenhuma página apresenta overflow horizontal em largura de 375px (verificado programaticamente); `tests/e2e/mobile-critical-flows.spec.ts` cobre fluxos críticos em um viewport de telefone (390×844, touch habilitado) sobre o navegador Chromium já usado pelo projeto Playwright existente (não foi adicionado um segundo projeto/navegador).
