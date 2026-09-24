# Stakeholders & RACI

## 1. Stakeholders

### Humano
**Rodrigo Moreira**
- sponsor do projeto;
- Product Owner;
- gerente do projeto;
- autoridade de aceite;
- responsável por priorização e release.

### Usuários
Pessoas interessadas em:
- geração organizada;
- comparação;
- histórico;
- conferência;
- transparência.

### Plataformas/fornecedores
- GitHub;
- GitHub Actions;
- Cloudflare Pages;
- Loterias CAIXA como fonte externa de dados.

### Agentes de apoio por IA
- **Claude (sessão "advisor", Cowork)**: pesquisa, produto, redação de instruções técnicas para o Claude Code, auditoria independente do trabalho entregue, manutenção deste pacote de gestão e do Painel LotoAtlas. Papel anteriormente ocupado pelo ChatGPT, migrado em setembro/2026 a pedido do product owner.
- **Claude Code (CLI local)**: implementação assistida e manutenção de código no repositório.

IA não é autoridade de decisão do projeto. Nenhuma automação de IA mergeia código visível ao usuário sem validação pessoal do product owner via preview (`DEC-022`).

---

## 2. RACI

| Atividade | Rodrigo | Claude (advisor, Cowork) | Claude Code | GitHub Actions | Cloudflare |
|---|---|---|---|---|---|
| Visão de produto | A/R | C | I | I | I |
| Priorização | A/R | C | I | I | I |
| Requisitos | A/R | C | C | I | I |
| Arquitetura funcional | A | R/C | C | I | I |
| Matemática/auditoria | A | R/C | C | I | I |
| Redação de instrução técnica | A | R | I | I | I |
| Implementação | A | C | R | I | I |
| Unit/integration | A | C | R | C | I |
| E2E | A | C | R | C | I |
| Auditoria independente do PR entregue | A | R | I | I | I |
| Validação de preview | **A/R (só o product owner, pessoalmente)** | I | I | I | I |
| CI | A | I | I | R | I |
| Preview/deploy | A | I | I | C | R |
| Release/merge | A/R | C | C | I | I |
| Roadmap | A/R | C | I | I | I |
| Manutenção deste pacote de gestão | A | R | I | I | I |

**Legenda:**  
R = Responsible  
A = Accountable  
C = Consulted  
I = Informed
