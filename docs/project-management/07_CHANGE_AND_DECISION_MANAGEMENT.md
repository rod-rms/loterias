# Change & Decision Management

## 1. Objetivo

Evitar que decisões relevantes existam apenas em conversas ou sejam implementadas sem rastreabilidade.

---

## 2. Fluxo de mudança

```text
Observação / problema
        ↓
Análise de impacto
        ↓
Classificação
        ↓
Decisão
        ↓
Release alvo
        ↓
Implementação
        ↓
Teste
        ↓
Preview validado pelo product owner (se mudança visível/comportamental — DEC-022)
        ↓
Homologação
        ↓
Merge
        ↓
Documentação
```

---

## 3. Classificação

### Bug
Comportamento diverge do acordado.

### Improvement
Melhoria sem ampliar significativamente capacidade.

### Feature
Nova capacidade do produto.

### Research
Investigação sem compromisso de produção.

### Architecture
Mudança estrutural.

---

## 4. Critérios de impacto

Avaliar:

- produto;
- UX;
- matemática;
- dados;
- persistência;
- performance;
- segurança;
- testes;
- documentação;
- deploy;
- custo.

---

## 5. Exemplos reais

### CR-001 — Remover landing intermediária
**Tipo:** UX Improvement · **Release:** v1.1.0 · **Status:** concluído

### CR-002 — Preservar resultado após editar configuração
**Tipo:** Product Integrity · **Solução:** snapshot congelado + stale result · **Release:** v1.1.0

### CR-003 — Simulação histórica
**Tipo:** Feature · **Controle crítico:** no-look-ahead · **Release:** v1.1.1

### CR-004 — Conferência detalhada
**Tipo:** Improvement · **Release:** v1.1.1

### CR-005 — Registro de aposta por jogo (BET-001)
**Tipo:** Feature · **Motivo:** separar carteira gerada (imutável) de seleção de aposta real (opt-in, append-only) · **Impacto:** produto, dados, persistência (`betSelection`), testes · **Release:** v1.2.0 · **Decisão:** `DEC-008`/`DEC-009`/`DEC-011`

### CR-006 — Identidade visual LotoAtlas
**Tipo:** Improvement (marca/UX) · **Impacto:** visual/responsividade apenas; zero impacto em matemática/estratégias/persistência · **Release:** v1.2.0

### CR-007 — MEGA-ROLL-001 (Rolling 20 Balanceada v2.1)
**Tipo:** Feature · **Impacto:** produto (nova estratégia Mega-Sena), matemática (agrupamento/alocação/filtros/otimizador), Strategy Registry, UI · **Decisão de aprovação:** `DEC-018` · **Status:** PR aberto, aguardando validação de preview do product owner antes do merge (ver CR-008)

### CR-008 — Reinstauração do preview-antes-do-merge
**Tipo:** Architecture/Governance · **Motivo:** uma instrução anterior padrão passou a incluir autorização de merge pré-concedida (para economizar idas e voltas), o que fez o product owner perder a validação pessoal via preview antes do merge que ele valorizava. **Decisão:** `DEC-022` (2026-09-24) — para qualquer mudança visível/comportamental ao usuário, a instrução de tarefa não pode mais pré-autorizar merge; a implementação deve reportar uma URL de preview testável e aguardar validação explícita antes do merge. Autorização pré-concedida continua válida só para mudanças puramente internas/invisíveis. **Release alvo:** aplicado retroativamente ao PR #15 (MEGA-ROLL-001) antes do merge.

---

## 6. Decision log

O registro estratégico atual e vivo de decisões, com IDs `DEC-NNN`, é [`DECISIONS.md`](./DECISIONS.md) (não o arquivo histórico `docs/global/DECISIONS_AND_OPEN_POINTS_V1.md`, que cobre apenas decisões 1–38 da v1/v1.1.x e não é duplicado aqui — ver `DECISIONS.md`'s própria nota de precedência, `DEC-020`).

Mudanças orientadas a usuário devem aparecer no `CHANGELOG.md`.
