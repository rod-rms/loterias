# Decisions & Open Points — v1.1

## Decisões fechadas

1. Um único aplicativo com Lotofácil e Mega-Sena.
2. GitHub como fonte da verdade.
3. Estratégias via registry/adapters versionados.
4. “Jogo” na v1 = aposta simples/elementar (LF15 / Mega6).
5. Apostas ampliadas fora da v1.
6. Quantidade configurável somente em estratégias flexíveis.
7. Orçamento = máximo de apostas inteiras sem exceder o valor; mostrar saldo.
8. RMS v2 fixa em 6 e sem fixas/excluídas.
9. RMS não relaxa regras silenciosamente.
10. Seeds registradas para todas as carteiras.
11. Nova variação e Reproduzir são ações diferentes.
12. Nomes de UI não prometem “máximo/ótimo” sem prova.
13. Baseline aleatória != carteira Aleatória distinta.
14. Comparações usam mesmo N e restrições compatíveis.
15. Popularidade Mega permanece experimental/off.
16. Sem IA generativa em runtime.
17. IndexedDB com migrations.
18. Backup/importação do histórico local na v1.
19. Dataset/versionamento entram na auditoria da carteira.
20. Atualização de resultados por script + GitHub Action.
21. Preços atuais são configuração versionada, não constantes matemáticas.
22. Comunicação 18+ / jogo responsável.
23. Deploy alvo: Cloudflare Pages.

## Valores atuais de configuração (07/09/2026)

- Lotofácil simples: R$ 3,50.
- Mega-Sena simples: R$ 6,00.

Validar novamente no processo de implementação/deploy e manter fonte/data na configuração.

## Decisões que o Claude pode medir, mas não redefinir conceitualmente

- implementação de bitset Lotofácil;
- parâmetros exatos por preset Rápida/Equilibrada/Profunda;
- virtualização/paginação concreta;
- limiares internos de avaliação exata quando a política documental permitir estimativa;
- performance do browser.

Qualquer redução de hard cap de produto exige ser registrada em documentação/configuração, não feita silenciosamente.

## Adiados

- Crowd Score calibrado;
- ROI previsto;
- compra de apostas;
- pagamentos;
- login/sync;
- push;
- IA explicativa em runtime;
- RMS v3;
- apostas ampliadas.
