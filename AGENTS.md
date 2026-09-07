# AGENTS.md — Regras para agentes que trabalham no projeto Loterias

## Objetivo

Manter e evoluir uma aplicação auditável de construção/comparação de carteiras da Lotofácil e Mega-Sena.

## Leia primeiro

- `00_START_HERE_CLAUDE_CODE.md`
- `docs/global/PRODUCT_SPEC_V1.md`
- `docs/global/STRATEGY_CATALOG_V1.md`
- `docs/global/ARCHITECTURE_V1.md`
- spec da modalidade alterada
- testes/oráculos relacionados

## Regras

- matemática é código de domínio, não UI;
- não alterar fórmulas sem teste/oráculo e documentação;
- não introduzir “números mais prováveis”;
- não adicionar estratégia sem contrato/versionamento/baseline;
- não alterar RMS v2 para suportar N diferente de 6;
- não transformar busca heurística em “ótimo” sem prova;
- não substituir Mega `bigint` por bitwise 32-bit;
- não misturar baseline teórica com uma carteira random concreta;
- não recalcular carteira salva silenciosamente após mudança de engine;
- preserve reprodutibilidade por seed;
- preserve compatibilidade de backup via migrations;
- não adicionar backend/login/pagamentos na v1 sem nova decisão de produto.

## Qualidade

Toda mudança matemática precisa de testes.
Toda mudança de schema precisa de migration.
Toda mudança de estratégia precisa de nova versão quando alterar comportamento.
Toda mudança de UI deve manter teclado, foco visível e semântica acessível.
