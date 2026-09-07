# 00 — START HERE: Implementação integral Loterias v1 no Claude Code

**Status:** handoff operacional aprovado para implementação  
**Repositório oficial:** `https://github.com/rod-rms/loterias.git`  
**Produto:** aplicação web pública “Loterias” — Lotofácil + Mega-Sena  
**Stack-alvo:** React + Vite + TypeScript strict  
**Deploy-alvo:** Cloudflare Pages  
**Data-base da especificação:** 07/09/2026

---

# 1. Missão

Implemente integralmente a **v1 funcional do aplicativo Loterias** a partir dos arquivos presentes neste repositório/starter pack.

Você deve conduzir a implementação ponta a ponta:

1. auditar o estado do repositório;
2. preservar e validar os artefatos matemáticos já entregues;
3. criar o shell React/Vite/TypeScript;
4. implementar a camada compartilhada;
5. implementar o motor e as estratégias da Lotofácil;
6. integrar o motor Mega-Sena já entregue;
7. implementar todas as telas e fluxos da v1;
8. implementar persistência local e backup;
9. implementar datasets e atualização de resultados;
10. implementar testes unitários, integração e E2E;
11. executar lint, typecheck, testes e build de produção;
12. corrigir tudo que falhar;
13. gerar documentação final de execução;
14. fazer commits Git coerentes;
15. fazer `push` para o repositório oficial somente depois de a Definition of Done estar verde.

Não entregue apenas scaffolding, wireframes ou pseudocódigo. A saída esperada é uma aplicação v1 executável.

---

# 2. Regra de execução

## 2.1 Trabalhe de forma autônoma

Não interrompa a execução para perguntar detalhes cosméticos ou decisões já cobertas pela documentação.

Quando houver mais de uma implementação técnica igualmente válida:

- escolha a alternativa mais simples;
- mantenha baixo acoplamento;
- priorize testabilidade;
- registre a decisão no relatório final.

Só trate como bloqueio algo que realmente impeça continuar, como:

- ausência de credenciais Git para o `push`;
- impossibilidade de instalar/executar Node;
- indisponibilidade persistente da fonte oficial necessária para gerar o dataset inicial.

Mesmo nesses casos, conclua tudo que puder localmente e documente o bloqueio.

## 2.2 Não redefina o produto

As decisões funcionais já foram fechadas.

Não:

- invente novas estratégias;
- remova estratégias especificadas;
- transforme a RMS em quantidade flexível;
- transforme heurística em “ótimo global”;
- introduza previsão de dezenas;
- introduza IA generativa em runtime;
- introduza login, backend, pagamentos ou compra de apostas;
- altere regras matemáticas para facilitar a implementação.

---

# 3. Ordem de autoridade das fontes

Quando houver dúvida, use esta precedência:

1. **este arquivo `00_START_HERE_CLAUDE_CODE.md`;**
2. `docs/global/ACCEPTANCE_CRITERIA_V1.md`;
3. `docs/global/PRODUCT_SPEC_V1.md`;
4. `docs/global/STRATEGY_CATALOG_V1.md`;
5. `docs/global/UX_AND_SCREENS_V1.md`;
6. `docs/global/ARCHITECTURE_V1.md`;
7. `docs/global/DATA_AND_PERSISTENCE_V1.md`;
8. especificação específica da modalidade:
   - `docs/lotofacil/LOTOFACIL_DOMAIN_SPEC_V1.md`;
   - `docs/megasena/MEGASENA_IMPLEMENTATION_SPEC.md`;
9. demais notas de integração/testes/benchmarks;
10. arquivos de `reference/` como evidência histórica/oráculo.

### Regra sobre referências históricas

Arquivos em `reference/` não são automaticamente a especificação atual do produto.

Exceções:

- para as regras matemáticas canônicas da RMS v2, consulte também  
  `reference/lotofacil/Lotofacil_Estrategia_Revisada_v2_Concurso_3780.md`;
- para validar a implementação Mega-Sena, preserve os oráculos em  
  `reference/megasena/`.

Se uma especificação v1.1 deliberadamente refinar uma decisão histórica sem alterar sua matemática, a v1.1 prevalece.

---

# 4. Estado inicial que você deve preservar

Este starter pack já contém:

## Mega-Sena

- domínio TypeScript implementado;
- testes/oráculos;
- verificador Python;
- fixtures;
- benchmark;
- documentação técnica.

