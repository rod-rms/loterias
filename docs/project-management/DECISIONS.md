# LotoAtlas — Registro Atual de Decisões

Este arquivo é o registro **estratégico atual**. O log histórico detalhado (decisões 1–38, v1 a v1.1.2) permanece em [`docs/global/DECISIONS_AND_OPEN_POINTS_V1.md`](../global/DECISIONS_AND_OPEN_POINTS_V1.md) e não é duplicado aqui. Novas decisões relevantes entram aqui com ID `DEC-NNN` no mesmo PR que as origina.

Última revisão: 2026-09-24.

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
- **DEC-009 — Salvar não significa apostar.** O registro de aposta é opt-in explícito. **Emendada por `DEC-023`** quanto ao estado inicial do checkbox no painel de salvar (opt-out desde 2026-09-24); o conceito — salvar ≠ apostar, e o registro exige um checkbox visível e explícito — permanece.
- **DEC-010 — A conferência avalia a carteira gerada/salva inteira, inclusive jogos não marcados como apostados.** A comparação apostado × não apostado é estritamente factual, sem julgamento de valor.
- **DEC-011 — Revisões de `betSelection` são append-only.** Editar ou remover acrescenta uma revisão (remover = revisão vazia); edições posteriores ao resultado ficam distinguíveis (`resultAvailability`). Um novo salvamento do mesmo id nunca altera o conteúdo gerado e nunca apaga histórico de aposta (`savePortfolio` é append-only, protegido na persistência). `markedAsBet` deve coincidir com "a revisão atual tem ≥1 jogo" (validado no schema); registros legados sem `betSelection` e com `markedAsBet=true` significam "todos os jogos apostados".
- **DEC-012 — Dados pessoais de aposta ficam no IndexedDB local por padrão**; só saem do dispositivo por exportação explícita do usuário.
- **DEC-023 (2026-09-24) — Registro de aposta passa a vir marcado por padrão (opt-out), amenda `DEC-009`.** O painel "Salvar carteira" agora mostra a lista de jogos com "Registrar também quais jogos foram apostados" já marcada, em vez de desmarcada. O mecanismo continua sendo um checkbox explícito e visível, que o usuário pode desmarcar antes de confirmar — a mudança é só o estado inicial (opt-out em vez de opt-in). Motivo: o product owner quer que o painel de salvar sempre evidencie os jogos que serão salvos como um passo de confirmação visual; validado por ele em preview antes do merge (`DEC-022`) antes de ir para produção. `BET-002` no `ROADMAP.md`.

## Matemática e estratégia

- **DEC-013 — Dados históricos organizam estratégias, mas nunca são apresentados como previsão de números futuros.** Sem promessa de lucro; sem IA generativa em runtime.
- **DEC-014 — No-look-ahead estrito é obrigatório** em toda simulação histórica (o concurso-alvo e posteriores nunca chegam à estratégia).
- **DEC-015 — A RMS v2 mantém 20 concursos como janela histórica primária.**
- **DEC-016 — Substituir a RMS de 20 concursos por 50 NÃO está aprovado.**
- **DEC-017 — O desempate RMS 20+50 é apenas candidato de pesquisa** (RMS-201); nenhuma implementação sem experimento reprodutível documentado.
- **DEC-018 — A Rolling 20 Balanceada v2.1 (MEGA-ROLL-001) está aprovada para implementação futura**, mas **não** faz parte da produção até ser desenvolvida, mergeada e implantada explicitamente. O título oficial de UI de MEGA-ROLL-001 é "Organizar pelo histórico recente"; "Rolling 20 Balanceada v2.1" permanece como nome técnico.
- **DEC-019 — O Strategy Registry controla as capacidades; toda geração tem seed; a RMS nunca relaxa restrições rígidas silenciosamente.**

## Marca e propriedade intelectual

- **DEC-021 (2026-09-23) — Classificação de marca "LotoAtlas" pesquisada; registro formal adiado até regularização do MEI.** Busca informal no portal atual do INPI (`servicos.busca.inpi.gov.br/marcas`) para "LotoAtlas", "Loto Atlas", "Loto-Atlas", "Lotto Atlas", "Atlas Loto" e "Atlas Loteria" nas classes de Nice 9, 41 e 42: zero conflitos em todas as combinações. Um agente externo de propriedade industrial foi contratado para um parecer de enquadramento completo (relatório local em `docs/global/Relatorio_Enquadramento_INPI_LotoAtlas.md`, não versionado). Recomendação do agente: depositar somente na **NCL 42**, especificamente "Provimento de software de computador on-line não baixável" (código 420300) — a classe que corresponde ao que o LotoAtlas é hoje (software web entregue on-line, não baixável, sem operação de loteria). A **NCL 9** (software/app baixável) foi considerada desnecessária por ora, só relevante se um app nativo Android/iOS/desktop for concretamente planejado. A **NCL 41** (serviços de operação de loteria/jogos de azar, ex. "Operação de loterias") foi explicitamente **rejeitada por enquadramento incorreto**: o LotoAtlas não opera loteria, não recebe apostas nem processa pagamentos, e depositar nessa classe poderia caracterizar erroneamente o produto como serviço de aposta/jogo de azar, além de conflitar com a exigência do Art. 128 da LPI de que a marca corresponda à atividade lícita efetivamente exercida pelo requerente. **Decisão:** o depósito formal fica deliberadamente **adiado** (não rejeitado) até a regularização do MEI (Microempreendedor Individual) do product owner, para que o titular do pedido já seja a entidade jurídica correta desde o início — é uma escolha de sequenciamento, não de aversão a risco, e não bloqueia nenhum trabalho de engenharia. Três perguntas do agente permanecem em aberto e não são resolvidas por esta entrada: titular do pedido (PF, MEI ou outra PJ), planos concretos de app nativo, e se a área de conteúdo "Metodologia" se tornará um produto editorial/curso independente. A pesquisa de classificação já está feita e não deve precisar ser refeita quando o depósito ocorrer.
