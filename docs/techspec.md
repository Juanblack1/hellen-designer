# Tech Spec: Ellen Martins Brows

## Arquitetura

Aplicacao SPA em React/Vite. O cliente usa `@supabase/supabase-js` com as variaveis publicas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O banco usa Postgres com RLS para proteger leitura e escrita.

## Frontend

- `src/App.tsx`: pagina unica com landing, servicos, formulario, auth e listagem.
- `src/lib/supabase.ts`: inicializacao condicional do Supabase client.
- `src/App.css` e `src/index.css`: design system visual sem dependencia de UI kit.
- `src/assets/brow-atelier.svg`: arte vetorial original para hero.

## Dados

### `service_catalog`

Catalogo publico de servicos ativos.

Campos principais:

- `id text primary key`
- `name text`
- `duration_minutes integer`
- `price_cents integer`
- `description text`
- `active boolean`
- `sort_order integer`

### `bookings`

Pedidos de agendamento.

Campos principais:

- `id uuid primary key`
- `user_id uuid null references auth.users(id)`
- `client_name text`
- `client_email text`
- `client_phone text`
- `service_id text references service_catalog(id)`
- `service_name text`
- `preferred_date date`
- `preferred_time time`
- `notes text`
- `status text`
- `source text`

### `admin_profiles`

Lista de usuarios que podem operar a agenda completa.

## RLS

- `service_catalog`: leitura publica apenas para itens ativos.
- `bookings`: insert anonimo/autenticado permitido, select apenas para o proprio `user_id` ou admin.
- `bookings`: update/delete somente admin.
- `admin_profiles`: leitura do proprio perfil ou admin.

## Fluxos

### Agendamento anonimo

1. Visitante preenche formulario.
2. Frontend insere `bookings` com `user_id = null`.
3. Profissional/admin visualiza e confirma manualmente.

### Agendamento autenticado

1. Cliente entra/cria conta via Supabase Auth.
2. Frontend insere `bookings` com `user_id = auth.uid()`.
3. Cliente visualiza pedidos proprios na area segura.

### Admin

1. Usuario cria conta pelo site.
2. Admin tecnico insere o `auth.users.id` em `admin_profiles`.
3. A mesma listagem passa a retornar todos os pedidos por RLS.

## Deploy

- GitHub publico sem `.env.local`.
- Vercel com build `npm run build` e output `dist`.
- Variaveis configuradas na Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, opcional `VITE_BOOKING_WHATSAPP`.

## Seguranca

- `SUPABASE_DB_URL`, senha do banco, access token e service role nunca entram no bundle.
- Chave anon e URL sao publicas, mas dependem de RLS correta.
- Schema usa constraints basicas para status, duracao e tamanho de campos.

## Verificacao

- `npm run lint`
- `npm run build`
- Smoke test manual do formulario em ambiente com Supabase configurado.
