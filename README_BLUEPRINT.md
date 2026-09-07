# Loterias — Blueprint de especificação da v1.1

Este pacote ainda não é a aplicação final. É a especificação pré-implementação revisada que fecha produto, estratégias, UX, arquitetura, dados, persistência, testes e critérios de aceite antes do prompt mestre para Claude Code.

## Estado

- Mega-Sena: domínio TypeScript recebido e validado; testes/oráculos preservados.
- Lotofácil: RMS v2 preservada como referência; especificação do motor revisada; implementação pendente.
- UI React/Vite: ainda não criada.
- Configuração de preços atual: incluída em `public/data/config/game-config.json` como dado versionado.

## Ordem de leitura

1. `docs/global/review/REVIEW_CHANGELOG_V1_1.md`
2. `docs/global/PRODUCT_SPEC_V1.md`
3. `docs/global/STRATEGY_CATALOG_V1.md`
4. `docs/global/UX_AND_SCREENS_V1.md`
5. `docs/global/ARCHITECTURE_V1.md`
6. `docs/global/DATA_AND_PERSISTENCE_V1.md`
7. `docs/lotofacil/LOTOFACIL_DOMAIN_SPEC_V1.md`
8. `docs/global/TEST_PLAN_V1.md`
9. `docs/global/ACCEPTANCE_CRITERIA_V1.md`
10. `docs/global/DECISIONS_AND_OPEN_POINTS_V1.md`

## Próximo passo

Após aprovação desta revisão, produzir o prompt/handoff mestre para Claude Code construir a aplicação em uma única execução orientada por testes, mantendo GitHub como fonte única da verdade.
