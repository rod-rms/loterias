# CLAUDE.md — LotoAtlas (Loterias)

## Leia primeiro (antes de qualquer trabalho substancial)

1. `docs/project-management/PROJECT_STATE.md` — onde o projeto está hoje
2. `docs/project-management/ROADMAP.md` — itens, IDs e status
3. `docs/project-management/DECISIONS.md` — decisões estratégicas atuais
4. `docs/project-management/HANDOFF.md` — como retomar e o que fazer ao final

Depois, os documentos técnicos da tarefa (fontes técnicas, em ordem):

1. `docs/global/ACCEPTANCE_CRITERIA_V1.md`
2. `docs/global/PRODUCT_SPEC_V1.md`
3. `docs/global/STRATEGY_CATALOG_V1.md`
4. specs de domínio por modalidade (`docs/lotofacil/`, `docs/megasena/`)
5. `docs/global/ARCHITECTURE_V1.md`, `DATA_AND_PERSISTENCE_V1.md`, `TEST_PLAN_V1.md`
6. `docs/global/DECISIONS_AND_OPEN_POINTS_V1.md` — log histórico detalhado de decisões (1–38)
7. `docs/global/IMPLEMENTATION_REPORT_V1.md` — status, decisões técnicas e limitações conhecidas

`00_START_HERE_CLAUDE_CODE.md` é o **handoff histórico da implementação original da v1**; o app já está implementado e esse arquivo **não** é mais a autoridade de estado/roadmap atual.

`reference/` é histórico/oráculo, não UI spec atual, exceto regras canônicas RMS indicadas pela documentação.

Em caso de divergência entre a documentação e o GitHub (SHAs, PRs, datasets), o estado real do GitHub/repositório prevalece.

## Invariantes de engenharia

- um único app React/Vite;
- Lotofácil e Mega-Sena são módulos de domínio separados;
- domain não importa React;
- apostas simples apenas (LF15 / Mega6), salvo mudança explícita de escopo;
- sem IA generativa em runtime;
- sem previsão de dezenas; dados históricos organizam estratégias, nunca "preveem";
- sem promessa de lucro;
- Strategy Registry controla capacidades;
- RMS v2 = exatamente 6 jogos; RMS nunca relaxa hard constraints silenciosamente;
- Mega usa `bigint` para máscaras 60-bit;
- preserve `exact/estimated/upper_bound/lower_bound/not_computed`;
- baseline aleatória não é a estratégia Aleatória distinta;
- toda geração tem seed;
- no-look-ahead estrito em simulações históricas;
- carteira gerada ≠ seleção de aposta real (`betSelection`, append-only); salvar ≠ apostar;
- dados pessoais ficam locais por padrão;
- preços são configuração versionada;
- não colocar secrets no frontend/repo.

## Disciplina de status

- IMPLEMENTED numa branch **não** é MERGED.
- MERGED **não** é automaticamente DEPLOYED.
- DEPLOYED **não** é DONE até a verificação exigida (CI verde + produção) estar completa.

## Manutenção do estado do projeto (PROJECT STATE MAINTENANCE)

Quando sua tarefa mudar status, roadmap ou decisões, atualize os arquivos de `docs/project-management/` **no mesmo PR** (`PROJECT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`; `HANDOFF.md` só se o processo de continuação mudar; `CHANGELOG.md` para mudanças visíveis ao usuário). Regras completas em `docs/project-management/HANDOFF.md`.

## Regras de Git

- `git fetch origin --prune` e parta do `origin/main` mais recente; o atualizador automático de datasets pode avançar `main` a qualquer momento;
- nunca force push; nunca rebase de branches de feature compartilhadas (use merge normal de `origin/main`);
- staging direcionado — nunca `git add .`; não inclua arquivos locais não versionados do usuário;
- **nunca faça merge, tag ou release sem autorização explícita do product owner.**

## Antes de push

Execute e corrija:

- lint
- typecheck
- unit/integration
- Mega oracle
- Lotofácil oracle
- Playwright crítico
- build
- data:validate

(PRs somente de documentação: `git diff --check` e confirmar que nenhum arquivo executável mudou — ver `HANDOFF.md`.)