O handoff original declarou:

- TypeScript strict: PASS;
- 24/24 testes: PASS;
- verificador Python: PASS;
- JSON regenerado idêntico ao original;
- máscaras 60-bit com `bigint`;
- seed reproduzível;
- nenhuma divergência matemática v0.1.

### Primeira ação obrigatória

Antes de alterar o domínio Mega-Sena:

1. execute a suíte/oráculo disponível;
2. registre o resultado inicial;
3. preserve a semântica e os valores canônicos.

Não reescreva o motor Mega-Sena “porque faria diferente”.

Adapters, integração, configuração compartilhada e testes adicionais são permitidos.

## Lotofácil

Já existem:

- especificação v1.1;
- RMS v2 de referência;
- fixture/oráculo exato `tests/lotofacil/fixtures/rms_3780_oracle.json`.

A implementação TypeScript do domínio Lotofácil ainda deve ser criada.

---

# 5. Segurança Git e estrutura local

## 5.1 Repositório

Confirme:

```text
origin = https://github.com/rod-rms/loterias.git
```

Faça:

- `git status`;
- inspeção dos remotes;
- inspeção dos commits existentes.

Nunca:

- `git push --force`;
- apague alterações do usuário;
- use `git reset --hard` sobre trabalho não seu;
- recrie o projeto em uma subpasta `loterias/loterias`.

## 5.2 Branch

Como o repositório foi criado para este projeto e pode estar vazio:

- se `main` estiver vazio ou contiver apenas este starter pack, pode trabalhar na `main`;
- se encontrar código remoto inesperado ou trabalho não incorporado, crie `feat/loterias-v1` e trabalhe nela sem sobrescrever conteúdo.

Faça commits locais por marcos.

Faça o `push` apenas quando:

- lint;
- typecheck;
- testes;
- E2E críticos;
- build

estiverem verdes, salvo bloqueio externo documentado.

---

# 6. Ambiente e dependências

## 6.1 Runtime

Adote Node compatível com o domínio recebido:

```text
Node >= 22
```

Use **npm** como package manager principal e versione `package-lock.json`.

Se houver impedimento real do ambiente para npm, use alternativa apenas com justificativa no relatório final.

## 6.2 Stack obrigatória

- React;
- Vite;
- TypeScript `strict`;
- React Router;
- Tailwind CSS;
- Vitest;
- Testing Library;
- Playwright;
- IndexedDB;
- Web Workers.

## 6.3 Decisões técnicas recomendadas

Para reduzir boilerplate e aumentar robustez, é permitido usar:

- **Dexie** para IndexedDB/migrations;
- **Zod** para validação de datasets, configuração e backups;
- **Lucide React** para ícones.

Evite adicionar:

- Redux;
- servidor Express;
- ORM;
- bibliotecas de gráficos pesadas;
- UI framework proprietário;
- dependências que não tragam benefício claro.

Use React Context/hooks para estado global pequeno.

## 6.4 Scripts npm mínimos

Implemente scripts equivalentes a:

```text
dev
build
preview
lint
typecheck
test
test:unit
test:e2e
test:mega:oracle
test:lotofacil:oracle
data:update
```

`npm test` deve ser executável de forma reproduzível no Windows.

Preserve o script shell original da Mega-Sena como referência, mas não dependa exclusivamente de Bash para a suíte normal do projeto.

---

# 7. Estrutura física

Respeite `docs/global/REPOSITORY_STRUCTURE_V1.md`.

Estrutura lógica obrigatória:

```text
src/
  app/
    layout/
    providers/
    router/

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

public/
  data/
    config/
    lotofacil/
    megasena/
  images/
    common/
    lotofacil/
    megasena/

docs/
  global/
  lotofacil/
  megasena/

tests/
  lotofacil/
  megasena/
  integration/

scripts/
  data/
  lotofacil/
  megasena/

reference/
  lotofacil/
  megasena/
```

Não coloque matemática em componentes React.

Não duplique utilitários matemáticos entre modalidades sem necessidade.

Só promova algo para `shared/` quando a semântica for realmente igual.

---

# 8. Identidade visual da v1

Não copie a identidade visual da CAIXA.

Use uma interface:

