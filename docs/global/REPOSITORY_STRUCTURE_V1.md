# Repository Structure — v1

```text
loterias/
│
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── layout/
│   │   └── providers/
│   │
│   ├── modules/
│   │   ├── lotofacil/
│   │   │   ├── domain/
│   │   │   ├── strategies/
│   │   │   ├── ui/
│   │   │   ├── workers/
│   │   │   └── index.ts
│   │   │
│   │   └── megasena/
│   │       ├── domain/
│   │       ├── strategies/
│   │       ├── ui/
│   │       ├── workers/
│   │       └── index.ts
│   │
│   └── shared/
│       ├── components/
│       ├── lib/
│       ├── types/
│       └── utils/
│
├── public/
│   ├── data/
│   │   ├── config/
│   │   ├── lotofacil/
│   │   └── megasena/
│   └── images/
│       ├── common/
│       ├── lotofacil/
│       └── megasena/
│
├── docs/
│   ├── global/
│   ├── lotofacil/
│   └── megasena/
│
├── tests/
│   ├── lotofacil/
│   ├── megasena/
│   └── integration/
│
├── scripts/
│   ├── lotofacil/
│   └── megasena/
│
├── reference/
│   ├── lotofacil/
│   └── megasena/
│
├── .github/
│   └── workflows/
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── AGENTS.md
└── CLAUDE.md
```

## Finalidade

- `src`: código executável.
- `public/data`: dados consumidos em runtime.
- `public/images`: assets visuais.
- `docs`: especificação vigente.
- `tests`: validação automatizada.
- `scripts`: atualização/benchmark/verificadores.
- `reference`: estudos, oráculos e documentação histórica que explicam origem das decisões.

Não misturar `reference` com documentos normativos atuais.
