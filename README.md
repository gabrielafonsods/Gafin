# Gafin

Controle financeiro pessoal — PWA offline-first, feito para uso principal no iPhone.

**Gafin** = **Ga**briel + **Fin**anceiro. _"Seu dinheiro, sob controle."_

## Stack

Vue 3 + TypeScript + Vite + IndexedDB + PWA, hospedado gratuitamente no GitHub Pages. Sem backend, sem serviços pagos.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (geralmente `http://localhost:5173`).

## Build de produção

```bash
npm run build
npm run preview   # para conferir o build antes de publicar
```

## Deploy no GitHub Pages

1. Crie um repositório no GitHub chamado `gafin` (ou ajuste `REPO_NAME` em `vite.config.ts` se usar outro nome).
2. Suba o código para a branch `main`.
3. Em **Settings → Pages**, em "Build and deployment", selecione **Source: GitHub Actions**.
4. O workflow em `.github/workflows/deploy.yml` builda e publica automaticamente a cada push em `main`.

O app ficará disponível em `https://SEU_USUARIO.github.io/gafin/`.

## Instalando no iPhone

Abra a URL publicada no Safari → toque em **Compartilhar** → **Adicionar à Tela de Início**.

## Estrutura de pastas

```text
src/
├── assets/            estilos globais e tokens de design
├── components/        componentes visuais reutilizáveis
├── layouts/           layout principal (shell + navegação)
├── views/             páginas, organizadas por seção do menu
├── router/            rotas (Vue Router, hash history)
├── database/          schema, conexão e repositórios do IndexedDB
├── services/          lógica de negócio futura (fora dos componentes)
├── types/             tipos compartilhados que não pertencem ao schema
└── utils/             helpers puros (ex.: formatação de moeda)
```

## Status

Fundação inicial do projeto: navegação, layout, PWA e camada de persistência
prontos. Funcionalidades financeiras completas (transações, cartões,
faturas, investimentos) serão implementadas nas próximas etapas.
