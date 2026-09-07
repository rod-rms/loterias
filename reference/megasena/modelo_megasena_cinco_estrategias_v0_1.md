# Mega-Sena: modelo de pesquisa e requisitos para um futuro gerador

**Versão:** 0.1 | **Data:** 7 de setembro de 2026

## Escopo e estado da evidência

Esta especificação considera somente as cinco abordagens mais bem classificadas na discussão inicial: jogos distintos, cobertura combinatória, controle de sobreposição, menor compartilhamento potencial e otimização computacional/IA. A classificação inicial foi qualitativa; não constitui uma demonstração de superioridade empírica de todas as abordagens.

Não foi construído um aplicativo. O script anexo executa apenas verificações matemáticas reproduzíveis. Não foram usados dados históricos de sorteios, dados reais de preferências dos apostadores ou previsões de retorno financeiro.

## 1. Premissas

O modelo pressupõe sorteios uniformes de seis dezenas distintas entre 1 e 60, independentes entre concursos. Existem M = C(60,6) = 50.063.860 resultados possíveis. Uma aposta elementar contém seis dezenas. O preço consultado na CAIXA foi de R$ 6,00; o aplicativo deverá versionar esse parâmetro, em vez de fixá-lo permanentemente no código [1].

S representa um conjunto de N apostas elementares distintas no mesmo concurso; D representa o resultado sorteado. Não existe ordem relevante dentro da aposta.

O limite de orçamento B impõe c*N <= B. O número de jogos é escolhido pelo usuário; o sistema não precisa consumir todo o limite informado.

## 2. Medidas que não devem ser confundidas

- F_h(S) = P(existe s em S com |s interseção D| >= h), para h = 4, 5 ou 6.
- Z_h(S,D) = quantidade de apostas de S com exatamente h acertos.
- Cobertura de subconjuntos: quantidade de duplas, trincas, quadras ou quinas distintas presentes nas apostas.
- Retorno monetário: depende dos fundos de premiação e dos demais ganhadores; não é determinado apenas por F_h.

Para qualquer S com N apostas:

    E[Z_h] = N * C(6,h) * C(54,6-h) / M.

Logo, mudar a sobreposição pode alterar a chance de ganhar alguma coisa e a concentração dos prêmios, sem aumentar a quantidade esperada de bilhetes premiados. Com pagamentos unitários fixos, isso também não aumenta automaticamente o retorno esperado. Na Mega-Sena real, os efeitos do rateio devem ser modelados separadamente [1].

## 3. As cinco abordagens

### 3.1 Jogos distintos: restrição obrigatória

Ordenar as seis dezenas, validar o intervalo e a unicidade interna, e criar uma chave canônica. Impedir duplicatas no conjunto do mesmo concurso, incluindo jogos já registrados pelo usuário nesse concurso. Não bloquear uma combinação só porque apareceu em concursos anteriores.

    F_6(S) = N / M.

Duas carteiras com o mesmo número de combinações distintas têm a mesma chance de Sena. Apostas maiores podem ser expandidas em combinações elementares para auditoria. A desduplicação não altera retroativamente um comprovante já comprado.

### 3.2 Cobertura combinatória: objetivo mensurável

Definir A_h(s) como o conjunto dos resultados D nos quais s consegue pelo menos h acertos. Então:

    F_h(S) = |união de A_h(s), s em S| / M.

O objetivo de quadra ou melhor maximiza F_4; o de quina ou melhor maximiza F_5. A chance de Sena continua fixada por N. Cobrir muitas duplas ou quadras diferentes pode ajudar a construir candidatos, mas não equivale automaticamente a maximizar F_4.

A teoria de covering designs fornece uma base para coberturas de subconjuntos [2,3]. Um fechamento construído dentro de um conjunto-base exige registrar explicitamente a condição de garantia e verificar todos os casos pertinentes. Não rotular uma busca heurística como garantia universal ou ótimo global.

### 3.3 Sobreposição: ferramenta de construção e auditoria

Para duas apostas s_i e s_j, definir r_ij = |s_i interseção s_j|. Registrar a distribuição completa das interseções, não apenas a média.

Dois jogos só podem ambos acertar pelo menos h dezenas se 2*h-r_ij <= 6. Portanto, r_ij <= 1 impede dois prêmios de quadra ou melhor simultâneos; r_ij <= 3 impede duas quinas ou melhor simultâneas.

Se uma carteira satisfizer r_ij <= 1 para todos os pares, F_4(S) = N * 21.790 / M. Ela atinge o limite superior da união para esse objetivo. A viabilidade dessas restrições depende de N e de eventuais dezenas obrigatórias ou excluídas. Não presumir que uma construção assim exista para qualquer quantidade de jogos.

Minimizar a interseção média, isoladamente, é apenas uma heurística. O critério final permanece F_4 ou F_5.

### 3.4 Menor compartilhamento potencial: módulo experimental

Estudos em outras loterias documentam escolhas não uniformes, associadas a datas, significado pessoal e padrões visuais [4,5]. Isso não calibra automaticamente a popularidade de cada combinação da Mega-Sena brasileira.

