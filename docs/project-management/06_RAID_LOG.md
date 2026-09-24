# RAID Log

## 1. Risks

| ID | Risco | Prob. | Impacto | Resposta | Status |
|---|---|---:|---:|---|---|
| R01 | Instabilidade/atraso da API da CAIXA | M | A | retries + múltiplas janelas + preservação do último dataset válido | Mitigado |
| R02 | IA alterar matemática inadvertidamente | M | A | oracles + regressão + revisão independente | Mitigado |
| R03 | Data leakage em simulação histórica | M | A | `contest < T` + testes no-look-ahead | Mitigado |
| R04 | Usuário interpretar estratégia como previsão | M | A | copy, metodologia, equiprobabilidade e linguagem proibida | Mitigado |
| R05 | Perda de dados locais | M | M | backup + transparência + futura opção de sync | Aberto |
| R06 | Crescimento descontrolado de escopo | A | M | releases pequenas + backlog explícito | Em monitoramento |
| R07 | Dependência excessiva de um único provedor de deploy | B | M | GitHub como source of truth + build portátil | Aceito |
| R08 | Monetização prejudicar confiança | M | A | validar valor antes de cobrança; separar análise de incentivo a aposta | Futuro |
| R09 | Naming conflitar com marca/domínio | M | M | busca informal no INPI (23/09) sem conflito nas classes 9/41/42; parecer de agente externo recomenda depósito só na Classe 42; depósito formal adiado até regularização do MEI do product owner (`DEC-021`) | Parcialmente mitigado — pesquisa concluída, depósito formal adiado por sequenciamento |
| R10 | Erro assíncrono pós-merge escapar do PR CI | M | A | guard de unmount (`isMountedRef`) + `main CI` como gate — **reincidiu em 23/09 (PR #14) após ter sido marcado "Mitigado" na v1.1.1 (PR #3)**, mesma classe de bug em `CarteirasPage.tsx`. Reclassificado de "Mitigado" para "Em monitoramento": a resposta reativa funciona, mas nada impede uma terceira ocorrência em outro componente | Em monitoramento |
| R11 | Deploy do Cloudflare Pages não é condicionado ao resultado do GitHub Actions | A | M | nenhuma; documentado (`TECH-007`) como gap conhecido; confirmado empiricamente que um commit com `main CI` vermelho já foi servido em produção sem causar dano real | Aberto |
| R12 | Instrução de tarefa pré-autorizar merge de mudança visível sem validação do product owner | B (agora, com `DEC-022`) | A | `DEC-022` (24/09): nenhuma instrução volta a pré-autorizar merge de mudança visível/comportamental; exige preview validado pessoalmente antes de qualquer merge | Mitigado |

---

## 2. Assumptions

| ID | Premissa | Validação |
|---|---|---|
| A01 | Fonte oficial continuará disponível | monitorar updater |
| A02 | IndexedDB atende fase sem login | validar por uso |
| A03 | Cloudflare atende escala inicial | observar tráfego |
| A04 | Usuários valorizam transparência | medir qualitativamente/analytics futuro |
| A05 | Arquitetura modular suporta novos jogos | validada parcialmente: MEGA-ROLL-001 reutilizou o padrão de wiring de `lotofacil.rms_v2` e as primitivas de avaliação (overlap/F4) do Strategy Registry existente sem criar plumbing nova |

---

## 3. Issues

| ID | Issue | Resolução | Status |
|---|---|---|---|
| I01 | URL antiga de jogo responsável | URL oficial corrigida e centralizada | Fechado |
| I02 | Updater diário insuficiente | múltiplas janelas pós-sorteio | Fechado |
| I03 | Resultado sumia/ficava inconsistente após mudança de config | snapshot + stale-result protection | Fechado |
| I04 | Concurso-alvo aceitava futuro arbitrário | validação latest/next/historical | Fechado |
| I05 | Conferência mostrava apenas maior pontuação | detalhamento completo por jogo | Fechado |
| I06 | Main CI pós-v1.1.1 encontrou race assíncrona em `refresh()` | PR #3, await e nova validação | Fechado |
| I07 | Isolamento de estado entre modalidades: resultado/snapshot de uma modalidade podia vazar para outra ao navegar (FIX-001) | três camadas de correção (`useGenerationWorker`, `GerarPage`, invariante `activeResult`) + `key` por modalidade no roteador | Fechado (PR #6) |
| I08 | Nome do produto desatualizado ("Loterias" em vez de "LotoAtlas") na página Sobre + travessões em texto visível | corrigido (PR #12) | Fechado |
| I09 | Main CI pós-v1.2.0 encontrou a mesma classe de erro do I06 (setState assíncrono pós-unmount) em `CarteirasPage.tsx`, agora em quatro call sites | guard `isMountedRef` aplicado consistentemente (PR #14) | Fechado — mas ver R10: mesma classe de bug já ocorreu duas vezes |
| I10 | Instrução de tarefa do MEGA-ROLL-001 continha autorização de merge pré-concedida para uma feature visível ao usuário, incompatível com a preferência já reinstaurada do product owner por validar preview antes do merge | emenda enviada revogando a autorização antes do merge acontecer; `DEC-022` registrada | Fechado (PR #15 aguardando validação, não mergeado) |

---

## 4. Dependencies

| ID | Dependência | Tipo | Estratégia |
|---|---|---|---|
| D01 | CAIXA | Dados | retries/status |
| D02 | GitHub | SCM/CI | source of truth |
| D03 | Cloudflare | Deploy | build reproduzível |
| D04 | Browser IndexedDB | Persistência | backup |
| D05 | Runtime JS/browser | Execução | testes multi-fluxo |

---

## 5. Cadência de manutenção

Revisar a cada release tagueada e imediatamente após qualquer incidente de CI/produção (adicionar Issue) ou decisão que mude o status de um risco (`DECISIONS.md`).
