# Starter Pack — Loterias v1 para Claude Code

Este pacote contém o blueprint v1.1 aprovado, o domínio Mega-Sena já validado, as referências matemáticas e o handoff operacional para o Claude Code implementar a primeira versão funcional do aplicativo.

## Como usar

1. Clone o repositório:

   `git clone https://github.com/rod-rms/loterias.git`

2. Extraia o conteúdo deste ZIP **diretamente na raiz do repositório local `loterias/`**.

3. Abra a pasta `loterias` no VS Code.

4. Inicie o Claude Code dentro dessa pasta.

5. Cole o conteúdo de `PROMPT_PARA_CLAUDE_CODE.txt`.

O Claude deverá então ler `00_START_HERE_CLAUDE_CODE.md` e executar o projeto.

## Arquivos adicionados ao blueprint

- `00_START_HERE_CLAUDE_CODE.md` — handoff mestre operacional;
- `CLAUDE.md` — invariantes persistentes para Claude Code;
- `AGENTS.md` — invariantes para outros agentes;
- `PROMPT_PARA_CLAUDE_CODE.txt` — mensagem curta para iniciar a execução;
- `tests/lotofacil/fixtures/rms_3780_oracle.json` — oráculo exato da carteira RMS 3780.

Não extraia o ZIP em uma subpasta dentro do repositório.
