# Hellen Designer

Landing publica e painel privado para Hellen Martins, designer de sobrancelhas.

O produto tem apenas duas telas reais:

- `/`: landing com marca, WhatsApp, Instagram, servicos, precos e fotos/artes publicadas.
- `/admin`: painel privado para Hellen gerir agenda, clientes, valores recebidos, servicos/precos e fotos da landing.

Nao existe mais area da cliente, checkout, sinal Asaas ou agendamento automatico publico. A cliente chama a Hellen pelo WhatsApp; a Hellen organiza tudo no admin.

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth, Postgres, RLS e Storage
- Vercel para hospedagem
- Vitest + ESLint
- Design system criado no Stitch MCP

## Stitch

O design desta versao foi criado no Stitch no projeto `Hellen Designer`.

- Project ID: `1155312581449594488`
- Design system asset: `4979033361024d29a058739a4ada8675`
- Arquivos locais: `.stitch/DESIGN.md`, `.stitch/metadata.json`, `.stitch/designs/`

## Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_PUBLIC_SITE_URL=https://hellen-designer.vercel.app
VITE_BOOKING_WHATSAPP=5516988758633
SUPABASE_DB_URL=<postgres-connection-string>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
PUBLIC_SITE_URL=https://hellen-designer.vercel.app
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ficam no cliente. `SUPABASE_DB_URL` e `SUPABASE_SERVICE_ROLE_KEY` nunca devem ir para o front-end.

## Banco de dados

Com `SUPABASE_DB_URL` configurado em ambiente seguro:

```bash
npm run db:push
```

O schema cria:

- `admin_profiles`
- `business_profile`
- `services`
- `gallery_items`
- `clients`
- `appointments`
- bucket Storage `landing-media`

Depois de criar a primeira conta no Supabase Auth, promova a conta da Hellen pelo SQL editor:

```sql
insert into public.admin_profiles (user_id, role)
values ('AUTH_USER_ID_AQUI', 'owner')
on conflict (user_id) do nothing;
```

## Desenvolvimento

```bash
npm install
npm run dev
```

## Verificacao

```bash
npm run lint
npm test
npm run build
```

## Rotas

- `/`: landing publica.
- `/admin`: painel privado.
- `/auth`: renderiza o mesmo acesso admin, sem criar uma terceira experiencia.
