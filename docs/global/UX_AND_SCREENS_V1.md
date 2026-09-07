# UX & Screens — v1.1

## 1. Rotas

```text
/
/lotofacil
/lotofacil/gerar
/lotofacil/carteiras
/lotofacil/metodologia
/megasena
/megasena/gerar
/megasena/carteiras
/megasena/metodologia
/carteiras
/sobre
```

“Carteiras” é o termo para histórico pessoal; evitar chamar isso de “histórico” quando puder ser confundido com histórico de sorteios.

## 2. Home

- nome do produto;
- “construa e compare carteiras; não é previsão”;
- cards Lotofácil / Mega-Sena;
- acesso a Minhas carteiras;
- Metodologia;
- aviso discreto 18+ / jogo responsável.

## 3. Shell

### Desktop

- marca/nome;
- switch Lotofácil ↔ Mega-Sena;
- Gerar;
- Minhas carteiras;
- Metodologia;
- indicador “dados atualizados até concurso X”.

### Mobile

- header compacto;
- switch;
- navegação inferior ou menu acessível.

## 4. Tela Gerar

### A — Estratégia

Cards com:

- nome;
- descrição curta;
- badge de evidência;
- “Otimiza”;
- “Não altera”;
- quantidade suportada;
- necessidade ou não de histórico;
- link “Como funciona”.

Não usar ranking “melhor/pior”.

### B — Quantidade / orçamento

Toggle somente quando a estratégia suporta orçamento.

Em orçamento mostrar:

- orçamento;
- custo unitário;
- N calculado;
- custo utilizado;
- saldo remanescente.

RMS:

```text
Quantidade de jogos: 6 [bloqueado]
A RMS v2 foi definida e auditada como uma carteira de 6 jogos.
Custo da carteira: ...
```

### C — Concurso

- sugerir próximo concurso com base no snapshot;
- mostrar último concurso disponível;
- estratégias não históricas usam concurso apenas como contexto;
- RMS exige 20 concursos anteriores;
- não usar o resultado do concurso-alvo para geração.

### D — Opções avançadas

Conforme capacidades:

- dezenas fixas;
- dezenas excluídas;
- seed;
- qualidade: Rápida / Equilibrada / Profunda;
- popularidade experimental Mega-Sena.

Fixas/excluídas devem usar seletor visual de dezenas. Uma dezena não pode estar simultaneamente nas duas listas.

Ao alterar estratégia, parâmetros incompatíveis são limpos somente após aviso.

### E — Resumo antes de gerar

Sempre exibir:

- modalidade;
- estratégia;
- N;
- custo;
- concurso;
- restrições ativas;
- qualidade, se aplicável.

CTA: `Gerar carteira`.

## 5. Validação

Antes do Worker:

- faixa e unicidade das dezenas;
- conflito fixas/excluídas;
- número de fixas;
- quantidade de dezenas disponíveis;
- máximo de combinações distintas possível sob restrições;
- N e orçamento;
- histórico mínimo RMS.

Nunca ajustar restrição silenciosamente.

## 6. Processamento

Etapas reais, sem percentual fictício:

- Preparando candidatos;
- Otimizando;
- Avaliando cobertura;
- Auditando carteira.

Permitir cancelar quando tecnicamente possível.

## 7. Resultado

### Resumo

- estratégia + versão;
- N;
- custo;
- concurso;
- seed;
- preset;
- “Busca: heurística/exata/etc.”;
- “Avaliação: exata/estimada/etc.”.

### Jogos

J1...JN em ordem.

Se N for alto, usar paginação/virtualização para evitar DOM excessivo.

Ações:

- copiar jogo;
- copiar todos;
- salvar;
- CSV;
- JSON;
- **Nova variação**;
- **Reproduzir carteira**.

### Lotofácil

- F11, F12, F13, F14, F15;
- nenhum 11+;
- exposição das 25 dezenas;
- interseção média/máxima/histograma;
- baseline equivalente.

### Mega-Sena

- F4;
- F5;
- F6/Sena;
- nenhum Quadra+;
- esperado de bilhetes exatos por faixa;
- overlap;
- baseline;
- status exato/estimado.

### Baseline

Rotular:

> Média teórica/controle de carteiras aleatórias equivalentes

Não confundir com “Aleatória distinta”, que é uma carteira concreta.

## 8. Comparação

Ação: `Comparar com outra estratégia`.

Exibir somente estratégias compatíveis com:

- mesma modalidade;
- mesmo N;
- mesmas restrições;
- dados históricos necessários.

RMS só aparece se N=6 e configuração compatível.

Comparar:

- custo;
- cobertura;
- overlap;
- exposição;
- método;
- diferenças absolutas;
- limitações.

No máximo duas carteiras lado a lado na v1.

## 9. Minhas carteiras

Filtros:

- modalidade;
- concurso;
- estratégia;
- apostada;
- conferida.

Ações:

- abrir;
- marcar/desmarcar apostada;
- adicionar observação;
- conferir;
- exportar;
- excluir.

## 10. Backup

Em Configurações/Minhas carteiras:

- Exportar backup;
- Importar backup;
- Apagar todos os dados locais.

Ações destrutivas exigem confirmação explícita.

## 11. Conferência

- resultado oficial/snapshot;
- acertos destacados sem depender só de cor;
- acertos por jogo;
- maior pontuação;
- salvar `checkedResult`.

## 12. Metodologia

Tópicos:

- equiprobabilidade;
- aposta simples/elementar;
- cobertura vs previsão;
- aleatória concreta vs baseline;
- sobreposição;
- RMS;
- F4/F5;
- busca heurística;
- exato vs estimado;
- rateio experimental;
- jogo responsável.

## 13. Visual

- analítico e moderno;
- identidade própria;
- modalidade diferenciada por acento, não por cópia da CAIXA;
- números como chips funcionais;
- tema claro obrigatório;
- dark mode opcional após v1.

## 14. Acessibilidade

- teclado;
- foco visível;
- labels e `aria-*` adequados;
- contraste AA como alvo;
- cor não é único indicador;
- tabelas/matrizes possuem alternativa textual/resumo.
