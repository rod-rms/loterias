# Deploy — Cloudflare Pages

Este projeto é um site estático (Vite build) e não requer backend próprio.

## 1. Build

```text
Build command: npm run build
Output directory: dist
Node version: 22
```

O build gera `dist/` com todos os assets, incluindo `public/data/**` (datasets) e `public/_redirects` (fallback SPA).

## 2. Passos de conexão GitHub → Cloudflare Pages

1. Acesse o painel da Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Selecione o repositório `rod-rms/loterias` e a branch `main`.
3. Configure o build:
   - **Framework preset:** Vite (ou "None", configurando manualmente).
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (raiz do repositório).
4. Variáveis de ambiente: nenhuma é necessária em runtime. Não adicione segredos — o app não usa chaves de API no cliente.
5. Salve e implante. A Cloudflare buildará e publicará automaticamente a cada push em `main`.

## 3. Roteamento SPA

O arquivo `public/_redirects` já contém:

```text
/*    /index.html   200
```

Isso garante que rotas como `/lotofacil/gerar` funcionem em recarregamento direto no ambiente estático da Cloudflare Pages.

## 4. Atualização de dados

Os datasets (`public/data/lotofacil/results.json`, `public/data/megasena/results.json`) são versionados no repositório e atualizados pelo workflow `.github/workflows/data-update.yml` (diário + `workflow_dispatch`). Cada atualização gera um novo commit em `main`, o que aciona um novo deploy automático na Cloudflare Pages.

## 5. Domínio e branding

Nenhum domínio customizado foi configurado nesta entrega. O domínio padrão `*.pages.dev` gerado pela Cloudflare pode ser usado até a definição de um domínio próprio.

## 6. Status desta implementação

Nenhuma credencial Cloudflare estava disponível no ambiente de implementação. O deploy automatizado não foi executado; os passos acima descrevem exatamente o procedimento manual necessário para publicar. O build de produção (`npm run build`) foi validado localmente e produz uma saída estática pronta para os passos 1–3 acima.
