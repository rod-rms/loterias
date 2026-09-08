# Changelog

Registro de mudanças voltadas ao usuário e à operação do produto. Não é um espelho de cada commit — para o histórico técnico completo, use `git log`.

## [Unreleased] — v1.1

### Navegação e estrutura

- As páginas de landing por modalidade (`/lotofacil`, `/megasena`) foram removidas; agora redirecionam para a página de geração (`/lotofacil/gerar`, `/megasena/gerar`), que passa a ser o ponto de entrada de cada modalidade.
- Os links "Meus jogos salvos" e "Metodologia" da modalidade atual aparecem no topo da página de geração, com o mesmo peso visual.
- Navegação "voltar" passou a ser determinística (destinos fixos em vez de depender do histórico do navegador): Gerar → Início; Metodologia e Carteiras da modalidade → Gerar da mesma modalidade; Carteiras global → Início.

### Geração de jogos

- Nenhuma estratégia vem pré-selecionada por padrão, para não sugerir implicitamente uma recomendação.
- "Como você quer definir seus jogos?" substitui os antigos botões escuros de modo por um controle de opção explícito ("Quantidade de jogos" / "Valor que quero gastar").
- Personalização de dezenas redesenhada: "Quero personalizar" começa desligado, e quando ligado mostra duas seções independentes e usáveis ao mesmo tempo — "Dezenas que devem aparecer em todos os jogos" e "Dezenas que não quero usar" — mantendo a regra de que uma dezena nunca pertence às duas.
- "Limpar configuração" reseta todo o formulário (estratégia, quantidade/valor, concurso sugerido, personalização, código de reprodução) sem apagar jogos já salvos.
- **Resultados desatualizados nunca são apagados silenciosamente.** Se a configuração for alterada depois de gerar jogos, o resultado anterior continua visível, com um aviso destacado e três ações: gerar com a nova configuração, restaurar a configuração anterior (sem gerar de novo) ou descartar o resultado anterior.
- Salvar um resultado sempre usa a configuração e o dataset exatamente como estavam no momento em que aquele resultado foi gerado — mesmo que o formulário tenha sido editado depois, sem gerar novamente.

### Comparação com jogos aleatórios

- A comparação com jogos aleatórios equivalentes foi humanizada: sem a abreviação "p.p." na interface leiga, com frases como "6,95 pontos percentuais a favor deste conjunto" ou "Mesma cobertura" quando não há diferença real. Os valores exatos continuam disponíveis nos detalhes técnicos.

### Metodologia

- Reorganizada com divulgação progressiva: "Como este aplicativo funciona" (linguagem simples) é a seção principal; todo o material técnico rigoroso anterior continua disponível em "Detalhes técnicos".
- Nova seção "Dados e atualizações" por modalidade, mostrando fonte oficial, último concurso na base, data do último sorteio, situação da base, última atualização com novo concurso e última verificação da fonte oficial — carregada de metadados versionados, nunca fixa no código.

### Dados e persistência

- Novo arquivo versionado `public/data/status.json` com metadados de transparência por modalidade. Distingue explicitamente "última atualização" (quando um novo concurso realmente entrou na base) de "última verificação" (quando a fonte oficial foi conferida com sucesso, mesmo sem novidade).
- Jogos salvos agora armazenam um retrato do dataset usado na geração (último concurso, data de importação, fonte), de forma compatível com jogos salvos anteriormente (que simplesmente não têm esse campo).
- A verificação automática de novos concursos passou de um horário único e arbitrário para múltiplas janelas de checagem após os sorteios oficiais (ver `.github/workflows/data-update.yml`), por ser mais resiliente a atrasos/instabilidade na publicação da CAIXA. Janelas intermediárias não geram commit quando não há novidade; a janela final de cada sequência registra a verificação mesmo sem concurso novo, para que o app mostre a data real da última verificação.
- Corrigido o link "Saiba mais sobre jogo responsável", que apontava para uma URL obsoleta da CAIXA; agora aponta para a página oficial atual.

### Documentação

- Especificações de produto, arquitetura e dados atualizadas para refletir a nova navegação, o ciclo de vida de atualização de dados e a separação entre o que fica no repositório (produto) e o que fica no IndexedDB do usuário (jogos salvos, preferências).
