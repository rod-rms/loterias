# Como retomar o projeto LotoAtlas

Objetivo: qualquer sessão nova (Claude Code, ChatGPT ou pessoa) consegue continuar o projeto **sem acesso a conversas anteriores**. O repositório é a fonte da verdade (`DEC-001`, `DEC-002`).

## Hierarquia de documentos

1. **Gestão atual (autoritativa):** `docs/project-management/PROJECT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`, `HANDOFF.md`. Estes **quatro** são a fonte oficial de estado, roadmap, decisões e continuação.
2. **Especificações técnicas:** documentos versionados em `docs/global/`, `docs/lotofacil/`, `docs/megasena/` (inclui a especificação da Rolling 20 e o memorando de pesquisa RMS 20+50).
3. **Histórico / local:** handoffs de implementação antigos (`00_START_HERE_CLAUDE_CODE.md`), artefatos em `reference/`, arquivos locais não versionados (pacote antigo de gestão `docs/project-management/00_…14_*.md` e `README.md`, pacotes brutos de auditoria, Brand Kits, DOCX).

Material histórico/local pode informar uma tarefa, mas **não substitui silenciosamente** uma decisão canônica atual. Os arquivos antigos/locais de gestão são apenas referência histórica, a menos que seu conteúdo tenha sido explicitamente migrado para os quatro documentos canônicos (o conhecimento durável relevante já foi migrado em 2026-09-21: regras de release abaixo, critérios de mudança de escopo em `DEC-020` e ideias de produto em `ROADMAP.md`).

## No início de TODA tarefa substancial

1. Leia, nesta ordem:
   - `CLAUDE.md`
   - `docs/project-management/PROJECT_STATE.md`
   - `docs/project-management/ROADMAP.md`
   - `docs/project-management/DECISIONS.md`
   - `docs/project-management/HANDOFF.md`
2. Depois leia os documentos técnicos da tarefa (`docs/global/*`, `docs/lotofacil/*`, `docs/megasena/*`).
3. Rode:
   ```
   git fetch origin --prune
   git status
   git log --oneline --decorate -n 15 origin/main
   gh pr list
   ```
4. Compare o estado real do GitHub com a documentação.
5. Se um SHA, um PR ou um status avançou desde a última atualização dos documentos, **o GitHub/repositório atual prevalece**; corrija a documentação no PR da tarefa.
6. Nunca assuma que o "último concurso" documentado ainda é o último: releia `public/data/status.json`.
7. Preserve arquivos locais/não versionados do usuário (`Claude outputs/`, pacotes de auditoria, Brand Kits, DOCX etc.).
8. Nunca use `git add .` às cegas; faça staging direcionado.
9. Nunca faça force push; não faça rebase de branches de feature compartilhadas (merge normal de `origin/main`).
10. Nunca faça merge, tag ou release sem autorização explícita do product owner.
11. Ao final de trabalho substancial, atualize os documentos de gestão **no mesmo PR** quando o estado, o roadmap ou uma decisão mudou.

## Manutenção da documentação ao fim da tarefa

| Arquivo | Atualizar quando |
|---|---|
| `PROJECT_STATE.md` | o estado atual muda (SHA de `main`, PRs, capacidades em produção, tag, itens em andamento) |
| `ROADMAP.md` | um item muda de status ou surge um novo item aceito |
| `DECISIONS.md` | há decisão relevante de produto, arquitetura, matemática ou pesquisa (novo `DEC-NNN`) |
| `CHANGELOG.md` | há mudança visível ao usuário |
| `HANDOFF.md` | o próprio processo de continuação muda |

Disciplina de status: só marque `DONE` depois de implementado + mergeado + CI verde + verificado em produção (quando afeta produção). Após um merge, o SHA de `main` registrado em `PROJECT_STATE.md` fica defasado por natureza (datasets avançam); registre o SHA da verificação e a data.

## Gates de qualidade padrão

```
npm run lint
npm run typecheck
npm run test:unit
npm run test:mega:oracle
npm run test:lotofacil:oracle
npm run build
npm run test:e2e
npm run data:validate
```

Contagens de referência (2026-09-21, `main` em `978d63d`): unit 269, oráculo Mega 24, oráculo Lotofácil 45, Playwright 57. Podem aumentar; não podem regredir, e nenhuma saída de oráculo pode mudar sem decisão explícita.

**PRs somente de documentação** não precisam rodar todos os gates de execução se nenhum código/configuração executável mudou, mas **devem** ao menos: rodar `git diff --check` e confirmar (por `git diff --stat`) que nenhum arquivo executável da aplicação mudou.

## Antes de push (invariantes do repositório)

Ver `CLAUDE.md`. Nunca coloque secrets no frontend/repositório.

## Fluxo de release e deploy

- CI: `build-and-test` (GitHub Actions) em PR e em `main`.
- Deploy: Cloudflare Pages. Obtenha a URL real de preview/deploy nos metadados de check/deployment do GitHub (por exemplo os check-runs do commit ou o status do PR), **verifique que ela responde com sucesso** e registre a URL exata quando necessário. Não assuma nenhum mapeamento não documentado entre `external_id` e hostname. Homologue sempre o ambiente correto: registre a URL imutável do preview e o SHA aceito (um alias incorreto já causou um falso diagnóstico de regressão). Produção: `https://loterias-bkr.pages.dev/`.
- Verificar produção = CI de `main` (event `push`, `head_sha` do merge) com sucesso + o que está em produção corresponde ao deploy desse commit (por exemplo, mesmo bundle de assets) + smoke test.
- O CI de PR não substitui o CI de `main`: a tag/release só depois do CI de `main` verde (na v1.1.1 o PR passou e o `main` revelou uma race assíncrona).
- Versionamento SemVer (MAJOR incompatibilidade relevante; MINOR capacidade compatível; PATCH correção/manutenção). Tag anotada e GitHub Release só com autorização explícita (`DEC-003`). Nunca reescreva/mova uma tag publicada: regressão crítica ⇒ interromper a release e publicar um patch. Hoje a última tag é `v1.1.2`.

## Problemas conhecidos de ferramenta

- Heredocs/`node -e` com crases e barras invertidas são frágeis no Git Bash: escreva scripts em arquivo.
- No PowerShell, a saída de `gh pr ready`/`gh pr merge` vai para stderr e gera um `NativeCommandError` cosmético.
- Existe um flake de teardown assíncrono ("window is not defined") observado uma vez; um re-run passou (`TECH-006`).
