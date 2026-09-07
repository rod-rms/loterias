# Mega-Sena UI Contract v1

This document defines the UI/domain boundary only. It does not prescribe visual design.

## 1. Required inputs

The future UI should provide:

- contest identifier/number as UI context; the mathematical engine itself does not need it to calculate coverage;
- target number of elementary tickets **or** total budget;
- current/configured elementary-ticket cost in BRL;
- primary objective:
  - `quadra_or_better`;
  - `quina_or_better`;
- already existing user tickets for that contest, if any;
- optional fixed numbers;
- optional excluded numbers;
- optional seed;
- popularity mode (`off` by default, `experimental` only with explicit disclosure);
- optional computation/quality settings such as iterations, candidate pool and estimation samples.

### Input semantics

`numberOfTickets` means total desired portfolio size, including `existingTickets`.

Generated tickets obey fixed/excluded restrictions. Existing tickets are validated but not rewritten by those restrictions.

## 2. Minimal result payload

The UI must be able to render:

- generated tickets in ascending number order;
- total number of distinct elementary tickets;
- total cost;
- exact Sena probability;
- `F4` (at least one Quadra or better);
- `F5` (at least one Quina or better);
- probability of no Quadra-or-better prize;
- expected number of exact-Quadra, exact-Quina and Sena tickets;
- overlap matrix and histogram;
- uniform/random baseline comparison;
- evaluation status/method (`exact`, `estimated`, bounds, or not computed);
- model/algorithm version;
- seed;
- warnings and known limitations;
- experimental popularity features only when enabled.

## 3. Probability rendering

Every probability shown to the user should render both:

- a percentage; and
- when useful, a `1 in X` representation.

The UI must preserve the metric `status` next to the value. Estimated values must be labeled `Estimativa` and may expose sample size/standard error in details.

`F4` must not be labeled `chance de ganhar dinheiro`; it is specifically the chance of at least one ticket achieving Quadra or better under the mathematical draw model.

## 4. Baseline rendering

For unrestricted portfolios, the module can return the exact mean of uniformly selected distinct portfolios of the same `N`.

Show:

- portfolio metric;
- baseline metric;
- absolute difference in percentage points;
- relative difference;
- same ticket count;
- baseline kind.

Do not present a relative percentage without the absolute percentage-point difference.

For restricted generation, the module returns a deterministic uniform control portfolio under the same explicit restrictions rather than mislabeling the unrestricted closed-form mean as equivalent.

## 5. Popularity mode

Default: `off`.

If enabled, the UI must display a prominent notice equivalent to:

> EXPERIMENTAL / NÃO CALIBRADO PARA PROBABILIDADE REAL DE RATEIO.

Current v1 returns observable features and `score: null`. The UI must not synthesize its own crowding probability from these features.

## 6. Allowed language

- `cobertura da carteira`;
- `chance de pelo menos uma quadra`;
- `chance de pelo menos uma quina`;
- `chance de Sena`;
- `comparação com carteira aleatória de mesmo tamanho`;
- `menor/maior sobreposição`;
- `melhor solução encontrada pelo algoritmo`.

## 7. Prohibited language

- `números mais prováveis`;
- `IA prevê o próximo sorteio`;
- `jogo vencedor`;
- `garantia de lucro`;
- `aumenta sua chance de Sena` when comparing equal-size distinct portfolios;
- `chance de ganhar dinheiro` as a synonym for `F4`;
- `menor rateio garantido` without real calibrated popularity data.

## 8. Suggested integration flow

```ts
const generated = generateMegaSenaPortfolio({
  numberOfTickets: 7,
  ticketCostBRL: configuredCurrentPrice,
  objective: "quadra_or_better",
  popularityMode: "off",
  seed: 12345
});

const independentAudit = evaluateMegaSenaPortfolio(generated.tickets, {
  ticketCostBRL: configuredCurrentPrice
});
```

Generation and evaluation must remain separable in application state.

## 9. Worker use

The UI should execute portfolio generation in the provided Web Worker for interactive use. Validation of small inputs may remain on the main thread. Long-running exact F4 evaluation, large Monte Carlo evaluation and optimization should not block React rendering.
