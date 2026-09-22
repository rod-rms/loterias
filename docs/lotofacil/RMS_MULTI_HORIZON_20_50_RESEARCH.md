# RMS v2.x — Desempate multi-horizonte 20+50 (base de pesquisa)

**Status: RESEARCH — NOT IMPLEMENTED — NOT APPROVED FOR IMPLEMENTATION YET.**
Item de roadmap: `RMS-201` (`docs/project-management/ROADMAP.md`). Nenhum código da RMS foi alterado; a RMS v2 em produção continua usando somente a janela de 20 concursos (`DEC-015`); trocar 20 por 50 **não** está aprovado (`DEC-016`).

Este memorando existe para que o raciocínio por trás do RMS-201 não dependa de conversas de chat. As cifras abaixo foram **reproduzidas de forma independente** a partir do dataset do repositório, com no-look-ahead estrito.

## 1. Hipótese candidata

Pools RMS (ver `LOTOFACIL_DOMAIN_SPEC_V1.md` §9): A = 15 primeiras, C = posições 16–20, B = posições 21–25 do ranking de frequência da janela. Hoje, empates de fronteira (A/C na posição 15|16 e C/B em 20|21) são resolvidos por seed.

Regra candidata "20+50":
1. ranking primário: frequência em `T-20 … T-1`;
2. **somente se** as frequências primárias empatarem: frequência em `T-50 … T-1`;
3. empate remanescente: desempate determinístico por seed.

**Equivalência.** Se dois números têm a mesma frequência em `T-20 … T-1`, comparar suas frequências totais em `T-50 … T-1` equivale a compará-los apenas em `T-50 … T-21` (os 30 concursos anteriores à janela curta), pois a parcela comum se cancela. Logo os 20 últimos concursos permanecem **soberanos**: a janela de 50 nunca reordena números com frequências diferentes nos 20 últimos; ela só substitui o sorteio arbitrário por seed dentro de um empate.

## 2. Método (reprodutível)

- Dataset: `public/data/lotofacil/results.json`, concursos 1–3783 (`latestContest=3783`), SHA-256 `eefbf200753ee6ce2778f6d598eaedbe19fb0a94e14d6a234d435159ab4ba6f2`. O dataset avança com o tempo; os números abaixo são deste snapshot.
- Alvos comuns: concursos **51 a 3783, N = 3.733** (50 concursos anteriores existem para todos).
- Para cada alvo `T`, usar **somente** `T-w … T-1` (`w` = 20 ou 50). O resultado de `T` é usado apenas depois, para medir a pertença.
- Modelos: **A)** RMS-20; **B)** RMS-50 puro; **C)** RMS-20 primário + RMS-50 só como desempate secundário.
- Empates restantes: em vez de sorteios de seed (ruidosos), calcula-se a **esperança exata** sob uma permutação uniforme dentro de cada grupo empatado (probabilidade de cada número cair em A/C/B = fração das posições do grupo que caem no pool). Equivale à média sobre infinitos seeds.
- Métricas: média de dezenas do sorteio seguinte em A, B e C; taxa de empate atravessando cada fronteira; estabilidade do pool entre alvos consecutivos (membros retidos esperados, tie-breaks independentes).
- O script completo está no Apêndice.

## 3. Resultados reproduzidos

Referência combinatória (15 dezenas sorteadas de 25, pools 15/5/5): **9 / 3 / 3**.

Média de dezenas do sorteio seguinte em cada pool (B = posições 21–25, C = 16–20):

| Modelo | A (15) | B (5) | C (5) |
|---|---:|---:|---:|
| RMS-20 | 8,9963 | 3,0252 | 2,9785 |
| RMS-50 | 9,0097 | 2,9960 | 2,9942 |
| RMS 20+50 (desempate) | 8,9950 | 3,0246 | 2,9804 |

Taxa de empate atravessando a fronteira (fração dos 3.733 alvos):

| Modelo | A/C (15\|16) | C/B (20\|21) |
|---|---:|---:|
| RMS-20 | 72,06% | 68,90% |
| RMS-50 | 65,93% | 56,71% |
| RMS 20+50 (após o desempate secundário) | 16,66% | 13,26% |

Estabilidade: membros esperados retidos de um alvo para o seguinte (3.732 transições):

| Modelo | A (de 15) | C (de 5) | B (de 5) |
|---|---:|---:|---:|
| RMS-20 | 13,51 | 2,60 | 3,87 |
| RMS-50 | 13,99 | 3,28 | 4,25 |
| RMS 20+50 | 13,73 | 2,87 | 4,03 |

Conferência com os valores de referência informados previamente: **todos coincidem** dentro do arredondamento (a estabilidade do 20+50 não tinha referência prévia).

## 4. Interpretação (conservadora)

- Todas as médias A/B/C do sorteio seguinte ficam praticamente no baseline combinatório 9/3/3 (desvios de ordem de 0,01–0,03). **Isto não é evidência de vantagem preditiva.**
- O resultado interessante é estrutural: o desempate por 50 concursos reduz o empate residual de fronteira de ~72%/69% para ~17%/13% e aumenta a estabilidade do pool, mantendo a janela de 20 como critério soberano.
- RMS-50 puro também é mais estável, mas troca a identidade da estratégia (janela curta) — **não aprovado**.
- Nada aqui autoriza alegar melhora de previsão ou de premiação.

