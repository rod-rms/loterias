# Changelog

Registro de mudanças voltadas ao usuário e à operação do produto. Não é um espelho de cada commit — para o histórico técnico completo, use `git log`.

## [Unreleased]

Nada pendente no momento.

## [1.1.1] — 2026-09-09

Release de manutenção/usabilidade/integridade sobre a v1.1.0, cobrindo Lotofácil e Mega-Sena. Foco em validar corretamente o concurso-alvo, permitir simulação histórica segura, melhorar a conferência de jogos salvos, e pequenos detalhes de transparência (versão visível, explicação sobre armazenamento local). O comportamento matemático de probabilidade/oráculo permanece inalterado. **Não adiciona valores de premiação, cálculo de prêmios, rateio, ROI, cobrança automática de prêmios nem integração com apostas** — apenas número de acertos e o nome convencional do resultado (ex.: "Quadra"). Este aplicativo não prevê resultados de sorteio.

- **Validação do concurso-alvo**: "Concurso em que você pretende jogar" agora é validado contra a base local — aceita o próximo concurso disponível ou um concurso histórico existente; bloqueia, com explicação clara, um concurso muito à frente do disponível (acima do próximo), um concurso ausente da base (lacuna) ou um valor inválido (zero, negativo, decimal).
- **Simulação histórica**: ao escolher um concurso já realizado, a tela mostra o resultado oficial daquele sorteio e deixa claro que é uma simulação histórica — o resultado não é usado para montar os jogos.
- **Garantia de "sem espiada ao futuro"**: para estratégias que usam histórico (como a RMS), a simulação histórica nunca tem acesso ao resultado do concurso-alvo nem a qualquer concurso posterior — comprovado por uma suíte de testes automatizados dedicada (fatiamento do histórico, equivalência com dataset truncado, invariância a dados futuros alterados).
- **Validação de prontidão do dataset**: gerar jogos com um concurso já digitado nunca mais pode "correr na frente" da validação enquanto a base de concursos ainda está carregando — mostra uma mensagem neutra até a base ficar pronta, sem falso erro de concurso inválido.
- **Conferência de jogos salvos muito mais completa**: agora mostra, juntos, o resultado oficial do concurso, o número de acertos de cada jogo, e identifica claramente o(s) melhor(es) jogo(s) — inclusive quando há empate entre dois, três ou mais jogos.
- **Rótulos de resultado**: "Quadra"/"Quina"/"Sena" (Mega-Sena) e "11 acertos" a "15 acertos" (Lotofácil), sempre como descrição factual do número de acertos — nunca duplicados ("12 acertos · 12 acertos" corrigido) e nunca como premiação.
- **Correção de singular/plural**: "1 acerto" em vez de "1 acertos", tanto por jogo quanto no resumo do melhor resultado.
- **Versão do aplicativo visível no rodapé**, vinda de uma única fonte de verdade (a versão do `package.json`), nunca escrita à mão em um componente.
- **Explicação mais clara sobre onde os jogos salvos ficam guardados**: apenas neste navegador/dispositivo, sem conta nem sincronização em nuvem — com um lembrete para usar "Exportar backup" antes de limpar dados ou trocar de dispositivo.

## [1.1.0] — 2026-09-08

Primeira revisão de experiência do usuário sobre a v1, cobrindo Lotofácil e Mega-Sena. Sem mudanças na matemática das loterias, nos algoritmos de estratégia, nas regras da RMS ou nos preços — apenas navegação, apresentação, transparência de dados e persistência.

- **Terminologia e ajuda em linguagem simples**: nomes de estratégia, explicações ("Como funciona?") e um sistema de ajuda contextual acessível (`InfoHelp`) substituem termos técnicos na tela principal; o material técnico rigoroso continua disponível em "Detalhes técnicos".
- **Nenhuma estratégia pré-selecionada por padrão**, para não sugerir implicitamente uma recomendação.
- **Navegação simplificada entre Lotofácil e Mega-Sena**: a página de geração de cada modalidade passa a ser o ponto de entrada direto (Home → Gerar), com as antigas páginas de destino por modalidade agora redirecionando para lá.
- **Navegação "voltar" acessível e determinística** ("Voltar ao início" e equivalentes), com destino fixo em vez de depender do histórico do navegador.
- **Personalização de dezenas redesenhada**: desligada por padrão, com duas seções independentes ("devem aparecer em todos os jogos" / "não quero usar") usáveis ao mesmo tempo.
- **Apresentação de probabilidades e comparações melhorada**: formatação adaptativa que nunca mostra uma chance real como "0%", e comparação com jogos aleatórios equivalentes em linguagem simples, sem jargão técnico.
- **Proteção contra resultado desatualizado**: alterar a configuração depois de gerar jogos nunca apaga o resultado automaticamente — ele continua visível, com aviso claro e opções para gerar de novo, restaurar a configuração anterior ou descartar explicitamente. "Limpar configuração" reseta apenas o formulário e nunca remove um resultado já gerado.
- **Retrato do dataset salvo junto com cada jogo gerado**, para auditoria futura de qual base de dados originou aquele conjunto.
- **Metodologia sincronizada** com uma seção de transparência de dados por modalidade (fonte oficial, último concurso, última atualização, última verificação).
- **Verificação de dados mais resiliente**: múltiplas janelas de checagem após os sorteios oficiais da CAIXA, em vez de um único horário arbitrário por dia.
- **Correção do link de jogo responsável**, que apontava para uma URL oficial obsoleta.

## [1.0.0] — 2026-09-07

Primeira versão pública: geração de jogos simples para Lotofácil (15 dezenas) e Mega-Sena (6 dezenas), catálogo de estratégias auditáveis, métricas exatas/estimadas com status explícito, histórico local de jogos salvos e datasets oficiais versionados.