- analítica;
- limpa;
- moderna;
- responsiva;
- prioritariamente clara;
- com fundo neutro e cards bem definidos;
- com acento visual diferente por modalidade;
- sem depender somente de cor para transmitir informação.

Não há marca final definida.

Centralize nome/subtítulo do produto em configuração para futura troca.

Use como rótulo provisório:

```text
Loterias
Carteiras e estratégias auditáveis
```

Evite imagens externas/stock na v1. Prefira:

- tipografia;
- chips de dezenas;
- ícones;
- formas simples;
- visualização de dados por CSS/SVG acessível.

---

# 9. Núcleo de produto

Na v1, “jogo” significa sempre aposta **simples/elementar**:

- Lotofácil: 15 dezenas;
- Mega-Sena: 6 dezenas.

Não implemente apostas ampliadas.

## 9.1 Estratégia e quantidade são independentes quando permitido

A interface deve carregar as capacidades do Strategy Registry.

Uma estratégia declara se:

- quantidade é fixa ou flexível;
- orçamento é aceito;
- fixas/excluídas são aceitas;
- seed do usuário é aceita;
- histórico é necessário;
- preset de qualidade existe.

A UI não deve possuir `if strategy === ...` espalhado por páginas. Use registry/adapters.

---

# 10. Catálogo obrigatório — Lotofácil

Implemente exatamente:

## LF-01 — RMS v2

```text
id: lotofacil.rms_v2
version: 2.0.0
N: exatamente 6
```

Características:

- 20 concursos anteriores;
- pools A/B/C;
- regras canônicas;
- sem fixas/excluídas;
- sem quantidade livre;
- sem orçamento como input;
- sem alegar maior probabilidade de 15.

Se não houver carteira válida:

```text
RMS_NO_VALID_PORTFOLIO_FOUND
```

Não relaxe regra silenciosamente.

## LF-02 — Diversificação de carteira

```text
id: lotofacil.max_diversification
N: 1..50
```

Prioridade conforme Strategy Catalog/Domain Spec.

## LF-03 — Otimizar cobertura 11+

```text
id: lotofacil.max_coverage_11
N: 1..50
```

Objetivo real: maximizar cobertura 11+.

## LF-04 — Otimizar cobertura 12+

```text
id: lotofacil.max_coverage_12
N: 1..50
```

Objetivo real: maximizar cobertura 12+.

## LF-05 — Aleatória distinta

```text
id: lotofacil.uniform_random
N: 1..50
```

Uniforme, distinta, sem filtros ocultos.

---

# 11. Catálogo obrigatório — Mega-Sena

Preserve o domínio entregue e crie adapters para:

## MS-01 — Otimizar cobertura Quadra+

```text
id: megasena.max_f4
N: 1..100
```

## MS-02 — Otimizar cobertura Quina+

```text
id: megasena.max_f5
N: 1..100
```

## MS-03 — Diversificação de carteira

```text
id: megasena.max_diversification
N: 1..100
```

## MS-04 — Aleatória distinta

```text
id: megasena.uniform_random
N: 1..100
```

Não transforme popularidade/rateio em estratégia principal.

Módulo experimental Mega pode ficar disponível apenas em detalhes avançados, **OFF por padrão**, claramente rotulado como não calibrado.

---

# 12. Quantidade e orçamento

## Modo quantidade

Usuário informa `N`.

## Modo orçamento

Quando suportado:

```text
N = floor(budgetBRL / ticketCostBRL)
```

Mostre:

- orçamento;
- preço unitário;
- N;
- custo usado;
- saldo.

Nunca exceda o orçamento.

Nunca aumente orçamento automaticamente.

Nunca reduza N silenciosamente quando ultrapassar cap.

## Viabilidade sob fixas/excluídas

Antes de buscar:

```text
maxDistinct = C(totalNumbers - fixed - excluded, ticketSize - fixed)
```

Rejeite solicitação impossível antes de iniciar Worker.

---

# 13. Seed

Toda carteira precisa possuir seed.

- seed informada → usar;
- em branco → gerar;
- `Nova variação` → nova seed;
- `Reproduzir carteira` → mesma seed/parâmetros/versões/dataset.

A mesma execução reproduzível deve produzir a mesma carteira.

RMS pode usar seed determinística derivada de:

```text
rms-v2:<contest>:<algorithmVersion>
```

---

# 14. Implementação do domínio Lotofácil

Crie API equivalente a:

