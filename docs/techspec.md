# Tech Spec: Hellen Martins Brows

## Arquitetura

Aplicacao SPA em React/Vite com funcoes serverless na Vercel. O frontend usa `@supabase/supabase-js` com as variaveis publicas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Operacoes sensiveis de pagamento usam `SUPABASE_SERVICE_ROLE_KEY` apenas nas funcoes `/api`. O banco usa Postgres com RLS para proteger leitura e escrita.

## Frontend

- `src/App.tsx`: landing publica, `/app`, `/servicos`, `/agendamento`, `/confirmacao`, `/auth`, `/cliente` futura e painel admin reorganizado por rotas.
- `src/lib/supabase.ts`: inicializacao condicional do Supabase client.
- `src/App.css` e `src/index.css`: design system visual sem dependencia de UI kit.
- `public/manifest.webmanifest` e `public/sw.js`: camada PWA para instalacao do aplicativo e cache basico do app shell.

## Backend serverless

- `api/create-deposit-checkout.ts`: cria ou reaproveita checkout de sinal para a cliente autenticada.
- `api/asaas-webhook.ts`: recebe eventos do Asaas, valida token, processa status e mantem idempotencia.
- `server/payments.ts`: helpers de env, JSON/body limit, timeout, respostas `no-store`, redacao de payload e comparacao timing-safe.

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

### `booking_payments`

Pagamentos de sinal vinculados a um agendamento.

Campos principais:

- `booking_id uuid references bookings(id)`
- `user_id uuid references auth.users(id)`
- `provider text`
- `status text`
- `amount_cents integer`
- `checkout_url text`
- `provider_checkout_id text`
- `expires_at timestamptz`

Há índice único parcial para impedir mais de um pagamento `pending` por `booking_id/provider`.

### `asaas_webhook_events`

Registro idempotente dos eventos recebidos do Asaas, com `processed_at` e `processing_error` para auditoria operacional.

### `admin_profiles`

Lista de usuarios que podem operar a agenda completa. O campo `role` aceita `owner` e `admin`; apenas `owner` gerencia outros perfis administrativos.

### `clients`

Ficha consolidada da cliente. A tabela recebe backfill a partir de `bookings` e tambem e sincronizada por trigger quando novos agendamentos sao criados ou atualizados.

Campos principais:

- `user_id uuid references auth.users(id)`
- `full_name text`
- `email text unique`
- `phone text`
- `birth_date date`
- `preferences text`
- `professional_notes text`

### `payments`

Pagamentos por atendimento, independentes do sinal Asaas.

Campos principais:

- `booking_id uuid references bookings(id)`
- `client_id uuid references clients(id)`
- `service_id text references service_catalog(id)`
- `payment_method text`
- `status text`
- `total_amount_cents integer`
- `paid_amount_cents integer`
- `paid_at date`

### `products`

Produtos usados ou vendidos no estudio.

Campos principais:

- `name text`
- `category text`
- `stock_quantity numeric`
- `unit text`
- `cost_cents integer`
- `sale_price_cents integer`
- `minimum_stock numeric`
- `notes text`

### `stock_movements`

Movimentacoes de estoque com trigger para atualizar `products.stock_quantity`.

Tipos aceitos: `input`, `output`, `service_use`, `sale`, `manual_adjustment`.

## RLS

- `service_catalog`: leitura publica apenas para itens ativos.
- `bookings`: insert autenticado; select apenas para o proprio `user_id` ou admin.
- `bookings`: update/delete somente admin ou funcoes controladas para cancelamento/remarcacao da propria cliente.
- `booking_payments`: leitura da propria cliente ou admin; escrita sensivel via funcao serverless.
- `admin_profiles`: leitura do proprio perfil ou admin; escrita restrita a `owner`.
- `clients`: cliente le a propria ficha; admin gerencia todas.
- `payments`: cliente le pagamentos vinculados aos proprios agendamentos; admin gerencia todos.
- `products` e `stock_movements`: acesso restrito a admin.

## Fluxos

### Escopo inicial admin-first

1. Visitante conhece servicos na landing publica.
2. CTAs publicos abrem WhatsApp com mensagem inicial de agendamento.
3. Hellen/admin registra e opera calendario, clientes, pagamentos e estoque pelo painel privado.
4. Area da cliente e checkout autenticado permanecem como base futura, sem destaque publico.

### Agendamento autenticado futuro

1. Cliente entra/cria conta via Supabase Auth.
2. Frontend insere `bookings` com `user_id = auth.uid()`.
3. Se a politica exigir sinal, o status inicial fica `awaiting_deposit` e o checkout hospedado e aberto.
4. Cliente visualiza pedidos proprios na area segura.

### Admin

1. Usuario admin entra pelo acesso privado em `/auth`.
2. Owner insere o `auth.users.id` em `admin_profiles` com `role = 'owner'` ou `role = 'admin'`.
3. O painel libera dashboard, agenda, agendamentos, clientes, WhatsApp, servicos, pagamentos, produtos, relatorios e configuracoes.

### Aplicativo PWA

1. Admin acessa `/app` para instalar o PWA.
2. O navegador le `manifest.webmanifest` e registra `sw.js` em producao.
3. Quando o evento `beforeinstallprompt` estiver disponivel, o frontend exibe a opcao de instalar o aplicativo.
4. Depois de instalado, o app abre em `/app` com atalhos para painel admin, agenda admin e CRM de clientes cadastradas.
5. O CRM de clientes cadastradas fica em `/admin/clientes`; a area individual da cliente fica reservada para etapa futura.

### Pagamento e webhook

1. Cliente solicita checkout em `/api/create-deposit-checkout` com token da sessao.
2. Funcao valida ownership, politica ativa e idempotencia de pagamento pendente.
3. Asaas recebe item de sinal e redireciona a cliente para `successUrl`, `cancelUrl` ou `expiredUrl` em `/cliente`.
4. Webhook valida token, grava evento, consulta o checkout pago no Asaas quando necessario e atualiza `booking_payments`/`bookings` sem regredir status pago.

## Deploy

- GitHub publico sem `.env.local`.
- Vercel com build `npm run build` e output `dist`.
- Variaveis configuradas na Vercel: publicas `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL`, `VITE_BOOKING_WHATSAPP`; server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `ASAAS_API_BASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`.

## Seguranca

- `SUPABASE_DB_URL`, senha do banco, access token e service role nunca entram no bundle.
- Chave anon e URL sao publicas, mas dependem de RLS correta.
- Schema usa constraints basicas para status, duracao e tamanho de campos.
- O app nao coleta, armazena, processa nem transmite dados brutos de cartao.
- Webhook usa token compartilhado com comparacao timing-safe e payloads redigidos.

## Verificacao

- `npm run lint`
- `npm test`
- `npm run build`
- Smoke test publico em `/`, `/app`, `/servicos`, `/agendamento`, `/confirmacao`, `/cliente`, `/admin`, `/admin/pagamentos`, `/admin/produtos`.
- Teste autenticado de admin em ambiente com Supabase configurado; cliente autenticada fica para a etapa futura.
