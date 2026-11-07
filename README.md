# Provador

Seu armário no celular. Fotografe suas roupas, veja tudo numa vitrine de prateleiras de vidro e monte combinações num manequim. Quando quiser ver o look de verdade, a IA veste as peças numa foto sua.

## O que o app faz

- **Armário:** cada peça numa prateleira de acrílico, com filtro por tipo e favoritas. Tocando, a peça cresce no centro sobre a prateleira acesa, com as vizinhas desfocadas dos lados (deslize para passar). O **+** veste a peça no manequim.
- **Nova peça:** tire a foto ou escolha da galeria. O fundo é removido **no próprio celular** (o modelo baixa uns 40 MB na primeira vez e fica guardado), a peça é recortada rente e vai para a prateleira. Escolha o tipo, nome e cor.
- **Look:** o manequim vestido no centro e os looks salvos desfocados dos lados, como uma passarela. Embaixo, a lista das peças. Dá para ajustar tamanho e posição de cada peça, tirar peças, sortear um look ("Surpreenda-me") e salvar.
- **Provar com IA:** manda sua foto de corpo inteiro + as peças para o modelo de imagem do Google (Gemini) e devolve uma foto realista sua com o look. A foto pode ser guardada junto do look.
- **Perfil:** seu rosto na cabeça do manequim (opcional, com enquadramento), foto de corpo para a IA e conta.
- **App no celular (PWA):** instala na tela inicial, abre em tela cheia e guarda as fotos das roupas no aparelho.
- **Uso pessoal:** só a primeira conta pode ser criada; depois o cadastro fecha sozinho (`ALLOW_SIGNUP=true` reabre).

Visual: fundo branco de estúdio, superfícies de vidro fosco, texto e botões pretos.

## Tecnologias

Next.js 16 (App Router) + React 19 + TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS 4 · remoção de fundo com `@imgly/background-removal` (roda no navegador) · prova com IA pela API do Gemini.

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

### Ligando a prova com IA

1. Entre em https://aistudio.google.com/apikey e crie uma chave.
2. Ative o faturamento no Google AI Studio (o modelo de imagem é pago: alguns centavos de dólar por foto gerada).
3. Na Vercel, adicione `GEMINI_API_KEY` com a chave e faça um novo deploy.
4. No app, em Perfil, adicione sua foto de corpo inteiro.

O modelo padrão é `gemini-2.5-flash-image`; dá para trocar com `GEMINI_IMAGE_MODEL`.

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
