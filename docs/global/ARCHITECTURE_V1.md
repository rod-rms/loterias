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
