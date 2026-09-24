# LotoAtlas — Roadmap

Última revisão: 2026-09-21. Estado de `main` no momento da revisão: `978d63d` (ver `PROJECT_STATE.md`).

## Status

| Status | Significado |
|---|---|
| `IDEA` | Ideia registrada, sem análise. |
| `RESEARCH` | Em investigação; nenhuma implementação aprovada. |
| `APPROVED` | Escopo aprovado pelo product owner; implementação ainda não iniciada (ou não concluída). |
| `IN_PROGRESS` | Em desenvolvimento em branch. |
| `PR_OPEN` | PR aberto (rascunho ou pronto), ainda não mergeado. |
| `MERGED` | Mergeado em `main`, produção ainda não verificada. |
| `DEPLOYED` | Em produção; verificação ainda incompleta. |
| `DONE` | Implementado + mergeado + CI exigida verde + **verificado em produção** quando afeta produção. |
| `DEFERRED` | Adiado conscientemente. |

Nada é `DONE` só porque o código existe numa branch. Implementado em branch ≠ `MERGED`; `MERGED` ≠ `DEPLOYED`; `DEPLOYED` ≠ `DONE` sem verificação.

## Concluído / em produção

| ID | Item | Status |
|---|---|---|
| CORE-001 | Aplicação original Lotofácil + Mega-Sena (v1.0.0–v1.1.0): estratégias, métricas com status, carteiras locais, backup | DONE |
| CORE-002 | Simulação histórica com proteção no-look-ahead e validação do concurso-alvo (v1.1.1) | DONE |
| CORE-003 | Conferência de resultado de carteiras salvas (v1.1.1) | DONE |
| DATA-001 | Atualizador automático de datasets (CAIXA) com janelas de retry | DONE |
| REL-001 | v1.1.2 — confiabilidade (Worker, Error Boundary, alerta `data-update-failure`, LF) — tag `v1.1.2` | DONE |
| BRAND-000 | Integração da marca LotoAtlas (PR #5), sem tag própria | DONE (em produção; sem release com tag) |
| FIX-001 | Isolamento do estado de geração entre modalidades (PR #6) | DONE |
| BET-001 | Registro de aposta por jogo + conferência da carteira completa (PR #7, merge `978d63d`) | DONE — verificado em produção em 2026-09-21 (CI de `main` verde, bundle em produção = deploy do merge, smoke Playwright 48/48 contra produção) |

## Em revisão (aguardando validação do product owner)

### BET-002 — Registro de aposta padrão visível (opt-out) + destaque visual do painel de salvar
Status: **PR_OPEN** — CI verde, aguardando validação de preview e autorização de merge do product owner (`DEC-022`). **Ainda não em produção.**

- O painel "Salvar carteira" passa a mostrar "Registrar também quais jogos foram apostados" já marcada por padrão (opt-out, `DEC-023`, emenda `DEC-009`), em vez de desmarcada; continua sendo um checkbox explícito e visível, desmarcável antes de confirmar.
- O painel ganhou destaque visual (borda `brand-borderStrong` + fundo `bg-brand-action/10`) para deixar de se confundir com elementos neutros da tela.
- Nenhuma mudança no modelo de persistência de `betSelection`, na derivação de `markedAsBet` ou na conferência de resultado.

## Próxima implementação aprovada

### MEGA-ROLL-001 — Mega-Sena Rolling 20 Balanceada v2.1
Status: **APPROVED — implementação não iniciada.**

Propósito de alto nível:
- usar os 20 concursos imediatamente anteriores ao alvo;
- agrupamento histórico G1/G2/G3 **descritivo, nunca preditivo**;
- alocação proporcional para G2 no lugar do 2-0-4 rígido do legado;
- diversificação em nível de carteira;
- estritamente no-look-ahead;
- geração determinística e auditável (seed);
- especificação/auditoria detalhadas já preparadas antes da implementação.

**Especificação canônica versionada:** [`../megasena/MEGASENA_ROLLING20_BALANCED_V2_1_SPEC.md`](../megasena/MEGASENA_ROLLING20_BALANCED_V2_1_SPEC.md) — contém tudo o necessário para implementar (grupos, alocação proporcional, filtros, otimização, capacidades, critérios de aceite). O pacote bruto de auditoria (`MEGASENA_ROLLING20_AUDIT_PACKAGE_v2_1/`, local e não versionado) é apenas evidência de apoio e **não** é necessário.

Pré-requisito de qualquer trabalho: ler a especificação acima e confirmar que `main` está atualizada. Título oficial de UI: "Organizar pelo histórico recente"; nome técnico: "Rolling 20 Balanceada v2.1".

## Pesquisa

### RMS-201 — RMS v2.x, desempate multi-horizonte 20+50
Status: **RESEARCH.** Nenhuma implementação aprovada.

Memorando de pesquisa com a análise exploratória reproduzida: [`../lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md`](../lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md).

Regra candidata:
1. ranking primário: frequência em T-20 … T-1;
2. **somente** quando as frequências primárias empatarem: comparar frequência em T-50 … T-1;
3. persistindo o empate: desempate determinístico por seed.

Interpretação: os 20 últimos concursos continuam soberanos; a janela de 50 **não** substitui a de 20. Como os números empatados têm a mesma frequência nos últimos 20, comparar seus totais em 50 equivale a comparar a frequência nos 30 concursos anteriores (T-50 … T-21).

Objetivo: reduzir a resolução arbitrária, por seed, de empates na fronteira do pool, preservando a janela curta. **Não** se alega melhora preditiva. A análise exploratória preliminar indicou que o benefício principal seria estabilidade do pool / menos empates não resolvidos, e não evidência de melhor previsão.

Antes de qualquer implementação exige-se experimento histórico reprodutível comparando RMS-20 atual, RMS-50 puro e RMS 20+50 (desempate), com: mesmo conjunto histórico de alvos; no-look-ahead estrito; seeds controladas; carteiras completas de seis jogos; distribuição de 11/12/13/14/15 acertos; melhor jogo por carteira; comportamento estrutural J1–J6; estabilidade do pool; frequência de empates na fronteira; e baselines relevantes. O experimento deve ser documentado antes da decisão.

### OBS-001 — Registro de Pesquisa Observacional
Status: **RESEARCH / PLANNED.** Não há painel nem análise implementados.

Base criada pelo BET-001: carteira gerada ≠ seleção de aposta real; todos os jogos gerados continuam conferíveis.

Escopo futuro possível: registro prospectivo; gerado × realmente apostado; resultado dos jogos apostados e não apostados; snapshot de estratégia/versão/seed/dataset; análise temporal; exportação anonimizada.

Ressalvas: `resultAvailability` descreve se o LotoAtlas já tinha o resultado no dataset no momento do registro — **não prova** quando a aposta real foi feita. Registros pessoais permanecem locais salvo exportação explícita. Sem alegações preditivas.

## Backlog / adiado

| ID | Item | Status |
|---|---|---|
| BRAND-001 | Refinamento da centralização óptica do trevo/logo | DEFERRED |
| TECH-001 | Limpeza da descrição legada/interna em `package.json` | DEFERRED |
| TECH-002 | Upgrades major de dependências (React, Router, Vite, Tailwind, TypeScript…); não fazer em lote casualmente | DEFERRED |
| TECH-003 | Housekeeping de runtime do GitHub Actions (avisos de depreciação do Node, upgrade de actions) | DEFERRED |
| TECH-004 | Prontidão para migração futura do `ubuntu-latest` | DEFERRED |
| TECH-005 | Aviso no upload do relatório do Playwright quando o diretório não existe | DEFERRED |
| TECH-006 | Investigar o erro intermitente de teardown assíncrono "window is not defined" se reaparecer (visto uma vez em `carteirasResultChecking.test.tsx`; re-run passou) | DEFERRED |
| REPO-001 | Limpeza opcional/baixa prioridade do repositório e de arquivos locais não versionados | DEFERRED |

### Ideias de produto (IDEA — sem aprovação)

Migradas do antigo pacote local de gestão (v1.1.1); todas exigem definição de escopo e aprovação antes de virar `APPROVED`:

- premiação oficial por concurso e ciclo de conferência (aguardando / disponível / conferido), conferência automática;
- histórico mais rico, filtros, indicadores e exportação melhorada; eventual impressão/PDF;
- analytics de adoção (hoje não há métricas de uso estruturadas);
- monetização: somente após dados de uso, sem prejudicar a transparência (ex.: freemium/recursos analíticos), separando análise de incentivo à aposta;
- novas modalidades e apostas ampliadas; conta/sync; PWA mais avançado;
- verificação de nome/marca (INPI, domínio, lojas): status **não verificado** no repositório;
- RMS v3, Crowd Score, popularidade/rateio, ablação de regras (pesquisa).

Adiados de produto herdados da v1 (`docs/global/DECISIONS_AND_OPEN_POINTS_V1.md`): Crowd Score calibrado, ROI previsto, compra de apostas, pagamentos, login/sync, push, IA explicativa em runtime, RMS v3, apostas ampliadas.
