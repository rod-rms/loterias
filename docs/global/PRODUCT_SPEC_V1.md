# Product Specification — Loterias v1.1

**Status:** especificação revisada para aprovação antes da implementação  
**Produto:** aplicação web pública para construção, comparação, auditoria e armazenamento local de carteiras da Lotofácil e Mega-Sena.

## 1. Objetivo

Permitir que o usuário escolha uma modalidade, selecione uma estratégia documentada, defina quantidade de jogos ou orçamento quando compatível, gere uma carteira reproduzível e veja claramente o que a estratégia altera — e o que ela não altera.

O produto **não prevê sorteios**, não vende apostas, não registra apostas na CAIXA, não promete lucro e não apresenta heurísticas históricas como aumento de probabilidade de uma combinação individual.

## 2. Modalidades da v1

- Lotofácil
- Mega-Sena

Um único aplicativo, com módulos independentes por modalidade.

## 3. Definição de “jogo” na v1

Na v1, todo “jogo” gerado é uma **aposta simples/elementar**:

- Lotofácil: 15 dezenas distintas entre 1 e 25;
- Mega-Sena: 6 dezenas distintas entre 1 e 60.

Apostas ampliadas (Lotofácil 16–20 números; Mega-Sena com mais de 6 números) ficam fora da v1. Elas podem ser incorporadas futuramente pela expansão em combinações elementares, sem alterar o núcleo matemático.

A UI deve deixar isso explícito para evitar confusão entre “quantidade de jogos” e “quantidade de dezenas marcadas em uma única aposta ampliada”.

## 4. Estratégia como objeto selecionável

Cada modalidade possui um `Strategy Registry`. Cada estratégia declara:

- identificador estável;
- versão;
- nome de exibição;
- modalidade;
- status (`active`, `experimental`, `research`);
- nível de evidência;
- quantidade mínima/máxima ou quantidade fixa;
- se aceita entrada por orçamento;
- se aceita dezenas fixas/excluídas;
- se aceita seed informada pelo usuário;
- se exige histórico de concursos;
- se depende do concurso-alvo;
- presets de qualidade computacional, se aplicáveis;
- métricas que otimiza;
- métricas que apenas reporta;
- linguagem permitida/proibida;
- restrições de comparação.

A UI deve se configurar a partir desses metadados. Regras de estratégia não podem ficar espalhadas em componentes React.

## 5. Fluxo principal

1. Escolher Lotofácil ou Mega-Sena.
2. Escolher uma estratégia.
3. Ler objetivo, evidência e limitações em linguagem curta.
4. Definir quantidade de jogos ou orçamento, quando permitido.
5. Definir concurso-alvo/contexto.
6. Configurar opções avançadas compatíveis.
7. Gerar em Web Worker quando houver processamento pesado.
8. Visualizar jogos, custo, métricas, baseline, auditoria e limitações.
9. Salvar localmente, copiar/exportar ou gerar nova variação.
10. Conferir posteriormente contra resultado oficial disponível.

## 6. Quantidade de jogos e orçamento

### 6.1 Modo quantidade

O usuário informa diretamente `N` jogos elementares.

### 6.2 Modo orçamento

Para estratégias compatíveis:

```text
N = floor(orçamento / custo_unitário)
```

A UI deve exibir:

- orçamento informado;
- custo unitário;
- quantidade resultante;
- custo efetivamente utilizado;
- saldo não utilizado inferior a uma aposta simples.

O sistema nunca deve ultrapassar o orçamento e nunca deve aumentar orçamento automaticamente após perdas.

Se o orçamento produzir `N` acima do limite operacional da estratégia, **não reduzir silenciosamente**. Bloquear a geração e informar o limite suportado.

### 6.3 Estratégias fixas

A RMS v2 é fixa em 6 jogos. Ela não usa “modo orçamento” como parâmetro de geração; a UI apenas informa o custo dos 6 jogos.

## 7. Restrições opcionais

Nas estratégias compatíveis:

- dezenas fixas;
- dezenas excluídas;
- seed;
- preset de qualidade de busca.

### 7.1 Viabilidade combinatória

Se `f` é o número de dezenas fixas, `e` o número de excluídas e `k` o tamanho de uma aposta simples, o máximo de jogos distintos possíveis sob as restrições é:

```text
C(total_dezenas - f - e, k - f)
```

O domínio deve validar `N` contra esse máximo antes de iniciar a busca.

Restrições impossíveis nunca devem ser ajustadas silenciosamente.

## 8. Seed e reprodutibilidade

Toda geração deve possuir uma seed registrada.

- se o usuário informar seed, ela deve ser usada;
- se deixar em branco, o app gera uma seed automaticamente e a exibe/salva;
- mesma estratégia + versão + dados + parâmetros + seed deve produzir o mesmo resultado, salvo quando a documentação do algoritmo declarar explicitamente outra limitação.

A UI deve diferenciar:

- **Nova variação** → nova seed;
- **Reproduzir carteira** → mesma seed e mesmos parâmetros.

