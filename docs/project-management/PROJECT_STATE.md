# LotoAtlas — Estado Atual do Projeto

> Este arquivo responde: **"onde exatamente está o LotoAtlas hoje?"**
> Em caso de divergência, o estado real do GitHub (`git log`, `gh pr list`, `public/data/status.json`) prevalece — veja `HANDOFF.md`.

| Campo | Valor |
|---|---|
| Última revisão | 2026-09-22 |
| Repositório | https://github.com/rod-rms/loterias |
| Produção | https://loterias-bkr.pages.dev/ |
| `main` no momento da revisão | `8d463c59a850d95b8440a510d66b4c70b9f82137` (tip pós-merge do PR #8 + atualização automática de dataset) |
| Versão em `package.json` | `1.1.2` |
| Última release estável com tag | `v1.1.2` (2026-09-10) |

## Release com tag ≠ estado atual de produção

- **Release com tag:** `v1.1.2` — release de confiabilidade (Worker fatal errors, Error Boundary, alerta de falha do atualizador, `.gitattributes`/`.editorconfig`). **Não** contém a integração visual da marca LotoAtlas, o FIX-001 (PR #6), o BET-001 (PR #7) nem a fundação de continuidade de projeto (PR #8).
- **Produção hoje:** `main` em `8d463c5`, **à frente** de `v1.1.2`: inclui a marca LotoAtlas (PR #5), o FIX-001 (PR #6), o BET-001 (PR #7), a fundação de continuidade de projeto (PR #8 — este próprio conjunto de documentos) e os commits automáticos de atualização de dataset. As mudanças de produto/UX estão em `## [Unreleased]` do `CHANGELOG.md` e ainda não têm tag/release. A versão do app continua `1.1.2` de propósito (nenhum bump foi autorizado).
- Produção verificada em 2026-09-21 (merge do PR #7, `978d63d`) e novamente confirmada verde via CI de `main` no merge do PR #8 (`4fb0589`, documentação apenas — sem verificação funcional de produto necessária).

## Capacidades atualmente em produção

- Lotofácil (LF15) e Mega-Sena (Mega6): geração de jogos simples por estratégias do Strategy Registry (incl. RMS v2 = exatamente 6 jogos), sempre com seed, métricas com status `exact/estimated/upper_bound/lower_bound/not_computed`.
- Simulação histórica com proteção *no-look-ahead* (o concurso-alvo e os posteriores nunca chegam à estratégia).
- Carteiras salvas localmente (IndexedDB), backup/importação, conferência de resultado contra concurso histórico.
- **BET-001:** salvar ≠ apostar. A carteira gerada é salva por inteiro; o registro dos jogos realmente apostados (`betSelection`) é opt-in, append-only e separado; a conferência checa **todos** os jogos, com selos Apostado/Não apostado e comparação factual.
- **FIX-001:** isolamento do estado de geração entre modalidades (Lotofácil ↔ Mega-Sena).
- Atualização automática de datasets a partir da API da CAIXA (workflow agendado, com alerta por issue `data-update-failure`).
- Identidade visual LotoAtlas (dark-first, tokens `brand.*`).
- Dados pessoais somente locais; nenhuma conta, nenhum backend.

## Datasets (lidos de `public/data/status.json` em 2026-09-22)

| Modalidade | Último concurso | Data do sorteio | Status |
|---|---|---|---|
| Lotofácil | 3785 | 2026-09-21 | ok, 0 lacunas |
| Mega-Sena | 3060 | 2026-09-20 | ok, 0 lacunas |

Estes números avançam sozinhos (commits `data: update lottery datasets` em `main`). **Sempre releia `public/data/status.json`.**

## PRs abertos

Nenhum, no momento da revisão (verificado via `gh pr list`).

## Item de desenvolvimento em andamento

Nenhum.

## Próximo item de implementação aprovado

**MEGA-ROLL-001** — Mega-Sena Rolling 20 Balanceada v2.1. Status `APPROVED`; **implementação não iniciada**. Contrato de implementação versionado em [`docs/megasena/MEGASENA_ROLLING20_BALANCED_V2_1_SPEC.md`](../megasena/MEGASENA_ROLLING20_BALANCED_V2_1_SPEC.md) (o pacote bruto de auditoria local é só evidência de apoio). Título oficial de UI: "Organizar pelo histórico recente". Ver `ROADMAP.md`.

## Itens de pesquisa

- **RMS-201** — RMS v2.x, desempate multi-horizonte 20+50: `RESEARCH`. Nada implementado. Base: [`docs/lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md`](../lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md).
- **OBS-001** — Registro de Pesquisa Observacional: `RESEARCH / PLANNED`. Existe apenas a base de dados do BET-001; **não há painel/análise**.

## Dívida técnica conhecida, não bloqueante

BRAND-001 (centralização óptica do trevo/logo), TECH-001 … TECH-006 (ver `ROADMAP.md`).

## Observações

- Arquivos locais não versionados podem existir na máquina do product owner (`Claude outputs/`, pacote bruto de auditoria, Brand Kits, DOCX, pacote antigo de gestão `docs/project-management/00_…14_*.md`). São material histórico/de referência; não os adicione ao git sem pedido explícito e não os trate como fonte de estado.
- `00_START_HERE_CLAUDE_CODE.md` é o handoff histórico da implementação original da v1 e **não** é fonte de estado atual.
