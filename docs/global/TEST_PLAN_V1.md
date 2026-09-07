# Test Plan — v1.1

## 1. Ferramentas

- Vitest;
- Testing Library;
- Playwright;
- fixtures/oráculos Python Mega-Sena preservados.

## 2. Unitários

- combinatória;
- canonicalização;
- validação;
- seeds;
- cobertura;
- overlap;
- baseline;
- registry;
- adapters;
- presets;
- data adapters;
- migrations;
- backup/importação;
- conferência.

## 3. Integração

- estratégia → adapter → domínio → envelope;
- Worker → adapter;
- dataset → RMS sem look-ahead;
- save/load IndexedDB;
- migration;
- backup export/import;
- baseline equivalente;
- restrições → máximo de combinações.

## 4. UI

- troca modalidade;
- troca estratégia altera campos;
- RMS fixa 6;
- orçamento calcula N/custo/saldo;
- orçamento acima do cap é erro, não cap silencioso;
- fixas/excluídas mutuamente exclusivas;
- seed gerada quando ausente;
- Nova variação muda seed;
- Reproduzir mantém seed;
- status busca vs avaliação visíveis;
- baseline diferente de Aleatória distinta;
- estratégias incompatíveis não aparecem em comparação.

## 5. E2E

1. Lotofácil → RMS → gerar 6 → salvar → reload → persistir;
2. Lotofácil → Aleatória → N + seed → duas gerações idênticas;
3. Lotofácil → orçamento → custo/saldo corretos;
4. Lotofácil → fixas/excluídas → validação de viabilidade;
5. Mega F4 N=7 → métricas/baseline;
6. Mega F5 com restrições;
7. comparar duas estratégias compatíveis;
8. tentar comparar RMS com N !=6 → indisponível com motivo;
9. conferir carteira salva;
10. exportar/importar backup;
11. apagar dados locais com confirmação.

## 6. Mega regressão

Preservar todos os testes do handoff, incluindo:

- 50.063.860;
- K4/K5/K6;
- carteiras referência;
- baseline N=7;
- F6 invariance;
- relabeling;
- bigint;
- seed.

## 7. Lotofácil regressão

- 3.268.760;
- contagens 11–15;
- baseline fórmula;
- RMS fixture 3780;
- 15 interseções =8 na fixture;
- exposição 10x3 +15x4;
- coberturas;
- pools 3760–3779;
- empates;
- nenhum acesso ao draw alvo durante geração.

## 8. Property tests

- ordem das dezenas não altera chave;
- ordem dos jogos não altera métricas;
- probabilidades [0,1];
- F11>=...>=F15;
- Mega F4>=F5>=F6;
- mesmo N distinto → mesmo jackpot;
- mesma seed → mesma geração;
- restrições respeitadas;
- `N <= C(total-f-e, size-f)`.

## 9. Performance

Benchmark em navegador real.

Metas de UX, não garantias matemáticas:

- validação/formulário: resposta imediata;
- Worker não bloqueia UI;
- etapa longa informa estágio;
- listas grandes usam virtualização/paginação.

Registrar benchmarks por preset e N.

## 10. Dados

Testar:

- duplicata;
- faixa inválida;
- quantidade errada;
- lacuna RMS;
- JSON inválido;
- atualização falha mantendo snapshot;
- `latestContest` inconsistente;
- config de preço inválida.
