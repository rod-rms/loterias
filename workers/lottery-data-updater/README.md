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
- `45 1 * * 2-6`  — 22:45 BRT Seg-Sex (intermediário)
- `0 10 * * 2-6`  — 07:00 BRT Ter-Sáb (fallback final)
- `0 23 * * 0`    — 20:00 BRT Domingo (fallback final)

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
| `45 1 * * 2-6` | 22:45 Seg-Sex | Intermediário | Não persiste `lastCheckedAt` se não houver novo concurso |
| `0 10 * * 2-6` | 07:00 Ter-Sáb | **Fallback final** | Sempre persiste `lastCheckedAt` |
| `0 23 * * 0`  | 20:00 Dom | **Fallback final** | Sempre persiste `lastCheckedAt` |

## Alertas

Falhas abrem (ou comentam em) uma GitHub Issue com label `data-update-failure`.
Sucesso fecha qualquer issue aberta com esse label.

## GitHub Actions — período de transição

Os crons do `.github/workflows/data-update.yml` **permanecem ativos** como rede de
segurança enquanto este Worker não tiver pelo menos 2-3 execuções agendadas reais
com sucesso em produção (verificar logs no Cloudflare Dashboard + commits
`chore(data): update ... [skip ci]` aparecendo no repositório).

Só depois dessa validação os crons do GitHub Actions devem ser removidos
(mantendo apenas `workflow_dispatch` como fallback manual), em um commit
separado, com aprovação explícita.
