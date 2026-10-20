# LotoAtlas — Roadmap

Última revisão: 2026-10-20. Estado de `main` no momento da revisão: `67fa91d` (ver `PROJECT_STATE.md`). Última release com tag: `v1.3.0`.

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
| BRAND-000 | Integração da marca LotoAtlas (PR #5), incluída na release `v1.2.0` | DONE (em produção; release `v1.2.0`) |
| FIX-001 | Isolamento do estado de geração entre modalidades (PR #6) | DONE |
| BET-001 | Registro de aposta por jogo + conferência da carteira completa (PR #7, merge `978d63d`) | DONE — verificado em produção em 2026-09-21 (CI de `main` verde, bundle em produção = deploy do merge, smoke Playwright 48/48 contra produção) |
| MEGA-ROLL-001 | Mega-Sena Rolling 20 Balanceada v2.1 — "Organizar pelo histórico recente" (PR #15, merge `3e88e4d`) | DONE — verificado em produção em 2026-09-24 (CI de `main` verde no commit do merge; bundle em produção idêntico ao deploy do merge; UI em produção confirmada mostrando "Organizar pelo histórico recente" como primeiro card de estratégia da Mega-Sena e gerando normalmente para concurso histórico) |
| BET-002 | Registro de aposta padrão visível (opt-out, `DEC-023`, emenda `DEC-009`) + destaque visual do painel de salvar (PR #17, merge `9e3d660`) | DONE — verificado em produção em 2026-09-28 (PR mergeado em 2026-09-24T21:46:59Z após validação pessoal do product owner via preview; CI de `main` verde no commit do merge; comportamento opt-out e destaque visual (`bg-brand-action/10`) confirmados presentes no bundle atual de produção) |
| CART-001 | Meus jogos salvos: agrupado por dia (teto de 3 dias + "Carregar mais"), faixa de cor por modalidade, filtro por concurso, data real/estimada do sorteio, aviso de resultado pendente no dialog e painel "Detalhes" logo abaixo do cartão aberto (PR #20; a correção de posição foi incorporada ao mesmo item) | DONE — verificado em produção em 2026-09-26 (CI de `main` verde no commit do merge; bundle em produção = deploy do merge; UI confirmada: Detalhes abre logo abaixo do cartão clicado) |
| BRAND-001 | Centralização óptica do trevo no símbolo/logo (micro-ajuste de translação, `translate(200,165)` → `translate(200,155.5)`); quebra de linha defensiva (`break-all`) no identificador técnico de estratégia em "Detalhes técnicos do resultado" (PR #24, merge `edfabe0`) | DONE — verificado em produção em 2026-09-29 (validação pessoal do product owner via preview antes do merge, `DEC-022`; CI de `main` verde no commit do merge; bundle em produção confirmado contendo `translate(200,155.5)` e nenhum resquício de `translate(200,165)`) |
| RMS-201 | RMS v2.1: desempate multi-horizonte 20+50 nos pools da RMS (empates de frequência da janela de 20 na fronteira entre pools passam a ser desempatados pela frequência nos 50 concursos anteriores antes da seed; por determinismo/auditabilidade, **sem** ganho preditivo; `DEC-024`; estratégia `2.1.0` / `rms-v2.1.0`) (PR #31, merge `c52e4da`) | DONE — verificado em produção em 2026-10-17 (validação pessoal do product owner via preview antes do merge, `DEC-022`; CI de `main` verde no commit do merge; o deploy do Cloudflare Pages do próprio `c52e4da` falhou de forma transitória, mas foi superado pelos deploys seguintes dos commits de dados `7958cd7` e `be69808`; o bundle do worker de geração em produção contém `rms-v2.1.0` e `multi_horizon_20_50`) |

## Pesquisa

### RMS-201 — RMS v2.x, desempate multi-horizonte 20+50
Status: **DONE** — implementado e em produção (PR #31, merge `c52e4da`, `DEC-024`); ver a linha RMS-201 em "Concluído / em produção". O texto de pesquisa abaixo é mantido como registro histórico. Experimento exigido por `DEC-017`: [`../lotofacil/RMS_201_EXPERIMENT_RESULTS.md`](../lotofacil/RMS_201_EXPERIMENT_RESULTS.md).

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
| TECH-001 | Limpeza da descrição legada/interna em `package.json` | DEFERRED |
| TECH-002 | Upgrades major de dependências (React, Router, Vite, Tailwind, TypeScript…); não fazer em lote casualmente | DEFERRED |
| TECH-003 | Housekeeping de runtime do GitHub Actions (avisos de depreciação do Node, upgrade de actions) | DEFERRED |
| TECH-004 | Prontidão para migração futura do `ubuntu-latest` | DEFERRED |
| TECH-005 | Aviso no upload do relatório do Playwright quando o diretório não existe | DEFERRED |
| TECH-006 | Investigar o erro intermitente de teardown assíncrono "window is not defined" se reaparecer (visto uma vez em `carteirasResultChecking.test.tsx`; re-run passou) | DEFERRED |
| REPO-001 | Limpeza opcional/baixa prioridade do repositório e de arquivos locais não versionados | DEFERRED |
| AUTH-001 | Integração com Supabase para autenticação (login opcional) e possível sincronização de dados entre dispositivos | IDEA |
| DATA-002 | Atualizador automático (`data-update.yml`). **(1) Bloqueio:** HTTP 403 da CAIXA a IPs do GitHub Actions em 2026-09-29/30 e de novo em 2026-10-02 (alertas #23 e #28 abriram e fecharam sozinhos; execuções com sucesso de 2026-10-03 em diante; catch-up manual `8312dfb`). **(2) Dados defasados em 2026-10-18/19:** o app ficou em Lotofácil 3806 / Mega-Sena 3070 enquanto a fonte já tinha 3807 / 3071; as três execuções agendadas de domingo consultaram o endpoint "último concurso", a fonte respondeu 3806/3070 (HTTP 200, sem falha e sem alerta) e o atualizador, por desenho, trata "ainda não publicado" como "base atualizada". Causa raiz (logs dos runs `39154137037`, `39165722023`, `39183410658` e histórico do git): **lacuna de agenda, não bloqueio** — os crons noturnos rodavam só de terça a sábado (UTC), então a segunda-feira UTC não tinha nenhuma execução; o GitHub atrasa as execuções agendadas em 2 a 4 h (mediana ~4 h); e dos 5 domingos com sorteio observados nenhum foi capturado durante o dia de domingo (4 só na terça de manhã, 1 na noite de domingo), o que contradiz a suposição antiga de sorteio de domingo às 11h BRT. O horário real de publicação dos resultados de domingo **não está confirmado** e nada foi assumido sobre ele. Cabeçalho `Cache-Control: no-cache` e ausência de `Age` não indicam cache de CDN (verificado em 2026-10-19; não há logs de cabeçalhos de 18/10). **Correção (PR #36):** crons noturnos de `2-6` para `1-6` + duas verificações extras só na segunda (12h e 16h BRT); aviso de sorteio atrasado (próximo sorteio informado pela fonte já passou da margem "dia seguinte 14h BRT", constante `OVERDUE_MARGIN_NEXT_DAY_BRT_HOUR`, sem avanço do último concurso → abre/comenta a issue `data-update-failure`, no máximo uma vez a cada 12 h, sem afirmar falha da CAIXA); diagnóstico em todo run (status, `Date`, `Age`, `Cache-Control`, `numero`, `dataApuracao`, `dataProximoConcurso`, linha UTC de "first seen") para medir o atraso real de publicação em algumas semanas. Contingência: Worker da Cloudflare em `workers/lottery-data-updater/` (PR #29, **mergeado e inerte: não implantado**; o product owner implanta manualmente, passos e ressalvas no README do Worker, incluindo o limite de CPU de 10 ms por execução agendada do plano Free). Ele não teria evitado o caso de 18/10, pois lê o mesmo endpoint e tinha a mesma lacuna de agenda; agora tem a mesma cobertura de segunda-feira, o mesmo aviso de sorteio atrasado e os mesmos logs, e uma corrida de ref com o Actions não abre incidente. | RESEARCH |

### Ideias de produto (IDEA — sem aprovação)

Migradas do antigo pacote local de gestão (v1.1.1); todas exigem definição de escopo e aprovação antes de virar `APPROVED`:

- premiação oficial por concurso e ciclo de conferência (aguardando / disponível / conferido), conferência automática;
- histórico mais rico, filtros, indicadores e exportação melhorada; eventual impressão/PDF;
- analytics de adoção (hoje não há métricas de uso estruturadas);
- monetização: somente após dados de uso, sem prejudicar a transparência (ex.: freemium/recursos analíticos), separando análise de incentivo à aposta;
- novas modalidades e apostas ampliadas; PWA mais avançado;
- verificação de nome/marca (INPI, domínio, lojas): status **não verificado** no repositório;
- RMS v3, Crowd Score, popularidade/rateio, ablação de regras (pesquisa).

Adiados de produto herdados da v1 (`docs/global/DECISIONS_AND_OPEN_POINTS_V1.md`): Crowd Score calibrado, ROI previsto, compra de apostas, pagamentos, push, IA explicativa em runtime, RMS v3, apostas ampliadas.
