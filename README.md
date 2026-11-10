# Provador

Seu armário no celular. Fotografe suas roupas, veja tudo numa vitrine de prateleiras de vidro e monte combinações num manequim. Quando quiser ver o look de verdade, a IA veste as peças numa foto sua.

## O que o app faz

- **Armário:** cada peça numa prateleira de acrílico, com filtro por tipo e favoritas. Tocando, a peça cresce no centro sobre a prateleira acesa, com as vizinhas desfocadas dos lados (deslize para passar). O **+** veste a peça no manequim.
- **Nova peça:** tire a foto ou escolha da galeria. O fundo é removido **no próprio celular** (o modelo baixa uns 40 MB na primeira vez e fica guardado), a peça é recortada rente e vai para a prateleira. Escolha o tipo, nome e cor.
- **Look:** o manequim vestido no centro e os looks salvos desfocados dos lados, como uma passarela. Embaixo, a lista das peças. Dá para ajustar tamanho e posição de cada peça, tirar peças, sortear um look ("Surpreenda-me") e salvar.
- **Manequim real (IA):** o botão "Ver no manequim real" manda as fotos das peças para a Cloudflare Workers AI (modelo FLUX.2) e devolve uma foto de catálogo: manequim de loja branco, sem rosto, vestindo o look, em fundo de estúdio. A foto fica guardada no look. Masculino ou feminino, escolhido no Perfil.
- **Perfil:** seu rosto na cabeça do manequim (opcional, com enquadramento), foto de corpo para a IA e conta.
- **App no celular (PWA):** instala na tela inicial, abre em tela cheia e guarda as fotos das roupas no aparelho.
- **Uso pessoal:** só a primeira conta pode ser criada; depois o cadastro fecha sozinho (`ALLOW_SIGNUP=true` reabre).

Visual: fundo branco de estúdio, superfícies de vidro fosco, texto e botões pretos.

## Tecnologias

Next.js 16 (App Router) + React 19 + TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS 4 · remoção de fundo com `@imgly/background-removal` (roda no navegador) · manequim realista pela Cloudflare Workers AI (FLUX.2).

As imagens ficam no próprio banco (são pequenas: as peças são salvas em WebP de até ~900 px), então não precisa de outro serviço de arquivos.

## Rodando no computador

```bash
npm install
cp .env.example .env.local
docker compose up -d      # PostgreSQL
npm run db:migrate
npm run dev               # http://localhost:3000
```

## Colocando no ar (igual ao FilmScore)

1. Crie um banco no **Neon** e copie a URL de conexão.
2. Importe este repositório na **Vercel** e configure `DATABASE_URL`.
3. Rode uma vez: `DATABASE_URL=... npm run db:migrate`.
4. Abra o site e crie sua conta (a primeira é a dona; depois o cadastro fecha).

### Ligando o manequim real (grátis)

1. Crie uma conta grátis em https://dash.cloudflare.com (sem cartão).
2. Copie o **Account ID** (painel > Workers AI ou a URL do painel).
3. Em My Profile > API Tokens, crie um token com o modelo **Workers AI**.
4. Na Vercel, adicione `CF_ACCOUNT_ID` e `CF_API_TOKEN` e faça um novo deploy.

O plano grátis tem uma cota diária de 10 mil neurons (na prática, libera 24 h depois do uso). O app usa o FLUX.2 klein 9B e, quando a cota dele acaba, passa para o klein 4B, mais leve.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run db:generate` | Gera migração após mudar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações |
| `npm run lint` / `npm run typecheck` | Checagens de código |

## Licença de terceiros

A remoção de fundo usa `@imgly/background-removal`, sob licença AGPL-3.0. Como este repositório é público e o uso é pessoal, está tudo certo; para um produto comercial fechado seria preciso a licença comercial da IMG.LY ou outro removedor.
