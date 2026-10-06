# lottery-data-updater (Cloudflare Worker)

Substitui o cron do GitHub Actions para atualização dos datasets das loterias.
CAIXA bloqueia IPs do GitHub Actions intermitentemente; Cloudflare (GRU) não é bloqueado.

**Confirmado em 2026-10-02:** status 200, cfColo: GRU, 153ms.

## Estrutura

```
workers/lottery-data-updater/
├── worker.js        # Worker completo (ES modules)
├── wrangler.toml    # 3 cron triggers + metadata
└── README.md        # Este arquivo
```

## Pré-requisitos

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) instalado: `npm install -g wrangler`
- Conta Cloudflare autenticada: `wrangler login`
- Fine-grained PAT do GitHub (veja abaixo)

## 1. Criar o GitHub PAT

1. Acesse: https://github.com/settings/tokens?type=beta
2. **Generate new token (fine-grained)**
3. Configurações:
   - **Resource owner:** rod-rms
   - **Repository access:** Only selected repositories → `rod-rms/loterias`
   - **Permissions:**
     - Contents: **Read and Write**
     - Issues: **Read and Write**
4. Copie o token gerado (começa com `github_pat_...`)

## 2. Adicionar o secret no Worker

```bash
cd workers/lottery-data-updater
wrangler secret put GITHUB_TOKEN
# Cole o token quando solicitado
```

## 3. Deploy

```bash
cd workers/lottery-data-updater
wrangler deploy
```

## 4. Verificar os cron triggers

No Cloudflare Dashboard → Workers & Pages → `lottery-data-updater` → Settings → Triggers.
Devem aparecer 3 crons:
- `0 2 * * 2-6`   — 23:00 BRT Seg-Sex (intermediário)
- `15 10 * * 2-6` — 07:15 BRT Ter-Sáb (fallback final)
- `15 23 * * 0`   — 20:15 BRT Domingo (fallback final)

Esses horários estão deslocados +15min dos crons equivalentes no GitHub Actions
(`data-update.yml`) de propósito — veja a seção "GitHub Actions — período de
transição" abaixo.

## 5. Testar manualmente

```bash
# Disparo manual via Cloudflare dashboard:
# Workers & Pages → lottery-data-updater → Triggers → Cron Triggers → Test
```

Ou via HTTP (requer o mesmo GITHUB_TOKEN como Authorization):
```bash
curl -H "Authorization: Bearer <GITHUB_TOKEN>" \
  https://lottery-data-updater.<seu-subdominio>.workers.dev/trigger
```

## Lógica de schedule

| Cron | BRT | Tipo | Comportamento |
|------|-----|------|---------------|
| `0 2 * * 2-6`   | 23:00 Seg-Sex | Intermediário | Não persiste `lastCheckedAt` se não houver novo concurso |
| `15 10 * * 2-6` | 07:15 Ter-Sáb | **Fallback final** | Sempre persiste `lastCheckedAt` |
| `15 23 * * 0`   | 20:15 Dom | **Fallback final** | Sempre persiste `lastCheckedAt` |

## Alertas

Abre (ou comenta em) uma GitHub Issue com label `data-update-failure` quando:
- a verificação da fonte oficial (CAIXA) falha para alguma modalidade, OU
- o commit das mudanças no GitHub falha (conflito de ref, token expirado, erro de API).

Em qualquer um dos dois casos o alerta dispara — uma falha de commit não passa
em branco silenciosamente. Sucesso fecha qualquer issue aberta com esse label.

## Segurança contra leitura inconsistente do estado atual

Antes de buscar qualquer dado novo na CAIXA, o Worker lê o estado atual
(`results.json` de cada modalidade + `status.json`) via `raw.githubusercontent.com`.
Se essa leitura falhar por qualquer motivo que não seja um 404 genuíno (erro 5xx,
timeout, etc.), o Worker **aborta a execução sem escrever nada e sem consultar a
CAIXA** — nunca assume "o arquivo não existe" quando na verdade só não conseguiu
ler. Isso evita que uma instabilidade passageira do CDN do GitHub dispare uma
reconstrução completa do histórico (milhares de requisições à CAIXA) ou sobrescreva
um dataset bom com um incompleto.

## GitHub Actions — período de transição

Os crons do `.github/workflows/data-update.yml` **permanecem ativos** como rede de
segurança enquanto este Worker não tiver pelo menos 2-3 execuções agendadas reais
com sucesso em produção (verificar logs no Cloudflare Dashboard + commits
`chore(data): update ... [skip ci]` aparecendo no repositório).

Os crons do Worker (acima) são deslocados +15min dos horários do GitHub Actions
de propósito, para que os dois sistemas nunca leiam-e-commitem ao mesmo tempo
durante essa validação. Isso pode ficar assim indefinidamente — uma vez que os
crons do GitHub Actions forem removidos, não há mais nada para colidir.

Só depois dessa validação os crons do GitHub Actions devem ser removidos
(mantendo apenas `workflow_dispatch` como fallback manual), em um commit
separado, com aprovação explícita.
