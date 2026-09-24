# Release & Deployment Governance

## 1. Fluxo padrão

```text
Feature
  ↓
Feature branch
  ↓
Implementation
  ↓
Automated tests
  ↓
Draft PR
  ↓
PR CI
  ↓
Cloudflare preview
  ↓
Validação pessoal do product owner no preview   ← obrigatória p/ mudança visível/comportamental (DEC-022)
  ↓
Autorização explícita de merge (não pode ser pré-concedida na instrução, nesse caso)
  ↓
Ready for Review
  ↓
Sync with main
  ↓
Merge commit
  ↓
Main CI
  ↓
Production deploy
  ↓
Annotated tag
  ↓
GitHub Release
  ↓
Production smoke test
```

Para mudança puramente interna/invisível (testes, refactors sem superfície de UI, documentação, correção defensiva sem mudança de comportamento no caso normal), a autorização de merge pode continuar pré-concedida na própria instrução da tarefa — a etapa de "validação pessoal no preview" nesse caso não se aplica.

---

## 2. Regras Git

- GitHub é source of truth;
- feature branch por escopo;
- sem force-push em fluxo normal;
- merge commit preferido;
- não reescrever tag publicada;
- release corrigida por patch version.

---

## 3. Versionamento

SemVer:

- `MAJOR`: incompatibilidade relevante;
- `MINOR`: nova capacidade compatível;
- `PATCH`: correção/manutenção/usabilidade/integridade.

Exemplos:
- v1.1.0 — UX;
- v1.1.1 — manutenção/integridade;
- v1.1.2 — confiabilidade;
- v1.2.0 — marca, isolamento entre modalidades, registro de aposta por jogo, fundação de continuidade — primeira vez que a tag e o estado de produção coincidiram no mesmo commit.

---

## 4. Incidentes conhecidos de main CI pós-merge

### 4.1 — v1.1.1 (PR #2/#3)
`CarteirasPage.handleCheck` disparava `refresh()` sem `await`, permitindo erro assíncrono depois do teardown do teste. Resposta: tag não foi feita imediatamente; PR #3 isolado; correção; main CI verde; tag apontada para o commit corrigido.

### 4.2 — pós-v1.2.0 (PR #14, 2026-09-23)
**Mesma classe de bug reapareceu**: múltiplos `setState` depois de `await` em `CarteirasPage.tsx`, sem guard contra unmount, expostos pela suíte de testes adicionada no PR #13 (não causados por ele). Corrigido no mesmo dia com um guard padrão de React (`isMountedRef`), sem mudança de comportamento no caso montado.

**Lição consolidada (as duas ocorrências, não só a primeira):** `main CI` continua sendo gate obrigatório mesmo quando PR CI e homologação passaram — e esta classe específica de erro (setState assíncrono pós-unmount em `CarteirasPage.tsx`) já se repetiu duas vezes. Vale considerar um lint rule ou teste estrutural que pegue esse padrão antes do CI, em vez de depender de detecção reativa (ver `06_RAID_LOG.md`, R10).

---

## 5. Rollback

Em regressão crítica:
- interromper release;
- não mover tag existente;
- criar hotfix;
- lançar nova versão patch.

---

## 6. Produção

URL: https://loterias-bkr.pages.dev/

**Gap conhecido, não bloqueante:** o Cloudflare Pages publica em produção qualquer push em `main`, independentemente do resultado do GitHub Actions — já confirmado empiricamente (commit `07f7e6e` foi servido em produção enquanto seu `main` CI estava vermelho, ver 4.2 acima e `06_RAID_LOG.md`). Avaliar se isso deveria mudar (gate de deploy condicionado ao CI) é uma decisão de produto ainda não tomada.

---

## 7. Cadência de manutenção deste documento

Atualizar a cada release tagueada e sempre que um novo incidente de `main CI` pós-merge ocorrer (seção 4) ou uma decisão de governança de merge/release mudar (`DEC-003`, `DEC-004`, `DEC-022`).
