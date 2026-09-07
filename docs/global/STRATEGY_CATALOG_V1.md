# Strategy Catalog — v1.1

## 1. Contrato genérico

Implementar conceito equivalente a:

```ts
interface StrategyDefinition {
  id: string;
  version: string;
  modality: "lotofacil" | "megasena";
  name: string;
  shortDescription: string;
  status: "active" | "experimental" | "research";
  evidence: "baseline" | "mathematical" | "structural" | "experimental";

  ticketCount: {
    mode: "fixed" | "range";
    fixed?: number;
    min?: number;
    max?: number;
  };

  supportsBudget: boolean;
  supportsFixedNumbers: boolean;
  supportsExcludedNumbers: boolean;
  supportsUserSeed: boolean;
  supportsQualityPreset: boolean;
  requiresHistoricalDraws: boolean;
  requiresTargetContest: boolean;

  optimizedMetrics: string[];
  reportedMetrics: string[];
  disclaimers: string[];
}
```

Os limites e capacidades são domínio/configuração, nunca lógica duplicada na UI.

## 2. Nomenclatura de UI

Evitar “Máxima cobertura” quando a busca não comprova ótimo global.

Usar nomes de exibição:

- `Diversificação de carteira`;
- `Otimizar cobertura 11+`;
- `Otimizar cobertura 12+`;
- `Otimizar cobertura Quadra+`;
- `Otimizar cobertura Quina+`.

IDs internos existentes podem manter `max_*` por compatibilidade, mas a UI deve usar linguagem tecnicamente defensável.

---

# 3. Lotofácil

## LF-01 — RMS v2 canônica

**ID:** `lotofacil.rms_v2`  
**Versão:** `2.0.0`  
**Status:** ativo  
**Evidência:** estrutural/auditada  
**Quantidade:** exatamente 6  
**Orçamento:** não como parâmetro de geração  
**Fixas/excluídas:** não  
**Seed do usuário:** não  
**Qualidade:** não exposta  
**Histórico:** 20 concursos anteriores  
**Concurso-alvo:** obrigatório

### Objetivo

Reproduzir fielmente a RMS v2, sem adaptar critérios silenciosamente.

### Núcleo

- pools A/B/C 15/5/5;
- janela móvel de 20 concursos apenas para classificação/rotação;
- padrões `9-3-3`, `8-3-4`, `8-4-3`, `10-2-3`, `10-3-2`, `9-4-2` ou `9-2-4`;
- exposição 10 dezenas ×3 e 15 dezenas ×4;
- interseções entre 7 e 9, alvo 8;
- paridades 5/6/7/7/8/9;
- 20–25: 2/3/3/4/4/5;
- 4–7 dezenas entre 01–09 por jogo;
- maior sequência consecutiva <=7;
- regras de 01/02 e 13/17 conforme especificação canônica.

### Falha

Se o gerador não encontrar uma carteira que cumpra as regras canônicas, **não degradar silenciosamente**. Retornar falha estruturada com as restrições não satisfeitas e sugerir outra estratégia.

### Não afirmar

- A mais provável que B/C;
- histórico aumenta chance individual;
- RMS aumenta chance de 15 acertos contra outros 6 jogos distintos.

---

## LF-02 — Diversificação de carteira

**ID:** `lotofacil.max_diversification`  
**Versão:** `1.0.0`  
**Status:** ativo  
**Evidência:** matemática  
**Quantidade:** 1–50 (hard cap v1; performance pode restringir preset profundo, não o contrato)  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** sim  
**Histórico:** não  
**Concurso:** apenas contexto

### Objetivo

Equilibrar exposição das 25 dezenas e minimizar redundância.

Para `P=15N`, `q=floor(P/25)` e `r=P-25q`, alvo de exposição:

- `r` dezenas em `q+1` jogos;
- `25-r` dezenas em `q` jogos.

Prioridade lexicográfica:

1. menor `sum C(exposure_i,2)`;
2. menor soma das interseções;
3. menor máxima interseção;
4. maior F11;
5. seed.

---

## LF-03 — Otimizar cobertura 11+

**ID:** `lotofacil.max_coverage_11`  
**Versão:** `1.0.0`  
**Quantidade:** 1–50  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** sim  
**Histórico:** não

Objetivo: maximizar a quantidade de resultados em `C(25,15)` cobertos por pelo menos um jogo com 11+.

A busca pode ser heurística; a avaliação final deve informar seu próprio status separadamente.

---

## LF-04 — Otimizar cobertura 12+

**ID:** `lotofacil.max_coverage_12`  
**Versão:** `1.0.0`  
**Quantidade:** 1–50  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** sim  
**Histórico:** não

Objetivo: maximizar cobertura 12+ diretamente.

---

## LF-05 — Aleatória distinta

**ID:** `lotofacil.uniform_random`  
**Versão:** `1.0.0`  
**Quantidade:** 1–50  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** não  
**Histórico:** não

Gerar combinações válidas, distintas e uniformes, sem filtros ocultos.

---

# 4. Mega-Sena

## MS-01 — Otimizar cobertura Quadra+

**ID:** `megasena.max_f4`  
**Versão:** `1.0.0`  
**Quantidade:** 1–100  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** sim  
**Histórico:** não

Adapter usa `objective: "quadra_or_better"`.

A avaliação F4 pode ser estimada acima do limite exato do motor. Preservar status.

---

## MS-02 — Otimizar cobertura Quina+

**ID:** `megasena.max_f5`  
**Versão:** `1.0.0`  
**Quantidade:** 1–100  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** sim  
**Histórico:** não

Adapter usa `objective: "quina_or_better"`.

---

## MS-03 — Diversificação de carteira

**ID:** `megasena.max_diversification`  
**Versão:** `1.0.0`  
**Quantidade:** 1–100  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** sim  
**Histórico:** não

Para `P=6N`, `q=floor(P/60)` e `r=P-60q`, alvo de exposição:

- `r` dezenas em `q+1` jogos;
- `60-r` dezenas em `q` jogos.

Prioridade:

1. menor `sum C(exposure_i,2)`;
2. menor soma das interseções;
3. menor maior-interseção;
4. maior F4 como desempate;
5. seed.

Não afirmar aumento de Sena.

---

## MS-04 — Aleatória distinta

**ID:** `megasena.uniform_random`  
**Versão:** `1.0.0`  
**Quantidade:** 1–100  
**Orçamento:** sim  
**Fixas/excluídas:** sim  
**Seed:** sim  
**Qualidade:** não  
**Histórico:** não

Gerar jogos uniformes, distintos e válidos.

---

# 5. Popularidade/rateio

Não é estratégia ativa na v1.

Mega-Sena pode exibir features experimentais somente em detalhes avançados e desligadas por padrão. Nenhum score ou probabilidade deve ser inventado.

Lotofácil Crowd Score permanece fora da v1.

# 6. Baseline

A baseline teórica/controle aleatório é uma métrica de comparação, não uma estratégia selecionada implicitamente.

A estratégia `uniform_random` gera uma carteira concreta. A baseline representa a média teórica ou controle compatível.

# 7. Inclusão futura

Nova estratégia ativa exige:

- objetivo definido;
- algoritmo reproduzível;
- invariantes/testes;
- baseline equivalente;
- linguagem permitida/proibida;
- versão;
- limitações documentadas.