Na RMS v2, a seed pode ser derivada deterministicamente do concurso/versão e não precisa ser editável pelo usuário.

## 9. Resultado da geração

Exibir:

- jogos ordenados;
- quantidade;
- custo;
- concurso-alvo;
- estratégia e versão;
- seed;
- métricas da modalidade;
- status da métrica (`exata`, `estimada`, `limite`, `não calculada`);
- método de otimização separado do método de avaliação;
- sobreposição/diagnóstico;
- baseline quando disponível;
- alertas e limitações;
- data/hora.

Não usar “ótimo global” quando o algoritmo for heurístico. Usar “melhor solução encontrada” quando não houver prova de ótimo.

## 10. Baseline aleatória vs estratégia Aleatória

São conceitos diferentes:

- **Aleatória distinta**: uma carteira concreta gerada uniformemente;
- **Baseline aleatória**: média teórica ou controle equivalente usado para comparação.

A UI nunca deve tratá-los como sinônimos.

## 11. Comparação de estratégias

Ação: `Comparar com outra estratégia`.

Regras:

- mesmo número de jogos elementares `N`;
- mesmo custo unitário;
- mesmas restrições quando ambas as estratégias as suportarem;
- mesma base de concursos quando aplicável;
- estratégias incompatíveis ficam indisponíveis com motivo visível;
- RMS v2 só entra em comparação quando `N=6`, não existem restrições incompatíveis e há 20 concursos anteriores disponíveis;
- comparar no máximo uma estratégia adicional por vez na v1.

Não declarar vencedora absoluta. Mostrar diferenças por métrica.

## 12. Presets de qualidade

Estratégias de busca podem expor em `Opções avançadas`:

- **Rápida**;
- **Equilibrada** (padrão);
- **Profunda**.

A UI não expõe diretamente `iterations`, `candidatePoolSize` ou parâmetros internos. O adapter converte o preset em valores concretos e grava esses valores na auditoria.

O preset altera esforço de busca, não as regras matemáticas do jogo.

## 13. Salvar e histórico local

Sem login na v1.

Cada carteira salva deve manter snapshot imutável de:

- `schemaVersion`;
- modalidade;
- concurso;
- estratégia + versão;
- versão do motor/algoritmo;
- dataset usado e último concurso disponível no momento;
- preço e referência do preço;
- parâmetros;
- seed;
- jogos;
- métricas e seus status;
- auditoria;
- data de criação;
- marcação opcional `apostada`;
- observações;
- conferência posterior.

Atualizações futuras do algoritmo não podem recalcular silenciosamente uma carteira antiga.

## 14. Backup local

Como não há conta/sincronização, a v1 deve incluir:

- exportar todo o histórico local para JSON de backup;
- importar backup validado;
- opção explícita de apagar todos os dados locais.

Importação deve validar schema e não aceitar conteúdo incompatível silenciosamente.

## 15. Conferência

Quando houver resultado disponível:

- exibir dezenas sorteadas;
- destacar acertos por jogo;
- calcular maior pontuação;
- salvar conferência;
- não inferir prêmio monetário sem tabela de premiação daquele concurso validada.

## 16. Exportação de carteira

- copiar um jogo;
- copiar todos;
- CSV;
- JSON.

PDF/impressão fica fora da v1.

## 17. Metodologia

Explicar:

- equiprobabilidade;
- cobertura vs previsão;
- frequência de algum prêmio vs valor esperado;
- aleatória concreta vs baseline aleatória;
- exato vs estimado;
- busca heurística vs ótimo provado;
- sobreposição;
- RMS;
- Mega F4/F5;
- limitações de rateio/popularidade;
- jogo responsável.

## 18. Jogo responsável

A aplicação não é uma plataforma de apostas, mas deve manter comunicação compatível com jogo responsável:

- informar que apostas reais são proibidas para menores de 18 anos no Brasil;
- não incentivar recuperação de perdas;
- não usar notificações, contadores ou linguagem de urgência para estimular gasto;
- sempre mostrar custo antes da geração;
- incluir link informativo para a página de Jogo Responsável da CAIXA na área “Sobre/Metodologia”, sem sugerir vínculo oficial.

## 19. Fora do escopo

- login;
- sync em nuvem;
- pagamentos;
- compra/intermediação de apostas;
- apostas ampliadas;
- notificações push;
- IA generativa em runtime;
- previsão de dezenas;
- ROI previsto sem dados defensáveis;
- comunidade/ranking;
- Crowd Score calibrado;
- RMS v3.

## 20. UX

- linguagem analítica e não promocional;
- custo antes de gerar;
- configurações avançadas recolhidas;
- mobile-first;
- desktop completo;
- cálculos pesados fora da thread principal;
- acessibilidade por teclado;
- cor nunca como único sinal;
- nenhuma estratégia rotulada como “a melhor”.

## 21. Branding

Nome de trabalho: **Loterias**.

Não usar logo oficial da CAIXA nem elementos que sugiram vínculo oficial. Cores podem diferenciar modalidades mantendo identidade própria comum.
