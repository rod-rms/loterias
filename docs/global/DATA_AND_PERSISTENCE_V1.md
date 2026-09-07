# Data & Persistence — v1.1

## 1. Categorias

- dados de jogo/snapshot oficial;
- configuração versionada;
- dados derivados;
- dados pessoais locais.

## 2. Configuração de jogo

Arquivo:

```text
public/data/config/game-config.json
```

Cada modalidade deve conter:

- `simpleTicketSize`;
- `ticketCostBRL`;
- `source`;
- `referenceDate`;
- `configVersion`.

Valores verificados em 07/09/2026:

- Lotofácil simples (15 números): R$ 3,50;
- Mega-Sena simples (6 números): R$ 6,00.

Os valores são configuração atualizável, não regra matemática imutável.

## 3. Resultados

Formato de arquivo sugerido:

```ts
interface LotteryDataset {
  schemaVersion: number;
  modality: "lotofacil" | "megasena";
  source: string;
  importedAt: string;
  latestContest: number;
  draws: LotteryDraw[];
}

interface LotteryDraw {
  contest: number;
  drawDate: string;
  numbers: number[];
}
```

Ordenar por concurso crescente.

## 4. Integridade do dataset

Validar:

- schema;
- modalidade;
- concurso inteiro/positivo;
- sem duplicatas;
- dezenas válidas e únicas;
- quantidade correta;
- ordenação/canonicalização;
- `latestContest` coerente;
- falha de atualização não apaga snapshot anterior.

Lacunas históricas podem existir por erro de fonte, mas devem ser detectadas. RMS não pode gerar se faltar qualquer um dos 20 concursos anteriores necessários.

## 5. Atualização

A v1 deve incluir:

- script reproduzível de atualização de dados;
- GitHub Action agendada diariamente;
- fonte oficial configurada;
- validação antes de commit;
- nenhuma alteração se não houver concurso novo;
- preservação do snapshot em falha.

Se a fonte oficial mudar, a aplicação continua funcionando com o último snapshot válido e mostra a data de atualização.

## 6. RMS

Pools são recalculadas em runtime para o concurso-alvo a partir dos 20 anteriores. Não persistir pools como verdade permanente.

Metadados da geração registram:

- janela utilizada;
- frequências;
- empates;
- pools finais;
- dataset `latestContest`/versão.

## 7. Persistência pessoal

IndexedDB com migrations.

```ts
interface SavedPortfolio {
  schemaVersion: number;
  id: string;
  modality: "lotofacil" | "megasena";
  contest?: number;

  strategyId: string;
  strategyVersion: string;
  engineVersion: string;

  createdAt: string;
  dataset?: {
    latestContest: number;
    importedAt: string;
    source: string;
  };

  price: {
    ticketCostBRL: number;
    referenceDate: string;
    source: string;
  };

  seed: string | number;
  parameters: unknown;
  tickets: number[][];
  metrics: unknown;
  audit: unknown;

  markedAsBet: boolean;
  notes?: string;

  checkedResult?: {
    contest: number;
    numbers: number[];
    source?: string;
    checkedAt: string;
    hitsPerTicket: number[];
    prizeGrossBRL?: number;
  };
}
```

## 8. Imutabilidade histórica

Uma carteira salva mantém suas métricas originais. Versão nova do algoritmo não substitui métricas antigas silenciosamente.

## 9. Preferências

localStorage:

- última modalidade;
- última estratégia por modalidade;
- inputMode;
- preferências visuais.

Não guardar carteiras completas apenas em localStorage.

## 10. Backup

Formato próprio versionado:

```ts
interface LoteriasBackup {
  schemaVersion: number;
  exportedAt: string;
  portfolios: SavedPortfolio[];
  preferences?: Record<string, unknown>;
}
```

Importação:

- valida schema;
- mostra quantidade de itens;
- trata IDs duplicados explicitamente;
- nunca executa código do arquivo;
- recusa formato inválido.

## 11. Privacidade

Na v1, dados pessoais de carteiras permanecem localmente no navegador. Não incluir analytics de terceiros por padrão.