```ts
generateLotofacilPortfolio(...)
evaluateLotofacilPortfolio(...)
validateLotofacilPortfolio(...)
```

## 14.1 Constantes canônicas

```text
C(25,15) = 3.268.760

exatamente 11 = 286.650
exatamente 12 = 54.600
exatamente 13 = 4.725
exatamente 14 = 150
exatamente 15 = 1

11+ = 346.126
12+ = 59.476
13+ = 4.876
14+ = 151
15  = 1
```

Para `N` jogos distintos:

```text
F15 = N / 3.268.760
```

## 14.2 Representação

25 bits cabem em 32 bits, mas isole completamente a representação.

Pode usar:

- `Uint32Array`/`number` com testes;
- ou `bigint`.

Não espalhe operações bitwise em UI/adapters.

## 14.3 Avaliação

Implemente avaliação de:

- F11;
- F12;
- F13;
- F14;
- F15;
- nenhum 11+;
- expected exact hits;
- exposição;
- overlap;
- baseline.

O universo de 3.268.760 resultados permite avaliação exata em muitos cenários.

Benchmarke:

- enumeração canônica;
- typed arrays;
- bitsets;
- união de regiões.

Não sacrifique exatidão sem rotular.

---

# 15. Oráculo obrigatório RMS 3780

Use:

```text
tests/lotofacil/fixtures/rms_3780_oracle.json
```

Ele contém a carteira canônica e resultados obtidos por enumeração exaustiva dos 3.268.760 sorteios possíveis.

A carteira canônica deve produzir exatamente:

```text
11+ favoráveis = 1.840.731
12+ favoráveis =   356.856
13+ favoráveis =    29.256
14+ favoráveis =       906
15  favoráveis =         6
```

Matriz de interseções:

```text
diagonal 15
todos os pares distintos = 8
```

Baseline uniforme distinta N=6 também está no fixture.

### Importante

O **avaliador** deve reproduzir o fixture exatamente.

O **gerador RMS** pode produzir uma carteira RMS diferente da canônica caso seu desempate determinístico encontre outra solução válida, conforme a especificação.

Nunca use o resultado do concurso 3780 para gerar seus jogos.

---

# 16. RMS v2

Siga `LOTOFACIL_DOMAIN_SPEC_V1.md` + referência RMS.

Hard constraints:

- 6 jogos distintos;
- padrões A-B-C;
- 10 dezenas ×3 exposições;
- 15 dezenas ×4;
- interseção por par 7..9, alvo 8;
- paridades multiset `{5,6,7,7,8,9}`;
- contagens 20–25 `{2,3,3,4,4,5}`;
- 4–7 dezenas 01–09 por jogo;
- maior sequência <=7;
- 01,02,13,17 em 3 ou 4 jogos;
- ao menos um jogo sem 01/02;
- ao menos um jogo sem 13/17.

Não use F11 como critério oculto da RMS.

O histórico define pools/rotação, não “dezenas mais prováveis”.

---

# 17. Estratégias de otimização Lotofácil

## Diversificação

Objetivo lexicográfico conforme especificação.

Sob fixas/excluídas, recalcule equilíbrio possível.

## Cobertura 11+ e 12+

Comece com:

- gerador uniforme;
- construção gulosa;
- busca local;
- seed reproduzível.

A função objetivo deve ser cobertura direta.

Não declare ótimo global sem certificado/prova.

Registre:

- preset;
- iterações reais;
- candidate pool;
- elapsed;
- seed;
- melhor score;
- método de avaliação.

## Aleatória

Uniforme, distinta, sem filtros estruturais invisíveis.

---

# 18. Mega-Sena — regra de preservação

Não altere as seguintes identidades:

```text
C(60,6) = 50.063.860
K4 = 21.790
K5 = 325
K6 = 1
F6 = N / 50.063.860
```

Não substitua `bigint` por bitwise 32-bit.

Preserve a diferenciação:

```text
exact
estimated
upper_bound
lower_bound
not_computed
```

## Testes legados

Não apague ou enfraqueça a suíte original.

Como o usuário trabalha em Windows:

- preserve os arquivos `node:test` originais;
- crie uma forma cross-platform de executar as regressões centrais via npm/Vitest ou Node script;
- mantenha o script Bash de referência.

---

# 19. Presets de qualidade

A UI expõe:

