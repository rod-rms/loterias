# LotoAtlas — Estado Atual do Projeto

> Este arquivo responde: **"onde exatamente está o LotoAtlas hoje?"**
> Em caso de divergência, o estado real do GitHub (`git log`, `gh pr list`, `public/data/status.json`) prevalece — veja `HANDOFF.md`.

| Campo | Valor |
|---|---|
| Última revisão | 2026-10-20 |
| Repositório | https://github.com/rod-rms/loterias |
| Produção | https://loterias-bkr.pages.dev/ |
| `main` no momento da revisão | `67fa91d37e7573e8afd3cdb002f110909d9d5140` (tip antes do PR #36; o `main` real pode ter avançado por commits automáticos de dataset) |
| Versão em `package.json` | `1.3.0` |
| Última release estável com tag | `v1.3.0` (2026-10-19), tag anotada no commit de merge do PR de release |

## Release com tag ≠ estado atual de produção

`v1.3.0` reúne o que foi entregue desde a `v1.2.0` (marca LotoAtlas, FIX-001, BET-001, fundação de continuidade e clareza do fluxo de salvar): **MEGA-ROLL-001** (PR #15), **BET-002** (PR #17), **CART-001** (PR #20), **BRAND-001** (PR #24), a reorganização da tela de resultado (PR #30), a **RMS v2.1 / RMS-201** (PR #31, desempate determinístico e auditável, sem alegação preditiva), a correção de concurso desatualizado e correções de copy — ver `CHANGELOG.md` e a tabela abaixo. Correções internas sem superfície de UI (PR #12, #13, #14, #33) e PRs somente de documentação/pesquisa (por exemplo PR #25) também entraram.

**Observação (DEC-006):** tag e produção continuam sendo coisas separadas. Neste momento a tag `v1.3.0` aponta para o commit de merge do PR de release; a produção pode estar à frente dela apenas por commits automáticos de dataset (`data: update lottery datasets`) e por qualquer merge posterior — ambos devem ser verificados no GitHub, não assumidos. Mudanças ainda não mergeadas (por exemplo PR #29, Cloudflare Worker de contingência do atualizador) **não** fazem parte da release.

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
- **Tela de resultado reorganizada (PR #30):** em "Seus jogos estão prontos" (Lotofácil e Mega-Sena) os botões de ação (salvar, copiar, gerar outra opção, exportar, limpar) ficam logo abaixo do resumo, seguidos dos jogos; os cartões de probabilidade e a comparação com jogos aleatórios equivalentes vêm depois (a comparação não repete mais "Seus jogos: X%"). Somente apresentação.
- **RMS-201 / RMS v2.1 (PR #31, `DEC-024`):** na "Equilibrar meus 6 jogos (RMS)", empates de frequência na janela de 20 concursos na fronteira entre pools são desempatados pela frequência nos 50 concursos anteriores e, persistindo o empate, pela seed (estratégia `2.1.0`, `algorithmVersion` `rms-v2.1.0`; com menos de 50 concursos anteriores completos vale o comportamento v2.0, só seed, registrado como `rms-v2.0.0`). Decisão de determinismo/auditabilidade; o experimento não mostrou ganho em acertos e **não há alegação preditiva**.
- Atualização automática de datasets a partir da API da CAIXA (workflow agendado, com alerta por issue `data-update-failure`).
- Identidade visual LotoAtlas (dark-first, tokens `brand.*`).
- Dados pessoais somente locais; nenhuma conta, nenhum backend.

## Datasets (lidos de `public/data/status.json` em 2026-10-17)

| Modalidade | Último concurso | Data do sorteio | Status |
|---|---|---|---|
| Lotofácil | 3806 | 2026-10-16 | ok, 0 lacunas |
| Mega-Sena | 3070 | 2026-10-14 | ok, 0 lacunas |

Estes números avançam sozinhos (commits `data: update lottery datasets` em `main`). **Sempre releia `public/data/status.json`.**

**Incidente DATA-002 (2026-09-29, recorrente em 2026-10-02; segunda causa em 2026-10-18/19):** (1) o workflow agendado `data-update.yml` falhou com HTTP 403 de `servicebus2.caixa.gov.br` em 2026-09-29/30 e de novo em 2026-10-02, deixando o app, na primeira ocorrência, oferecer o concurso errado como próximo a jogar; a mesma chamada funcionava fora do GitHub Actions (bloqueio intermitente por IP do lado da CAIXA; dataset corrigido manualmente, commit `8312dfb`; alertas #23 e #28 abriram e fecharam sozinhos; execuções com sucesso de 2026-10-03 em diante). (2) Em 2026-10-18/19 o app ficou em Lotofácil 3806 / Mega-Sena 3070 com a fonte já em 3807 / 3071, **sem falha e sem alerta**: as três execuções agendadas de domingo viram 3806/3070 no endpoint "último concurso" e o atualizador trata "ainda não publicado" como "base atualizada". Causa raiz: lacuna de agenda (nenhuma execução às segundas em UTC, execuções agendadas atrasadas 2 a 4 h pelo GitHub, e nenhum domingo observado capturado durante o dia). Dataset corrigido por execução manual (commit `bf941b8`). Correção no PR #36: cobertura de segunda-feira, aviso de sorteio atrasado e diagnóstico por run. O horário real de publicação dos resultados de domingo **não está confirmado**; os novos logs vão permitir medi-lo. Contingência em PR aberto, **não implantada** (PR #29, Cloudflare Worker) — ver `DATA-002` em `ROADMAP.md`.

## PRs abertos

Um: **PR #29** (`feat(data): Cloudflare Worker for dataset updates (DATA-002)`), aberto, não mergeado e sem decisão (verificado via `gh pr list` em 2026-10-17) — releia para confirmar, pois pode já ter avançado.

## Item de desenvolvimento em andamento

Nenhum.

## Próxima implementação aprovada

Nenhuma no momento (MEGA-ROLL-001, BET-002, CART-001, BRAND-001, a reorganização da tela de resultado e RMS-201 já estão em produção — ver acima e `ROADMAP.md`).

## Itens de pesquisa

- **RMS-201** — concluído e em produção (RMS v2.1, PR #31, `DEC-024`); ver acima e `ROADMAP.md`. Base: [`docs/lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md`](../lotofacil/RMS_MULTI_HORIZON_20_50_RESEARCH.md) e [`docs/lotofacil/RMS_201_EXPERIMENT_RESULTS.md`](../lotofacil/RMS_201_EXPERIMENT_RESULTS.md).
- **OBS-001** — Registro de Pesquisa Observacional: `RESEARCH / PLANNED`. Existe apenas a base de dados do BET-001; **não há painel/análise**.

## Dívida técnica conhecida, não bloqueante

TECH-001 … TECH-006 (ver `ROADMAP.md`). BRAND-001 (centralização óptica do trevo/logo) foi resolvida — ver tabela acima. **DATA-002** (bloqueio intermitente da CAIXA a IPs do GitHub Actions) é conhecida e **não bloqueante hoje** (execuções com sucesso desde 2026-10-03), mas pode voltar e segue sem solução definitiva — ver `ROADMAP.md`.

## Observações

- Arquivos locais não versionados podem existir na máquina do product owner (`Claude outputs/`, pacote bruto de auditoria, Brand Kits, DOCX, pacote antigo de gestão `docs/project-management/00_…14_*.md`). São material histórico/de referência; não os adicione ao git sem pedido explícito e não os trate como fonte de estado.
- `00_START_HERE_CLAUDE_CODE.md` é o handoff histórico da implementação original da v1 e **não** é fonte de estado atual.
