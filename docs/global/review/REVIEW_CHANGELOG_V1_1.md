# Review Changelog — Blueprint v1.1

Principais ajustes após revisão pré-implementação:

1. definiu “jogo” como aposta simples/elementar;
2. separou Aleatória distinta de baseline aleatória;
3. removeu linguagem “Máxima” da UI quando não há prova de ótimo global;
4. adicionou versionamento formal de estratégias;
5. formalizou capacidades por estratégia;
6. definiu orçamento, saldo e comportamento acima do cap;
7. definiu validação combinatória de fixas/excluídas;
8. tornou seed obrigatória na auditoria;
9. separou Nova variação de Reproduzir;
10. formalizou compatibilidade para comparação entre estratégias;
11. adicionou presets de qualidade em vez de parâmetros técnicos crus;
12. separou método de busca de método de avaliação;
13. formalizou desempate/falha da RMS sem relaxamento silencioso;
14. adicionou schema/migrations e snapshots imutáveis na persistência;
15. adicionou backup/importação local;
16. tornou atualização automática de resultados requisito da v1;
17. adicionou jogo responsável/18+;
18. adicionou pasta `strategies/` à arquitetura lógica;
19. definiu valores atuais de preço como configuração versionada;
20. ampliou testes/E2E para cobrir essas decisões.
