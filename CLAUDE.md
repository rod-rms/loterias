# CLAUDE.md — Loterias

Leia `00_START_HERE_CLAUDE_CODE.md` antes de alterações substanciais.

## Fontes de verdade

1. `00_START_HERE_CLAUDE_CODE.md`
2. `docs/global/ACCEPTANCE_CRITERIA_V1.md`
3. `docs/global/PRODUCT_SPEC_V1.md`
4. `docs/global/STRATEGY_CATALOG_V1.md`
5. specs de domínio por modalidade

`reference/` é histórico/oráculo, não UI spec atual, exceto regras canônicas RMS indicadas pela documentação.

## Invariantes

- um único app React/Vite;
- Lotofácil e Mega-Sena são módulos separados;
- domain não importa React;
- v1 usa apenas apostas simples: LF15 / Mega6;
- sem IA generativa em runtime;
- sem previsão de dezenas;
- sem promessa de lucro;
- Strategy Registry controla capacidades;
- RMS v2 = exatamente 6 jogos;
- RMS nunca relaxa hard constraints silenciosamente;
- Mega usa `bigint` para máscaras 60-bit;
- preserve `exact/estimated/upper_bound/lower_bound/not_computed`;
- baseline aleatória não é a estratégia Aleatória distinta;
- toda geração tem seed;
- dados pessoais ficam locais na v1;
- preços são configuração versionada;
- não colocar secrets no frontend/repo.

## Antes de push

Execute e corrija:

- lint
- typecheck
- unit/integration
- Mega oracle
- Lotofácil oracle
- Playwright crítico
- build

Nunca force push.
