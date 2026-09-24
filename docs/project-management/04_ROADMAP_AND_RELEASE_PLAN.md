# Roadmap & Release Plan

> Esta é a narrativa de marcos/versões. A lista viva, com IDs (`DONE`/`PR_OPEN`/`RESEARCH`/`DEFERRED`) e o backlog item a item, mora em [`ROADMAP.md`](./ROADMAP.md) e é o que deve ser consultado para status corrente — este documento não duplica aquela lista, só narra a sequência de releases e critérios de entrada/saída de fase.

## 1. Linha de releases

| Versão | Data | Foco |
|---|---|---|
| v1.0.0 | 2026-09-07 | Primeira versão pública: geração simples LF/Mega, catálogo de estratégias, métricas com status, histórico local |
| v1.1.0 | 2026-09-08 | UX e transparência: terminologia simples, navegação, proteção contra resultado desatualizado |
| v1.1.1 | 2026-09-09 | Integridade histórica: validação de concurso-alvo, no-look-ahead comprovado por testes, conferência completa |
| v1.1.2 | 2026-09-10 | Confiabilidade: recuperação de falha do Worker, Error Boundary global, alerta de falha do atualizador |
| v1.2.0 | 2026-09-23 | Marca LotoAtlas, isolamento de estado entre modalidades (FIX-001), registro de aposta por jogo (BET-001), fundação de continuidade de projeto, clareza do fluxo de salvar |

## 2. Versão candidata em curso — pós-v1.2.0

Não tagueada ainda. Já mergeado em `main` desde v1.2.0: correção de copy (PR #12), validação da fixture de agrupamento do MEGA-ROLL-001 (PR #13), correção defensiva de unmount em `CarteirasPage.tsx` (PR #14).

**Em PR aberto, aguardando validação de preview do product owner (não mergeado):** MEGA-ROLL-001 — implementação completa da estratégia "Organizar pelo histórico recente" (PR #15). Ver `ROADMAP.md` para o status vivo e `DECISIONS.md` (`DEC-022`) para a regra de preview-antes-do-merge que passou a valer a partir desta release.

## 3. Critérios de entrada de uma nova release

- Nenhuma alteração de escopo sem decisão registrada (`DECISIONS.md`).
- `main` com CI verde no commit que será tagueado.
- Para qualquer mudança visível/comportamental: preview validado pessoalmente pelo product owner antes do merge (`DEC-022`), não apenas antes do tag.
- Oráculos matemáticos (Lotofácil e Mega-Sena) sem regressão.
- `CHANGELOG.md` com entrada em `[Unreleased]` migrada para a seção da versão.

## 4. Critérios de saída de uma release (release considerada `DONE`)

- Tag anotada criada e publicada.
- Produção (`https://loterias-bkr.pages.dev/`) servindo o mesmo commit da tag.
- `PROJECT_STATE.md` atualizado com o novo SHA/tag.
- Nenhuma capacidade marcada `DONE` no roadmap sem essa verificação em produção (`DEC-007`).

## 5. Cadência de atualização deste pacote de gestão

Este arquivo e os demais deste pacote (`docs/project-management/00_…14_*.md`) devem ser revisados a cada release tagueada (no mínimo) e sempre que uma decisão relevante (`DEC-NNN`) mudar o estado de um risco, escopo ou marco aqui narrado. A responsabilidade é do mesmo processo que corta a tag — ver `10_RELEASE_AND_DEPLOYMENT_GOVERNANCE.md`, seção 5.
