# Hellen Martins Brows

Site de agendamento para servicos de sobrancelhas, construido com React, Vite, Supabase Auth/Postgres e deploy na Vercel.

Live: https://hellen-brows.vercel.app

GitHub: https://github.com/Juanblack1/hellen-brows

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
VITE_PUBLIC_SITE_URL=https://hellen-brows.vercel.app
VITE_BOOKING_WHATSAPP=5511999999999
SUPABASE_DB_URL=<postgres-connection-string>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
PUBLIC_SITE_URL=https://hellen-brows.vercel.app
ASAAS_API_BASE_URL=https://api-sandbox.asaas.com
ASAAS_API_KEY=<server-only-asaas-api-key>
ASAAS_WEBHOOK_TOKEN=<server-only-asaas-webhook-token>
```

`VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL` e `VITE_PUBLIC_SITE_URL` sao usados no cliente. A seguranca dos dados depende das politicas RLS em `supabase/schema.sql`. Nunca exponha `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, access tokens ou senhas no repositorio.

## Pagamentos

O sinal de reserva usa Asaas Checkout hospedado. O site nao coleta dados de cartao; o cliente e redirecionado para o Asaas, e o status volta pelo webhook.

No painel admin, configure:

- se o sinal esta ativo;
- valor do sinal;
- tempo de expiracao do checkout.

Configure no Asaas um webhook de Checkout apontando para:

```text
https://hellen-brows.vercel.app/api/asaas-webhook
```

Eventos: `CHECKOUT_CREATED`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, `CHECKOUT_PAID`. O token configurado no webhook deve ser o mesmo valor de `ASAAS_WEBHOOK_TOKEN`.

## Auth

No Supabase Dashboard, em Authentication > URL Configuration:

- Site URL: `https://hellen-brows.vercel.app`
- Redirect URL: `https://hellen-brows.vercel.app/auth?mode=sign-in`
- Redirect URL: `https://hellen-brows.vercel.app/auth?mode=reset-password`

Se os templates de email forem personalizados, use `{{ .RedirectTo }}` nos links de confirmacao e recuperacao, nao `{{ .SiteURL }}`. Isso evita links apontando para `localhost`.

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
- `docs/plans/2026-05-19-hellen-brows-design.md`
- `docs/visual-prompts.md`
