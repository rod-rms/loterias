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

## 13. Deploy

GitHub → Cloudflare Pages.

Atualização de resultados por GitHub Action/script, preservando último snapshot válido em falhas.