- Rápida;
- Equilibrada;
- Profunda.

Não expõe números de iterações/candidate pools como campos normais.

Você pode medir e definir valores concretos durante a implementação.

Requisitos:

- `balanced` é padrão;
- os números concretos devem ficar centralizados em configuração/adapters;
- auditoria salva os valores reais utilizados;
- alteração de preset muda esforço de busca, não matemática.

Documente benchmarks em:

```text
docs/global/IMPLEMENTATION_BENCHMARKS_V1.md
```

---

# 20. Dados oficiais

A aplicação deve funcionar como site estático, então datasets validados ficam versionados no repositório.

## 20.1 Fontes atuais oficiais da CAIXA

Endpoints-base verificados na data da especificação:

```text
https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/
https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/
```

Não dependa de sites de terceiros para os snapshots de produção.

Antes de assumir um formato de consulta histórica por concurso:

1. verifique o comportamento real da API oficial;
2. crie adapter isolado;
3. valide a resposta;
4. normalize para o schema interno.

## 20.2 Dataset inicial

Gere e versione:

```text
public/data/lotofacil/results.json
public/data/megasena/results.json
```

Preferencialmente com todo o histórico oficial disponível.

## 20.3 Atualizador

Crie script cross-platform:

```text
npm run data:update
```

Ele deve:

- ler snapshot atual;
- consultar fonte oficial;
- buscar concursos ausentes;
- validar cada draw;
- canonicalizar;
- não duplicar;
- detectar gaps;
- escrever atomicamente somente depois da validação;
- não destruir snapshot válido em falha;
- não fazer commit sozinho quando executado localmente.

## 20.4 GitHub Action

Crie workflow agendado diário e `workflow_dispatch`.

Fluxo:

1. checkout;
2. npm ci;
3. data:update;
4. testes de dataset;
5. se mudou, commit/push usando `GITHUB_TOKEN`;
6. se não mudou, encerra sem commit.

O app precisa exibir:

```text
Dados atualizados até o concurso X
```

---

# 21. Configuração de preços

Use:

```text
public/data/config/game-config.json
```

O preço é configuração versionada, não constante matemática.

Valores presentes no pack:

```text
Lotofácil: R$ 3,50
Mega-Sena: R$ 6,00
referência: 07/09/2026
```

Não atualize preço por inferência.

Se validar um preço diferente em fonte oficial durante a implementação, atualize:

- valor;
- source;
- referenceDate;
- configVersion;

e registre no relatório final.

---

# 22. Persistência

Use IndexedDB com camada própria, preferencialmente Dexie.

Não faça chamadas IndexedDB diretamente em componentes.

Implemente:

- schema versionado;
- migrations;
- `SavedPortfolio`;
- salvar;
- listar;
- filtrar;
- abrir;
- excluir;
- marcar/desmarcar “apostada”;
- observações;
- conferência;
- backup;
- restore;
- apagar tudo.

## 22.1 Imutabilidade

Não recalcule silenciosamente carteiras antigas quando estratégia/engine mudar.

Salve snapshot de:

- strategy ID/version;
- engine version;
- dataset;
- price;
- seed;
- parâmetros;
- tickets;
- metrics;
- audit.

---

# 23. Backup

Implemente:

- exportação JSON;
- importação validada;
- tratamento explícito de IDs duplicados;
- preview da quantidade de itens;
- confirmação antes de importar;
- nenhum `eval` ou execução de conteúdo;
- confirmação forte para apagar todos os dados.

Use schema Zod ou equivalente no boundary.

---

# 24. Rotas e telas obrigatórias

```text
/
/lotofacil
/lotofacil/gerar
/lotofacil/carteiras
/lotofacil/metodologia
/megasena
/megasena/gerar
/megasena/carteiras
/megasena/metodologia
/carteiras
/sobre
```

## 24.1 Home

- proposta do produto;
- Lotofácil;
- Mega-Sena;
- Minhas carteiras;
- Metodologia;
- 18+ / jogo responsável.

## 24.2 Tela Gerar

Etapas:

1. Estratégia;
2. Quantidade/Orçamento;
3. Concurso;
4. Opções avançadas;
5. Resumo;
6. Gerar.

Formulário deve ser dirigido pelos metadados da estratégia.

## 24.3 Processamento

Status reais:

- Preparando candidatos;
- Otimizando;
- Avaliando cobertura;
- Auditando carteira.

