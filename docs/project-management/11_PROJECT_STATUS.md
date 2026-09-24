# Project Status

> Status executivo narrativo. Para o estado técnico exato e sempre atual, `PROJECT_STATE.md` prevalece em caso de divergência — este documento é revisado por release, não em tempo real.

**Data de referência:** 24/09/2026
**Overall:** GREEN (produção estável; um PR de feature aguardando validação do product owner)

| Área | Status | Observação |
|---|---|---|
| Produto | GREEN | v1.2.0 em produção; MEGA-ROLL-001 completo em PR #15, aguardando validação de preview |
| Matemática | GREEN | oracles verdes (32/32 Mega, 45/45 Lotofácil no PR aberto) |
| UX | GREEN | identidade visual LotoAtlas + clareza do fluxo de salvar homologadas em v1.2.0 |
| Dados | GREEN | updater operacional; Lotofácil #3786, Mega-Sena #3061 (22/09) |
| Persistência | GREEN | IndexedDB + backup; BET-001 (registro de aposta por jogo) em produção |
| Qualidade | GREEN | gates verdes; ver `08_QUALITY_MANAGEMENT_PLAN.md` |
| CI/CD | GREEN | `main` CI verde; um incidente de unmount assíncrono ocorreu e foi corrigido em 23/09 (ver `06_RAID_LOG.md`, R10) |
| Governança de merge | GREEN | `DEC-022` reinstaurada: preview validado pessoalmente antes de qualquer merge visível |
| Produção | GREEN | tag e produção no mesmo commit pela primeira vez (v1.2.0) |
| Documentação técnica | GREEN | ampla cobertura |
| Documentação de gestão (este pacote) | GREEN | atualizado em 24/09/2026 após período sem manutenção desde 09/09; cadência de atualização formalizada (ver README) |
| Marca/IP | YELLOW | pesquisa de classificação concluída (`DEC-021`), depósito formal adiado até regularização do MEI |
| Monetização | GREY | ainda não iniciada |
| Analytics de adoção | YELLOW | métricas ainda não estruturadas |

---

## Release atual

**v1.2.0** (2026-09-23) — marca LotoAtlas, isolamento de estado entre modalidades (FIX-001), registro de aposta por jogo (BET-001), fundação de continuidade de projeto, clareza do fluxo de salvar.

## Em andamento, não mergeado

**MEGA-ROLL-001** (PR #15) — implementação completa da estratégia "Organizar pelo histórico recente". CI verde, todos os 10 critérios de aceite da spec confirmados. Aguardando o product owner abrir o preview e validar pessoalmente antes de autorizar o merge (`DEC-022`).

---

## Último incidente

Erro assíncrono pós-unmount em `CarteirasPage.tsx` (mesma classe de bug já vista na v1.1.1) detectado pelo `main CI` em 23/09, corrigido no mesmo dia (PR #14). Ver `06_RAID_LOG.md`, R10, para a reclassificação do risco.

---

## Próximo foco recomendado

1. Validar o preview de MEGA-ROLL-001 e decidir o merge;
2. Rodar a correção pendente de header/logo (BRAND-001), instrução já preparada;
3. Avaliar se o deploy do Cloudflare deve passar a ser condicionado ao `main CI` (`TECH-007`/R11);
4. Decidir se este pacote de gestão (00-14) deve continuar mantido a cada release, agora que está commitado no git;
5. Manter dogfooding e observar operação.

---

## Blockers

Nenhum blocker técnico. Único item aguardando ação humana: validação de preview do PR #15.

---

## Decisões pendentes

- titular do pedido de marca no INPI (PF, MEI ou outra PJ) — `DEC-021`;
- planos concretos de app nativo (afetaria a Classe 9 do INPI);
- futuro do conteúdo de Metodologia (produto editorial/curso independente?);
- momento adequado para analytics estruturado;
- estratégia de monetização futura.
