# LotoAtlas — Estado Atual do Projeto

> Este arquivo responde: **"onde exatamente está o LotoAtlas hoje?"**
> Em caso de divergência, o estado real do GitHub (`git log`, `gh pr list`, `public/data/status.json`) prevalece — veja `HANDOFF.md`.

| Campo | Valor |
|---|---|
| Última revisão | 2026-09-23 |
| Repositório | https://github.com/rod-rms/loterias |
| Produção | https://loterias-bkr.pages.dev/ |
| `main` no momento da revisão | `091a29057a8c9530ca0c66460071a87e6d52d19e` (tip pós-merge do PR #14 + atualização automática de dataset) |
| Versão em `package.json` | `1.2.0` |
| Última release estável com tag | `v1.2.0` (2026-09-23) |

## Release com tag ≠ estado atual de produção

`v1.2.0` inclui a marca LotoAtlas, o FIX-001, o BET-001, a fundação de continuidade de projeto e a clareza do fluxo de salvar. Desde então, `main` recebeu correções internas adicionais sem release própria ainda (PR #12 correção de copy, PR #13 spike de validação do agrupamento MEGA-ROLL-001, PR #14 correção defensiva de unmount) — nenhuma delas é uma capacidade nova visível ao usuário. **MEGA-ROLL-001 (implementação completa) está em PR aberto, ainda não mergeado** — ver seção "Item de desenvolvimento em andamento".

## Capacidades atualmente em produção

- Lotofácil (LF15) e Mega-Sena (Mega6): geração de jogos simples por estratégias do Strategy Registry (incl. RMS v2 = exatamente 6 jogos), sempre com seed, métricas com status `exact/estimated/upper_bound/lower_bound/not_computed`.
- Simulação histórica com proteção *no-look-ahead* (o concurso-alvo e os posteriores nunca chegam à estratégia).
- Carteiras salvas localmente (IndexedDB), backup/importação, conferência de resultado contra concurso histórico.
- **BET-001:** salvar ≠ apostar. A carteira gerada é salva por inteiro; o registro dos jogos realmente apostados (`betSelection`) é opt-in, append-only e separado; a conferência checa **todos** os jogos, com selos Apostado/Não apostado e comparação factual.
- **FIX-001:** isolamento do estado de geração entre modalidades (Lotofácil ↔ Mega-Sena).
- Atualização automática de datasets a partir da API da CAIXA (workflow agendado, com alerta por issue `data-update-failure`).
- Identidade visual LotoAtlas (dark-first, tokens `brand.*`).
- Dados pessoais somente locais; nenhuma conta, nenhum backend.

## Datasets (lidos de `public/data/status.json` em 2026-09-23)

| Modalidade | Último concurso | Data do sorteio | Status |
|---|---|---|---|
| Lotofácil | 3786 | 2026-09-22 | ok, 0 lacunas |
| Mega-Sena | 3061 | 2026-09-22 | ok, 0 lacunas |

Estes números avançam sozinhos (commits `data: update lottery datasets` em `main`). **Sempre releia `public/data/status.json`.**

## PRs abertos

O PR de implementação completa do MEGA-ROLL-001 (`feat/mega-roll-001-implementation`) é o único aberto no momento em que esta revisão foi escrita — releia `gh pr list` para confirmar, pois pode já ter avançado.

## Item de desenvolvimento em andamento

**MEGA-ROLL-001** — Mega-Sena Rolling 20 Balanceada v2.1: implementação completa (agrupamento, alocação, filtros, otimizador, Strategy Registry, UI), CI verde, **aguardando validação de preview e autorização de merge do product owner** (`DEC-022`). Ver `ROADMAP.md` para o link do PR e o status detalhado.

## Próxima implementação aprovada

Nenhuma outra além do MEGA-ROLL-001 acima (em revisão, não em produção).

## Itens de pesquisa

- **RMS-201** — RMS v2.x, desempate multi-horizonte 20+50: `RESEARCH`. Nada implementado. Base: [`docs/lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md`](../lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md).
- **OBS-001** — Registro de Pesquisa Observacional: `RESEARCH / PLANNED`. Existe apenas a base de dados do BET-001; **não há painel/análise**.

## Dívida técnica conhecida, não bloqueante

BRAND-001 (centralização óptica do trevo/logo), TECH-001 … TECH-006 (ver `ROADMAP.md`).

## Observações

- Arquivos locais não versionados podem existir na máquina do product owner (`Claude outputs/`, pacote bruto de auditoria, Brand Kits, DOCX, pacote antigo de gestão `docs/project-management/00_…14_*.md`). São material histórico/de referência; não os adicione ao git sem pedido explícito e não os trate como fonte de estado.
- `00_START_HERE_CLAUDE_CODE.md` é o handoff histórico da implementação original da v1 e **não** é fonte de estado atual.
