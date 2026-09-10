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
24. (v1.1) Um resultado já gerado nunca é apagado ou regenerado silenciosamente quando a configuração muda depois — fica visível, marcado como desatualizado, com ações explícitas (gerar de novo / restaurar configuração anterior / descartar).
25. (v1.1) Salvar sempre usa a configuração e o dataset que efetivamente geraram o resultado exibido (snapshot congelado no momento da geração), nunca uma reconstrução a partir do formulário no momento do clique em salvar.
26. (v1.1) Verificação automática de dados usa múltiplas janelas de retry após cada janela de sorteio (não um único horário diário), por resiliência a atraso/instabilidade da fonte oficial; retries HTTP internos continuam existindo como camada de resiliência separada e complementar.
27. (v1.1) `lastUpdatedAt` (dataset mudou) e `lastCheckedAt` (fonte verificada, mesmo sem mudança) são conceitos e campos distintos em `public/data/status.json`; a UI nunca os apresenta como a mesma coisa.
28. (v1.1) URL de jogo responsável corrigida e centralizada em `RESPONSIBLE_GAMING_URL` (`src/shared/lib/externalLinks.ts`).
29. (v1.1.1) Concurso-alvo é validado contra o dataset local (próximo concurso, concurso histórico existente, futuro distante bloqueado, lacuna bloqueada, valor inválido bloqueado) — nunca por uma nova requisição de rede.
30. (v1.1.1) Simulação histórica é uma capacidade de primeira classe: escolher um concurso já realizado mostra o resultado oficial e gera normalmente, mas o histórico fornecido a qualquer estratégia nunca inclui o concurso-alvo nem concursos posteriores — garantido na fronteira de dados (`referenceWindow`), não só visualmente.
31. (v1.1.1) Histórico insuficiente para uma janela exigida (ex.: RMS v2) bloqueia a geração; nunca reduz a janela, usa concursos futuros, ou cai para o histórico mais recente disponível como substituto.
32. (v1.1.1) Rótulos de resultado ("Quadra"/"Quina"/"Sena", "11 a 15 acertos") são puramente descritivos do número de acertos — nunca semântica de premiação/dinheiro. Tabelas de rateio/premiação ficam fora de escopo até nova decisão explícita.
33. (v1.1.1) `package.json` é a única fonte de verdade da versão visível do app, injetada em build-time como `__APP_VERSION__`; nenhum componente escreve a versão como literal.
34. (v1.1.2) Uma falha fatal do Web Worker de geração (fora do try/catch interno) sempre encerra o worker, limpa o estado e mostra uma mensagem amigável — nunca deixa a geração travada indefinidamente nem expõe stack trace ao usuário leigo.
35. (v1.1.2) Uma Error Boundary global envolve toda a árvore do roteador; uma falha de renderização nunca deixa o usuário com uma tela em branco sem explicação, e "Voltar ao início" nesse fallback é navegação simples (não depende do React Router estar funcional).
36. (v1.1.2) A CI normal de PR/main nunca chama a fonte oficial da CAIXA — isso é responsabilidade exclusiva do workflow agendado, que agora também alerta operacionalmente (via GitHub Issues) quando falha, sem serviço pago e sem novo segredo.
37. (v1.1.2) Terminação de linha do repositório padronizada em LF via `.gitattributes`/`.editorconfig`; v1.1.2 é uma release de robustez/confiabilidade, não uma release de funcionalidade de produto.

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
