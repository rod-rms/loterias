# Índice da Documentação de Gestão do Projeto

**Projeto:** Loterias  
**Status atual:** Produto em produção, v1.2.0 liberada em 23/09/2026; MEGA-ROLL-001 em PR aberto aguardando validação (ver `PROJECT_STATE.md`/`ROADMAP.md` para o estado exato e sempre atual)  
**Repositório:** https://github.com/rod-rms/loterias  
**Produção:** https://loterias-bkr.pages.dev/

---

## 1. Objetivo deste conjunto documental

Este diretório adiciona uma camada de **gestão de projetos e governança** à documentação técnica/produto já existente no repositório.

A intenção é evitar duplicação. Sempre que possível, estes documentos apontam para os arquivos técnicos existentes em `docs/global/`.

---

## 2. Documentos de gestão

| Ordem | Documento | Finalidade |
|---|---|---|
| 01 | `01_PROJECT_CHARTER.md` | Formalizar propósito, objetivos, escopo macro, restrições e critérios de sucesso |
| 02 | `02_BUSINESS_CASE.md` | Registrar justificativa, benefícios, custos, alternativas e racional do investimento |
| 03 | `03_SCOPE_AND_WBS.md` | Estruturar escopo e decompor o projeto em pacotes de trabalho |
| 04 | `04_ROADMAP_AND_RELEASE_PLAN.md` | Organizar versões, marcos, backlog e critérios de entrada/saída |
| 05 | `05_STAKEHOLDERS_AND_RACI.md` | Identificar partes envolvidas, papéis e responsabilidades |
| 06 | `06_RAID_LOG.md` | Consolidar riscos, premissas, issues e dependências |
| 07 | `07_CHANGE_AND_DECISION_MANAGEMENT.md` | Definir como mudanças e decisões são propostas, avaliadas e registradas |
| 08 | `08_QUALITY_MANAGEMENT_PLAN.md` | Formalizar estratégia de qualidade, testes e gates de release |
| 09 | `09_COMMUNICATION_PLAN.md` | Definir canais, cadências e produtos de comunicação |
| 10 | `10_RELEASE_AND_DEPLOYMENT_GOVERNANCE.md` | Formalizar fluxo Git/PR/CI/preview/release/deploy |
| 11 | `11_PROJECT_STATUS.md` | Status executivo vivo do projeto |
| 12 | `12_LESSONS_LEARNED.md` | Consolidar aprendizados práticos |
| 13 | `13_PROJECT_CLOSURE_AND_NEXT_PHASE.md` | Fechar fase atual e preparar próxima fase |
| 14 | `14_KPI_AND_SUCCESS_MEASUREMENT.md` | Definir indicadores de produto, qualidade, operação e futura monetização |

---

## 3. Documentação técnica/produto já existente

A camada de gestão deve ser lida em conjunto com os documentos de `docs/global/`, especialmente:

- `PRODUCT_SPEC_V1.md`
- `ARCHITECTURE_V1.md`
- `DATA_AND_PERSISTENCE_V1.md`
- `DECISIONS_AND_OPEN_POINTS_V1.md`
- `DEPLOY_CLOUDFLARE.md`
- `IMPLEMENTATION_BENCHMARKS_V1.md`
- `IMPLEMENTATION_REPORT_V1.md`
- `REPOSITORY_STRUCTURE_V1.md`
- `STRATEGY_CATALOG_V1.md`
- `TEST_PLAN_V1.md`
- `ACCEPTANCE_CRITERIA_V1.md`
- `UX_AND_SCREENS_V1.md`
- `UX_COPY_AND_TERMINOLOGY_V1_1.md`

Também consultar:

- `/CHANGELOG.md`
- histórico de Pull Requests
- GitHub Releases
- GitHub Actions

---

## 4. Princípios de documentação

1. **GitHub é a fonte da verdade.**
2. Não duplicar especificações matemáticas já documentadas.
3. Não inventar custos, métricas de adoção ou resultados de negócio ainda não medidos.
4. Decisões importantes devem ser registradas.
5. Riscos devem ter responsável, resposta e status.
6. Cada release deve possuir rastreabilidade entre escopo, código, testes, homologação e release.
7. A documentação deve permanecer proporcional ao porte do projeto: governança suficiente, sem burocracia artificial.


---

## 5. Cadência de manutenção deste pacote (adicionado 24/09/2026)

Este pacote ficou sem manutenção entre sua criação (09/09/2026, v1.1.1) e 24/09/2026 — quase um ciclo de release inteiro (v1.1.2 e v1.2.0) sem atualização, e nunca havia sido commitado no git (risco de perda total, dependendo apenas da máquina do product owner). Corrigido em 24/09/2026: o pacote foi trazido ao estado atual e commitado.

**Regra daqui para frente:** revisar este pacote a cada release tagueada (no mínimo) e sempre que uma decisão relevante em `DECISIONS.md` mude o estado de um risco, escopo ou marco aqui narrado — a mesma cadência já usada pelos quatro arquivos canônicos (`PROJECT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`, `HANDOFF.md`). Responsabilidade: a sessão advisor (Claude/Cowork), como parte de fechar cada release ou decisão relevante — não uma tarefa separada e esquecível.
