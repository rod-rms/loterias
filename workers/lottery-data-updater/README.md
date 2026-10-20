# lottery-data-updater (Cloudflare Worker) — contingência

Atualizador **alternativo** dos datasets das loterias, para o caso de a CAIXA bloquear os IPs do GitHub Actions
(`DATA-002`). O workflow `.github/workflows/data-update.yml` continua sendo o atualizador **principal** e não é
alterado por este Worker. Cloudflare (colo GRU) **não foi bloqueado** quando testado em 2026-10-02 (status 200,
153 ms, endpoint da Lotofácil; a Mega-Sena usa a mesma origem e não foi testada isoladamente).

**Estado: mergeado no repositório, mas NÃO implantado.** Enquanto você não rodar o `wrangler deploy` abaixo,
nada deste código executa em lugar nenhum.

## Estrutura

```
workers/lottery-data-updater/
├── worker.js        # Worker completo (ES modules, sem dependências)
├── wrangler.toml    # 4 cron triggers + metadata
└── README.md        # Este arquivo
```

## Antes de implantar (leia isto primeiro)

1. **Limite de CPU do plano Free (provável problema).** Segundo a documentação de limites da Cloudflare
   (consultada em 2026-10-20), cada execução de Cron Trigger tem **10 ms de CPU no plano Free** e 30 s no plano Paid.
   O Worker lê e converte em JSON os datasets completos (~1 MB a Lotofácil, ~0,5 MB a Mega-Sena) e, quando há commit,
   serializa e codifica em base64 os arquivos alterados. Medição aproximada em Node neste repositório (não é a
   medição real do Workers): só ler e fazer parse dos 3 arquivos ≈ **7 ms**; um commit com os dois datasets soma
   ≈ **60 ms**, dominado pelo base64. **Em execuções com commit o plano Free provavelmente estoura o limite.**
   Opções: usar o plano Paid; ou aprovar uma otimização do Worker (blob em UTF-8 sem base64, evitar reserializar
   o arquivo inteiro). Para saber ao certo: depois do deploy use o botão **Test** do cron e procure no log
   (Real-time Logs) por erro de limite de CPU.
2. **Cron Triggers.** O plano Free permite **5 por conta** (documentação de limites). Este Worker usa 4. Se a conta
   já tiver outros Workers com cron, ajuste a lista em `wrangler.toml`.
3. **O PAT expira.** Defina a data de expiração ao criá-lo e crie um lembrete. Com o PAT vencido, o commit falha e o
   próprio alerta por issue também falha (só aparece no log do Worker): o alerta de "sorteio atrasado" do
   repositório (feito pelo workflow principal) continua sendo a rede de segurança.

## Passo a passo do deploy (você faz manualmente)

1. **Criar o PAT** (GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token):
   - Resource owner: `rod-rms`; Repository access: **Only selected repositories → `rod-rms/loterias`**;
   - Permissions: **Contents: Read and write** e **Issues: Read and write** (nada além disso);
   - defina expiração. Copie o token (`github_pat_...`). Nunca o coloque em arquivo nem no repositório.
2. **Instalar e autenticar o wrangler** (uma vez): `npm install -g wrangler` e `wrangler login`.
3. **Guardar o PAT como secret do Worker:**
   ```bash
   cd workers/lottery-data-updater
   wrangler secret put GITHUB_TOKEN
   # cole o token quando solicitado
   ```
4. **Implantar:**
   ```bash
   cd workers/lottery-data-updater
   wrangler deploy
   ```
5. **Conferir os cron triggers** (Cloudflare Dashboard → Workers & Pages → `lottery-data-updater` → Settings →
   Triggers). Devem aparecer exatamente 4:
   - `0 2 * * 1-6`
   - `15 10 * * 1-6`
   - `15 15,19 * * 1`
   - `15 23 * * 0`
6. **Testar:** no dashboard, Triggers → Cron Triggers → **Test** (prefira isto a chamar `/trigger`, que exige colar o
   PAT em um `curl`). Nos logs devem aparecer `=== lottery-data-updater START ...`, as linhas
   `latest endpoint response`/`latest payload`/`overdue check` e `=== ... END anyCheckFailed=false ...`.
   Se a base já estiver atualizada: "Nothing to commit this run." (ou só um commit de `status.json` nos crons de
   fallback final).
7. **Acompanhar** pelo menos 2–3 execuções agendadas reais com sucesso (logs + commits `chore(data): update ...`
   no repositório) antes de considerar remover qualquer cron do GitHub Actions. Isso é uma decisão separada.

Se quiser desfazer: `wrangler delete` remove o Worker e os crons. O spike descartável
(`caixa-spike-worker-DISPOSABLE`) pode ser apagado no dashboard.

## Cronograma

Mesmos dias/horas do workflow principal, **+15 min de propósito** (para os dois sistemas não lerem e commitarem no
mesmo minuto). Tudo é idempotente.

