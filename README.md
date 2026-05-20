# Ellen Martins Brows

Site de agendamento para servicos de sobrancelhas, construido com React, Vite, Supabase Auth/Postgres e deploy na Vercel.

Live: https://ellen-brows.vercel.app

GitHub: https://github.com/Juanblack1/ellen-brows

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth e Postgres com RLS
- CSS autoral com direcao beauty editorial
- Vercel para hospedagem

## Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_BOOKING_WHATSAPP=5511999999999
SUPABASE_DB_URL=<postgres-connection-string>
```

`VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_URL` sao usados no cliente. A seguranca dos dados depende das politicas RLS em `supabase/schema.sql`. Nunca exponha `SUPABASE_DB_URL`, access tokens ou senhas no repositorio.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Banco de dados

Com `SUPABASE_DB_URL` definido em um ambiente seguro, aplique o schema:

```bash
npm run db:push
```

Depois que a primeira conta admin existir no Supabase Auth, promova-a pelo SQL editor do Supabase:

```sql
insert into public.admin_profiles (user_id)
values ('AUTH_USER_ID_AQUI')
on conflict (user_id) do nothing;
```

## Verificacao

```bash
npm run lint
npm run build
```

## Documentos

- `docs/prd.md`
- `docs/techspec.md`
- `docs/tasks.md`
- `docs/plans/2026-05-19-ellen-brows-design.md`
- `docs/visual-prompts.md`