Separar três camadas: fatos matemáticos, evidência comportamental externa e hipóteses locais. O histórico dos números sorteados não mede quais combinações as pessoas compram.

Um escore exploratório pode usar características como combinação totalmente contida em 1-31 ou padrões completos de preenchimento. Os pesos e o sentido dos efeitos precisam de validação. Não proibir todo par consecutivo, toda dezena baixa, toda combinação equilibrada ou todo número primo. Não exibir o escore como probabilidade de acerto nem como percentual real de menor rateio.

Se q_s for a probabilidade de uma aposta concorrente escolher exatamente s e T for o número de apostas concorrentes, um cenário simplificado usa W_s ~ Poisson(lambda_s), lambda_s = T*q_s. Sob essa aproximação:

    E[1/(1+W_s)] = (1-exp(-lambda_s))/lambda_s,

com limite 1 quando lambda_s tende a zero. Isso é a parcela esperada do jackpot condicionada ao acerto de s, não a probabilidade de acertar. Dependência entre apostas e bolões pode invalidar a aproximação.

Com jackpot J fixo, o valor esperado bruto da faixa Sena seria:

    EV_Sena(S) = (J/M) * soma_s E[1/(1+W_s)].

O retorno esperado líquido total precisaria acrescentar as faixas menores com seus respectivos rateios e subtrair c*N. Sem estimativas defensáveis de q_s, T e prêmios, não publicar um ROI previsto.

Uma futura investigação indireta poderia relacionar características das combinações sorteadas, quantidade de ganhadores e volume de vendas. Isso exigiria modelo de contagem, controle de exposição e validação temporal; não substitui observação completa das escolhas individuais.

### 3.5 Otimização computacional/IA: motor, não previsão

O motor propõe e compara carteiras sob as regras anteriores. Começar com um gerador uniforme, construção gulosa e busca local. Algoritmos mais complexos só merecem entrar se demonstrarem ganho mensurável no mesmo objetivo e sob o mesmo limite computacional.

Uma IA de linguagem pode explicar resultados já calculados; não deve inventar probabilidades. Um modelo aprendido de preferências humanas só deve ser ativado com dados apropriados e validação. O funcionamento do gerador não deve depender de um modelo generativo para realizar combinatória exata.

## 4. Integração sem uma pontuação arbitrária

Primeiro cumprir validade, quantidade e orçamento. Depois otimizar F_4 ou F_5, conforme escolha explícita do usuário. Usar sobreposição como ferramenta e diagnóstico, sem contabilizar o mesmo benefício duas vezes. Popularidade permanece um critério secundário e experimental.

Uma possibilidade especialmente útil é separar a estrutura abstrata da carteira dos rótulos 1-60. Qualquer permutação global desses rótulos preserva interseções, F_4, F_5 e F_6 sob sorteio uniforme. Portanto, pode-se explorar diferentes atribuições de dezenas para reduzir um escore de popularidade hipotética sem prejudicar a cobertura já provada. Essa invariância é exata; o benefício financeiro do escore continua não validado.

Restrições de dezenas fixas ou excluídas devem ser respeitadas ao procurar permutações. Não usar uma lista global idêntica de jogos para todos os usuários, pois isso pode produzir o compartilhamento que o módulo pretende reduzir.

## 5. Verificação exata já executada

Foram comparadas sete apostas simples, custo total ilustrativo de R$ 42,00. Nenhum valor é recomendação de gasto.

| Carteira | Quadra ou melhor | Quina ou melhor | Sena |
|---|---:|---:|---:|
| Sete combinações contidas no mesmo conjunto de sete dezenas | 0,0985741012% | 0,0022371427% | 0,0000139821% |
| Média de carteiras uniformes com sete jogos distintos | 0,3042733624% | 0,0045441079% | 0,0000139821% |
| Sete apostas sem nenhuma dezena em comum entre si | 0,3046708744% | 0,0045441962% | 0,0000139821% |

Os dois exemplos concretos foram conferidos por enumeração completa dos resultados favoráveis, além das fórmulas combinatórias. A média aleatória não vem de simulação: para K_h = soma de C(6,j)*C(54,6-j), j=h..6, ela é 1 - C(M-K_h,N)/C(M,N).

A carteira disjunta melhora F_4 em aproximadamente 209,08% sobre o exemplo concentrado, mas somente 0,130643% em termos relativos sobre a média aleatória. A diferença absoluta nesta última comparação é de 0,000397512 ponto percentual. Mesmo na carteira disjunta, a chance de nenhum prêmio é de 99,6953291%.

A quantidade esperada de apostas premiadas, somadas as três faixas, é 0,0030467087 por concurso nos dois exemplos. A carteira concentrada produz prêmios simultâneos em menos resultados; a disjunta produz no máximo um prêmio por resultado.

A comparação não demonstra que qualquer otimizador superará cada carteira aleatória individual. Algumas carteiras aleatórias já atingem o limite superior. Não extrapolar os percentuais do exemplo para outros orçamentos.

