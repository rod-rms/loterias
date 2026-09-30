# LotoAtlas — Estado Atual do Projeto

> Este arquivo responde: **"onde exatamente está o LotoAtlas hoje?"**
> Em caso de divergência, o estado real do GitHub (`git log`, `gh pr list`, `public/data/status.json`) prevalece — veja `HANDOFF.md`.

| Campo | Valor |
|---|---|
| Última revisão | 2026-09-29 |
| Repositório | https://github.com/rod-rms/loterias |
| Produção | https://loterias-bkr.pages.dev/ |
| `main` no momento da revisão | `8312dfb750479346ee07dadbb64cf920506c8167` (catch-up manual de dados após o incidente DATA-002, ver abaixo) |
| Versão em `package.json` | `1.2.0` |
| Última release estável com tag | `v1.2.0` (2026-09-23) |

## Release com tag ≠ estado atual de produção

`v1.2.0` inclui a marca LotoAtlas, o FIX-001, o BET-001, a fundação de continuidade de projeto e a clareza do fluxo de salvar. Desde a tag, quatro capacidades/ajustes novos visíveis ao usuário já foram mergeados e verificados em produção sem uma release própria: **MEGA-ROLL-001** (PR #15, 24/09), **BET-002** (PR #17, 24/09), **CART-001** (PR #20, 26/09) e **BRAND-001** (PR #24, 29/09) — ver a tabela abaixo. Correções internas sem superfície de UI (PR #12, #13, #14) e um PR de pesquisa somente documentação (PR #25, 29/09, experimento RMS-201) também entraram no meio tempo.

**Observação (DEC-006):** `package.json` permanece em `1.2.0` e não há tag mais recente que `v1.2.0`, mas a produção já contém três entregas de produto além do que essa tag descreve. Uma nova release com tag está **em atraso** frente ao que está de fato em produção — sinalizado aqui para o product owner decidir quando cortar a próxima tag; nenhuma tag/bump foi feito por esta revisão (`DEC-003`, fora do escopo de uma tarefa somente de documentação).

## Capacidades atualmente em produção

- Lotofácil (LF15) e Mega-Sena (Mega6): geração de jogos simples por estratégias do Strategy Registry (incl. RMS v2 = exatamente 6 jogos), sempre com seed, métricas com status `exact/estimated/upper_bound/lower_bound/not_computed`.
- Simulação histórica com proteção *no-look-ahead* (o concurso-alvo e os posteriores nunca chegam à estratégia).
- Carteiras salvas localmente (IndexedDB), backup/importação, conferência de resultado contra concurso histórico.
- **BET-001:** salvar ≠ apostar. A carteira gerada é salva por inteiro; o registro dos jogos realmente apostados (`betSelection`) é append-only e separado; a conferência checa **todos** os jogos, com selos Apostado/Não apostado e comparação factual.
- **BET-002:** o painel "Salvar carteira" mostra "Registrar também quais jogos foram apostados" já marcada por padrão (opt-out, `DEC-023`, emenda `DEC-009`) — o usuário desmarca jogos ou desativa o registro antes de confirmar, em vez de precisar marcar antes. Painel com destaque visual próprio (borda `brand-borderStrong` + fundo `bg-brand-action/10`).
- **FIX-001:** isolamento do estado de geração entre modalidades (Lotofácil ↔ Mega-Sena).
- **MEGA-ROLL-001:** estratégia Mega-Sena "Organizar pelo histórico recente" (Rolling 20 Balanceada v2.1, `megasena.rolling_20_v2`) — agrupamento G1/G2/G3 pelos 20 concursos anteriores, alocação proporcional, filtros estruturais e otimizador de exposição/sobreposição; estritamente no-look-ahead, sem afirmação preditiva.
- **CART-001:** "Meus jogos salvos" agrupado por dia de criação (Hoje/Ontem/data completa, teto de 3 dias com "Carregar mais"), faixa de cor por modalidade nos cartões, filtro rápido por concurso, data real (do dataset) ou estimada (pela periodicidade oficial CAIXA, sempre rotulada como estimativa) do sorteio em cada cartão, aviso de resultado ainda não divulgado dentro do diálogo de detalhes (não mais no topo da página), e o próprio painel de detalhes abrindo logo abaixo do cartão clicado.
- **BRAND-001:** centralização óptica do trevo no símbolo/logo LotoAtlas (micro-ajuste de translação, `translate(200,165)` → `translate(200,155.5)`, mesmo trevo/tamanho, validado visualmente sobre os dois fundos escuros do app) e quebra de linha defensiva (`break-all`) no identificador técnico de estratégia em "Detalhes técnicos do resultado".
- Atualização automática de datasets a partir da API da CAIXA (workflow agendado, com alerta por issue `data-update-failure`).
- Identidade visual LotoAtlas (dark-first, tokens `brand.*`).
- Dados pessoais somente locais; nenhuma conta, nenhum backend.

## Datasets (lidos de `public/data/status.json` em 2026-09-29, pós catch-up manual)

| Modalidade | Último concurso | Data do sorteio | Status |
|---|---|---|---|
| Lotofácil | 3792 | 2026-09-29 | ok, 0 lacunas |
| Mega-Sena | 3064 | 2026-09-29 | ok, 0 lacunas |

Estes números avançam sozinhos (commits `data: update lottery datasets` em `main`). **Sempre releia `public/data/status.json`.**

**Incidente DATA-002 (2026-09-29):** o workflow agendado `data-update.yml` falhou em 3 execuções seguidas (07:30, 10:03, 16:18 UTC) com HTTP 403 de `servicebus2.caixa.gov.br`, deixando o app oferecer o concurso errado como próximo a jogar (produção presa em 3790/3063 enquanto os concursos reais já eram 3792/3064). Causa raiz confirmada: o bloqueio é específico das máquinas do GitHub Actions (a mesma chamada, headers idênticos, funciona normalmente fora dessa rede) — não é um problema de código, header ou token, e não foi causado pelos PRs #24/#25/#26 (confirmado via diff, nenhuma mudança no caminho do updater). Dataset corrigido manualmente (commit `8312dfb`, mesmo script idempotente `scripts/data/update-dataset.mjs`, rodado de uma rede não bloqueada) e confirmado ao vivo em produção oferecendo o concurso 3793 (Lotofácil) e 3065 (Mega-Sena) como próximos a jogar. O mecanismo automático em si **continua quebrado** até uma decisão de infraestrutura ser tomada — ver `DATA-002` em `ROADMAP.md` e a issue [#23](https://github.com/rod-rms/loterias/issues/23) (mantida aberta de propósito).

## PRs abertos

Nenhum, no momento em que esta revisão foi escrita (verificado via `gh pr list`) — releia para confirmar, pois pode já ter avançado.

## Item de desenvolvimento em andamento

Nenhum.

## Próxima implementação aprovada

Nenhuma no momento (MEGA-ROLL-001, BET-002, CART-001 e BRAND-001 já estão em produção — ver acima e `ROADMAP.md`).

## Itens de pesquisa

- **RMS-201** — RMS v2.x, desempate multi-horizonte 20+50: `RESEARCH`. Nada implementado. Base: [`docs/lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md`](../lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md).
- **OBS-001** — Registro de Pesquisa Observacional: `RESEARCH / PLANNED`. Existe apenas a base de dados do BET-001; **não há painel/análise**.

## Dívida técnica conhecida, não bloqueante

TECH-001 … TECH-006 (ver `ROADMAP.md`). BRAND-001 (centralização óptica do trevo/logo) foi resolvida — ver tabela acima. **DATA-002** (atualizador automático bloqueado por IP nos runners do GitHub Actions) é conhecida e **não bloqueante para o usuário** (dado corrigido manualmente), mas segue sem solução definitiva — ver `ROADMAP.md`.

## Observações

- Arquivos locais não versionados podem existir na máquina do product owner (`Claude outputs/`, pacote bruto de auditoria, Brand Kits, DOCX, pacote antigo de gestão `docs/project-management/00_…14_*.md`). São material histórico/de referência; não os adicione ao git sem pedido explícito e não os trate como fonte de estado.
- `00_START_HERE_CLAUDE_CODE.md` é o handoff histórico da implementação original da v1 e **não** é fonte de estado atual.
