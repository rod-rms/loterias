# Project Charter — Loterias

## 1. Identificação

**Projeto:** Loterias  
**Responsável:** Rodrigo Moreira  
**Natureza:** Produto digital / aplicação web pública  
**Início:** 2026  
**Fase atual:** Operação e evolução incremental  
**Versão de referência:** v1.2.0 (produção) + MEGA-ROLL-001 em PR aberto

---

## 2. Propósito

Construir uma plataforma web transparente e auditável para geração, organização, comparação, armazenamento e conferência de carteiras de jogos de loteria, separando claramente:

- matemática combinatória;
- organização de carteira;
- métricas de cobertura;
- histórico;
- simulação;
- previsão.

O produto não se posiciona como ferramenta de previsão de sorteios.

---

## 3. Problema

Ferramentas de loteria existentes frequentemente:

- oferecem geradores sem metodologia clara;
- misturam frequência histórica com promessa de previsão;
- apresentam métricas sem explicação;
- dificultam auditoria de como os jogos foram gerados;
- oferecem pouco acompanhamento posterior;
- usam linguagem promocional pouco compatível com transparência matemática.

---

## 4. Objetivo geral

Entregar uma aplicação modular que permita ao usuário gerar e acompanhar carteiras de jogos com regras explícitas, dados oficiais, resultados reproduzíveis quando aplicável e limitações claramente comunicadas.

---

## 5. Objetivos específicos

- suportar múltiplas modalidades;
- manter estratégias versionadas e auditáveis;
- manter domínio matemático desacoplado da UI;
- usar datasets oficiais versionados;
- permitir persistência local;
- oferecer backup/importação;
- conferir jogos contra resultados oficiais;
- impedir vazamento temporal em simulações históricas;
- manter CI/CD e gates de qualidade;
- permitir evolução futura para novos jogos e funcionalidades;
- preservar espaço para eventual monetização sem comprometer transparência.

---

## 6. Escopo atual

### Incluído
- Mega-Sena;
- Lotofácil;
- estratégias de geração;
- baseline e métricas;
- seed/reprodutibilidade;
- armazenamento IndexedDB;
- backup/importação;
- atualização automática de resultados;
- simulação histórica;
- conferência detalhada;
- registro de aposta por jogo, separado da carteira gerada (BET-001);
- identidade visual própria (marca LotoAtlas);
- metodologia;
- jogo responsável;
- CI/CD;
- Cloudflare Pages;
- governança de merge com validação de preview pelo product owner para mudanças visíveis (`DEC-022`).

### Fora do escopo atual
- login;
- sincronização em nuvem;
- pagamentos;
- compra/intermediação de apostas;
- ROI previsto;
- previsão de dezenas;
- RMS v3;
- apostas ampliadas;
- comunidade/ranking;
- push;
- IA generativa em runtime.

---

## 7. Premissas

- dados oficiais continuarão acessíveis por fonte pública da CAIXA;
- GitHub permanecerá como fonte da verdade;
- Cloudflare Pages continuará como plataforma de deploy;
- aplicação continuará sem backend de usuário até haver justificativa de produto;
- estratégias históricas devem respeitar no-look-ahead;
- matemática validada não pode ser alterada silenciosamente por mudanças de UX.

---

## 8. Restrições

- projeto individual, com execução assistida por IA;
- ausência atual de orçamento formal;
- ausência atual de métricas robustas de adoção;
- dependência de dados externos;
- necessidade de comunicação responsável por se tratar de loterias;
- sem autenticação e sem sincronização nesta fase.

---

## 9. Critérios de sucesso da fase atual

- aplicação pública funcional;
- releases versionadas;
- datasets atualizados;
- ausência de gaps conhecidos;
- testes automatizados verdes;
- oráculos matemáticos verdes;
- homologação manual antes de release;
- documentação suficiente para manutenção e evolução;
- nenhum claim de previsão incorreta.

---

## 10. Governança

Rodrigo é a autoridade final sobre:

- escopo;
- requisitos;
- aceitação;
- priorização;
- homologação;
- releases;
- roadmap.

Ferramentas de IA apoiam especificação, análise, implementação e auditoria, mas não substituem a responsabilidade humana pela decisão final.
