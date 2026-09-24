# Lessons Learned

## 1. Matemática correta não garante UX correta

A v1 inicial era tecnicamente sólida, mas expunha linguagem como seed, coverage e p.p. ao usuário.

**Aprendizado:** abstrair complexidade sem esconder metodologia.

---

## 2. Dogfooding encontra problemas que testes não encontram

Uso cotidiano revelou:
- tela redundante;
- stale result;
- concurso inválido;
- conferência insuficiente;
- clareza sobre armazenamento.

**Aprendizado:** incorporar revisão de uso real como rotina.

---

## 3. IA precisa de invariantes explícitas

Agentes podem otimizar localmente e quebrar pressupostos.

**Aprendizado:** matemática, schemas e comportamento crítico devem ser protegidos por testes/oracles.

---

## 4. Dados externos exigem resiliência

Uma única execução diária do updater não era suficiente.

**Aprendizado:** separar retries HTTP de janelas operacionais de verificação.

---

## 5. Simulação histórica exige proteção contra data leakage

Sem no-look-ahead, um backtest pode parecer melhor do que realmente é.

**Aprendizado:** tratar corte temporal como requisito de domínio.

---

## 6. Não construir backend cedo demais

IndexedDB resolveu a necessidade inicial com menor custo e risco.

**Aprendizado:** adiar infraestrutura até haver benefício comprovado.

---

## 7. Resultado gerado deve ser imutável

Salvar com estado atual do formulário poderia gerar inconsistência.

**Aprendizado:** usar snapshot congelado da configuração/dataset.

---

## 8. PR CI não substitui main CI

Na v1.1.1, o PR passou, mas o main CI detectou race assíncrono.

**Aprendizado:** tag/release só depois do main CI verde.

---

## 9. Homologar o ambiente correto

Um alias de preview incorreto levou a um falso diagnóstico de regressão.

**Aprendizado:** sempre registrar URL imutável do preview e SHA aceito.

---

## 10. Uso de IA deve ser governado, não escondido

O projeto se beneficia de IA para implementação e análise.

**Aprendizado:** o diferencial profissional está em especificação, decisão, validação, governança e capacidade de conduzir agentes.


---

## 11. A mesma classe de bug pode reaparecer mesmo "mitigada"

O race assíncrono de setState pós-unmount detectado em `CarteirasPage.tsx` na v1.1.1 (lição 8) reapareceu quase idêntico em 23/09/2026 (PR #14), agora em quatro call sites diferentes do mesmo componente, exposto por uma suíte de testes de uma feature completamente não relacionada (MEGA-ROLL-001).

**Aprendizado:** marcar um risco como "Mitigado" no RAID log depois de uma correção pontual é otimista demais quando a causa raiz é um padrão (setState depois de `await` sem guard), não um bug isolado. Vale considerar uma verificação estrutural/lint (não apenas testes que podem ou não expor o padrão) antes de reclassificar como encerrado.

---

## 12. Autorização de merge pré-concedida por economia de tokens tem custo escondido

Uma instrução padrão passou a incluir "pode incluir o merge junto às instruções" para reduzir idas e voltas. O efeito colateral não foi imediato — as mudanças seguintes foram pequenas — mas eliminou silenciosamente a validação pessoal via preview que o product owner valorizava desse fluxo (vinda de sua experiência anterior com outra ferramenta de IA). Só ficou visível quando uma mudança maior (MEGA-ROLL-001) já estava prestes a ser mergeada sem essa validação.

**Aprendizado:** "economizar tokens" e "manter um gate de aprovação humana em mudanças visíveis" são objetivos em tensão direta — quando um afeta o outro, o gate de aprovação vence por padrão. Formalizado em `DEC-022`.