## 6. Protocolo de validação futura

Comparar sempre o mesmo número de apostas elementares, o mesmo concurso, as mesmas restrições e o mesmo limite computacional. Usar o gerador uniforme sem duplicatas como controle, não apenas exemplos concentrados fáceis de superar.

Validar cada componente separadamente: desduplicação; cobertura; sobreposição isolada versus objetivo direto; permutações para popularidade; motores computacionais alternativos. Repetir a construção sob sementes independentes e publicar resultados fracos e empates.

Preferir probabilidades exatas quando viáveis. Se houver Monte Carlo, separar amostras de otimização e de avaliação, comparar as carteiras nos mesmos sorteios de teste e publicar intervalos de incerteza. A chance de Sena pode ser calculada diretamente; não requer observar Senas raríssimas na simulação.

Um teste histórico deve usar uma base oficial auditada, ordenação temporal e informações disponíveis antes de cada concurso. Pesos escolhidos depois de conhecer os resultados não podem ser avaliados nos mesmos dados. O retorno contrafactual exige reconstruir os fundos e considerar os bilhetes simulados no rateio, em vez de simplesmente multiplicar todos os acertos pelo prêmio unitário histórico.

Critérios: F_4, F_5, F_6; quantidade esperada por faixa; probabilidade de nenhum prêmio; sobreposição; diferença absoluta e relativa contra o controle; tempo de processamento; custos; origem e incerteza dos parâmetros de popularidade. ROI histórico e ROI simulado devem ser identificados separadamente.

## 7. Requisitos para o futuro aplicativo

**Entradas:** concurso, quantidade de jogos ou limite financeiro, objetivo, jogos já existentes, restrições opcionais, modo experimental de popularidade e semente reproduzível.

**Saídas:** jogos válidos e distintos, custo, chance exata de Sena, chance de quadra/quina ou melhor com identificação do método, chance de nenhum prêmio, diagnóstico de interseções e comparação com controle de mesmo custo. Exibir garantias condicionais somente com condição completa e certificado de verificação.

**Rastreabilidade:** versão das regras, fonte e data do preço, versão do algoritmo, objetivo, parâmetros, semente, identificador da carteira e método de avaliação. Diferenciar dado exato, estimado e hipotético.

**Comunicação:** não usar probabilidade de lucro como sinônimo de chance de algum prêmio. Não divulgar dezenas mais prováveis, IA que prevê sorteios ou retorno garantido. Não elevar limites de gasto em resposta a perdas. Um jogo gerado não equivale a uma aposta registrada na CAIXA. Este escopo não inclui pagamentos nem intermediação de apostas.

**Prioridade inicial:** motor matemático, controle uniforme, desduplicação, cobertura e auditoria. Popularidade permanece desligada por padrão até existir uma justificativa de uso. IA generativa é opcional, não uma dependência central.

## 8. Tese proposta

Otimização auditável de carteiras da Mega-Sena sob equiprobabilidade: cobertura combinatória, dependência entre apostas e compartilhamento potencial de prêmios.

Hipótese principal: para N fixo, toda carteira de N combinações distintas tem a mesma chance de Sena, mas a organização pode alterar a probabilidade de pelo menos um prêmio nas faixas inferiores. Se houver escolhas concorrentes não uniformes e identificáveis, a atribuição de dezenas poderá alterar a parcela esperada do prêmio condicionada ao acerto.

A primeira parte foi ilustrada e verificada exatamente neste material. A segunda continua uma hipótese empírica, não um resultado comprovado para a Mega-Sena.

## Referências consultadas

[1] CAIXA. Mega-Sena: regras, preços, probabilidades e quantidade de prêmios. Consulta: 07/09/2026. https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx

[2] Gordon, D. M. Covering Designs, La Jolla Covering Repository. https://dmgordon.org/covering-designs/

[3] SageMath. Covering designs: coverings of t-element subsets of a v-set by k-sets. Documentação oficial. https://doc.sagemath.org/html/en/reference/combinat/sage/combinat/designs/covering_design.html

[4] Wang, T. V.; Potter van Loon, R. J. D.; van den Assem, M. J.; van Dolder, D. (2016). Number preferences in lotteries. Judgment and Decision Making, 11(3), 243-259. https://doi.org/10.1017/S1930297500003089

[5] D'Hondt, C.; Roger, P.; Hoffmann, A. O. I.; Plotkina, D. (2024). Is There a Gender Gap in the Birthday-Number Effect? The Case of Lotto Players and the Role of Sequential Choice. Journal of Gambling Studies, 40, 1439-1463. https://doi.org/10.1007/s10899-024-10288-5

## Reprodução dos cálculos

Requisito: Python 3.10 ou superior, apenas biblioteca padrão.

    python verificar_modelo.py

O programa verifica contagens por duas rotas, confere a invariância por permutação de rótulos e grava resultados_verificados.json. Os cenários de Poisson nesse arquivo são exemplos hipotéticos, não estimativas reais de concorrentes.
