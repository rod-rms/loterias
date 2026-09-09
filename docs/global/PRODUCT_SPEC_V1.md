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

### 7.2 Validação do concurso-alvo (v1.1.1)

Definições, a partir do dataset local validado da modalidade:

- `latestContest` = último concurso oficial disponível na base local;
- `nextContest` = `latestContest + 1`.

Estados permitidos:

- `contest === nextContest`: caso normal (sorteio futuro/pretendido) — gera normalmente;
- `contest <= latestContest` e existe exatamente esse concurso na base: **simulação histórica** — gera normalmente, sujeita aos requisitos de histórico da estratégia (7.3);
- `contest > nextContest`: concurso futuro ainda não suportado — **bloqueia** a geração, com mensagem dinâmica citando `latestContest` e `nextContest` reais;
- `contest <= latestContest` mas ausente da base (lacuna): **bloqueia** a geração;
- valor inválido (zero, negativo, decimal, não numérico): **bloqueia** a geração.

Essa validação usa somente o dataset já carregado — nunca dispara uma nova requisição à fonte oficial a partir do navegador.

### 7.3 Simulação histórica e a garantia de "sem espiada ao futuro"

Ao escolher um concurso histórico, a tela mostra o resultado oficial daquele sorteio (dezenas, data) e deixa explícito que é uma simulação — aquele resultado não é usado para montar os jogos.

Para qualquer estratégia que leia histórico de concursos (ex.: RMS v2), o histórico fornecido ao algoritmo para um concurso-alvo `T` deve conter **apenas** concursos com `contest < T` — nunca `T` nem qualquer concurso posterior a `T`. Essa regra é garantida na fronteira entre a camada de dados e o domínio (não apenas visualmente): a função que recorta a janela de referência (`referenceWindow`) sempre calcula os contests esperados a partir de `T` para trás, independentemente de quais concursos futuros também existam no dataset.

Se a janela histórica exigida não estiver completa (ex.: RMS v2 exige exatamente os 20 concursos imediatamente antes de `T`), a geração é **bloqueada** com mensagem clara. Nunca é aceitável: usar concursos posteriores, reduzir silenciosamente o tamanho da janela, relaxar regras da estratégia, ou usar o histórico mais recente disponível como substituto.

Para `nextContest`, o histórico disponível até `latestContest` continua sendo usado normalmente — a regra acima nunca deve truncar acidentalmente esse caso comum.

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

### 9.1 Resultado desatualizado (stale) — v1.1

Se o usuário alterar a configuração (estratégia, quantidade/orçamento, concurso, personalização de dezenas, seed, preset) **depois** de já ter gerado um resultado, o resultado exibido não é apagado nem regenerado automaticamente. Ele permanece visível, com um aviso destacado indicando que não corresponde mais à configuração atual, e três ações explícitas: gerar com a nova configuração, restaurar a configuração anterior (sem gerar de novo), ou descartar o resultado anterior. Editar o formulário de volta exatamente à configuração que gerou o resultado exibido remove o aviso automaticamente.

Salvar um resultado (“Salvar estes jogos”) sempre usa a configuração e o retrato do dataset que efetivamente o geraram — nunca uma reconstrução a partir do estado atual do formulário, mesmo que este já tenha sido editado sem gerar novamente.

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

### 15.1 Apresentação completa do resultado conferido (v1.1.1)

A conferência não resume o resultado em uma única frase. Deve mostrar, juntos:

- o resultado oficial do concurso (dezenas sorteadas);
- o número de acertos de cada jogo salvo individualmente;
- as dezenas sorteadas destacadas em cada jogo;
- o(s) jogo(s) com a maior pontuação, com tratamento correto de empate (dois ou mais jogos podem empatar na maior pontuação — a UI deve identificar todos, nunca assumir um único vencedor);
- o rótulo convencional de resultado, quando aplicável (ver 15.2);
- a data/hora da conferência, com baixo destaque visual.

### 15.2 Rótulos de resultado (nunca premiação)

Um rótulo puramente descritivo do número de acertos, nunca semântica de prêmio/dinheiro:

- Mega-Sena: 4 acertos → "Quadra"; 5 → "Quina"; 6 → "Sena"; abaixo de 4, sem rótulo especial.
- Lotofácil: 11 a 15 acertos → "11 acertos" a "15 acertos"; abaixo de 11, sem rótulo especial.

Proibido em qualquer rótulo ou frase desta seção: "premiação", "prêmio", "aposta premiada", "faixa de premiação", "ganhou", "aposta vencedora", ou qualquer valor monetário. Tabelas oficiais de rateio/premiação por concurso são um item de backlog futuro (v1.2+), não implementado nesta versão.

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

### 17.1 Divulgação progressiva e dados de origem (v1.1)

A Metodologia usa divulgação progressiva: "Como este aplicativo funciona" (linguagem simples, cobrindo os pontos acima) é a seção primária; todo o material técnico rigoroso listado acima permanece disponível, na íntegra, em "Detalhes técnicos" (recolhido por padrão).

Por modalidade, a Metodologia também mostra uma seção "Dados e atualizações" com: nome da fonte oficial (Loterias CAIXA) e URL, último concurso na base local, data desse sorteio, situação da base, data/hora da última atualização com concurso novo e data/hora da última verificação bem-sucedida da fonte oficial (mesmo sem novidade) — carregados de `public/data/status.json`, nunca fixos no código.

## 18. Jogo responsável

A aplicação não é uma plataforma de apostas, mas deve manter comunicação compatível com jogo responsável:

- informar que apostas reais são proibidas para menores de 18 anos no Brasil;
- não incentivar recuperação de perdas;
- não usar notificações, contadores ou linguagem de urgência para estimular gasto;
- sempre mostrar custo antes da geração;
- incluir link informativo para a página de Jogo Responsável da CAIXA na área “Sobre/Metodologia”, sem sugerir vínculo oficial (URL atual, corrigida na v1.1: `https://www.caixa.gov.br/jogo-responsavel/Paginas/default.aspx`, centralizada em `RESPONSIBLE_GAMING_URL`).

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
