# Acceptance Criteria — v1.1

## Build

- [ ] install reproduzível;
- [ ] lint;
- [ ] typecheck strict;
- [ ] unit/integration;
- [ ] E2E críticos;
- [ ] build produção;
- [ ] sem secrets no frontend/repo.

## Arquitetura

- [ ] único React/Vite;
- [ ] módulos separados;
- [ ] `strategies/` por modalidade;
- [ ] matemática sem React;
- [ ] registry/adapters;
- [ ] Worker para pesado;
- [ ] sem IA em runtime.

## Escopo de aposta

- [ ] UI explica que v1 gera apostas simples: LF15 e Mega6;
- [ ] apostas ampliadas não são simuladas como se fossem um único jogo simples.

## Estratégias

- [ ] LF RMS v2;
- [ ] LF Diversificação;
- [ ] LF Cobertura 11+;
- [ ] LF Cobertura 12+;
- [ ] LF Aleatória;
- [ ] Mega F4;
- [ ] Mega F5;
- [ ] Mega Diversificação;
- [ ] Mega Aleatória;
- [ ] UI não usa “máxima”/“ótima” quando não provado;
- [ ] popularity não aparece como estratégia validada.

## Quantidade/orçamento

- [ ] quantidade configurável nas flexíveis;
- [ ] orçamento converte por floor;
- [ ] custo usado e saldo exibidos;
- [ ] orçamento acima de cap gera validação explícita;
- [ ] RMS fixa 6;
- [ ] limites no domínio;
- [ ] máximo combinatório sob fixas/excluídas validado.

## Seed

- [ ] toda carteira possui seed;
- [ ] seed automática é salva/exibida;
- [ ] Nova variação cria seed nova;
- [ ] Reproduzir mantém resultado.

## Resultado

- [ ] jogos válidos/distintos;
- [ ] métricas;
- [ ] otimização e avaliação separadas;
- [ ] status exato/estimado preservado;
- [ ] baseline corretamente rotulada;
- [ ] Aleatória concreta não confundida com baseline;
- [ ] copiar/CSV/JSON;
- [ ] salvar local.

## Comparação

- [ ] mesmo N;
- [ ] mesmas restrições quando compatíveis;
- [ ] RMS só se N=6/config compatível;
- [ ] incompatibilidade mostra motivo;
- [ ] sem vencedor absoluto.

## Persistência

- [ ] IndexedDB com schema/migration;
- [ ] snapshot imutável de versão/seed/dataset/preço;
- [ ] reload preserva;
- [ ] backup completo export/import;
- [ ] apagar dados locais;
- [ ] exclusão explícita de carteira.

## Dados

- [ ] dataset versionado;
- [ ] atualização visível;
- [ ] preço config versionada;
- [ ] script update;
- [ ] GitHub Action agendada;
- [ ] falha mantém último snapshot;
- [ ] RMS falha se faltar janela de 20.

## Comunicação

- [ ] não prevê números;
- [ ] não promete lucro;
- [ ] não diz que organização aumenta jackpot para mesmo N;
- [ ] jogo gerado != aposta registrada;
- [ ] 18+ / jogo responsável;
- [ ] sem incentivo de recuperação de perdas.

## UX/A11y

- [ ] responsivo;
- [ ] teclado;
- [ ] foco visível;
- [ ] estados loading/error/empty;
- [ ] cor não é único indicador;
- [ ] tooltip/metodologia;
- [ ] listas grandes não degradam UI.

## Mega

- [ ] testes handoff verdes;
- [ ] bigint 60-bit;
- [ ] política exact/estimated preservada.

## RMS

- [ ] fixture 3780;
- [ ] pools auditáveis;
- [ ] sem look-ahead;
- [ ] regras não relaxadas silenciosamente;
- [ ] N diferente de 6 rejeitado.