Não invente percentual de progresso.

## 24.4 Resultado

Exiba:

- estratégia/version;
- N/custo;
- concurso;
- seed;
- preset;
- método de busca;
- método de avaliação;
- status exato/estimado;
- jogos;
- métricas;
- overlap;
- exposição;
- baseline;
- limitações.

Ações:

- copiar;
- copiar todos;
- CSV;
- JSON;
- salvar;
- Nova variação;
- Reproduzir carteira.

Para listas grandes, virtualize/pagine.

## 24.5 Comparação

No máximo duas estratégias lado a lado.

Mesmos:

- N;
- custo;
- restrições.

RMS apenas se compatível com N=6.

Não declare “vencedora absoluta”.

## 24.6 Minhas carteiras

Filtros:

- modalidade;
- concurso;
- estratégia;
- apostada;
- conferida.

## 24.7 Conferência

Quando o resultado oficial existir:

- números sorteados;
- acertos destacados;
- contagem por jogo;
- maior pontuação;
- salvar snapshot.

Não invente prêmio monetário quando a tabela de premiação do concurso não estiver validada no dataset.

---

# 25. Componentes compartilhados sugeridos

Crie abstrações reutilizáveis onde fizer sentido:

```text
AppShell
GameSwitcher
StrategyCard
StrategyBadge
NumberChip
NumberSelector
QuantityBudgetInput
QualityPresetSelector
SeedInput
GenerationSummary
MetricCard
MetricStatusBadge
PortfolioTicketList
OverlapSummary
ExposureSummary
BaselineComparison
SavedPortfolioCard
EmptyState
ErrorState
ResponsibleGamingNotice
DataFreshnessBadge
```

Não force componentes compartilhados quando a semântica for diferente.

---

# 26. Acessibilidade

Alvo WCAG AA razoável.

Obrigatório:

- navegação por teclado;
- foco visível;
- labels;
- `aria-*` quando necessário;
- não usar cor como único indicador;
- chips selecionáveis acessíveis;
- mensagens de erro ligadas aos campos;
- tabelas/matrizes com resumo textual;
- dialogs com focus trap/retorno de foco;
- reduced motion quando aplicável.

---

# 27. Web Workers

Processamento pesado deve sair da thread principal.

Use Workers para:

- otimização;
- enumeração pesada;
- Monte Carlo;
- cobertura.

Contrato de status:

```text
preparing
optimizing
evaluating
auditing
done
```

Implemente cancelamento cooperativo quando razoável.

A UI nunca deve congelar por cálculo de estratégia.

---

# 28. Testes obrigatórios

## 28.1 Unitários

### Shared

- seed;
- currency;
- backup schema;
- dataset schema;
- strategy registry.

### Lotofácil

- `C(25,15)`;
- contagens 11..15;
- acumulados;
- F15;
- validação;
- canonicalização;
- duplicate detection;
- fixas/excluídas;
- maxDistinct;
- overlap;
- baseline;
- oracle RMS 3780;
- pools/frequências da janela 3760–3779;
- no look-ahead;
- RMS N != 6;
- RMS não relaxa;
- seed.

### Mega-Sena

Mantenha as regressões existentes e cubra adapters.

## 28.2 Integração

- registry → form capabilities;
- quantity/budget;
- worker → result;
- salvar → reload;
- compare;
- data adapter;
- backup export/import;
- check result.

## 28.3 E2E Playwright

Cenários mínimos:

1. abrir home;
2. gerar Lotofácil aleatória;
3. gerar RMS para concurso com janela válida;
4. alterar para Mega-Sena;
5. gerar Mega aleatória;
6. gerar Mega cobertura;
7. salvar carteira;
8. abrir Minhas carteiras;
9. exportar backup;
10. comparar duas estratégias compatíveis;
11. validar erro de restrição impossível;
12. validar RMS bloqueada em N diferente de 6;
13. conferir carteira contra concurso disponível.

---

# 29. Testes matemáticos de regressão Lotofácil

O arquivo:

```text
tests/lotofacil/fixtures/rms_3780_oracle.json
```

é obrigatório.

Os counts inteiros devem bater exatamente.

Não teste apenas porcentagens arredondadas.

Além disso, valide:

```text
F15 de 6 jogos = 6 / 3.268.760
```

