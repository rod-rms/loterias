# Communication Plan

## 1. Objetivo

Formalizar como decisões, implementação, qualidade e release são comunicadas e registradas.

---

## 2. Matriz

| Comunicação | Frequência | Canal | Responsável | Resultado |
|---|---|---|---|---|
| Refinamento de requisito | por feature | conversa com Claude (advisor, Cowork) | Rodrigo | instrução técnica em inglês |
| Implementação | por feature | Claude Code (CLI local) | Rodrigo + agente | commit/PR |
| Auditoria independente do PR | por PR relevante | Claude (advisor, Cowork), lendo o repositório diretamente | Rodrigo | achados + autorização/correção |
| Auditoria agendada (fallback automático) | seg-sex, 6h | scheduled task dedicada, audita commits/branches novos | Rodrigo (só se achar algo fora do padrão) | achados salvos em `docs/project-management/drafts/` |
| PR | por release | GitHub | Rodrigo | rastreabilidade |
| CI | por push | GitHub Actions | sistema | status |
| Preview | por PR | Cloudflare | sistema | ambiente homologável |
| Validação de preview | por mudança visível/comportamental | Cloudflare preview, aberto pessoalmente por Rodrigo | Rodrigo (não delegável — `DEC-022`) | autorização explícita de merge |
| Homologação | por release | manual | Rodrigo | aprovação |
| Release notes | por release | GitHub | Rodrigo | histórico |
| Status | quando muda milestone | PROJECT_STATUS + Painel LotoAtlas (artifact) | Rodrigo | visão executiva |

---

## 3. Regras

- decisões críticas não ficam apenas em chat;
- prompts de implementação devem conter critérios de aceite;
- bugs encontrados na homologação voltam para branch;
- releases devem possuir changelog;
- limitações conhecidas devem ser documentadas.

---

## 4. Painel visual (Painel LotoAtlas)

Desde 23/09/2026, existe um artifact HTML publicado ("Painel LotoAtlas") consolidando o mesmo conteúdo destes documentos de forma visual: estatísticas, ritmo de entregas, timeline, roadmap, decisões e recomendações. É um retrato gerado a partir do repositório, não uma fonte adicional de estado — atualizado pela sessão advisor sempre que há uma mudança de estado relevante para acompanhar.

---

## 5. Comunicação externa futura

Caso o produto cresça:

- changelog simplificado;
- status de dados;
- metodologia;
- política de privacidade;
- termos de uso;
- comunicação de jogo responsável.