## 5. Experimento exigido antes de qualquer implementação

Comparar **RMS-20 atual × RMS-50 puro × RMS 20+50 (desempate)** com:

- o mesmo conjunto histórico de alvos;
- no-look-ahead estrito;
- seeds controladas;
- carteiras completas de seis jogos (restrições duras da RMS v2 intactas);
- distribuições de 11/12/13/14/15 acertos;
- melhor jogo por carteira;
- comportamento estrutural J1–J6 / padrões A-B-C;
- estabilidade do pool;
- frequência de empates de fronteira;
- baselines relevantes (ex.: carteira aleatória equivalente).

O experimento deve ser documentado e a decisão registrada em `DECISIONS.md` antes de qualquer código. Enquanto isso, a RMS v2 fica inalterada.

## Apêndice — script de reprodução

```js
// Exploratory RMS pool-ranking study (reproducible, no repo deps).
// Usage: node rms-study.mjs <path to public/data/lotofacil/results.json>
import fs from "node:fs";
import crypto from "node:crypto";

const path = process.argv[2];
const raw = fs.readFileSync(path);
const data = JSON.parse(raw);
const draws = data.draws;
const byContest = new Map(draws.map((d) => [d.contest, d.numbers]));
const first = draws[0].contest, last = draws[draws.length - 1].contest;
for (let c = first; c <= last; c++) if (!byContest.has(c)) throw new Error("gap " + c);
const sha = crypto.createHash("sha256").update(raw).digest("hex");

// window frequency for contests T-w .. T-1 (strictly before T)
function freq(T, w) {
  const f = new Array(26).fill(0);
  for (let c = T - w; c <= T - 1; c++) for (const n of byContest.get(c)) f[n]++;
  return f;
}
// Ranks 25 numbers by key (array of numbers, lexicographic desc). Returns for each number the
// EXACT probability of landing in pool A (positions 0..14), C (15..19), B (20..24) when ties
// are broken by a uniformly random permutation, plus whether ties straddle each boundary.
function pools(keys) {
  const idx = Array.from({ length: 25 }, (_, i) => i + 1);
  const cmp = (a, b) => {
    const ka = keys[a], kb = keys[b];
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return 0;
  };
  idx.sort(cmp);
  const p = {}; // p[n] = [A, C, B]
  let ac = false, cb = false;
  let i = 0;
  while (i < 25) {
    let j = i;
    while (j + 1 < 25 && cmp(idx[i], idx[j + 1]) === 0) j++;
    const size = j - i + 1;
    const ov = (lo, hi) => Math.max(0, Math.min(j, hi) - Math.max(i, lo) + 1);
    const pa = ov(0, 14) / size, pc = ov(15, 19) / size, pb = ov(20, 24) / size;
    for (let k = i; k <= j; k++) p[idx[k]] = [pa, pc, pb];
    if (i < 15 && j >= 15) ac = true;
    if (i < 20 && j >= 20) cb = true;
    i = j + 1;
  }
  return { p, ac, cb };
}
const models = {
  "RMS-20": (T) => { const f = freq(T, 20); return Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, [f[i + 1]]])); },
  "RMS-50": (T) => { const f = freq(T, 50); return Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, [f[i + 1]]])); },
  "RMS 20+50": (T) => { const f = freq(T, 20), g = freq(T, 50); return Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, [f[i + 1], g[i + 1]]])); },
};
const firstT = first + 50, lastT = last; // common targets: 51..latest (needs 50 prior contests)
const N = lastT - firstT + 1;
const out = { dataset: { sha256: sha, first, last, latestContest: data.latestContest }, targets: { first: firstT, last: lastT, n: N }, models: {} };
for (const [name, fn] of Object.entries(models)) {
  let mA = 0, mC = 0, mB = 0, tieAC = 0, tieCB = 0;
  let retA = 0, retC = 0, retB = 0, retN = 0, prev = null;
  for (let T = firstT; T <= lastT; T++) {
    const { p, ac, cb } = pools(fn(T));
    const draw = byContest.get(T);
    for (const n of draw) { mA += p[n][0]; mC += p[n][1]; mB += p[n][2]; }
    if (ac) tieAC++;
    if (cb) tieCB++;
    if (prev) { // expected retained members between consecutive targets, independent tie-breaks
      let a = 0, c = 0, b = 0;
      for (let n = 1; n <= 25; n++) { a += prev[n][0] * p[n][0]; c += prev[n][1] * p[n][1]; b += prev[n][2] * p[n][2]; }
      retA += a; retC += c; retB += b; retN++;
    }
    prev = p;
  }
  out.models[name] = {
    meanNextDraw: { A: mA / N, C: mC / N, B: mB / N },
    boundaryTieRate: { "A/C": tieAC / N, "C/B": tieCB / N },
    stability: { A: retA / retN, C: retC / retN, B: retB / retN, transitions: retN },
  };
}
console.log(JSON.stringify(out, null, 2));
```

Execução: `node rms-study.mjs public/data/lotofacil/results.json` (Node 18+, sem dependências).
