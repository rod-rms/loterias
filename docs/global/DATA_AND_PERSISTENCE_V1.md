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

O workflow restringe cada sequência de janelas aos dias em que o sorteio correspondente de fato ocorre, em vez de rodar todo dia. Como Lotofácil e Mega-Sena juntas cobrem sorteios noturnos de segunda a sexta (união dos dois calendários), a sequência noturna roda apenas nesses dias; a sequência de domingo de manhã roda apenas aos domingos. Concretamente, em UTC (BRT = UTC-3, sem horário de verão desde 2019):

- Sequência noturna (22:45 → 00:30 → 07:00 BRT, referente a um sorteio de segunda a sexta): como 22:45 BRT de um dia útil já cai em UTC no dia seguinte, e as duas checagens seguintes (00:30 e 07:00 BRT) já são o dia seguinte tanto em BRT quanto em UTC, a sequência inteira roda em `terça a sábado` (UTC) — o conjunto de dias que sucede um sorteio de segunda a sexta.
- Sequência de domingo de manhã (13:00 → 15:30 → 20:00 BRT): permanece inteiramente no mesmo dia em BRT e UTC, então roda apenas aos `domingos` (UTC).

Isso mantém exatamente a mesma sequência de retries por sorteio, apenas sem executar o workflow em dias/horários em que nenhum sorteio relevante ocorreu. `workflow_dispatch` continua disponível para verificação manual em datas excepcionais — o **calendário oficial mensal da CAIXA é a fonte de verdade** para feriados e alterações de agenda, e prevalece sobre esta agenda recorrente.

Duas camadas de resiliência distintas, ambas mantidas:

1. **Retries HTTP internos** no `update-dataset.mjs` (backoff exponencial, tratamento de 429/timeout): resolvem falhas curtas de rede/API dentro de uma mesma execução.
2. **Múltiplas janelas agendadas**: resolvem atraso ou instabilidade mais longa na publicação do resultado pela CAIXA, entre uma execução e outra.

Para evitar ruído no histórico do Git, janelas "intermediárias" de uma mesma sequência de acompanhamento **não** geram commit quando a verificação teve sucesso mas não havia concurso novo (o script registra a tentativa no log, mas não persiste `lastCheckedAt`). Apenas a **janela final** de cada sequência (ou uma execução manual via `workflow_dispatch`) persiste `lastCheckedAt` mesmo sem novidade — assim a aplicação pode mostrar honestamente quando a fonte oficial foi verificada pela última vez. Encontrar um concurso novo sempre gera commit, em qualquer janela.

### 5.2 Alerta de falha e por que a CI normal fica de fora (v1.1.2)

A resiliência do próprio atualizador (timeouts, retries, backoff, tratamento de 429, validação de payload, escrita atômica, detecção de lacunas, preservação do último dataset válido) já existia e não foi reescrita nesta versão. O que faltava era um sinal acionável: se a fonte da CAIXA mudar de formato ou ficar indisponível por muito tempo, o workflow pode falhar silenciosamente enquanto a produção continua servindo o dataset anterior, sem que ninguém saiba.

A partir da v1.1.2, `data-update.yml` cria (ou comenta, para não duplicar) uma issue no GitHub rotulada `data-update-failure` quando a atualização falha, com o link da execução, o evento/agenda que disparou, o commit/ref e o horário — e fecha automaticamente essa issue, com um comentário de recuperação, na primeira execução seguinte bem-sucedida. Isso usa apenas `actions/github-script` com o token do próprio repositório (permissão `issues: write`), sem serviço pago e sem novo segredo. Issues criadas manualmente por uma pessoa nunca são tocadas.

O workflow não assume que o rótulo `data-update-failure` já existe: antes de usá-lo, verifica sua existência via API (`getLabel`) e o cria (`createLabel`) se estiver ausente, tolerando com segurança a corrida de criação concorrente (HTTP 422 tratado como sucesso). Isso torna o alerta funcional mesmo em um repositório novo/limpo, sem exigir configuração manual prévia do rótulo.

Esse alerta é responsabilidade exclusiva do workflow agendado. A CI normal de PR/main (`ci.yml`) nunca chama a fonte oficial da CAIXA — ela roda `npm run data:validate` (validação estrutural do dataset já commitado), nunca `npm run data:update` — porque os gates de qualidade de um PR precisam ser determinísticos e nunca devem falhar por causa de uma instabilidade temporária de um serviço externo. Ver `ARCHITECTURE_V1.md` §16.

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

## 16. Conferência de resultado — apresentação completa e rótulos (v1.1.1)

`CheckedResult` continua com o mesmo schema (`contest`, `numbers`, `checkedAt`, `hitsPerTicket`, mais os campos opcionais já existentes) — nada foi removido, nada de premiação foi adicionado. Carteiras e backups salvos antes da v1.1.1 continuam sendo lidos normalmente.

O que mudou foi apenas a **apresentação**, derivada dos dados já existentes, sem duplicar valores calculados no IndexedDB:

- `src/shared/lib/resultLabels.ts` fornece `getResultLabel(modality, hits)` (rótulo convencional: "Quadra"/"Quina"/"Sena" para Mega-Sena; "11 acertos".."15 acertos" para Lotofácil; `null` abaixo do limiar) e `summarizeBestTickets`/`summarizeCheckedResult`, que calculam a maior pontuação, todos os jogos empatados nela, e uma frase pronta em pt-BR que trata corretamente 1, 2, ou 3+ jogos empatados.
- Nenhum desses rótulos ou frases usa semântica de prêmio/dinheiro ("premiação", "prêmio", "ganhou", "aposta vencedora" são proibidos nesta camada).
- A tela de "Meus jogos salvos" mostra, juntos: o resultado oficial do concurso, o número de acertos por jogo, as dezenas destacadas, e o(s) melhor(es) jogo(s) — nunca resumidos em uma única frase genérica.

## 17. Validação de concurso-alvo e simulação histórica (v1.1.1)

Ver `PRODUCT_SPEC_V1.md` §7.2–7.3 para as regras completas. Do ponto de vista de dados:

- toda a validação (`src/shared/lib/targetContest.ts`) usa exclusivamente o dataset já carregado (`LotteryDataset`) — nunca dispara uma nova requisição HTTP a partir do navegador;
- a garantia de "sem espiada ao futuro" para estratégias com histórico (RMS v2) é implementada na função de recorte de janela (`referenceWindow`, já existente desde a v1), que calcula os concursos esperados relativos ao concurso-alvo e nunca considera concursos posteriores presentes no dataset;
- testes de regressão dedicados (`tests/lotofacil/noLookAhead.test.ts`) provam, com um dataset sintético: que toda entrada histórica passada à RMS tem `contest < T`; que gerar com o dataset completo ou com um dataset fisicamente truncado em `T-1` produz o mesmo resultado; e que alterar concursos posteriores a `T` não muda o resultado gerado.

## 18. Transparência de armazenamento local (v1.1.1)

Reforço de copy (não muda a arquitetura): Sobre e "Meus jogos salvos" explicam que os jogos salvos existem apenas no navegador/dispositivo atual, sem conta nem sincronização em nuvem; que outro dispositivo/perfil não vê os mesmos jogos automaticamente; que qualquer pessoa usando o mesmo perfil de navegador pode acessá-los; e que limpar dados do site pode apagá-los — daí a recomendação de "Exportar backup" antes de limpar dados ou trocar de dispositivo. Mecanismo de persistência inalterado: IndexedDB via Dexie, sem login, sem backend, sem sincronização.
