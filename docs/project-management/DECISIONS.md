# LotoAtlas — Registro Atual de Decisões

Este arquivo é o registro **estratégico atual**. O log histórico detalhado (decisões 1–38, v1 a v1.1.2) permanece em [`docs/global/DECISIONS_AND_OPEN_POINTS_V1.md`](../global/DECISIONS_AND_OPEN_POINTS_V1.md) e não é duplicado aqui. Novas decisões relevantes entram aqui com ID `DEC-NNN` no mesmo PR que as origina.

Última revisão: 2026-09-21.

## Governança e processo

- **DEC-001 — O repositório GitHub é a fonte durável da verdade.** Estado, roadmap, decisões e handoff vivem em `docs/project-management/`.
- **DEC-002 — Conversas de chat (ChatGPT, Claude, etc.) não são estado autoritativo.** Qualquer coisa que precise sobreviver a uma conversa deve estar no repositório.
- **DEC-003 — Merge, tag e release exigem autorização explícita do product owner.** Autorização para um passo não se estende ao seguinte.
- **DEC-004 — Merge commits normais; sem rebase nem force push em branches de feature compartilhadas.**
- **DEC-005 — O atualizador automático de datasets pode avançar `main` a qualquer momento.** Toda tarefa de desenvolvimento/merge deve começar com `git fetch origin --prune` e considerar o `origin/main` mais recente; nunca assumir que um SHA ou "último concurso" documentado continua atual.
- **DEC-006 — Versão com tag e estado atual de produção podem diferir, e ambos são documentados separadamente.** Hoje: tag `v1.1.2`; produção contém trabalho posterior (marca, FIX-001, BET-001) ainda em `[Unreleased]`.
- **DEC-007 — Disciplina de status:** implementado em branch ≠ mergeado; mergeado ≠ em produção; em produção ≠ `DONE` até a verificação exigida terminar.
- **DEC-020 — Precedência de documentos.** Gestão atual = os quatro arquivos de `docs/project-management/` (autoritativos); especificações técnicas = documentos versionados em `docs/global|lotofacil|megasena/`; histórico/local (handoffs antigos, `reference/`, arquivos locais não versionados, pacotes brutos de auditoria) informa mas nunca sobrepõe silenciosamente uma decisão canônica atual. Uma mudança é **alteração de escopo** (exige decisão registrada) quando cria capacidade de produto, altera matemática existente, muda persistência/schema, altera a fonte de dados, cria dependência externa, muda a arquitetura, adiciona modalidade ou adiciona monetização; ajustes de copy/layout que não alteram comportamento são manutenção.

## Produto e modelo de dados

- **DEC-008 — Carteira gerada, metadados da carteira salva e seleção de aposta real são conceitos distintos.** `tickets` é sempre a carteira gerada completa e imutável; `betSelection` é metadado separado.
- **DEC-009 — Salvar não significa apostar.** O registro de aposta é opt-in explícito.
- **DEC-010 — A conferência avalia a carteira gerada/salva inteira, inclusive jogos não marcados como apostados.** A comparação apostado × não apostado é estritamente factual, sem julgamento de valor.
- **DEC-011 — Revisões de `betSelection` são append-only.** Editar ou remover acrescenta uma revisão (remover = revisão vazia); edições posteriores ao resultado ficam distinguíveis (`resultAvailability`). Um novo salvamento do mesmo id nunca altera o conteúdo gerado e nunca apaga histórico de aposta (`savePortfolio` é append-only, protegido na persistência). `markedAsBet` deve coincidir com "a revisão atual tem ≥1 jogo" (validado no schema); registros legados sem `betSelection` e com `markedAsBet=true` significam "todos os jogos apostados".
- **DEC-012 — Dados pessoais de aposta ficam no IndexedDB local por padrão**; só saem do dispositivo por exportação explícita do usuário.

## Matemática e estratégia

- **DEC-013 — Dados históricos organizam estratégias, mas nunca são apresentados como previsão de números futuros.** Sem promessa de lucro; sem IA generativa em runtime.
- **DEC-014 — No-look-ahead estrito é obrigatório** em toda simulação histórica (o concurso-alvo e posteriores nunca chegam à estratégia).
- **DEC-015 — A RMS v2 mantém 20 concursos como janela histórica primária.**
- **DEC-016 — Substituir a RMS de 20 concursos por 50 NÃO está aprovado.**
- **DEC-017 — O desempate RMS 20+50 é apenas candidato de pesquisa** (RMS-201); nenhuma implementação sem experimento reprodutível documentado.
- **DEC-018 — A Rolling 20 Balanceada v2.1 (MEGA-ROLL-001) está aprovada para implementação futura**, mas **não** faz parte da produção até ser desenvolvida, mergeada e implantada explicitamente.
- **DEC-019 — O Strategy Registry controla as capacidades; toda geração tem seed; a RMS nunca relaxa restrições rígidas silenciosamente.**
