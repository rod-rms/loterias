# Scope Management & WBS

## 1. Escopo do produto

Produto web multi-modalidade para geração, comparação, persistência e conferência de carteiras de loteria.

---

## 2. WBS — Work Breakdown Structure

```text
1. Gestão de Produto
   1.1 Descoberta
   1.2 Requisitos
   1.3 Priorização
   1.4 Roadmap
   1.5 Homologação

2. Domínio Lotofácil
   2.1 Regras
   2.2 Estratégias
   2.3 RMS
   2.4 Métricas
   2.5 Oracle
   2.6 Simulação histórica

3. Domínio Mega-Sena
   3.1 Regras
   3.2 Estratégias
   3.3 F4/F5
   3.4 Métricas
   3.5 Oracle
   3.6 Simulação histórica
   3.7 Rolling 20 Balanceada v2.1 (MEGA-ROLL-001) — agrupamento/alocação/filtros/otimizador

4. Dados
   4.1 Fonte CAIXA
   4.2 Dataset Lotofácil
   4.3 Dataset Mega-Sena
   4.4 Validação
   4.5 Detecção de gaps
   4.6 Status
   4.7 Atualização automática

5. Frontend
   5.1 Home
   5.2 Geração
   5.3 Estratégias
   5.4 Resultados
   5.5 Jogos salvos
   5.6 Conferência
   5.7 Metodologia
   5.8 Sobre

6. Persistência
   6.1 IndexedDB
   6.2 Dexie
   6.3 Backup
   6.4 Importação
   6.5 Migrations
   6.6 Registro de aposta por jogo (BET-001, append-only)

7. Qualidade
   7.1 Unit tests
   7.2 Integration tests
   7.3 Oracle tests
   7.4 E2E
   7.5 Data validation
   7.6 Manual acceptance

8. DevOps
   8.1 Git
   8.2 PR
   8.3 CI
   8.4 Cloudflare preview
   8.5 Produção
   8.6 Tags
   8.7 Releases

9. Documentação
   9.1 Produto
   9.2 Arquitetura
   9.3 Dados
   9.4 Estratégias
   9.5 UX
   9.6 Gestão do Projeto
```

---

## 3. Controle de escopo

Uma mudança deve ser considerada alteração de escopo quando:

- cria nova capacidade de produto;
- altera matemática existente;
- muda persistência/schema;
- altera fonte de dados;
- cria dependência externa;
- muda arquitetura;
- adiciona modalidade;
- adiciona monetização.

Correções de copy/layout podem ser tratadas como manutenção quando não alteram comportamento funcional.

---

## 4. Critério de aceitação de escopo

Cada pacote só é considerado concluído quando houver:

- implementação;
- testes adequados;
- documentação atualizada;
- CI verde;
- homologação quando houver impacto visual/funcional.
