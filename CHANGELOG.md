# Changelog

Registro de mudanças voltadas ao usuário e à operação do produto. Não é um espelho de cada commit — para o histórico técnico completo, use `git log`.

## [Unreleased]

Nada pendente no momento.

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
