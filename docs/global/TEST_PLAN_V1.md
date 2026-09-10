# Test Plan — v1.1

## 1. Ferramentas

- Vitest;
- Testing Library;
- Playwright;
- fixtures/oráculos Python Mega-Sena preservados.

## 2. Unitários

- combinatória;
- canonicalização;
- validação;
- seeds;
- cobertura;
- overlap;
- baseline;
- registry;
- adapters;
- presets;
- data adapters;
- migrations;
- backup/importação;
- conferência.

## 3. Integração

- estratégia → adapter → domínio → envelope;
- Worker → adapter;
- dataset → RMS sem look-ahead;
- save/load IndexedDB;
- migration;
- backup export/import;
- baseline equivalente;
- restrições → máximo de combinações.

## 4. UI

- troca modalidade;
- troca estratégia altera campos;
- RMS fixa 6;
- orçamento calcula N/custo/saldo;
- orçamento acima do cap é erro, não cap silencioso;
- fixas/excluídas mutuamente exclusivas;
- seed gerada quando ausente;
- Nova variação muda seed;
- Reproduzir mantém seed;
- status busca vs avaliação visíveis;
- baseline diferente de Aleatória distinta;
- estratégias incompatíveis não aparecem em comparação.

## 5. E2E

1. Lotofácil → RMS → gerar 6 → salvar → reload → persistir;
2. Lotofácil → Aleatória → N + seed → duas gerações idênticas;
3. Lotofácil → orçamento → custo/saldo corretos;
4. Lotofácil → fixas/excluídas → validação de viabilidade;
5. Mega F4 N=7 → métricas/baseline;
6. Mega F5 com restrições;
7. comparar duas estratégias compatíveis;
8. tentar comparar RMS com N !=6 → indisponível com motivo;
9. conferir carteira salva;
10. exportar/importar backup;
11. apagar dados locais com confirmação.

## 6. Mega regressão

Preservar todos os testes do handoff, incluindo:

- 50.063.860;
- K4/K5/K6;
- carteiras referência;
- baseline N=7;
- F6 invariance;
- relabeling;
- bigint;
- seed.

## 7. Lotofácil regressão

- 3.268.760;
- contagens 11–15;
- baseline fórmula;
- RMS fixture 3780;
- 15 interseções =8 na fixture;
- exposição 10x3 +15x4;
- coberturas;
- pools 3760–3779;
- empates;
- nenhum acesso ao draw alvo durante geração.

## 8. Property tests

- ordem das dezenas não altera chave;
- ordem dos jogos não altera métricas;
- probabilidades [0,1];
- F11>=...>=F15;
- Mega F4>=F5>=F6;
- mesmo N distinto → mesmo jackpot;
- mesma seed → mesma geração;
- restrições respeitadas;
- `N <= C(total-f-e, size-f)`.

## 9. Performance

Benchmark em navegador real.

Metas de UX, não garantias matemáticas:

- validação/formulário: resposta imediata;
- Worker não bloqueia UI;
- etapa longa informa estágio;
- listas grandes usam virtualização/paginação.

Registrar benchmarks por preset e N.

## 10. Dados

Testar:

- duplicata;
- faixa inválida;
- quantidade errada;
- lacuna RMS;
- JSON inválido;
- atualização falha mantendo snapshot;
- `latestContest` inconsistente;
- config de preço inválida.

## 11. Confiabilidade (v1.1.2)

### 11.1 Falhas fatais do Web Worker

`tests/shared/useGenerationWorker.test.tsx` cobre, com um `Worker` global falso e controlável (jsdom não implementa `Worker`):

- `worker.onerror`: geração para, `isRunning` volta a `false`, erro amigável populado, worker encerrado;
- `worker.onmessageerror`: mesmo comportamento seguro;
- falha síncrona ao criar o worker (`new Worker(...)` lança): o hook nunca fica preso em `"preparing"`;
- falha síncrona de `postMessage`: recuperação segura, worker encerrado;
- corrida de worker obsoleto: uma geração B substitui a geração A; um evento fatal atrasado do worker A não pode corromper o estado da geração B (verificado via checagem de identidade `workerRef.current === worker`).

### 11.2 Barreira de erro global

`tests/app/errorBoundary.test.tsx` renderiza deliberadamente um componente que lança durante a renderização e verifica: a mensagem de fallback aparece (nunca tela em branco), o texto de reasseguro sobre jogos salvos aparece, não há rastro técnico (stack trace) visível, as ações "Tentar novamente" e "Voltar ao início" existem, e "Tentar novamente" de fato recupera quando a condição de erro deixa de existir.

### 11.3 Alerta de falha do atualizador (contrato do workflow)

`tests/shared/dataUpdateWorkflowAlert.test.ts` (9 testes) faz checagens determinísticas de texto/configuração sobre `.github/workflows/data-update.yml` e `.github/workflows/ci.yml` (sem parser de YAML): permissão `issues: write` presente; existe um passo de alerta com `if: failure()` e um passo de recuperação com `if: success()` que fecha a issue; o rótulo usado para evitar duplicidade aparece nos dois passos; a criação de issue nova está condicionada a uma checagem prévia de issue já aberta; a CI normal nunca invoca o atualizador de dados ao vivo; e — adicionado após a criação idempotente do rótulo — o passo de alerta verifica a existência do rótulo via `getLabel`, cria via `createLabel` quando ausente (tratando 404 como "não existe" e 422 como "já criado por uma corrida concorrente"), e essa verificação ocorre antes de listar/buscar issues existentes.

## 12. Integração visual da marca LotoAtlas

### 12.1 Marca pública no AppShell

`tests/app/appShellBrand.test.tsx` verifica que o `AppShell` mostra o nome/tagline LotoAtlas e o rodapé "LotoAtlas v{versão}" (nunca "Loterias v..."), e que o skip link/landmark de conteúdo principal permanecem intactos após a restilização.

### 12.2 Metadados de `index.html`

`tests/shared/brandMetadata.test.ts` verifica o `<title>`, a meta description (prefixo "LotoAtlas", presença do disclaimer "não é previsão de sorteios", ausência de linguagem de garantia/melhoria de chance/números previstos), `data-theme="dark"` + `color-scheme`/`theme-color` correspondentes, e que todo `href` de favicon referenciado em `public/brand/` realmente existe no disco.

### 12.3 Integridade dos ativos de logo

`tests/shared/logoAssetIntegrity.test.ts` compara byte a byte cada SVG de logo usado pela aplicação (`src/assets/brand/`, `public/brand/`) com o arquivo correspondente aprovado em `docs/global/LotoAtlas_BrandKit_v0.3/logos/svg/`, confirma que nenhum deles referencia uma pasta de Brand Kit v0.1/v0.2, e confirma que as proporções largura/altura usadas no `AppShell` para os `<img>` do logo correspondem ao `viewBox` real dos SVGs (evitando distorção de aspecto) — guarda de regressão para o defeito de alinhamento do trevo já corrigido em versões anteriores do Brand Kit.

### 12.4 Responsividade móvel (Playwright)

`tests/e2e/mobile-critical-flows.spec.ts` (4 testes) roda os fluxos críticos — home, troca de modalidade, navegação para Meus jogos salvos, geração de jogos, carteira salva vazia — em um viewport de telefone (390×844, touch habilitado) sobre o mesmo navegador Chromium do projeto Playwright existente, e verifica programaticamente a ausência de overflow horizontal em nível de página em cada etapa.
