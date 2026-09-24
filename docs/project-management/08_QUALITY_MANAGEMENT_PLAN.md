# Quality Management Plan

## 1. Objetivo

Garantir correção matemática, integridade de dados, qualidade funcional e segurança de release.

---

## 2. Camadas de qualidade

### Unit
Helpers, regras de domínio, validações e formatação.

### Integration
Persistência, adapters, datasets e componentes integrados.

### Oracle
Validação independente de resultados matemáticos.

### E2E
Fluxos críticos de usuário.

### Data validation
Schemas, gaps, último concurso e consistência.

### Manual acceptance
Preview Cloudflare antes de release.

---

## 3. Gates obrigatórios

```text
npm run lint
npm run typecheck
npm run test:unit
npm run test:mega:oracle
npm run test:lotofacil:oracle
npm run build
npm run test:e2e
npm run data:validate
```

Todos devem estar verdes.

---

## 4. Gates adicionais de release

- PR CI verde;
- preview disponível;
- homologação manual;
- branch sincronizada com main;
- main CI verde após merge;
- somente depois: tag/release.

---

## 5. Situação — v1.2.0 (produção) e PR #15 (aguardando validação)

**Em produção (v1.2.0, 2026-09-23):** main CI verde, oráculos e testes íntegros no momento da tag.

**No PR #15, ainda não mergeado (MEGA-ROLL-001, 2026-09-24):**
- 320/320 unit (269 pré-existentes + 51 novos);
- 32/32 Mega oracle (24 pré-existentes intactos + 8 de agrupamento já mergeados no PR #13);
- 45/45 Lotofácil oracle (inalterado);
- 58/58 E2E (57 pré-existentes + 1 novo caminho feliz);
- lint/typecheck/build: PASS;
- CI verde, mas merge **não** acontece só por isso — falta a validação pessoal do preview pelo product owner (`DEC-022`).

Estes números avançam a cada release; releia `HANDOFF.md`/`ROADMAP.md` para o estado mais atual em vez de tratar esta seção como definitiva.

---

## 6. Critérios de severidade

### Blocker
- erro matemático;
- corrupção de dados;
- quebra de persistência;
- regressão de geração;
- main CI vermelho;
- data leakage.

### Major
- fluxo principal quebrado;
- resultado incorreto na UI;
- perda de dados locais.

### Minor
- copy;
- layout;
- inconsistência sem impacto funcional.

---

## 7. Regra de ouro

Mudança visual nunca deve alterar matemática silenciosamente.