e baseline N=6 do fixture.

---

# 30. Testes de propriedade/invariantes

Quando útil, gere casos automaticamente.

Invariantes:

- ordem interna do ticket não importa;
- ordem dos tickets não altera avaliação;
- probabilidade fica [0,1];
- F11 >= F12 >= F13 >= F14 >= F15;
- F4 >= F5 >= F6;
- N jogos distintos → jackpot proporcional a N;
- duplicatas não contam como exposições distintas;
- mesmas seed/parâmetros → mesma carteira;
- fixed numbers estão em todos os jogos;
- excluded numbers nunca aparecem.

Para estratégias sem significado numérico/histórico:

- global relabeling deve preservar métricas estruturais quando matematicamente aplicável.

---

# 31. Comunicação técnica obrigatória

Nunca exiba:

- “números mais prováveis”;
- “previsão do próximo sorteio”;
- “IA prevê”;
- “garantia de lucro”;
- “jogo vencedor”;
- “aumenta sua chance de Sena/15” contra outra carteira com mesmo N distinto;
- “rateio menor garantido”.

Use:

- cobertura;
- diversificação;
- sobreposição;
- baseline;
- melhor solução encontrada;
- exato;
- estimado;
- heurístico;
- condição/limitação.

---

# 32. Jogo responsável

Exibir de forma visível, sem alarmismo:

- uso destinado a maiores de 18 anos;
- o app não vende nem registra aposta;
- estratégias não eliminam aleatoriedade;
- não aumentar gastos para recuperar perdas.

Inclua link para informação oficial de jogo responsável quando apropriado.

---

# 33. Performance

Benchmarke principalmente:

## Lotofácil

- avaliação 1, 6, 10, 25, 50 jogos;
- F11/F12;
- busca fast/balanced/deep;
- Worker.

## Mega-Sena

Preserve benchmarks existentes e reavalie no bundle real.

Não invente progresso.

Não silencie fallback exato → estimado.

Registre valores medidos em:

```text
docs/global/IMPLEMENTATION_BENCHMARKS_V1.md
```

---

# 34. CI

Crie:

```text
.github/workflows/ci.yml
```

Em push/PR:

1. checkout;
2. setup Node;
3. npm ci;
4. lint;
5. typecheck;
6. unit/integration;
7. Mega oracle;
8. Lotofácil oracle;
9. build;
10. E2E crítico em Chromium.

Cache npm quando adequado.

Crie workflow separado para atualização dos dados.

---

# 35. Cloudflare Pages

Não bloqueie a conclusão da implementação por falta de credencial Cloudflare.

Prepare o projeto para:

```text
build command: npm run build
output: dist
```

Garanta que o roteamento SPA funcione no deploy estático.

Crie:

```text
docs/global/DEPLOY_CLOUDFLARE.md
```

com passos de conexão GitHub → Cloudflare Pages.

Não inclua secrets no repositório.

Se credenciais Cloudflare já estiverem disponíveis no ambiente e o deploy puder ser feito com segurança, você pode publicar. Caso contrário, prepare tudo e documente os passos finais.

---

# 36. Arquivos de instrução permanentes

Preserve/atualize:

```text
CLAUDE.md
AGENTS.md
```

Eles devem continuar refletindo as invariantes do projeto para sessões futuras.

---

# 37. Plano de implementação por marcos

## Marco 0 — Preflight

- Git;
- Node/npm;
- ler docs;
- validar Mega original;
- registrar baseline.

## Marco 1 — Bootstrap

- Vite React TS;
- dependências;
- scripts;
- ESLint;
- Vitest;
- Playwright;
- Tailwind;
- routing.

**Checkpoint:** app abre e builda.

## Marco 2 — Shared foundation

- config;
- strategy registry;
- seed;
- validation boundaries;
- storage;
- common UI.

**Checkpoint:** testes shared verdes.

## Marco 3 — Data layer

- schemas;
- datasets;
- updater;
- freshness;
- Action.

**Checkpoint:** datasets válidos.

## Marco 4 — Mega integration

- preservar domain;
- adapters;
- strategies;
- worker;
- UI contracts.

**Checkpoint:** 24 testes/oráculos + novos testes verdes.

## Marco 5 — Lotofácil domain

- combinatorics;
- masks;
- evaluation;
- baseline;
- overlap;
- validation;
- RMS;
- other strategies.