| Cron (UTC) | BRT | Tipo | Equivalente no Actions |
|------|-----|------|------|
| `0 2 * * 1-6`     | 23:00 Dom–Sex | Intermediário | 01:45 e 03:30 UTC Seg–Sáb |
| `15 10 * * 1-6`   | 07:15 Seg–Sáb | **Fallback final** | 10:00 UTC Seg–Sáb |
| `15 15,19 * * 1`  | 12:15 e 16:15 Segunda | Intermediário | 15:00 e 19:00 UTC Segunda |
| `15 23 * * 0`     | 20:15 Domingo | **Fallback final** | 23:00 UTC Domingo |

O que se sabe: há sorteios também aos domingos e às segundas, e o calendário oficial pode mover um sorteio. O que
**não** se sabe: a hora em que a CAIXA publica o resultado de domingo. O histórico do repositório (ROADMAP,
`DATA-002`) mostra resultados de domingo nunca capturados durante o dia de domingo; por isso o cronograma não
assume nada sobre isso e cobre a noite de domingo e a segunda inteira.

Crons de **fallback final** (`15 10 * * 1-6` e `15 23 * * 0`) sempre persistem `lastCheckedAt`; os intermediários
não fazem commit de `status.json` quando nada mudou. Esta lista precisa ficar igual a `FINAL_FALLBACK_CRONS` em
`worker.js` (um teste confere).

## Alertas (GitHub Issues, label `data-update-failure`)

- **Falha** (fonte da CAIXA falhou para alguma modalidade, leitura do estado do repositório falhou, ou commit
  falhou): abre ou comenta na issue. Uma execução limpa e sem atraso fecha a issue.
- **Sorteio atrasado:** se a data do próximo sorteio informada pela fonte (`dataProximoConcurso`) já passou da
  margem (dia seguinte às 14:00 BRT) e o último concurso não avançou, abre ou comenta na issue, **no máximo uma vez a
  cada 12 h**. O texto diz que o resultado pode ainda não ter sido publicado, que o calendário oficial pode ter
  movido o sorteio ou que pode haver problema no atualizador/fonte, e não afirma falha da CAIXA. A execução em si
  não é tratada como falha, e uma execução atrasada **não** fecha a issue. A regra e o texto são cópias idênticas de
  `scripts/data/overdue.mjs` e `scripts/data/overdue-alert.cjs` (blocos marcados; um teste falha se divergirem).
- Se o próprio token estiver inválido, o alerta também não consegue ser criado (fica só no log do Worker).

## Corrida com o GitHub Actions

O commit usa a Git Data API e o update do ref **não é forçado**: se `main` mudou depois de o Worker ler o HEAD,
o GitHub recusa (HTTP 422, "not a fast forward"), nada é gravado e **não é aberto incidente**. O Worker espera 5 s
e refaz a verificação inteira uma vez com o estado novo (leitura com query string única para driblar o cache do
`raw.githubusercontent.com`): se o outro atualizador já gravou os mesmos concursos, o Worker encontra "já
atualizado" e termina sem commit redundante. Só se `main` mudar de novo na segunda tentativa é aberto um alerta.
Erros 4xx determinísticos (por exemplo 422 ou 401) não são repetidos.

## Segurança contra leitura inconsistente do estado atual

Antes de buscar qualquer dado na CAIXA, o Worker lê o estado atual (`results.json` de cada modalidade +
`status.json`) via `raw.githubusercontent.com`. Se a leitura falhar por qualquer motivo que não seja um 404
genuíno, o Worker **aborta sem escrever nada e sem consultar a CAIXA** e abre o alerta de falha. Isso evita
reconstruir o histórico inteiro ou sobrescrever um dataset bom com um incompleto.

## Diagnóstico nos logs

Cada execução registra, por modalidade, no mesmo formato do script do Actions: status, `Date`, `Age` e
`Cache-Control` da resposta do endpoint "último concurso"; `numero`, `dataApuracao`, `dataProximoConcurso`,
`numeroConcursoProximo`; a linha `overdue check`; e uma linha UTC `first seen` para cada concurso novo. Servem para
medir o atraso real de publicação e comparar Actions × Worker. Nenhum cookie nem token é registrado.

## Mensagens de commit

`chore(data): update <modalidades> dataset` (sem `[skip ci]`). Atenção: o histórico do repositório mostra que a marca
`[skip ci]` foi removida da mensagem do atualizador do Actions (`3c98599`), provavelmente porque ela também pode
fazer o Cloudflare Pages pular o deploy que publica os dados. Como o commit do Worker usa um PAT, o CI do GitHub roda
nesses commits (alguns minutos de Actions por commit); isso é inofensivo.

## Relação com o workflow do GitHub Actions

`.github/workflows/data-update.yml` permanece como atualizador principal, com seus crons, e **não é modificado**
por este Worker. Remover crons do Actions só depois de o Worker ter várias execuções agendadas reais com sucesso,
em commit separado e com aprovação explícita.
