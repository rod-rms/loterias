# Mega-Sena — App Integration Decision v1

O domínio entregue foi aceito como base matemática da Mega-Sena.

## Mantido sem mudança conceitual

- Max F4 (`quadra_or_better`);
- Max F5 (`quina_or_better`);
- avaliação independente;
- baseline;
- overlap;
- exact/estimated labeling;
- seed;
- audit;
- worker;
- popularity experimental desligada por padrão.

## Extensões de app

O app adicionará dois adapters de estratégia:

1. `megasena.uniform_random` usando o gerador uniforme já existente/extraído;
2. `megasena.max_diversification` minimizando redundância e usando F4 como tie-break.

Esses adapters não podem alterar os resultados matemáticos das funções canônicas já testadas.

## Cap da v1

O handoff possui benchmark até 100 tickets. A UI adota 100 como cap inicial das estratégias Mega-Sena, mantendo a política exata/estimada do domínio.

## Test runner

A aplicação unificada deve preferencialmente migrar os testes para Vitest, preservando integralmente fixtures e invariantes.