**Checkpoint:** oracle RMS 3780 verde.

## Marco 6 — UX completa

- home;
- gerar;
- resultados;
- comparação;
- carteiras;
- metodologia;
- sobre.

**Checkpoint:** fluxos manuais funcionam em desktop/mobile.

## Marco 7 — Persistence/backup/check

- IndexedDB;
- migrations;
- backup;
- conferência.

**Checkpoint:** reload/E2E.

## Marco 8 — Hardening

- accessibility;
- performance;
- error states;
- cancellation;
- copy/export.

## Marco 9 — Acceptance

- lint;
- typecheck;
- unit;
- integration;
- oracle;
- E2E;
- build.

Corrija até verde.

## Marco 10 — Git

- relatório;
- changelog;
- commits;
- push.

---

# 38. Estratégia de commits

Faça commits coerentes, por exemplo:

```text
chore: bootstrap React TypeScript application
feat: add shared strategy and data infrastructure
feat: integrate validated Mega-Sena domain
feat: implement Lotofacil domain and RMS v2
feat: add lottery generation and comparison UI
feat: add portfolio persistence backup and checking
test: add mathematical integration and e2e coverage
ci: add validation and lottery data workflows
docs: finalize v1 implementation and deployment guide
```

Não é obrigatório usar exatamente essas mensagens.

Não faça commit a cada arquivo.

Não faça um único commit gigantesco se houver checkpoints naturais.

---

# 39. Relatório final obrigatório

Antes do push, crie:

```text
docs/global/IMPLEMENTATION_REPORT_V1.md
```

Inclua:

- data;
- commit SHA final local;
- Node/npm;
- dependências principais;
- funcionalidades implementadas;
- estratégias implementadas;
- datasets;
- testes executados e resultados;
- benchmarks;
- status dos 24 testes Mega;
- status do oracle Lotofácil;
- E2E;
- build;
- arquivos/workflows criados;
- decisões técnicas;
- desvios da especificação;
- limitações restantes;
- instruções de `npm install`, `npm run dev`, `npm test`, `npm run build`;
- status do push;
- status do deploy Cloudflare.

Se alguma exigência não puder ser cumprida, não esconda. Registre exatamente o motivo e o impacto.

---

# 40. Definition of Done

Você só deve considerar a v1 pronta quando:

- [ ] React/Vite executa;
- [ ] TypeScript strict;
- [ ] lint verde;
- [ ] build produção verde;
- [ ] Mega domain preservado;
- [ ] Mega oracles verdes;
- [ ] Lotofácil domain implementado;
- [ ] RMS v2 implementada;
- [ ] RMS oracle 3780 verde;
- [ ] todas as estratégias do catálogo existem;
- [ ] quantidade/orçamento funcionam;
- [ ] restrições funcionam onde suportadas;
- [ ] seed/reprodução funcionam;
- [ ] Worker evita travar UI;
- [ ] resultado exato/estimado não é confundido;
- [ ] baseline != random concreta;
- [ ] comparação funciona;
- [ ] IndexedDB funciona;
- [ ] backup/restore funciona;
- [ ] conferência funciona;
- [ ] dataset/config versionados;
- [ ] data updater existe;
- [ ] GitHub Actions existem;
- [ ] rotas obrigatórias existem;
- [ ] responsivo;
- [ ] acessibilidade crítica coberta;
- [ ] E2E críticos verdes;
- [ ] documentação final criada;
- [ ] nenhum secret commitado;
- [ ] nenhum texto promete previsão/lucro;
- [ ] Git está limpo após commit;
- [ ] push realizado ou bloqueio externo documentado.

---

# 41. Comando mental final

O objetivo não é fazer “um app que escolhe números”.

O produto deve ser:

> **uma aplicação auditável para construir, comparar, explicar e acompanhar carteiras de Lotofácil e Mega-Sena sob equiprobabilidade, com estratégias matemáticas reproduzíveis e limitações transparentes.**

Preserve essa ideia em código, UX e documentação.

---

# 42. Início da execução

Agora:

1. leia os documentos na ordem indicada;
2. audite o repositório;
3. rode a baseline Mega;
4. crie um plano interno de execução;
5. implemente todos os marcos sem esperar novas instruções;
6. valide a Definition of Done;
7. gere o relatório;
8. faça commit/push conforme as regras acima.
