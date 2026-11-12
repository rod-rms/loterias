# Protocolo do ledger prospectivo (ANL-001)

Status: **protocolo fixo, escrito antes do início da coleta** (`DEC-026`). Alterar qualquer regra abaixo depois que a coleta começar exige uma nova decisão registrada e inicia uma nova série; os dados já coletados não são reinterpretados. Os resultados são **descritivos** (`DEC-025`, `DEC-013`): não preveem sorteios futuros.

## 1. Objetivo

Registrar, **antes** de cada sorteio, os jogos que cada estratégia do app geraria, e pontuá-los **depois** do resultado. É a única fonte de evidência (fonte C da futura página "Análise de resultados") que não pode ser reconstruída depois: o tempo é o que a produz. As fontes A (backtest histórico) e B (carteiras salvas pelo usuário) são tratadas em outros itens (ANL-002, ANL-003).

## 2. Desenho

- **5 estratégias × 6 jogos por modalidade por sorteio.** Os ids vêm do Strategy Registry (verificados em 2026-11-11):
  - Lotofácil: `lotofacil.rms_v2`, `lotofacil.max_diversification`, `lotofacil.max_coverage_11`, `lotofacil.max_coverage_12`, `lotofacil.uniform_random`.
  - Mega-Sena: `megasena.max_f4`, `megasena.max_f5`, `megasena.max_diversification`, `megasena.uniform_random`, `megasena.rolling_20_v2`.
  - `uniform_random` é o **controle empírico** (uma das cinco). A referência teórica exata (hipergeométrica) é a outra.
- **Todos os sorteios da modalidade:** Lotofácil em todos os dias de sorteio; Mega-Sena nos dias de sorteio dela. O alvo é sempre `dataset.latestContest + 1`.
- **Parâmetros fixos de geração:** `inputMode: "quantity"`, `numberOfTickets: 6`, `qualityPreset: "balanced"`, sem dezenas fixas nem excluídas. Para estratégias que só aceitam 6 jogos (RMS), vale a própria regra delas.
- **Semente determinística:** `ledger:{modalidade}:{concurso}:{strategyId}:{strategyVersion}`. Mesma entrada, mesmos jogos.
- **O código é o mesmo da interface:** a geração passa pelo Strategy Registry e pelos adaptadores que o worker de geração chama; nada é copiado nem reimplementado.

## 3. Validade ("sem look-ahead por construção")

Uma entrada só é **válida** se, ao mesmo tempo:

1. o dataset usado tinha `latestContest === alvo − 1` (sem lacuna; o alvo ainda não estava no dataset);
2. `generatedAt` é anterior ao **corte**: data/hora estimada do sorteio (`src/shared/lib/drawSchedule.ts`; dias úteis ~21h BRT, domingo ~11h BRT; BRT = UTC−3, sem horário de verão) **menos 60 minutos**;
3. a verificação ao vivo (melhor esforço) não mostrou o alvo como já publicado.

Qualquer outra situação é gravada como `valid: false` com `invalidReason` e **excluída de toda análise prospectiva**. **Nunca gerar para um concurso que já tem resultado. Nunca fazer backfill**: nada gerado depois do fato conta como prospectivo.

Limitação conhecida: o horário do sorteio vem de uma estimativa (o calendário oficial da CAIXA prevalece e pode mover sorteios; o horário real de publicação dos resultados de domingo não está confirmado, ver `DATA-002`). Por isso o corte tem margem de 60 minutos e as regras 1 e 3 são a proteção principal.

## 4. Métricas

- **Primária:** média de acertos por jogo, por estratégia.
- **Secundárias:** Lotofácil, proporção de jogos com **≥ 11** acertos; Mega-Sena, proporção de jogos com **≥ 3** acertos; melhor jogo (máximo de acertos) por carteira.
- **Referência:** distribuição hipergeométrica exata. Lotofácil: média 9,0, desvio ≈ 1,22 por jogo. Mega-Sena: média 0,6, desvio ≈ 0,70 por jogo.

## 5. Regras de análise

- Uma nova `strategyVersion` inicia uma **nova série** (não se misturam versões).
- Entradas inválidas são excluídas.
- Nenhuma entrada é editada ou apagada. Uma correção é uma **nova entrada** que referencia a antiga.
- Os 6 jogos de uma carteira são correlacionados: o tamanho efetivo da amostra é menor que o número de jogos, e os intervalos devem considerar isso (agrupar por sorteio).
- Resultados são descritivos (`DEC-025`): sempre com tamanho da amostra, intervalo de variabilidade e a referência aleatória; marcador de liderança só quando a diferença supera a incerteza declarada; aviso permanente de que não garantem nem preveem sorteios futuros.

## 6. Nota de poder estatístico (transparência)

- **Lotofácil:** detectar uma diferença de 0,1 acerto/jogo exige ≈ 2.350 jogos por estratégia (≈ 390 sorteios); 0,2 acerto/jogo ≈ 590 jogos (≈ 98 sorteios).
- **Mega-Sena:** 0,1 acerto/jogo exige ≈ 775 jogos; 0,05 ≈ 3.100.
- Os dados prospectivos da Mega-Sena serão lentos; o backtest (ANL-002) carrega essa modalidade.

## 7. Layout dos dados (somente anexação, públicos)

`public/data/` para a futura página poder ler.

- `public/data/ledger/{modalidade}/entries-AAAA-MM.json`: registros de geração **imutáveis**, divididos pelo mês da data do sorteio alvo. Cada entrada: `ledgerSchemaVersion`, `modality`, `targetContest`, `strategyId`, `strategyVersion`, `algorithmVersion` (como a estratégia registrou), `seed`, `qualityPreset`, `tickets` (6 jogos ordenados), `generatedAt` (UTC), `datasetLatestContest`, `datasetSha256` (do arquivo de resultados usado), `estimatedDrawAt` e `cutoffAt` (UTC), `valid`, `invalidReason` (se houver), `codeCommit` (`GITHUB_SHA`).
- `public/data/ledger/{modalidade}/scores-AAAA-MM.json`: pontuação **derivada** (pode ser recalculada): por `(targetContest, strategyId)`: `hitsPerTicket` (6 números), `bestHits`, `scoredAt`, `resultNumbersSha256`. Só entradas `valid: true` entram na análise; o status das inválidas também é registrado.
- Validação: `npm run ledger:validate` confere o esquema, 6 jogos distintos e ordenados no tamanho e faixa certos, ausência de duplicata `(targetContest, strategyId)` e a integridade de **somente anexação** contra o git (linhas existentes do commit anterior inalteradas).

## 8. Operação

Gerador e pontuador em `scripts/ledger/`; workflow `.github/workflows/ledger.yml` (idempotente, com chave de desligamento `LEDGER_ENABLED`, grupo de concorrência próprio, sem tocar no atualizador de dados: o `push` simples tenta de novo reaplicando o único commit novo sobre o `main` mais recente, sem conflito porque só `public/data/ledger/**` muda). Falhas de tentativa não geram entradas: é preferível nenhuma entrada a uma entrada inválida disfarçada.
