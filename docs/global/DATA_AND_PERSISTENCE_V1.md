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

- script reproduzível de atualização de dados (`scripts/data/update-dataset.mjs`);
- GitHub Action agendada (`.github/workflows/data-update.yml`);
- fonte oficial configurada;
- validação antes de commit;
- nenhuma alteração se não houver concurso novo;
- preservação do snapshot em falha.

Se a fonte oficial mudar, a aplicação continua funcionando com o último snapshot válido e mostra a data de atualização.

### 5.1 Agenda de verificação (v1.1)

A partir da v1.1, a verificação automática não roda mais em um horário único e arbitrário por dia. Em vez disso, roda em **múltiplas janelas de verificação** logo após cada janela de sorteio oficial, porque a publicação do resultado pela CAIXA pode atrasar ou ficar instável por algum tempo:

- Sorteios noturnos (Lotofácil seg-sex, Mega-Sena ter/qui, a partir das 21:00 BRT): checagens de acompanhamento às 22:45, 00:30 e 07:00 BRT (esta última é a janela final de contingência).
- Sorteios de domingo de manhã (Lotofácil e Mega-Sena, a partir das 11:00 BRT): checagens de acompanhamento às 13:00, 15:30 e 20:00 BRT (esta última é a janela final de contingência).

O workflow roda essas seis janelas todo dia (é inofensivo/idempotente checar em dias sem sorteio daquela janela) e mantém `workflow_dispatch` para verificação manual em datas excepcionais — o **calendário oficial mensal da CAIXA é a fonte de verdade** para feriados e alterações de agenda, e prevalece sobre esta agenda recorrente.

Duas camadas de resiliência distintas, ambas mantidas:

1. **Retries HTTP internos** no `update-dataset.mjs` (backoff exponencial, tratamento de 429/timeout): resolvem falhas curtas de rede/API dentro de uma mesma execução.
2. **Múltiplas janelas agendadas**: resolvem atraso ou instabilidade mais longa na publicação do resultado pela CAIXA, entre uma execução e outra.

Para evitar ruído no histórico do Git, janelas "intermediárias" de uma mesma sequência de acompanhamento **não** geram commit quando a verificação teve sucesso mas não havia concurso novo (o script registra a tentativa no log, mas não persiste `lastCheckedAt`). Apenas a **janela final** de cada sequência (ou uma execução manual via `workflow_dispatch`) persiste `lastCheckedAt` mesmo sem novidade — assim a aplicação pode mostrar honestamente quando a fonte oficial foi verificada pela última vez. Encontrar um concurso novo sempre gera commit, em qualquer janela.

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
    // Opcionais, adicionados na v1.1; carteiras salvas antes disso
    // simplesmente não têm estes dois campos — nenhuma migração é
    // necessária, o campo `dataset` inteiro já era opcional.
    latestDrawDate?: string;
    statusSchemaVersion?: number;
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

## 12. Onde cada coisa vive (v1.1)

Para deixar explícita uma separação que já era verdadeira desde a v1, mas não estava documentada:

- **Repositório Git** (`public/data/**`, `docs/**`, código-fonte, specs, histórico de commits): fonte de verdade do *produto* — datasets oficiais versionados, configuração de preço, especificações, decisões de design. Nunca contém dados gerados pelo usuário.
- **IndexedDB do navegador** (via Dexie): dados privados de cada usuário — jogos salvos (`SavedPortfolio`), preferências locais. Nunca sobe para o repositório nem para qualquer servidor.
- **Backup JSON exportável** (`LoteriasBackup`): portabilidade controlada pelo próprio usuário — um arquivo que ele baixa e pode reimportar depois, inclusive em outro navegador/dispositivo. Não é sincronizado automaticamente com nada.

Carteiras, preferências, orçamentos e jogos salvos do usuário **nunca** devem ser commitados no repositório.

## 13. Metadados de transparência de dados: `public/data/status.json` (v1.1)

Arquivo versionado, gerado pelo mesmo script de atualização (`scripts/data/update-dataset.mjs`), consumido pela seção "Dados e atualizações" da Metodologia:

```ts
interface ModalityDataStatus {
  source: string;
  latestContest: number;
  latestDrawDate: string;
  lastUpdatedAt: string;
  lastCheckedAt: string;
  status: "ok" | "degraded";
  gapCount: number;
}

interface DataStatus {
  schemaVersion: number;
  lotofacil: ModalityDataStatus;
  megasena: ModalityDataStatus;
}
```

Duas datas com significado deliberadamente diferente — a UI nunca deve confundi-las:

- `lastUpdatedAt`: quando o dataset local **realmente mudou** porque um novo concurso válido foi importado.
- `lastCheckedAt`: quando a fonte oficial da CAIXA foi **verificada com sucesso pela última vez**, mesmo que não houvesse concurso novo naquele momento.

`lastCheckedAt` nunca é escrito quando a requisição falhou, a resposta foi inválida, ou a validação falhou — nesse caso o script preserva o último status conhecido-bom e não finge um sucesso. Ver seção 5.1 para como isso interage com as múltiplas janelas de verificação agendadas.

## 14. Resultado desatualizado (stale) e o que fica congelado ao salvar (v1.1)

Decisão de design: alterar a configuração de geração **depois** de já ter gerado um resultado nunca apaga ou regenera esse resultado silenciosamente. O resultado anterior continua visível, marcado como desatualizado, com ações explícitas para o usuário decidir (gerar de novo, restaurar a configuração anterior, ou descartar). Isso existe para que o usuário nunca perca, sem querer, um conjunto de jogos que já pretendia usar apenas por ter mexido em um campo do formulário.

Para isso, a página de geração mantém dois retratos (snapshots) separados:

- **`userInputSnapshot`**: a configuração visível ao usuário no momento em que "Gerar jogos" foi clicado — usada *apenas* para detectar se o formulário atual ainda corresponde ao resultado exibido (comparação de desatualização).
- **`resolvedGenerationSnapshot`**: a requisição de geração efetivamente enviada (incluindo a semente resolvida) mais o retrato do dataset usado naquele momento — usada para **salvar** (`SavedPortfolio.parameters` e `SavedPortfolio.dataset`) e para auditoria/reprodutibilidade.

Isso importa porque "Salvar estes jogos" deve sempre persistir a configuração que efetivamente gerou o resultado exibido, mesmo que o usuário já tenha editado o formulário sem gerar de novo — nunca uma reconstrução a partir do estado atual (possivelmente editado) do formulário. Ver `tests/app/gerarPageSnapshot.test.tsx` para a cobertura de regressão desse comportamento específico.

## 15. Link de jogo responsável (v1.1)

A URL usada em "Saiba mais sobre jogo responsável" (`https://loterias.caixa.gov.br/Paginas/jogo-responsavel.aspx`) ficou obsoleta/quebrada. Foi substituída pela página oficial atual (`https://www.caixa.gov.br/jogo-responsavel/Paginas/default.aspx`), centralizada em `src/shared/lib/externalLinks.ts` (`RESPONSIBLE_GAMING_URL`) para nunca mais ser duplicada por componente.
